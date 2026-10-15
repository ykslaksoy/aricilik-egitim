-- koloni-161 EK10: yönetici ayarları sürümlü yayın + değişiklik günlüğü + geri alma
create table if not exists public.ayar_surumleri (
  surum bigserial primary key,
  data jsonb not null,
  fark jsonb,
  not_ text,
  yayinlayan uuid default auth.uid(),
  yayinlayan_eposta text,
  at timestamptz not null default now(),
  geri_alinan bigint
);
alter table public.ayar_surumleri enable row level security;
drop policy if exists ayar_surumleri_admin on public.ayar_surumleri;
create policy ayar_surumleri_admin on public.ayar_surumleri for select using (public.sa_is_admin());

create or replace function public.sa_ayar_surum() returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(max(surum), 0) from public.ayar_surumleri;
$$;
grant execute on function public.sa_ayar_surum() to anon, authenticated;

create or replace function public.sa_ayar_yayinla(p_data jsonb, p_not text default null, p_geri bigint default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare onceki jsonb; f jsonb := '{}'::jsonb; k text; s bigint;
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  perform public.sa_ogul_skor_kaydet(p_data); -- mevcut doğrulama + uygulama ayarı
  select data into onceki from public.ayar_surumleri order by surum desc limit 1;
  if onceki is not null then
    for k in select jsonb_object_keys(p_data) loop
      if onceki->k is distinct from p_data->k then f := f || jsonb_build_object(k, jsonb_build_object('once', onceki->k, 'sonra', p_data->k)); end if;
    end loop;
  end if;
  insert into public.ayar_surumleri (data, fark, not_, yayinlayan_eposta, geri_alinan)
  values (p_data, f, p_not, coalesce(auth.jwt() ->> 'email', ''), p_geri) returning surum into s;
  return s;
end $$;
revoke all on function public.sa_ayar_yayinla(jsonb, text, bigint) from anon;

create or replace function public.sa_ayar_geri_al(p_surum bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  select data into d from public.ayar_surumleri where surum = p_surum;
  if d is null then raise exception 'Sürüm yok'; end if;
  return public.sa_ayar_yayinla(d, 'Geri alındı: sürüm ' || p_surum, p_surum);
end $$;
revoke all on function public.sa_ayar_geri_al(bigint) from anon;
-- mevcut ayar ilk sürüm olarak kaydedilir
insert into public.ayar_surumleri (data, not_, yayinlayan_eposta)
select data, 'İlk sürüm (mevcut ayar)', 'sistem' from public.ogul_skor_ayar where id = 1 and not exists (select 1 from public.ayar_surumleri);
