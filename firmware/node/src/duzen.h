// SüperArı — donanım düzeni → derleme bayrağıyla sürücü seçimi (koloni önizleme, 18.10.2026).
// TEST EDİLMEDİ: hiçbir kartta derlenip çalıştırılmadı. Mevcut firmware yeniden yazılmadı; bu dosyayı henüz hiçbir .cpp içermiyor.
// Panel: Yönetici → Donanım → «Donanım düzenleri». Düzen arılık bazında seçilir; cihaza otomatik gönderim (arılık → gateway → düğüm) YOK.
//   pio run -e t-weigh         → DUZEN=1 (Ana düzen)
//   pio run -e t-weigh-yedek   → DUZEN=2 (Yedek düzen) — sürücüler yazılmadığı için bilerek #error ile durur
#pragma once

#ifndef DUZEN
#define DUZEN 1
#endif

#if DUZEN == 1
// Ana düzen: T-Weigh + SHT41 (iç) + DS18B20 (giriş) + SPH0645 + ADXL345 + IR; gateway T-Beam V1.2 + A7670E.
#define TH_DRIVER_SHT4X 1           /* sensors/sht41.cpp — taslak; SHT40/43/45 (0x44) aynı komut setiyle okunur */
#define ENTRANCE_DRIVER_DALLAS 1    /* OneWire + DallasTemperature — okuma kodu yok (ds18b20.cpp yalnız yorum) */
#define MIC_DRIVER_SPH0645 1        /* sürücü yok — Yapılacaklar */
#define VIB_DRIVER_ADXL345 1        /* sürücü yok — Yapılacaklar */
#elif DUZEN == 2
// Yedek düzen (taslak): ESP32-S3 + ayrı LoRa + HX711, SHT31-DIS, INMP441, ADXL355.
// SHT31-DIS 16 bit komut kullanır (0x2400 ölçüm, 0x30A2 sıfırlama); sht41.cpp ile OKUNMAZ.
#error "DUZEN=2 (Yedek düzen): SHT31-DIS, INMP441, ADXL355 ve ESP32-S3 kartı için sürücü yok — Yapılacaklar listesine bakın"
#else
#error "Bilinmeyen DUZEN değeri (1 = Ana, 2 = Yedek)"
#endif
