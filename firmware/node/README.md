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
- `INTERVAL_MS` — 900000 (15 dk)

PlatformIO + Arduino framework önerilir.
