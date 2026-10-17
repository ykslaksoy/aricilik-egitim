# firmware — GATE (T-Beam + A7670E)

LoRa al → HTTPS POST → koloni API

| modül | dosya |
|-------|--------|
| LoRa RX | `lora_receive.cpp` |
| 4G forward | `cellular_forward.cpp` |

çalışınca NODE alır — WiFi testten sonra.

## config (`src/config.h`)

- `GATEWAY_UPLOAD_INTERVAL_MS` — 600000 (buluta gönderim 10 dk; uzman tahmini; uygulamada `okumaGatewayDk`). Acil olaylar (oğul çıktı, piping, tıslama, darbe, ani ağırlık düşüşü) beklemeden iletilir.
