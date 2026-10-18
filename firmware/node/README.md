# firmware — NODE (T-Weigh)

LilyGO T-Weigh · ESP32 · 868 MHz LoRa · 4× HX711

**Donanım kararı (koloni-243, 17.10.2026):** kovan başına 1 T-Weigh düğümü → LoRa EU868 → arılık başına **tek** gateway (T-Beam V1.2 + A7670E) → 4G. Sıcaklık/nem **SHT41** (DHT22 kaldırıldı; DHT22 ±0,5 °C eşek arısı kuralının 0,5 °C ani değişim sınırı için yetersizdi). Giriş sıcaklığı DS18B20. Mikrofon SPH0645 (≥ 32 kHz), ivmeölçer ADXL345. Güç 18650 + güneş isteğe bağlı (kapasite: Veri yok). Sürücüler taslak, cihazda test edilecek.

## sensör okuma

| modül | dosya |
|-------|--------|
| 4× tartı | `sensors/loadcells.cpp` |
| SHT41 (kovan içi sıcaklık + nem, I²C 0x44) | `sensors/sht41.cpp` · `sensors/sht41.h` |
| DS18B20 (giriş sıcaklığı, 1-Wire) | `sensors/ds18b20.cpp` |
| IR ×2 | `sensors/ir_counter.cpp` |
| ADXL345 | `sensors/adxl345.cpp` |
| mikrofon | `sensors/microphone.cpp` |

## gönderim

| mod | dosya | ne zaman |
|-----|--------|----------|
| WiFi test | `transport/wifi_test.cpp` | ev router — ilk test |
| LoRa | `transport/lora_send.cpp` | GATE takılınca |

## config (`config.h`)

- `TEMP_HUM_SENSOR_SHT41` / `SHT41_I2C_ADDR` (0x44) — kovan içi sıcaklık + nem
- `ENTRANCE_TEMP_DS18B20` — 1: giriş DS18B20 (varsayılan), 0: girişte ikinci SHT41 (ayrı I²C hattı)

- `HIVE_ID`
- `WIFI_SSID` / `WIFI_PASS` (test)
- `API_URL` — `http://192.168.x.x:3847/api/ingest`
- `INTERVAL_MS` / `WEIGHT_INTERVAL_MS` — 900000 (15 dk, tartı; Meikle 5–15 dk, uzman tahmini)
- `TEMP_HUM_INTERVAL_MS` — 1800000 (30 dk, sıcaklık+nem; uzman tahmini)
- Eşek arısı: tıslama veya titreşim artınca sıcaklık `ESEK_BURST_INTERVAL_MS` (~2 dk) ile `esekEslesDk` penceresi boyunca hızlı okunur (uzman tahmini; uygulamayla aynı mantık)
- `TEMP_HUM_INTERVAL_MS` artık yalnız kovan içi; `ENTRANCE_TEMP_INTERVAL_MS` — 1800000 (giriş sıcaklığı 30 dk; uzman tahmini; eşek burst bunu da hızlandırır)
- `OUTDOOR_TEMP_HUM_INTERVAL_MS` — 1800000 (dış hava 30 dk; uzman tahmini)
- `MIC_SPECTRUM_INTERVAL_MS` — 180000 (ses 3 dk ortalama spektrum; uzman tahmini). Mikrofon sürekli dinler.
- `VIB_SPECTRUM_INTERVAL_MS` — 180000 (titreşim 3 dk ortalama spektrum; Ramsey ve ark. 2020 Sci Rep 10:9798 sürekli kayıt + 3 dk ortalama). Gece 00–05 spektrumu oğul hazırlığı kuralı için şart.
- `IR_COUNT_INTERVAL_MS` — 300000 (5 dk; giren ve çıkan **ayrı** gönderilir; uzman tahmini; oğul çıktı 10 dk pencereye en az 2 dilim)
- `BATTERY_INTERVAL_MS` — 14400000 (pil 4 saat; uzman tahmini)
- `CAMERA_INTERVAL_MS` — 86400000 (kamera günde 1; uzman tahmini)
- Olay tabanlı (aralıktan bağımsız, olay anında gönder): piping / tooting / quacking, tıslama, dur sinyali, darbe, IR net çıkış (oğul çıktı).
- Bütün değerler uygulamada Yönetici › Ölçüm kuralları › «Okuma sıklığı» satırlarıyla aynıdır (`ogul_skor_ayar.sensor.okuma*Dk`). Cihaza ayar indirme yolu henüz yok (Yapılacaklar). Düşük pilde seyreltme yalnız kullanıcı «Onayla» deyince gelir.

PlatformIO + Arduino framework önerilir.
