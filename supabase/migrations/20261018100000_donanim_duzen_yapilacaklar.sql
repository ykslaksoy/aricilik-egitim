-- SüperArı — koloni önizleme (onizleme/donanim-secim, 18.10.2026): donanım düzenleri için eksik firmware sürücüleri → Yapılacaklar.
-- CANLIYA UYGULANMADI: yayın onayından sonra uygulanacak. Tekrar çalıştırılabilir (aynı başlık varsa eklemez).

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: düğüm ana döngüsü (main.cpp) yok', 'firmware/node/src/main.cpp yalnız plan yorumu; hiçbir sürücü çağrılmıyor. Sensör okuma → LoRa gönderim döngüsü yazılmalı (önizleme: donanım düzenleri, 18.10.2026).'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: düğüm ana döngüsü (main.cpp) yok');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: SHT41 sürücüsü cihazda test edilmeli', 'sensors/sht41.cpp taslak (I²C 0x44, 0xFD/0x94, CRC-8 0x31); main.cpp çağırmıyor. Gerçek SHT41 ile okuma ve CRC doğrulanmalı. SHT40/43/45 (0x44) aynı sürücüyle okunur (Sensirion SHT4x datasheet V7.3).'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: SHT41 sürücüsü cihazda test edilmeli');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: DS18B20 okuma kodu', 'platformio.ini''de OneWire + DallasTemperature tanımlı; sensors/ds18b20.cpp yalnız yorum. Okuma kodu yazılmalı (MAX31820/DS18S20/DS1822 aynı kütüphaneyle desteklenir).'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: DS18B20 okuma kodu');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: HX711 ×4 tartı sürücüsü', 'sensors/loadcells.cpp yalnız «4× HX711» yorumu. T-Weigh üzerindeki 4 HX711 için okuma + dara/kalibrasyon yazılmalı.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: HX711 ×4 tartı sürücüsü');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: SPH0645 I2S mikrofon sürücüsü', 'sensors/microphone.cpp yalnız «ADC / I2S» yorumu. Ana düzen mikrofonu SPH0645LM4H için I2S okuma + spektrum yazılmalı.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: SPH0645 I2S mikrofon sürücüsü');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: ADXL345 titreşim sürücüsü', 'sensors/adxl345.cpp yalnız yorum. I²C okuma, FIFO ve spektrum yazılmalı.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: ADXL345 titreşim sürücüsü');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: IR giriş sayacı sürücüsü', 'sensors/ir_counter.cpp yalnız «GPIO interrupt» yorumu; verici/alıcı parçası da seçilmedi (Veri yok).'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: IR giriş sayacı sürücüsü');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: LoRa gönderim (düğüm) ve alım (gateway)', 'node/src/transport ve gate/src/lora_receive.cpp yalnız yorum. SX1262 EU868 gönderim/alım yazılmalı.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: LoRa gönderim (düğüm) ve alım (gateway)');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: A7670E 4G iletim (gateway)', 'gate/src/cellular_forward.cpp yalnız «A7670E HTTPS client» yorumu. /api/ingest''e HTTPS gönderim yazılmalı.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: A7670E 4G iletim (gateway)');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: gateway dış SHT41 okuma', 'gate/src/config.h OUTDOOR_TEMP_HUM_SHT41 tanımlı; gateway''de sürücü kodu yok (düğümdeki sht41.cpp paylaşılmalı).'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: gateway dış SHT41 okuma');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: Yedek düzen sürücüleri', 'Yedek düzen (taslak): ESP32-S3 kartı + ayrı LoRa + HX711, SHT31-DIS (16 bit komut 0x2400/0x30A2 — sht41.cpp ile okunmaz), INMP441 (I2S), ADXL355. duzen.h DUZEN=2 bu sürücüler yazılana kadar #error ile durur.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: Yedek düzen sürücüleri');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: arılık düzenini cihaza gönderme', 'Panelde düzen arılık bazında seçiliyor, ama arılık → gateway → düğüm yapılandırma iletimi yok; düzen şimdilik derleme bayrağıyla (DUZEN) seçiliyor.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: arılık düzenini cihaza gönderme');
