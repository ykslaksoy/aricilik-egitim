-- koloni-184 (1): arilik_cevre çift kayıt (bulut kimliği + yerel a1…a5) → tek kanonik kayıt = apiaries.id (tetikleyici bu kimliği kuyruğa yazar).
-- Veri kaybı yok: silinen yerel kimlikli satırlar arilik_cevre_yedek tablosuna kopyalanır; bulut satırı yoksa yerel satır bulut kimliğine taşınır.
create table if not exists public.arilik_cevre_yedek (like public.arilik_cevre);
alter table public.arilik_cevre_yedek add column if not exists yedeklendi timestamptz default now();
alter table public.arilik_cevre_yedek enable row level security;
revoke all on public.arilik_cevre_yedek from anon, authenticated;

insert into public.arilik_cevre_yedek
select c.*, now() from public.arilik_cevre c join public.apiaries a on a.local_id = c.arilik_id and a.id::text <> c.arilik_id;

-- bulut satırı yoksa yerel satırı bulut kimliğine taşı
update public.arilik_cevre c set arilik_id = a.id::text
from public.apiaries a
where a.local_id = c.arilik_id and a.id::text <> c.arilik_id
  and not exists (select 1 from public.arilik_cevre k where k.arilik_id = a.id::text);
-- bulut satırı varsa: bulutta boş kalan alanı yerelden doldur, sonra yereli sil
update public.arilik_cevre k set
  rakim_m = coalesce(k.rakim_m, c.rakim_m), ortu = coalesce(k.ortu, c.ortu), toplama_alani_guvenli = coalesce(k.toplama_alani_guvenli, c.toplama_alani_guvenli)
from public.arilik_cevre c join public.apiaries a on a.local_id = c.arilik_id
where k.arilik_id = a.id::text and c.arilik_id <> k.arilik_id;
delete from public.arilik_cevre c using public.apiaries a where a.local_id = c.arilik_id and a.id::text <> c.arilik_id;
-- kuyrukta yerel kimlikli işler (tamamlanmış) kaldırılır; açık olanlar bulut kimliğiyle yeniden kurulur (aşağıda)
delete from public.cevre_kuyruk q using public.apiaries a where q.hedef_tur = 'arilik' and q.hedef_id = a.local_id and a.id::text <> q.hedef_id;

-- koloni-184 (2): Yanıkdağ eski 240 m (onaysız, tarayıcıda sabit yazılmış) — arılık kaydından kaldırılır; uygulama sunucu değerini (arilik_cevre) gösterir.
update public.apiaries set data = data - 'waterDistanceM' - 'waterSourceId' - 'waterSourceType' - 'waterSourceLabel'
where coalesce(data->>'waterSourceConfirmedAt', '') = '' and (data->>'waterDistanceM') = '240' and local_id = 'a4';

-- koloni-184 (3): su sorgusuna deniz kıyısı + göl/baraj çokgen ilişkileri eklendi → eski önbellek geçersiz, tüm arılıklar yeniden hesaplanır.
-- Mevcut mesafe yeni sonuç gelene kadar korunur (gerçek OSM sonucu; uydurma değil). Kuyruk hata verirse üstel bekleme ile yeniden dener.
delete from public.su_onbellek;
insert into public.cevre_kuyruk (hedef_tur, hedef_id, lat, lon, durum, deneme, sonraki)
select 'arilik', a.id::text, (a.data->>'lat')::double precision, (a.data->>'lon')::double precision, 'bekliyor', 0, now()
from public.apiaries a
where not coalesce(a.deleted, false) and nullif(a.data->>'lat', '') is not null and nullif(a.data->>'lon', '') is not null
on conflict (hedef_tur, hedef_id) where durum in ('bekliyor','isleniyor','hata')
do update set lat = excluded.lat, lon = excluded.lon, durum = 'bekliyor', deneme = 0, sonraki = now(), hata = null;

-- koloni-184 (4): foraj yarıçapındaki yerleşim yoğunluğu gerçek veri değil → Yapılacaklar
insert into public.yapilacaklar (baslik, aciklama)
select 'Foraj yerleşim yoğunluğu', 'Uzman tahmini · kaynak aranıyor'
where not exists (select 1 from public.yapilacaklar where baslik = 'Foraj yerleşim yoğunluğu');
