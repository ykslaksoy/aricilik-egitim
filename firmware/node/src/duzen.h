// SüperArı — donanım düzeni → derleme bayrağıyla sürücü seçimi (koloni önizleme, 18.10.2026).
// TEST EDİLMEDİ: hiçbir kartta derlenip çalıştırılmadı. Mevcut firmware yeniden yazılmadı; bu dosyayı henüz hiçbir .cpp içermiyor.
// Panel: Yönetici → Donanım → «Donanım düzenleri». Düzen arılık bazında seçilir; cihaza otomatik gönderim (arılık → gateway → düğüm) YOK.
//   pio run -e t-weigh         → DUZEN=1 (Ana düzen)
//   pio run -e t-weigh-yedek   → DUZEN=2 (Yedek düzen) — ana düzenle aynı sürücüler, mikrofon INMP441
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
// Yedek düzen (taslak): ana düzenle aynı kart ve sürücüler (T-Weigh + SHT41 + DS18B20 + ADXL345 + IR); yalnız mikrofon INMP441.
// Kural (18.10.2026): alternatif yalnız AYNI yazılımla çalışıp aynı işi görürse. ESP32-S3 + ayrı LoRa + HX711, SHT31-DIS, ADXL355, DS1822 çıkarıldı.
#define TH_DRIVER_SHT4X 1
#define ENTRANCE_DRIVER_DALLAS 1
#define MIC_DRIVER_INMP441 1        /* sürücü yok — SPH0645 ile aynı I2S okuma kodu çalışır mı: uzman tahmini, doğrulanmalı */
#define VIB_DRIVER_ADXL345 1
#else
#error "Bilinmeyen DUZEN değeri (1 = Ana, 2 = Yedek)"
#endif
