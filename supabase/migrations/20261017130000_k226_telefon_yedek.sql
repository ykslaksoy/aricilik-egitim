-- koloni-226: Telefon yedeği — telefondaki tüm uygulama verisi (localStorage: cihaz listesi, ayarlar, gönderilmemiş kayıtlar…) + fotoğraf dosyaları
-- günlük / elle telefonda alınır, özel Storage kovasına (telefon-yedek) yüklenir. İzinler koloni-223 ile aynı (sa_yedek_izin: yönetici, Sahip, «Kaydı görür»/«Geri alabilir»).
-- Saklama: sa_yedek_ayar (gunluk_gun / aylik_ay). Storage nesneleri SQL'den silinemez → süresi dolanlar sa_telefon_silinecek kuyruğuna, telefon/panel Storage API ile siler.

alter table public.sa_yedek_ayar add column if not exists telefon_uyari_gun int not null default 2 check (telefon_uyari_gun between 1 and 60);

create table if not exists public.sa_telefon_yedek (
  id bigserial primary key,
  hesap_id uuid not null references auth.users(id) on delete cascade,  -- verinin ait olduğu hesap (Sahip)
  user_id uuid not null default auth.uid(),                              -- yükleyen
  email text,
  cihaz_id text not null,
  cihaz_ad text,
  tarih date not null,                 -- TSİ günü (telefonda)
  tur text not null check (tur in ('gunluk', 'elle', 'oncesi')),
  at timestamptz not null default now(),
  yol text not null,                   -- telefon-yedek/<hesap>/<cihaz>/<tarih>-<tur>.json
  boyut bigint not null default 0,
  ozet jsonb not null default '{}',
  fotolar text[] not null default '{}'
);
alter table public.sa_telefon_yedek drop constraint if exists sa_telefon_yedek_hesap_id_user_id_cihaz_id_tarih_tur_key;
create unique index if not exists sa_telefon_yedek_gun on public.sa_telefon_yedek (hesap_id, user_id, cihaz_id, tarih, tur) where tur <> 'oncesi';  -- geri yükleme öncesi yedekler her seferinde ayrı
create index if not exists sa_telefon_yedek_hesap on public.sa_telefon_yedek (hesap_id, at desc);
alter table public.sa_telefon_yedek enable row level security;
drop policy if exists sa_telefon_yedek_oku on public.sa_telefon_yedek;
create policy sa_telefon_yedek_oku on public.sa_telefon_yedek for select to authenticated
  using (user_id = auth.uid() or public.sa_yedek_izin(hesap_id, 'kayit'));

create table if not exists public.sa_telefon_silinecek (yol text primary key, hesap_id uuid not null, at timestamptz not null default now());
alter table public.sa_telefon_silinecek enable row level security;

alter table public.sa_geri_yukleme add column if not exists telefon_yedek_id bigint, add column if not exists telefon_oncesi_id bigint;

-- Telefon verisinin hesabı: kendi arılığı varsa kendisi, yoksa üyesi olduğu arılığın Sahibi
create or replace function public.sa_telefon_hesap() returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select auth.uid() where exists (select 1 from public.apiaries where owner_id = auth.uid())),
    (select a.owner_id from public.apiary_members m join public.apiaries a on a.id = m.apiary_id where m.user_id = auth.uid() and a.owner_id is not null order by m.created_at limit 1),
    auth.uid());
$$;
grant execute on function public.sa_telefon_hesap() to authenticated;

create or replace function public.sa_telefon_yedek_kaydet(p_cihaz text, p_cihaz_ad text, p_tarih date, p_tur text, p_yol text, p_boyut bigint, p_ozet jsonb, p_fotolar text[], p_at timestamptz default now())
returns bigint language plpgsql security definer set search_path = public as $$
declare h uuid := public.sa_telefon_hesap(); yid bigint;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if split_part(p_yol, '/', 1) <> h::text then raise exception 'Yedek yolu hesapla uyuşmuyor' using errcode = '42501'; end if;
  insert into public.sa_telefon_yedek (hesap_id, email, cihaz_id, cihaz_ad, tarih, tur, at, yol, boyut, ozet, fotolar)
  values (h, coalesce(auth.jwt() ->> 'email', ''), left(p_cihaz, 64), left(p_cihaz_ad, 120), p_tarih, p_tur, least(coalesce(p_at, now()), now()), p_yol, coalesce(p_boyut, 0), coalesce(p_ozet, '{}'), coalesce(p_fotolar, '{}'))
  on conflict (hesap_id, user_id, cihaz_id, tarih, tur) where tur <> 'oncesi' do update set at = excluded.at, yol = excluded.yol, boyut = excluded.boyut, ozet = excluded.ozet, fotolar = excluded.fotolar, cihaz_ad = excluded.cihaz_ad
  returning id into yid;
  return yid;
end $$;
revoke all on function public.sa_telefon_yedek_kaydet(text, text, date, text, text, bigint, jsonb, text[], timestamptz) from public, anon;
grant execute on function public.sa_telefon_yedek_kaydet(text, text, date, text, text, bigint, jsonb, text[], timestamptz) to authenticated;

create or replace function public.sa_telefon_yedek_liste(p_hesap uuid default null) returns setof public.sa_telefon_yedek
language sql stable security definer set search_path = public as $$
  select * from public.sa_telefon_yedek y
  where (p_hesap is null or y.hesap_id = p_hesap) and (y.user_id = auth.uid() or public.sa_yedek_izin(y.hesap_id, 'kayit'))
  order by y.at desc limit 500;
$$;
grant execute on function public.sa_telefon_yedek_liste(uuid) to authenticated;

-- koloni-226: Telefon yedeğine geri yükleme kaydı (telefonda uygulanır; burada izin denetlenir, sa_geri_yukleme + sa_degisiklik'e yazılır)
create or replace function public.sa_telefon_geri_yukle_kaydet(p_yedek bigint, p_oncesi bigint, p_adet int) returns bigint
language plpgsql security definer set search_path = public as $$
declare y public.sa_telefon_yedek; yk bigint;
begin
  select * into y from public.sa_telefon_yedek where id = p_yedek;
  if y.id is null then raise exception 'Telefon yedeği bulunamadı'; end if;
  if not public.sa_yedek_izin(y.hesap_id, 'geri') then raise exception 'Geri yüklemeyi yalnız yönetici, Sahip veya «Geri alabilir» izni olan kişi yapar' using errcode = '42501'; end if;
  insert into public.sa_geri_yukleme (email, hesap_id, yedek_tarih, kapsam, adet, telefon_yedek_id, telefon_oncesi_id)
  values (coalesce(auth.jwt() ->> 'email', ''), y.hesap_id, y.tarih, 'Telefon: ' || coalesce(y.cihaz_ad, y.cihaz_id), p_adet, y.id, p_oncesi) returning id into yk;
  insert into public.sa_degisiklik (email, hesap_id, tablo, pk, islem, once, sonra)
  values (coalesce(auth.jwt() ->> 'email', ''), y.hesap_id, 'telefon_yedek', jsonb_build_object('id', y.id), 'geri_yukle',
    jsonb_build_object('oncesi_yedek', p_oncesi), jsonb_build_object('yedek', y.id, 'tarih', y.tarih, 'cihaz', coalesce(y.cihaz_ad, y.cihaz_id), 'adet', p_adet, 'geri_yukleme', yk));
  return yk;
end $$;
revoke all on function public.sa_telefon_geri_yukle_kaydet(bigint, bigint, int) from public, anon;
grant execute on function public.sa_telefon_geri_yukle_kaydet(bigint, bigint, int) to authenticated;

create or replace function public.sa_telefon_geri_al_kaydet(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare g public.sa_geri_yukleme;
begin
  select * into g from public.sa_geri_yukleme where id = p_id;
  if g.id is null or g.telefon_yedek_id is null then raise exception 'Telefon geri yüklemesi bulunamadı'; end if;
  if not public.sa_yedek_izin(g.hesap_id, 'geri') then raise exception 'Geri alma izniniz yok' using errcode = '42501'; end if;
  if g.geri_alindi_at is not null then raise exception 'Bu geri yükleme zaten geri alındı'; end if;
  update public.sa_geri_yukleme set geri_alindi_at = now() where id = p_id;
  insert into public.sa_degisiklik (email, hesap_id, tablo, pk, islem, once, sonra)
  values (coalesce(auth.jwt() ->> 'email', ''), g.hesap_id, 'telefon_yedek', jsonb_build_object('id', g.telefon_yedek_id), 'geri_al',
    jsonb_build_object('geri_yukleme', g.id), jsonb_build_object('oncesi_yedek', g.telefon_oncesi_id));
end $$;
revoke all on function public.sa_telefon_geri_al_kaydet(bigint) from public, anon;
grant execute on function public.sa_telefon_geri_al_kaydet(bigint) to authenticated;

-- Saklama: süresi dolan telefon yedekleri ve hiçbir yedekte kalmayan fotoğraflar silme kuyruğuna
create or replace function public.sa_telefon_yedek_temizle() returns int language plpgsql security definer set search_path = public as $$
declare ay public.sa_yedek_ayar; gun date := (now() at time zone 'Europe/Istanbul')::date; n int := 0;
begin
  select * into ay from public.sa_yedek_ayar where id = 1;
  with d as (
    delete from public.sa_telefon_yedek where tarih < gun - ay.gunluk_gun
      and not (tur = 'gunluk' and extract(day from tarih) = 1 and tarih >= (gun - make_interval(months => ay.aylik_ay))::date)
    returning yol, hesap_id)
  insert into public.sa_telefon_silinecek (yol, hesap_id) select yol, hesap_id from d on conflict do nothing;
  get diagnostics n = row_count;
  insert into public.sa_telefon_silinecek (yol, hesap_id)
  select o.name, (storage.foldername(o.name))[1]::uuid from storage.objects o
  where o.bucket_id = 'telefon-yedek' and (storage.foldername(o.name))[2] = 'foto' and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.sa_telefon_yedek y where y.hesap_id::text = (storage.foldername(o.name))[1]
                    and split_part(split_part(o.name, '/', 3), '.', 1) = any (y.fotolar))
  on conflict do nothing;
  return n;
end $$;
revoke all on function public.sa_telefon_yedek_temizle() from public, anon, authenticated;

-- Telefon / panel: silinecek nesne yolları (izinli olduğu hesaplar) ve silindi onayı
create or replace function public.sa_telefon_silinecekler() returns setof text language sql stable security definer set search_path = public as $$
  select yol from public.sa_telefon_silinecek s where public.sa_yedek_izin(s.hesap_id, 'geri') limit 500;
$$;
grant execute on function public.sa_telefon_silinecekler() to authenticated;
create or replace function public.sa_telefon_silindi(p_yollar text[]) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.sa_telefon_silinecek s where s.yol = any (p_yollar) and public.sa_yedek_izin(s.hesap_id, 'geri')
    and not exists (select 1 from storage.objects o where o.bucket_id = 'telefon-yedek' and o.name = s.yol);
  get diagnostics n = row_count; return n;
end $$;
grant execute on function public.sa_telefon_silindi(text[]) to authenticated;

-- Yönetici: saklama + telefon uyarı günü
drop function if exists public.sa_yedek_ayar_kaydet(int, int);
create or replace function public.sa_yedek_ayar_kaydet(p_gunluk int, p_aylik int, p_uyari int default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Saklama süresini yalnız yönetici değiştirir' using errcode = '42501'; end if;
  update public.sa_yedek_ayar set gunluk_gun = p_gunluk, aylik_ay = p_aylik, telefon_uyari_gun = coalesce(p_uyari, telefon_uyari_gun), updated_at = now() where id = 1;
end $$;
revoke all on function public.sa_yedek_ayar_kaydet(int, int, int) from public, anon;
grant execute on function public.sa_yedek_ayar_kaydet(int, int, int) to authenticated;

-- Storage: özel kova, yol <hesap>/<cihaz|foto>/…
insert into storage.buckets (id, name, public, file_size_limit) values ('telefon-yedek', 'telefon-yedek', false, 52428800)
  on conflict (id) do update set public = false, file_size_limit = 52428800;
drop policy if exists sa_ty_yaz on storage.objects;
create policy sa_ty_yaz on storage.objects for insert to authenticated
  with check (bucket_id = 'telefon-yedek' and (storage.foldername(name))[1] = public.sa_telefon_hesap()::text);
drop policy if exists sa_ty_guncelle on storage.objects;
create policy sa_ty_guncelle on storage.objects for update to authenticated
  using (bucket_id = 'telefon-yedek' and owner_id = auth.uid()::text)
  with check (bucket_id = 'telefon-yedek' and (storage.foldername(name))[1] = public.sa_telefon_hesap()::text);
drop policy if exists sa_ty_oku on storage.objects;
create policy sa_ty_oku on storage.objects for select to authenticated
  using (bucket_id = 'telefon-yedek' and (owner_id = auth.uid()::text or public.sa_yedek_izin(((storage.foldername(name))[1])::uuid, 'kayit')));
drop policy if exists sa_ty_sil on storage.objects;
create policy sa_ty_sil on storage.objects for delete to authenticated
  using (bucket_id = 'telefon-yedek' and exists (select 1 from public.sa_telefon_silinecek s where s.yol = name and public.sa_yedek_izin(s.hesap_id, 'geri')));

do $$ begin
  perform cron.unschedule('sa-telefon-yedek-temizle') where exists (select 1 from cron.job where jobname = 'sa-telefon-yedek-temizle');
  perform cron.schedule('sa-telefon-yedek-temizle', '15 0 * * *', 'select public.sa_telefon_yedek_temizle()');  -- 03:15 TSİ
end $$;
