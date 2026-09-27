# Not: Çevrimdışı uydu haritası (sonraya bırakıldı — 2026-09-27)

Uygulamada görünmez; yalnızca geliştirme notu (apps/web dışında, yayınlanmaz).

## Şu anki durum (koloni-37)
- Online: Yandex harita + güncel uydu (ücretsiz sürüm).
- Offline: indirilen bölge; OpenFreeMap yol haritası (net) + EOX Sentinel-2 2016 uydu (CC BY 4.0, 10 m, z14 sonrası bulanık).

## Araştırma özeti
- Yandex: ücretli JS API ~195.000 ₽/yıl; ücretli pakette uydu YOK. Ücretsiz sürüm kalıcı indirmeyi yasaklar (en çok 30 gün önbellek).
- Google: Map Tiles API ayda 100.000 parça ücretsiz, sonra ~$0,60/1000; önceden indirme/offline kullanım yasak; başka haritayla karıştırma yasak.
- Azure/Bing: önbellek yalnız gecikme için; bölge indirme uygun değil.
- MapTiler self-hosted: $2.500/yıl (≤500 kullanıcı, orta çözünürlük uydu); yüksek çözünürlük ek teklif.
- Esri (ArcGIS Location Platform): ayda 2M parça ücretsiz; offline bölge indirme yalnız native SDK'larda.
- Mapbox: offline bölge yalnız native mobil SDK'larda.
- EOX 2018+ sürümleri yalnız ticari olmayan kullanım (kullanıcı istemedi).

## Karar
Mağaza sürümüne (Capacitor/native) geçerken Esri veya MapTiler ile net çevrimdışı uyduyu yeniden değerlendir.
