-- koloni-159: sıcaklık ve nem okumaları ayrı alanlar, zaman etiketli; kullanıcıya özel RLS
create table if not exists public.sensor_okumalari (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kovan_id bigint,
  arilik_id text,
  sensor_tipi text not null check (sensor_tipi in ('isi_nem','dis_isi_nem')),
  olcum text not null check (olcum in ('isi','nem')),
  deger numeric not null,
  birim text not null check (birim in ('°C','%')),
  ts timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, sensor_tipi, olcum, kovan_id, arilik_id, ts)
);
create index if not exists sensor_okumalari_user_ts on public.sensor_okumalari (user_id, sensor_tipi, ts desc);
alter table public.sensor_okumalari enable row level security;
drop policy if exists sensor_okumalari_sec on public.sensor_okumalari;
drop policy if exists sensor_okumalari_ins on public.sensor_okumalari;
drop policy if exists sensor_okumalari_del on public.sensor_okumalari;
create policy sensor_okumalari_sec on public.sensor_okumalari for select to authenticated using (user_id = auth.uid());
create policy sensor_okumalari_ins on public.sensor_okumalari for insert to authenticated with check (user_id = auth.uid());
create policy sensor_okumalari_del on public.sensor_okumalari for delete to authenticated using (user_id = auth.uid());
revoke all on public.sensor_okumalari from anon;
grant select, insert, delete on public.sensor_okumalari to authenticated;
grant usage, select on sequence public.sensor_okumalari_id_seq to authenticated;
