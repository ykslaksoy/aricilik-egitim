// koloni-242: GATE varsayılanları (uygulama ogul_skor_ayar.sensor.okumaGatewayDk ile aynı; panelden değişir)
#pragma once
#ifndef GATEWAY_UPLOAD_INTERVAL_MS
#define GATEWAY_UPLOAD_INTERVAL_MS 600000UL /* buluta toplu gönderim 10 dk (uzman tahmini; oğul çıktı IR penceresi kadar) */
#endif
// Acil olaylar (oğul çıktı, piping, tıslama, darbe, ani ağırlık düşüşü) bu aralığı beklemeden hemen iletilir.

// koloni-243: arılık başına TEK gateway (kullanıcı kararı 17.10.2026). Bu gateway arılıktaki tüm T-Weigh düğümlerini LoRa ile alır, 4G (A7670E) ile iletir.
#ifndef GATEWAY_APIARY_ID
#define GATEWAY_APIARY_ID 0                 /* bağlı olduğu arılık (kurulumda yazılır); uygulama aynı arılıkta 2. gateway'i uyarır */
#endif
#ifndef OUTDOOR_TEMP_HUM_SHT41
#define OUTDOOR_TEMP_HUM_SHT41 1            /* merkezi dış sıcaklık/nem: SHT41 + radyasyon kalkanı, gateway'e bağlı (../node/src/sensors/sht41.cpp ile aynı sürücü) */
#endif
