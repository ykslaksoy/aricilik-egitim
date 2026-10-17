// koloni-243: SHT41 (Sensirion) — kovan içi sıcaklık + nem (DHT22 yerine; kullanıcı kararı 17.10.2026).
#pragma once
#include <Arduino.h>
#include <Wire.h>

// Başlat: yumuşak sıfırlama (0x94). Yanıt yoksa false → uygulamada «Cihaz yok / Veri yok».
bool sht41Begin(TwoWire &bus, uint8_t addr);
// Yüksek hassasiyet ölçüm (0xFD, en çok ~8,3 ms). CRC hatası ya da yanıt yoksa false.
bool sht41Read(float *tempC, float *humidity);
