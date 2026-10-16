-- koloni-193: Bildirim teslim günlüğü (gonderildi / teslim_edildi / basarisiz) ve kullanıcı kategori tercihleri.
-- Kullanıcı yalnız kategori aç/kapa yapar; eşikler yönetici panelinde. api/_push-lib.js SCHEMA_SQL ile aynı; tekrar çalıştırmak güvenlidir.
create table if not exists public.push_teslim (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kategori text, baslik text, cihaz text,
  durum text not null default 'gonderildi',
  hata text,
  created_at timestamptz not null default now(),
  teslim_at timestamptz
);
create index if not exists push_teslim_zaman_idx on public.push_teslim (created_at desc);
alter table public.push_teslim enable row level security;
drop policy if exists push_teslim_okur on public.push_teslim;
create policy push_teslim_okur on public.push_teslim for select to authenticated using (user_id = auth.uid() or public.sa_is_admin());
grant select on public.push_teslim to authenticated;
create table if not exists public.push_tercih (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kapali text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.push_tercih enable row level security;
create or replace function public.sa_push_ozet() returns table (abonelik int, kullanici int) language sql stable security definer set search_path = public as $$
  select count(*)::int, count(distinct user_id)::int from public.push_subscriptions where public.sa_is_admin();
$$;
revoke all on function public.sa_push_ozet() from public, anon;
grant execute on function public.sa_push_ozet() to authenticated;
