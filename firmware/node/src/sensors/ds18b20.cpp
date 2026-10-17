// koloni-243: DS18B20 su geçirmez prob — GİRİŞ sıcaklığı (eşek arısı top yapma > 44 °C). Taslak, cihazda test edilecek.
// 1-Wire, ±0,5 °C (−10…+85 °C), 12 bit dönüşüm ~750 ms. Kütüphane: OneWire + DallasTemperature (platformio.ini lib_deps).
// Gönderimde konum = "giris" işaretlenmeli (uygulama giriş sıcaklığını kovan içinden ayırır).
// Alternatif: girişte de SHT41 (aynı sht41.cpp) — iç SHT41 ile aynı adres 0x44 olduğundan ayrı I²C hattı gerekir.
