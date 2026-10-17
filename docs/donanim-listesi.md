# SüperArı — Donanım listesi (taslak – kullanıcı onayı bekliyor)

Sürüm 1 · koloni-238 · 17.10.2026 (TSİ). Yönetici paneli › Donanım bölümünde düzenlenir. Doğrulanamayan özellik = «Veri yok».


## 1. Kovan düğümü (mikrodenetleyici kartı)

- **Görevi:** Kovandaki sensörleri okur, ölçüm aralığına göre gönderir (LoRa / Wi‑Fi).
- **Cihaz tipi:** —
- **Aday parçalar:** LilyGO T-Weigh (repo firmware/node hedefi: ESP32, 4× HX711, SX1262 LoRa EU868, Wi‑Fi b/g/n, BLE 4.2, 4 MB flash, 5–12 V DC, I2S/I2C/SPI) · alternatif ESP32-S3 kartı (çift çekirdek LX7, 240 MHz, Wi‑Fi b/g/n + BLE 5)
- **Kuralların gerektirdiği özellik:** I2S (mikrofon), I2C/SPI (ivmeölçer, sıcaklık/nem), 4 kanal tartı girişi, 2 kesme girişi (IR), derin uyku; ESP32-S3 kartında LoRa yok → ayrı modül gerekir
- **Bağlı kurallar:** Tüm sensör kuralları
- **Kaynak:** lilygo.cc/products/t-weigh · Espressif ESP32-S3 datasheet
- **Fiyat:** T-Weigh 20,88 USD (lilygo.cc, 17.10.2026)
- **Durum:** taslak – kullanıcı onayı bekliyor

## 2. Kovan içi sıcaklık / nem

- **Görevi:** Kuluçka sıcaklığı, nem, yoğuşma, havalandırma, oğul öncesi sıcaklık, eşek arısı ani değişimi.
- **Cihaz tipi:** isi_nem
- **Aday parçalar:** Sensirion SHT41 (±0,2 °C tip., ±1,8 %RH tip., 1,08–3,6 V, I²C, −40…125 °C) · SHT31-DIS (±0,2 °C tip., ±2 %RH tip., 2,4–5,5 V, I²C) · repo şu an DHT22 (±0,5 °C, ±2 %RH, en az 2 s okuma) · yalnız sıcaklık için DS18B20 (±0,5 °C −10…+85 °C, 12 bit 750 ms)
- **Kuralların gerektirdiği özellik:** Çözünürlük ≤0,1 °C ve doğruluk ≈±0,2 °C (eşek arısı kuralı 0,5 °C ani değişim arar; DHT22 ±0,5 °C sınırda); okuma 30 dk (eşek arısı yolu için olay anında daha sık – Veri yok)
- **Bağlı kurallar:** Koloni sönmüş, yavrusuz/anasız, havalandırma/yoğuşma, oğul öncesi sıcaklık, eşek arısı (sıcaklık değişimi)
- **Kaynak:** sensirion.com SHT41 / SHT31-DIS-B · DHT22 datasheet · DS18B20 datasheet
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 3. Giriş sıcaklık sensörü

- **Görevi:** Kovan girişinde 44 °C üstü (eşek arısı top yapma) kontrolü.
- **Cihaz tipi:** isi_nem (giriş)
- **Aday parçalar:** DS18B20 su geçirmez prob (±0,5 °C, −55…+125 °C ölçüm aralığı) · SHT41
- **Kuralların gerektirdiği özellik:** Girişte ölçtüğünün kayıtta işaretlenmesi (konum=giriş) — şu an kaydedilmiyor
- **Bağlı kurallar:** Eşek arısı (giriş > 44 °C kritik)
- **Kaynak:** DS18B20 datasheet
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 4. Merkezi (dış) ısı / nem

- **Görevi:** Dış hava; uçuşa uygun gün, beklenen aktivite modeli, yoğuşma farkı.
- **Cihaz tipi:** dis_isi_nem
- **Aday parçalar:** SHT41 / SHT31 + radyasyon kalkanı (kalkan modeli: Veri yok)
- **Kuralların gerektirdiği özellik:** 30 dk okuma; güneşten korumalı
- **Bağlı kurallar:** Beklenenden düşük aktivite, koloni sönmüş (dış ≥ 6 °C), yoğuşma, eşek arısı IR yolu (uygun uçuş günü)
- **Kaynak:** sensirion.com
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 5. Tartı (yük hücreleri + ADC)

- **Görevi:** Ağırlık; bal akımı, tarlacı kaybı, ani kayıp/oğul, hırsızlık/devrilme, kış stoku.
- **Cihaz tipi:** tarti
- **Aday parçalar:** HX711 (24 bit Σ∆, 10 veya 80 SPS, kazanç 128/64/32) ×4 (T-Weigh üzerinde) + 4 köşe yük hücresi (model/kapasite: Veri yok) · platform: hardware/platform
- **Kuralların gerektirdiği özellik:** 15 dk okuma; ≤0,1 kg çözünürlük (tarlacı kuralı tarlaciMinKg 0,1 kg); 1 kg ani düşüş (oğul çıktı doğrulama), 3 kg/6 saat ani kayıp
- **Bağlı kurallar:** Tarlacı kaybı, oğul çıktı (doğrulama), ani kayıp, koloni sönmüş, bal akımı/taşıma planı
- **Kaynak:** HX711 datasheet (Avia) · lilygo.cc T-Weigh
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 6. Mikrofon

- **Görevi:** Oğul öncesi ses, ana ötmesi, rahatsızlık, eşek arısı tıslaması.
- **Cihaz tipi:** ses
- **Aday parçalar:** Knowles SPH0645LM4H (I2S, saat 2,048–4,096 MHz → 32–64 kHz örnekleme, SNR 65 dB(A)) · TDK INMP441 (I2S 24 bit, düz yanıt 60 Hz–15 kHz, SNR 61 dBA)
- **Kuralların gerektirdiği özellik:** Örnekleme ≥ 32 kHz (eşek arısı tıslaması 4,5–7,3 kHz, esekMinOrneklemeHz 32000); 100 Hz altı (110 Hz bandı) için INMP441 alt kesimi 60 Hz — sınırda; cihaz örnekleme hızını (sr) göndermeli; ham ses LoRa'ya gitmez, kovanda özet çıkarılır
- **Bağlı kurallar:** Oğul öncesi (110 Hz, 300 Hz), ana ötmesi (400–500 Hz), rahatsızlık (300–450 Hz), eşek arısı tıslaması
- **Kaynak:** SPH0645LM4H datasheet (Knowles) · INMP441 datasheet (TDK InvenSense)
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 7. İvmeölçer (titreşim)

- **Görevi:** Gece titreşimi (oğul hazırlığı), ana ötmesi, darbe/rahatsızlık, kış hareketsizliği.
- **Cihaz tipi:** titresim
- **Aday parçalar:** ADXL345 (repo şu an; ODR en çok 3200 Hz → bant ≈1600 Hz; ±2–16 g; 4 mg/LSB; I²C/SPI; 32 FIFO) · ST LIS3DH (ODR 1 Hz–5,3 kHz, ±2–16 g, 16 bit, FIFO 32) · ADXL355 (gürültü 22,5 µg/√Hz, ±2/4/8 g, 20 bit; ODR: Veri yok)
- **Kuralların gerektirdiği özellik:** Analiz bandı 20–800 Hz (titOgulHz) → örnekleme ≥ 2 kHz (ADXL345 3,2 kHz ile yeterli ama sınıra yakın); darbe için ≥2 g aralık; kovan çerçevesine sabit montaj; cihaz darbe gücünü (g) ve ötme türünü göndermeli — şu an göndermiyor
- **Bağlı kurallar:** Oğul hazırlığı (titreşim), ana ötmesi, rahatsız edilme/darbe, kış hareketsizliği, eşek arısı (titreşim artışı)
- **Kaynak:** ADXL345 datasheet Rev. G · st.com LIS3DH · analog.com ADXL355
- **Fiyat:** ADXL345 1ku 3,74 USD'den · ADXL355 1ku 46,03 USD'den (analog.com)
- **Durum:** taslak – kullanıcı onayı bekliyor

## 8. IR giriş sayacı (çift ışınlı, çift yönlü)

- **Görevi:** Giren/çıkan arı sayısı; kanal başına sayım.
- **Cihaz tipi:** ir
- **Aday parçalar:** Kızılötesi verici/alıcı çiftleri ile dar kanallar (her kanalda 2 ışın → yön) · hardware/mounting/ir-entrance.md, 3D baskı giriş kapısı; belirli parça: Veri yok
- **Kuralların gerektirdiği özellik:** Her kanal için iki ışın (yön tayini), giren ve çıkan ayrı, kanal başına sayım (sayaç arızası kuralı kanal sıfır sayıyor mu bakar); dar kanal; güneş/yağmur koruması; propolis/çöp tıkanmasına karşı temizlenebilir; erkek arı ayrımı yok → «Erkek arı uçuşu» Veri yok
- **Bağlı kurallar:** İlaçlama şüphesi, dönmeyen tarlacı, beklenenden düşük aktivite, sayaç arızası, oğul çıktı, eşek arısı IR yolu, koloni sönmüş
- **Kaynak:** Odemer 2021 (kanal tıkanması) · repo hardware/mounting
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 9. Ağ geçidi (gateway)

- **Görevi:** Kovan düğümlerinden LoRa alır, internete (4G / Wi‑Fi) iletir; ayarları düğümlere dağıtır.
- **Cihaz tipi:** gateway
- **Aday parçalar:** LilyGO T-Beam V1.2 (ESP32, SX1262 LoRa 433/868/915 MHz +22 dBm, AXP2101 PMU, 18650 yuvası, GNSS) + SIMCom A7670E (LTE Cat 1, LTE-FDD B1/B3/B5/B7/B8/B20, GSM 900/1800, 3,4–4,2 V) — repo firmware/gate hedefi · Wi‑Fi olan arılıkta Wi‑Fi ile doğrudan
- **Kuralların gerektirdiği özellik:** EU868 bandı; HTTPS POST /api/ingest; ayar indirme (ölçüm aralığı) ve düğümlere iletme; pil/şebeke durumu göndermeli (gateway pil kuralı)
- **Bağlı kurallar:** Gateway çevrimdışı/pil uyarıları, tüm sensör verisinin buluta gelmesi
- **Kaynak:** lilygo.cc T-Beam · SIMCom A7670 series spec
- **Fiyat:** T-Beam SoftRF 40,98 USD (lilygo.cc, 17.10.2026)
- **Durum:** taslak – kullanıcı onayı bekliyor

## 10. Güç: kovan pili / gateway aküsü / güneş paneli

- **Görevi:** Düğüm ve gateway beslemesi; pil yüzdesi uygulamaya gelir.
- **Cihaz tipi:** aku_kovan · aku_merkez
- **Aday parçalar:** 18650 Li-ion (T-Beam yuvası) · güneş paneli + şarj devresi (model: Veri yok) · T-Weigh 5–12 V DC girişi
- **Kuralların gerektirdiği özellik:** Pil yüzdesi ve şarj durumu gönderilmeli (pil kuralları: %10 bitti, 7/14 gün tahmini); kapasite hesabı ölçüm aralığına bağlı — Veri yok
- **Bağlı kurallar:** Pil bitiyor / bitti, şarj, gateway pil
- **Kaynak:** lilygo.cc T-Beam / T-Weigh
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 11. Kutu ve montaj

- **Görevi:** Elektroniği nem/yağmur/arılardan korur; sensör yerleşimi.
- **Cihaz tipi:** —
- **Aday parçalar:** Su geçirmez kutu (IP sınıfı ve model: Veri yok) · hardware/platform (tartı), hardware/mounting (IR, kovan), 3d-print/giris-kapisi
- **Kuralların gerektirdiği özellik:** Mikrofon ve ivmeölçer kovan içinde, propolise karşı korumalı (file); sıcaklık/nem kuluçka alanına yakın; anten dışarıda
- **Bağlı kurallar:** Tümü
- **Kaynak:** repo hardware/
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 12. Kamera (ileride)

- **Görevi:** Varroa taşıyan arı, eşek arısı görüntü tanıma; fotoğraf.
- **Cihaz tipi:** kamera_kovan · kamera_arilik
- **Aday parçalar:** Veri yok (model seçilmedi)
- **Kuralların gerektirdiği özellik:** Görüntü modeli gerekir; tek tek arı izleme (varroa şüphesi kuralı için)
- **Bağlı kurallar:** Varroa şüphesi (beklemede)
- **Kaynak:** Veri yok
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## Açık kararlar

- **Bağlantı türü:** LoRa + 4G gateway (repo planı) · yalnız Wi‑Fi · her kovanda GSM — Arılıkta Wi‑Fi/şebeke kapsaması: Veri yok
- **Güç:** Pil · pil + güneş · şebeke — Kapasite ölçüm aralığına ve LoRa gönderim sıklığına bağlı
- **Gateway yerleşimi:** Arılık başına tek ortak gateway · kovan başına bağlantı — LoRa menzili arazide doğrulanmalı
- **Düğüm kartı:** T-Weigh (ESP32, LoRa + 4× HX711 dahili) · ESP32-S3 + ayrı LoRa + HX711 — T-Weigh'de USB-seri yok, T-U2T programlayıcı gerekir
- **Sıcaklık/nem sensörü:** DHT22'den SHT41/SHT31'e geçiş — Eşek arısı 0,5 °C ani değişim için daha hassas sensör

## Yapılacaklar (veritabanına eklendi)

- **Donanım: /api/ingest uç noktası yazılmalı** — Cihaz → uygulama yolu yok (firmware API_URL /api/ingest gösteriyor, api/ klasöründe ingest yok). Şema: packages/shared/schemas/ingest.schema.json. Giren/çıkan ayrı, kanal başına sayım, giriş sıcaklığı konumu, örnekleme hızı (sr), titreşim darbe g ve ötme türü, pil % alanları eklenmeli.
- **Donanım: cihaz ayar indirme (ölçüm aralığı)** — Panelde ayarlanan aralık (sıcaklık/nem 30 dk, tartı 15 dk) cihaza ulaşmıyor. Gateway/düğüm her bağlantıda ayarı sunucudan okumalı (cihaz_aralik).
- **Donanım: firmware sensör kodları boş** — firmware/node/src/sensors/*.cpp yalnız yorum satırı; config.h'de INTERVAL_MS yok; pinout (hardware/wiring/node-pinout.md) doldurulmadı.
- **Donanım: açık kararlar (bağlantı, güç, gateway yerleşimi)** — Donanım listesindeki karar maddeleri kullanıcı onayı bekliyor.
