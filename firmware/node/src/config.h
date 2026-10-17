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
