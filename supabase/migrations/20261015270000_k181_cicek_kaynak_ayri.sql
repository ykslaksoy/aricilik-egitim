-- koloni-181 (4): cicek_takvimi.kaynak herkese açıktı → yalnız yöneticinin okuduğu cicek_takvimi_kaynak tablosuna taşındı (satır id ile bağlı).
create table if not exists public.cicek_takvimi_kaynak (
  takvim_id bigint primary key references public.cicek_takvimi(id) on delete cascade,
  kaynak text not null, created_at timestamptz not null default now()
);
alter table public.cicek_takvimi_kaynak enable row level security;
revoke all on public.cicek_takvimi_kaynak from anon, authenticated;
grant select on public.cicek_takvimi_kaynak to authenticated;
drop policy if exists cicek_takvimi_kaynak_admin_okur on public.cicek_takvimi_kaynak;
create policy cicek_takvimi_kaynak_admin_okur on public.cicek_takvimi_kaynak for select to authenticated using (public.sa_is_admin());
insert into public.cicek_takvimi_kaynak (takvim_id, kaynak) select id, kaynak from public.cicek_takvimi where kaynak is not null
on conflict (takvim_id) do update set kaynak = excluded.kaynak;

create or replace function public.sa_takvim_isle() returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; k integer;
begin
  for r in select * from public.takvim_eksik where durum in ('bekliyor','kaynak_yok') order by son_istek loop
    if exists (select 1 from public.cicek_takvimi where il = r.il) then
      update public.takvim_eksik set durum = 'hazirlandi', islendi_at = now(), kaynak_not = coalesce(kaynak_not, 'takvim zaten var') where id = r.id; n := n + 1;
    elsif exists (select 1 from public.cicek_kaynak_havuz where il = r.il and dogrulandi) then
      with h as (select il, ilce, ay1, ay2, donem, nektar, polen, baskin_flora, resmi_ay_araligi, dogrulandi, kaynak from public.cicek_kaynak_havuz where il = r.il and dogrulandi),
      ins as (insert into public.cicek_takvimi (il, ilce, ay1, ay2, donem, nektar, polen, baskin_flora, resmi_ay_araligi, dogrulandi)
        select il, ilce, ay1, ay2, donem, nektar, polen, baskin_flora, resmi_ay_araligi, dogrulandi from h returning id, il, ilce)
      insert into public.cicek_takvimi_kaynak (takvim_id, kaynak)
        select distinct on (ins.id) ins.id, h.kaynak from ins join h on h.il = ins.il and h.ilce is not distinct from ins.ilce where h.kaynak is not null
        on conflict (takvim_id) do update set kaynak = excluded.kaynak;
      select count(*) into k from public.cicek_takvimi where il = r.il;
      update public.takvim_eksik set durum = 'hazirlandi', islendi_at = now(), kaynak_not = k || ' ilçe satırı · TAGEM AAEM/51 (2022)' where id = r.id; n := n + 1;
    else
      update public.takvim_eksik set durum = 'kaynak_yok', islendi_at = now(), kaynak_not = 'Kaynak bekleniyor: TAGEM AAEM/51 Tablo 1''de bu il ayrıştırılamadı; il tarım müdürlüğü / Arıcılık Araştırma Enstitüsü / akademik flora çalışması aranıyor' where id = r.id;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.sa_takvim_talepleri() returns table (il text, durum text, istek_sayisi integer, created_at timestamptz, son_istek timestamptz, islendi_at timestamptz, kaynak_not text, kaynak text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query select t.il, t.durum, t.istek_sayisi, t.created_at, t.son_istek, t.islendi_at, t.kaynak_not,
    (select string_agg(distinct split_part(k.kaynak, ' — ', 1), ' · ') from public.cicek_takvimi c join public.cicek_takvimi_kaynak k on k.takvim_id = c.id where c.il = t.il)
  from public.takvim_eksik t order by t.son_istek desc;
end $$;

-- kopya doğrulandıktan sonra açık sütun kaldırılır
alter table public.cicek_takvimi drop column if exists kaynak;
