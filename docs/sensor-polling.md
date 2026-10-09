# Sensör ölçüm sıklığı ve saklama

## Rakip / sektör varsayımları

| Kaynak | Tartı (ağırlık) | Sıcaklık / nem | Not |
|--------|-----------------|----------------|-----|
| BroodMinder W3–W5 | Varsayılan **1 saat**; isteğe **15 dk** / **5 dk** | TH sensörleri genelde daha sık (BLE hub) | WeightMinder: ±2 kg değişimde 30 dk’ya sıklaşır |
| Arnia (eski gateway) | Gateway **günde bir** uplink | Kovan içi prob + ses | Sensör örnekleme sıklığı dokümanda ayrı değil |
| Arnia bScale | **Günde 4** tartım | — | Ticari ölçek |
| BeeWise | Kamusal dokümantasyon yok | — | SüperArı tartı varsayılanı BroodMinder ile hizalı |

SüperArı istemci zamanlayıcısı bu tabloya göre **varsayılan aralıkları** seçer; kullanıcı Cihazlar ekranından cihaz bazında değiştirebilir.

## Varsayılan ölçüm aralıkları (istemci)

| Cihaz tipi | Varsayılan | Seçilebilir (UI) |
|------------|------------|------------------|
| Tartı (`tarti`) | 1 saat | 1 / 4 / 12 / 24 saat |
| Sıcaklık/nem (`isi_nem`) | 15 dk | 15 dk, 1 / 4 / 12 / 24 saat |
| Ses (`ses`) | 1 saat | 1 / 4 / 12 / 24 saat |
| Titreşim (`titresim`) | 30 dk | 30 dk, 1 / 4 / 12 / 24 saat |
| IR (`ir`) | 4 saat | 1 / 4 / 12 / 24 saat |

Yapılandırma: `localStorage` anahtarı `superari.sensor.polling.v1` (`byDevice`, `byApiary`, `defaults`).

## Saklama (~6 ay)

- **Süre:** 183 gün (`RETENTION_DAYS`).
- **Yöntem:** Okuma listelerinde `at` alanına göre budama; her yazımda da uygulanır.
- **Depo anahtarları:** `superari.sensor.tarti.v1`, `superari.sensor.isi_nem.v1`, `superari.sensor.ses.v1`, `superari.sensor.titresim.v1`, `superari.sensor.ir.v1`.
- **Kayıt şeması:** `{ hiveId, deviceId?, at, type, kg|tempC|rh|level|count, demo? }`.

### Yaklaşık üst sınır (tek kovan, tek cihaz)

| Aralık | ~6 ayda nokta |
|--------|----------------|
| 15 dk | 17 520 |
| 30 dk | 8 760 |
| 1 saat | 4 392 |
| 4 saat | 1 098 |
| 12 saat | 366 |
| 24 saat | 183 |

## Çalışma modu

- **Canlı:** Gerçek okumalar entegrasyonla push edilir; zamanlayıcı **saklama budaması** ve arka plan tetiklerini yapar (uydurma veri üretmez).
- **Demo:** Bağlı cihazlar için aynı aralıkta **örnek okuma** üretilir (`demo: true`).
- **Service worker:** `periodicsync` / `sync` etiketi `superari-sensor-poll` → açık sayfalara `sensor-poll` mesajı.

Kod: `apps/web/sensor-polling.js`.
