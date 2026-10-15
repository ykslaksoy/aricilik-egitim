-- koloni-166: çevre sorguları sayfa açılışında değil, iş kuyruğunda (konum değişince) — sonuç arilik_cevre'ye
alter table public.arilik_cevre add column if not exists rakim_m integer;
create table if not exists public.cevre_kuyruk (
  id bigserial primary key,
  hedef_tur text not null check (hedef_tur in ('arilik', 'bal_ormani_sync')),
  hedef_id text not null, lat double precision, lon double precision,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'isleniyor', 'tamam', 'hata')),
  deneme int not null default 0, sonraki timestamptz not null default now(), hata text,
  eklendi timestamptz not null default now(), bitti timestamptz
);
create unique index if not exists cevre_kuyruk_acik on public.cevre_kuyruk (hedef_tur, hedef_id) where durum in ('bekliyor', 'isleniyor', 'hata');
alter table public.cevre_kuyruk enable row level security;
drop policy if exists cevre_kuyruk_admin on public.cevre_kuyruk;
create policy cevre_kuyruk_admin on public.cevre_kuyruk for select using (public.sa_is_admin());

create or replace function public.sa_cevre_kuyruga(tur text, hid text, la double precision, lo double precision) returns void language plpgsql security definer set search_path = public as $$
begin
  if la is null or lo is null then return; end if;
  insert into public.cevre_kuyruk (hedef_tur, hedef_id, lat, lon) values (tur, hid, la, lo)
  on conflict (hedef_tur, hedef_id) where durum in ('bekliyor', 'isleniyor', 'hata')
  do update set lat = excluded.lat, lon = excluded.lon, durum = 'bekliyor', deneme = 0, sonraki = now(), hata = null;
end $$;
revoke all on function public.sa_cevre_kuyruga(text, text, double precision, double precision) from public, anon, authenticated;

-- arılık konumu değişince kuyruğa (apiaries.data lat/lon)
create or replace function public.sa_arilik_konum_kuyruk() returns trigger language plpgsql security definer set search_path = public as $$
declare la double precision; lo double precision; ola double precision; olo double precision;
begin
  la := nullif(new.data->>'lat', '')::double precision; lo := nullif(new.data->>'lon', '')::double precision;
  if tg_op = 'UPDATE' then ola := nullif(old.data->>'lat', '')::double precision; olo := nullif(old.data->>'lon', '')::double precision; end if;
  if la is not null and lo is not null and (tg_op = 'INSERT' or ola is distinct from la or olo is distinct from lo) and not new.deleted then
    perform public.sa_cevre_kuyruga('arilik', new.id::text, la, lo);
  end if;
  return null;
exception when others then return null; -- kuyruk hatası kaydı engellemez
end $$;
drop trigger if exists sa_arilik_konum_kuyruk on public.apiaries;
create trigger sa_arilik_konum_kuyruk after insert or update of data on public.apiaries for each row execute function public.sa_arilik_konum_kuyruk();
