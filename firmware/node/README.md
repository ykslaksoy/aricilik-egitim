# firmware — NODE (T-Weigh)

LilyGO T-Weigh · ESP32 · 868 MHz LoRa · 4× HX711

## sensör okuma

| modül | dosya |
|-------|--------|
| 4× tartı | `sensors/loadcells.cpp` |
| DHT22 | `sensors/dht22.cpp` |
| IR ×2 | `sensors/ir_counter.cpp` |
| ADXL345 | `sensors/adxl345.cpp` |
| mikrofon | `sensors/microphone.cpp` |

## gönderim

| mod | dosya | ne zaman |
|-----|--------|----------|
| WiFi test | `transport/wifi_test.cpp` | ev router — ilk test |
| LoRa | `transport/lora_send.cpp` | GATE takılınca |

## config (`config.h`)

- `HIVE_ID`
- `WIFI_SSID` / `WIFI_PASS` (test)
- `API_URL` — `http://192.168.x.x:3847/api/ingest`
- `INTERVAL_MS` / `WEIGHT_INTERVAL_MS` — 900000 (15 dk, tartı; Meikle 5–15 dk, uzman tahmini)
- `TEMP_HUM_INTERVAL_MS` — 1800000 (30 dk, sıcaklık+nem; uzman tahmini)
- Eşek arısı: tıslama veya titreşim artınca sıcaklık `ESEK_BURST_INTERVAL_MS` (~2 dk) ile `esekEslesDk` penceresi boyunca hızlı okunur (uzman tahmini; uygulamayla aynı mantık)

PlatformIO + Arduino framework önerilir.
