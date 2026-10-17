// hiveId, wifi, api url, interval
#define HIVE_ID 1

// koloni-243: donanım kararı (17.10.2026) — kovan içi sıcaklık/nem SHT41 (DHT22 kaldırıldı), giriş DS18B20.
// Düğüm LoRa ile arılığın TEK gateway'ine gönderir (arılık başına 1 gateway; T-Beam V1.2 + A7670E → 4G).
#define TEMP_HUM_SENSOR_SHT41 1
#ifndef SHT41_I2C_ADDR
#define SHT41_I2C_ADDR 0x44           /* SHT41-AD1B varsayılan adres */
#endif
#ifndef ENTRANCE_TEMP_DS18B20
#define ENTRANCE_TEMP_DS18B20 1       /* giriş sıcaklığı: DS18B20 1-Wire (öneri korundu); 0 → girişte ikinci SHT41 (ayrı I²C hattı) */
#endif
// Pinler: hardware/wiring/node-pinout.md (T-Weigh pinout PDF işlenince doldurulacak)
// #define WIFI_SSID "..."
// #define API_URL "http://192.168.1.10:3847/api/ingest"

// koloni-236: varsayılan okuma sıklıkları (uzman tahmini; uygulama ogul_skor_ayar.sensor ile aynı)
#ifndef WEIGHT_INTERVAL_MS
#define WEIGHT_INTERVAL_MS 900000UL   /* tartı 15 dk · Meikle 5–15 */
#endif
#ifndef TEMP_HUM_INTERVAL_MS
#define TEMP_HUM_INTERVAL_MS 1800000UL /* sıcaklık+nem 30 dk */
#endif
#ifndef ESEK_BURST_INTERVAL_MS
#define ESEK_BURST_INTERVAL_MS 120000UL /* tıslama/titreşim sonrası hızlı sıcaklık ~2 dk */
#endif
#ifndef INTERVAL_MS
#define INTERVAL_MS WEIGHT_INTERVAL_MS /* geriye uyum: genel döngü = tartı */
#endif

// koloni-242: diğer sensörlerin varsayılan okuma sıklıkları (uygulama ogul_skor_ayar.sensor okuma*Dk ile aynı; panelden değişir)
#ifndef MIC_SPECTRUM_INTERVAL_MS
#define MIC_SPECTRUM_INTERVAL_MS 180000UL   /* ses: 3 dk ortalama spektrum (uzman tahmini); dinleme sürekli */
#endif
#ifndef VIB_SPECTRUM_INTERVAL_MS
#define VIB_SPECTRUM_INTERVAL_MS 180000UL   /* titreşim: 3 dk ortalama spektrum · Ramsey 2020 (sürekli kayıt; gece 00–05 şart) */
#endif
#ifndef IR_COUNT_INTERVAL_MS
#define IR_COUNT_INTERVAL_MS 300000UL       /* IR: 5 dk giren / çıkan AYRI sayım (uzman tahmini; oğul çıktı 10 dk ≥ 2 dilim) */
#endif
#ifndef ENTRANCE_TEMP_INTERVAL_MS
#define ENTRANCE_TEMP_INTERVAL_MS 1800000UL /* giriş sıcaklığı 30 dk (uzman tahmini); eşek burst bunu da hızlandırır */
#endif
#ifndef OUTDOOR_TEMP_HUM_INTERVAL_MS
#define OUTDOOR_TEMP_HUM_INTERVAL_MS 1800000UL /* dış hava 30 dk (uzman tahmini) */
#endif
#ifndef BATTERY_INTERVAL_MS
#define BATTERY_INTERVAL_MS 14400000UL      /* pil 4 saat (uzman tahmini) */
#endif
#ifndef CAMERA_INTERVAL_MS
#define CAMERA_INTERVAL_MS 86400000UL       /* kamera: günde 1 fotoğraf (uzman tahmini) */
#endif
// Olay tabanlı (aralıktan bağımsız, olay anında gönder): piping/tooting/quacking, tıslama, dur sinyali (whooping), darbe,
// IR net çıkış ≥ ogulCiktiNet / ogulCiktiDk (oğul çıktı). Düşük pil seyreltmesi yalnız uygulamada «Onayla» sonrası gelir.
