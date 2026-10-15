-- koloni-160: TAGEM 2022 il/ilçe çiçeklenme takvimi + eksik il istekleri
create table if not exists public.cicek_takvimi (
  id bigserial primary key,
  il text not null,
  ilce text not null,
  ay1 smallint check (ay1 between 1 and 12),
  ay2 smallint check (ay2 between 1 and 12),
  donem text,
  nektar text,
  polen text,
  baskin_flora text,
  resmi_ay_araligi text,
  dogrulandi boolean not null default true,
  kaynak text not null,
  created_at timestamptz not null default now()
);
create index if not exists cicek_takvimi_il_ilce on public.cicek_takvimi (il, ilce);
alter table public.cicek_takvimi enable row level security;
drop policy if exists cicek_takvimi_read on public.cicek_takvimi;
create policy cicek_takvimi_read on public.cicek_takvimi for select using (true);
drop policy if exists cicek_takvimi_admin on public.cicek_takvimi;
create policy cicek_takvimi_admin on public.cicek_takvimi for all using (public.sa_is_admin()) with check (public.sa_is_admin());

create table if not exists public.takvim_eksik (
  id bigserial primary key,
  il text not null,
  istek text not null,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.takvim_eksik enable row level security;
drop policy if exists takvim_eksik_ins on public.takvim_eksik;
create policy takvim_eksik_ins on public.takvim_eksik for insert to authenticated with check (user_id = auth.uid());
drop policy if exists takvim_eksik_admin on public.takvim_eksik;
create policy takvim_eksik_admin on public.takvim_eksik for select using (public.sa_is_admin());
