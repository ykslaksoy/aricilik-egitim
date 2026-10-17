// hiveId, wifi, api url, interval
#define HIVE_ID 1
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
