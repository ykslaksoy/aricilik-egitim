// koloni-242: GATE varsayılanları (uygulama ogul_skor_ayar.sensor.okumaGatewayDk ile aynı; panelden değişir)
#pragma once
#ifndef GATEWAY_UPLOAD_INTERVAL_MS
#define GATEWAY_UPLOAD_INTERVAL_MS 600000UL /* buluta toplu gönderim 10 dk (uzman tahmini; oğul çıktı IR penceresi kadar) */
#endif
// Acil olaylar (oğul çıktı, piping, tıslama, darbe, ani ağırlık düşüşü) bu aralığı beklemeden hemen iletilir.
