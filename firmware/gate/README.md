# firmware — GATE (T-Beam + A7670E)

LoRa al → HTTPS POST → koloni API

**Arılık başına tek gateway** (koloni-243, kullanıcı kararı 17.10.2026): LilyGO T-Beam V1.2 + SIMCom A7670E (LTE Cat 1). Arılıktaki bütün kovan düğümleri (T-Weigh) bu gateway'e LoRa EU868 ile gönderir. Merkezi dış sıcaklık/nem SHT41 + radyasyon kalkanı gateway'e bağlanır. Uygulama › Cihazlar bir arılıkta birden fazla gateway ya da gateway'siz kovan cihazı görürse uyarır. LoRa menzili arazide doğrulanmalı.

| modül | dosya |
|-------|--------|
| LoRa RX | `lora_receive.cpp` |
| 4G forward | `cellular_forward.cpp` |

çalışınca NODE alır — WiFi testten sonra.

## config (`src/config.h`)

- `GATEWAY_APIARY_ID` — bağlı olduğu arılık (arılık başına 1)
- `OUTDOOR_TEMP_HUM_SHT41` — dış sıcaklık/nem SHT41

- `GATEWAY_UPLOAD_INTERVAL_MS` — 600000 (buluta gönderim 10 dk; uzman tahmini; uygulamada `okumaGatewayDk`). Acil olaylar (oğul çıktı, piping, tıslama, darbe, ani ağırlık düşüşü) beklemeden iletilir.
