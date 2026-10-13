-- SüperArı: Oğul Risk Skoru (ORS) ayarları — Genetik puan tablosu + ağırlıklar (koloni-130).
-- Tek satır (id = 1) JSON. Okuma: herkes (istemci skoru hesaplamak için; gizli veri yok). Yazma: yalnız yönetici (sa_is_admin, fiyat_eksik migration'ı).
-- Satır yoksa uygulama koddaki varsayılanları kullanır. Supabase → SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

create table if not exists public.ogul_skor_ayar (
  id integer primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.ogul_skor_ayar enable row level security;
revoke all on public.ogul_skor_ayar from anon, authenticated;
drop policy if exists ogul_skor_ayar_read on public.ogul_skor_ayar;
create policy ogul_skor_ayar_read on public.ogul_skor_ayar for select to anon, authenticated using (true);
grant select on public.ogul_skor_ayar to anon, authenticated;

create or replace function public.sa_ogul_skor_kaydet(p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  w jsonb; t timestamptz := now();
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then raise exception 'Geçersiz veri'; end if;
  w := p_data->'weights';
  if w is null or jsonb_typeof(w) <> 'object' then raise exception 'Ağırlıklar eksik'; end if;
  if abs(coalesce((w->>'genetik')::numeric, 0) + coalesce((w->>'sikisiklik')::numeric, 0) + coalesce((w->>'mevsim')::numeric, 0) + coalesce((w->>'anaYasi')::numeric, 0) - 1) > 0.001 then
    raise exception 'Ağırlıkların toplamı 1 olmalı';
  end if;
  insert into public.ogul_skor_ayar (id, data, updated_at, updated_by) values (1, p_data, t, auth.uid())
  on conflict (id) do update set data = excluded.data, updated_at = t, updated_by = auth.uid();
  return t;
end;
$$;
revoke all on function public.sa_ogul_skor_kaydet(jsonb) from public;
revoke all on function public.sa_ogul_skor_kaydet(jsonb) from anon;
grant execute on function public.sa_ogul_skor_kaydet(jsonb) to authenticated;
