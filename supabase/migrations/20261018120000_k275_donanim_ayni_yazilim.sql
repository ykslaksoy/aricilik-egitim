-- SüperArı — koloni-275 Donanım: alternatif yalnız AYNI yazılımla çalışıp aynı işi görürse (kullanıcı kuralı 18.10.2026).
-- DS1822 (±2 °C, 44 °C giriş eşiği için zayıf), ADXL355 (ayrı sürücü), ESP32-S3 + ayrı LoRa + HX711 (yazılımı yok) çıkarıldı.
-- Yedek düzen artık ana düzenle aynı kart/sürücüler; yalnız mikrofon INMP441 (yazılım uyumu uzman tahmini). Tekrar çalıştırılabilir.
update public.yapilacaklar set aciklama = 'platformio.ini''de OneWire + DallasTemperature tanımlı; sensors/ds18b20.cpp yalnız yorum. Okuma kodu yazılmalı (MAX31820/DS18S20 aynı kütüphaneyle desteklenir).'
where baslik = 'Firmware: DS18B20 okuma kodu';

update public.yapilacaklar set aciklama = 'Yedek düzen (taslak): ana düzenle aynı kart ve sürücüler (T-Weigh, SHT41, DS18B20, ADXL345); yalnız mikrofon INMP441 (I2S). SPH0645 için yazılacak I2S kodunun INMP441''i de okuduğu cihazda doğrulanmalı (şu an uzman tahmini). duzen.h DUZEN=2 artık #error vermiyor.'
where baslik = 'Firmware: Yedek düzen sürücüleri';
