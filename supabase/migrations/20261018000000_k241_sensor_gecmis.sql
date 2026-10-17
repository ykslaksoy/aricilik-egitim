-- koloni-241: Sensör geçmişi — ham okumalar süresiz arşiv (yazılım geliştirme için), günlük özetler, saklama ayarları.
-- Telefon: ham okumalar IndexedDB'de hamSaklaGun (30) gün; gönderilmemişler silinmez. Sunucu: «sensor-ham» özel kovası
--   <hesap>/<arilik>/<YYYY-MM-DD TSİ>/<paket>.ndjson.gz (gzip NDJSON; tarayıcı sıkıştıramıyorsa .ndjson) + dizin tablosu sensor_ham_arsiv.
-- Günlük özetler: sensor_gunluk (kovan × gün), süresiz; yeni telefonda geri okunur. Erişim: hesabın kendisi, aynı hesabın arılık ekibi, yönetici.

-- Hesap ekibi: hesabın kendisi, hesabın arılıklarının üyeleri, yönetici
create or replace function public.sa_hesap_ekip(p_hesap uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.sa_is_admin() or p_hesap = auth.uid()
    or exists (select 1 from public.apiaries a join public.apiary_members m on m.apiary_id = a.id where a.owner_id = p_hesap and m.user_id = auth.uid());
$$;
revoke all on function public.sa_hesap_ekip(uuid) from public, anon;
grant execute on function public.sa_hesap_ekip(uuid) to authenticated;

-- 1) Ham arşiv dizini (paket başına bir satır). id = yedekte birincil anahtar.
create table if not exists public.sensor_ham_arsiv (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,   -- verinin hesabı (sa_telefon_hesap)
  user_id uuid not null default auth.uid(),                              -- yükleyen (telefon / ingest)
  arilik_id text,
  gun date not null,                                                     -- TSİ günü
  yol text not null unique,                                              -- sensor-ham kovasında nesne yolu
  okuma int not null default 0,
  bayt bigint not null default 0,                                        -- sıkıştırılmış boyut
  ham_bayt bigint not null default 0,                                    -- sıkıştırmasız NDJSON boyutu
  tipler text[] not null default '{}',
  kovanlar text[] not null default '{}',
  devre_disi int not null default 0,                                     -- devre dışı cihaz okumaları (arşivlenir, işaretli)
  bas timestamptz, bit timestamptz,
  sikistirma text not null default 'gzip',
  kaynak text not null default 'telefon' check (kaynak in ('telefon', 'ingest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sensor_ham_arsiv_hesap on public.sensor_ham_arsiv (owner_id, arilik_id, gun desc);
alter table public.sensor_ham_arsiv enable row level security;
drop policy if exists sensor_ham_arsiv_oku on public.sensor_ham_arsiv;
create policy sensor_ham_arsiv_oku on public.sensor_ham_arsiv for select to authenticated using (public.sa_hesap_ekip(owner_id));
revoke insert, update, delete on public.sensor_ham_arsiv from anon, authenticated;

create or replace function public.sa_sensor_ham_kaydet(p_yol text, p_arilik text, p_gun date, p_okuma int, p_bayt bigint, p_ham_bayt bigint, p_tipler text[], p_kovanlar text[],
  p_devre_disi int, p_bas timestamptz, p_bit timestamptz, p_sikistirma text, p_kaynak text default 'telefon')
returns bigint language plpgsql security definer set search_path = public as $$
declare h uuid := public.sa_telefon_hesap(); yid bigint;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if split_part(p_yol, '/', 1) <> h::text then raise exception 'Arşiv yolu hesapla uyuşmuyor' using errcode = '42501'; end if;
  insert into public.sensor_ham_arsiv (owner_id, arilik_id, gun, yol, okuma, bayt, ham_bayt, tipler, kovanlar, devre_disi, bas, bit, sikistirma, kaynak)
  values (h, left(p_arilik, 64), p_gun, p_yol, greatest(coalesce(p_okuma, 0), 0), greatest(coalesce(p_bayt, 0), 0), greatest(coalesce(p_ham_bayt, 0), 0),
    coalesce(p_tipler, '{}'), coalesce(p_kovanlar, '{}'), greatest(coalesce(p_devre_disi, 0), 0), p_bas, p_bit, coalesce(nullif(p_sikistirma, ''), 'gzip'),
    case when p_kaynak = 'ingest' then 'ingest' else 'telefon' end)
  on conflict (yol) do update set okuma = excluded.okuma, bayt = excluded.bayt, ham_bayt = excluded.ham_bayt, updated_at = now()
  returning id into yid;
  return yid;
end $$;
revoke all on function public.sa_sensor_ham_kaydet(text, text, date, int, bigint, bigint, text[], text[], int, timestamptz, timestamptz, text, text) from public, anon;
grant execute on function public.sa_sensor_ham_kaydet(text, text, date, int, bigint, bigint, text[], text[], int, timestamptz, timestamptz, text, text) to authenticated;

-- Özel kova: yazma yalnız kendi hesap klasörüne; okuma hesap ekibi + yönetici; güncelleme/silme yok (süresiz saklama).
insert into storage.buckets (id, name, public, file_size_limit) values ('sensor-ham', 'sensor-ham', false, 52428800)
  on conflict (id) do update set public = false, file_size_limit = 52428800;
drop policy if exists sa_sh_yaz on storage.objects;
create policy sa_sh_yaz on storage.objects for insert to authenticated
  with check (bucket_id = 'sensor-ham' and (storage.foldername(name))[1] = public.sa_telefon_hesap()::text);
drop policy if exists sa_sh_oku on storage.objects;
create policy sa_sh_oku on storage.objects for select to authenticated
  using (bucket_id = 'sensor-ham' and public.sa_hesap_ekip(((storage.foldername(name))[1])::uuid));

-- 2) Günlük özetler (kovan × gün). key = kovan_id|gun (yedekte birincil anahtar), owner_id = hesap.
create table if not exists public.sensor_gunluk (
  owner_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  kovan_id text not null,
  arilik_id text,
  gun date not null,
  ozet jsonb not null default '{}',
  tam boolean not null default false,                                    -- gün bitti mi (bugün kısmi)
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, key)
);
create index if not exists sensor_gunluk_gun on public.sensor_gunluk (owner_id, gun);
create index if not exists sensor_gunluk_arilik on public.sensor_gunluk (owner_id, arilik_id, gun);
alter table public.sensor_gunluk enable row level security;
drop policy if exists sensor_gunluk_oku on public.sensor_gunluk;
create policy sensor_gunluk_oku on public.sensor_gunluk for select to authenticated using (public.sa_hesap_ekip(owner_id));
revoke insert, update, delete on public.sensor_gunluk from anon, authenticated;

create or replace function public.sa_sensor_gunluk_yaz(p_satirlar jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare h uuid := public.sa_telefon_hesap(); n int := 0; r jsonb;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if jsonb_typeof(p_satirlar) <> 'array' or jsonb_array_length(p_satirlar) > 500 then raise exception 'En çok 500 satır'; end if;
  for r in select * from jsonb_array_elements(p_satirlar) loop
    continue when coalesce(r->>'kovan_id', '') = '' or coalesce(r->>'gun', '') !~ '^\d{4}-\d{2}-\d{2}$';
    insert into public.sensor_gunluk (owner_id, key, kovan_id, arilik_id, gun, ozet, tam)
    values (h, left(r->>'kovan_id', 64) || '|' || (r->>'gun'), left(r->>'kovan_id', 64), left(r->>'arilik_id', 64), (r->>'gun')::date,
      coalesce(case when jsonb_typeof(r->'ozet') = 'object' then r->'ozet' end, '{}'), coalesce((r->>'tam')::boolean, false))
    on conflict (owner_id, key) do update set ozet = excluded.ozet, tam = excluded.tam, arilik_id = coalesce(excluded.arilik_id, public.sensor_gunluk.arilik_id), user_id = auth.uid(), updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.sa_sensor_gunluk_yaz(jsonb) from public, anon;
grant execute on function public.sa_sensor_gunluk_yaz(jsonb) to authenticated;

-- 3) Yönetici: arılık başına arşiv boyutu / paket / okuma, özet günleri
create or replace function public.sa_admin_sensor_arsiv() returns table (owner_id uuid, email text, arilik_id text, arilik_ad text, paket bigint, okuma bigint, bayt bigint, ham_bayt bigint,
  ilk_gun date, son_gun date, son_yukleme timestamptz, devre_disi bigint, ozet_gun bigint)
language sql stable security definer set search_path = public as $$
  with a as (
    select s.owner_id, s.arilik_id, count(*) paket, sum(s.okuma) okuma, sum(s.bayt) bayt, sum(s.ham_bayt) ham_bayt, min(s.gun) ilk_gun, max(s.gun) son_gun, max(s.created_at) son_yukleme, sum(s.devre_disi) devre_disi
    from public.sensor_ham_arsiv s group by s.owner_id, s.arilik_id
  ), o as (select g.owner_id, g.arilik_id, count(*) ozet_gun from public.sensor_gunluk g group by g.owner_id, g.arilik_id)
  select coalesce(a.owner_id, o.owner_id), p.email, coalesce(a.arilik_id, o.arilik_id),
    (select ap.name from public.apiaries ap where (ap.id::text = coalesce(a.arilik_id, o.arilik_id) or ap.local_id = coalesce(a.arilik_id, o.arilik_id)) and ap.owner_id = coalesce(a.owner_id, o.owner_id) limit 1),
    coalesce(a.paket, 0), coalesce(a.okuma, 0), coalesce(a.bayt, 0), coalesce(a.ham_bayt, 0), a.ilk_gun, a.son_gun, a.son_yukleme, coalesce(a.devre_disi, 0), coalesce(o.ozet_gun, 0)
  from a full join o on o.owner_id = a.owner_id and o.arilik_id is not distinct from a.arilik_id
  left join public.profiles p on p.id = coalesce(a.owner_id, o.owner_id)
  where public.sa_is_admin()
  order by coalesce(a.bayt, 0) desc;
$$;
revoke all on function public.sa_admin_sensor_arsiv() from public, anon;
grant execute on function public.sa_admin_sensor_arsiv() to authenticated;

-- 4) Sunucu yedeğine sensor_gunluk + arşiv dizini (ham okumalar zaten kovada süresiz; yedeğe dosyalar değil dizin girer)
create or replace function public.sa_yedek_tablolar() returns text[] language sql immutable as $$
  select array['apiaries', 'hives', 'queens', 'records', 'tasks', 'stock_items', 'photos', 'cihaz_devre_disi', 'cihaz_aralik', 'sensor_gunluk', 'sensor_ham_arsiv'];
$$;
create or replace function public.sa_yedek_pk(t text) returns text language sql immutable as $$
  select case t when 'apiaries' then 'id' when 'cihaz_devre_disi' then 'device_id' when 'cihaz_aralik' then 'device_id' when 'sensor_ham_arsiv' then 'id' else 'key' end;
$$;
create or replace function public.sa_yedek_sahip(t text) returns text language sql immutable as $$
  select case t when 'cihaz_devre_disi' then 'user_id' when 'cihaz_aralik' then 'user_id' else 'owner_id' end;
$$;

-- 5) Saklama ayarları (uzman tahmini; yönetici panelinden değişir)
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('hamSaklaGun', 30, 'hiveSensGun', 21, 'ozetSaklaGun', 400) || coalesce(data->'sensor', '{}'::jsonb)), updated_at = now()
where id = 1;

insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Sensör geçmişi: saklama süreleri (uzman tahmini)', 'Telefonda ham okuma 30 gün, kural penceresi 21 gün, günlük özet 400 gün — uzman tahmini. Ham okumalar sunucuda (sensor-ham kovası) ve günlük özetler (sensor_gunluk) süresiz. Gerçek cihaz yoğunluğuyla telefon belleği / IndexedDB boyutu ölçülmeli.'),
 ('Cihaz → uygulama yolu eksik', 'POST /api/ingest yalnız sunucu arşivine yazar (kullanıcı oturum anahtarıyla, sensor-ham + sensor_ham_arsiv). Telefonun bu okumaları sunucudan çekip kurallara vermesi ve cihaza özel anahtar (device token) yok; gateway şimdilik telefona doğrudan (sensorGiris) vermeli. ESP32 darbe gücü (g), ötme türü (sinif), giren/çıkan ayrı ve yer alanlarını göndermeli.'),
 ('Sensör günlük özet alanları doğrulanmalı', 'Gece 00–05 titreşim ortancası, gün ortancası, IR günlük giren/çıkan, sabah tartı düşüşü, min/maks sıcaklık-nem, ötme/vakvak/dur sinyali sayıları gerçek cihaz verisiyle doğrulanmalı. Özetler kural ayarı değişince eski günler için yeniden hesaplanmaz (ham sunucuda).'),
 ('Ham arşivden geliştirme veri seti', 'sensor-ham kovasındaki gzip NDJSON paketlerini (arılık/gün) birleştirip model/kural geliştirme için dışa aktaran araç yazılmalı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);
