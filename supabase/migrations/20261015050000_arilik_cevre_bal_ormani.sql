-- koloni-161 EK8/EK9: arılık çevresi (OSM su + ESA WorldCover 2021) ve resmi bal ormanları — admin yazar, herkes okur
create table if not exists public.arilik_cevre (
  arilik_id text primary key,
  lat double precision not null, lon double precision not null,
  su_kaynagi_mesafe_metre integer, su_kaynagi_turu text, su_kaynagi_adi text,
  ortu jsonb, -- {agac,calilik,cayir,tarim,yerlesim,ciplak,su,sulak,...} oran 0–1, 3 km yarıçap
  toplama_alani_guvenli boolean, -- null = veri yok
  kaynak text not null,
  elle boolean not null default false,
  hesaplandi timestamptz not null default now()
);
alter table public.arilik_cevre enable row level security;
drop policy if exists arilik_cevre_read on public.arilik_cevre;
create policy arilik_cevre_read on public.arilik_cevre for select using (true);
drop policy if exists arilik_cevre_admin on public.arilik_cevre;
create policy arilik_cevre_admin on public.arilik_cevre for all using (public.sa_is_admin()) with check (public.sa_is_admin());

create table if not exists public.bal_ormanlari (
  id text primary key,
  ad text not null, il text, ilce text, lat double precision, lon double precision,
  kovan_kapasitesi integer,
  su_kaynagi_mesafe_metre integer, toplama_alani_guvenli boolean,
  kaynak text not null, guncellendi timestamptz not null default now()
);
create index if not exists bal_ormanlari_il_ilce on public.bal_ormanlari (il, ilce);
alter table public.bal_ormanlari enable row level security;
drop policy if exists bal_ormanlari_read on public.bal_ormanlari;
create policy bal_ormanlari_read on public.bal_ormanlari for select using (true);
drop policy if exists bal_ormanlari_admin on public.bal_ormanlari;
create policy bal_ormanlari_admin on public.bal_ormanlari for all using (public.sa_is_admin()) with check (public.sa_is_admin());
