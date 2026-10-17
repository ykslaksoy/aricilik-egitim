# SüperArı — Donanım listesi (onaylandı – test edilecek (2 açık karar: pil kapasitesi, güneş paneli modeli))

Sürüm 2 · koloni-243 · 17.10.2026 (TSİ). Yönetici paneli › Donanım bölümünde düzenlenir. Doğrulanamayan özellik = «Veri yok».

**Mimari:** her kovanda 1 LilyGO T-Weigh düğümü → LoRa EU868 → arılık başına **tek** gateway (T-Beam V1.2 + SIMCom A7670E) → 4G → /api/ingest.


## 1. Kovan düğümü (mikrodenetleyici kartı)

- **Görevi:** Kovandaki sensörleri okur, ölçüm aralığına göre gönderir (LoRa / Wi‑Fi).
- **Cihaz tipi:** —
- **Parça:** Seçilen: LilyGO T-Weigh (ESP32, 4× HX711, SX1262 LoRa EU868, Wi‑Fi b/g/n, BLE 4.2, 4 MB flash, 5–12 V DC, I2S/I2C/SPI) — kovan başına 1 · alternatif (seçilmedi): ESP32-S3 kartı + ayrı LoRa + HX711
- **Kuralların gerektirdiği özellik:** I2S (SPH0645), I²C (SHT41, ADXL345), 1-Wire (DS18B20 giriş), 4 kanal tartı girişi (dahili HX711), IR kesme girişleri, derin uyku; T-Weigh'de USB-seri yok → T-U2T programlayıcı gerekir; LoRa ile arılığın tek gateway'ine gönderir
- **Bağlı kurallar:** Tüm sensör kuralları
- **Kaynak:** lilygo.cc/products/t-weigh · Espressif ESP32-S3 datasheet
- **Fiyat:** T-Weigh 20,88 USD (lilygo.cc, 17.10.2026)
- **Durum:** onaylandı – test edilecek

## 2. Kovan içi sıcaklık / nem

- **Görevi:** Kuluçka sıcaklığı, nem, yoğuşma, havalandırma, oğul öncesi sıcaklık, eşek arısı ani değişimi.
- **Cihaz tipi:** isi_nem
- **Parça:** Seçilen: Sensirion SHT41 (±0,2 °C tip., ±1,8 %RH tip., 1,08–3,6 V, I²C adres 0x44, −40…125 °C) — DHT22 yerine (DHT22 ±0,5 °C eşek arısı 0,5 °C sınırı için yetersiz) · alternatif (seçilmedi): SHT31-DIS
- **Kuralların gerektirdiği özellik:** Çözünürlük ≤0,1 °C ve doğruluk ≈±0,2 °C (eşek arısı kuralı 0,5 °C ani değişim arar); okuma 30 dk, tıslama/titreşimde ~2 dk hızlı okuma; firmware sürücüsü firmware/node/src/sensors/sht41.cpp (taslak, cihazda test edilecek)
- **Bağlı kurallar:** Koloni sönmüş, yavrusuz/anasız, havalandırma/yoğuşma, oğul öncesi sıcaklık, eşek arısı (sıcaklık değişimi)
- **Kaynak:** sensirion.com SHT41 / SHT31-DIS-B · DHT22 datasheet · DS18B20 datasheet
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek

## 3. Giriş sıcaklık sensörü

- **Görevi:** Kovan girişinde 44 °C üstü (eşek arısı top yapma) kontrolü.
- **Cihaz tipi:** isi_nem (giriş)
- **Parça:** Seçilen (öneri korundu): DS18B20 su geçirmez prob (±0,5 °C, −55…+125 °C ölçüm aralığı, 1-Wire) · not: girişte de SHT41 kullanılabilir (aynı sürücü; düğümdeki iç SHT41 ile aynı I²C adresi 0x44 → ayrı I²C hattı gerekir). 44 °C eşiği için ±0,5 °C doğruluk yeterli
- **Kuralların gerektirdiği özellik:** Girişte ölçtüğünün kayıtta işaretlenmesi (konum=giriş); 30 dk okuma, eşek arısı burst ~2 dk
- **Bağlı kurallar:** Eşek arısı (giriş > 44 °C kritik)
- **Kaynak:** DS18B20 datasheet
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek

## 4. Merkezi (dış) ısı / nem

- **Görevi:** Dış hava; uçuşa uygun gün, beklenen aktivite modeli, yoğuşma farkı.
- **Cihaz tipi:** dis_isi_nem
- **Parça:** Seçilen: SHT41 + radyasyon kalkanı (kalkan modeli: Veri yok) — arılık başına 1, gateway'e bağlı
- **Kuralların gerektirdiği özellik:** 30 dk okuma; güneşten korumalı
- **Bağlı kurallar:** Beklenenden düşük aktivite, koloni sönmüş (dış ≥ 6 °C), yoğuşma, eşek arısı IR yolu (uygun uçuş günü)
- **Kaynak:** sensirion.com
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek

## 5. Tartı (yük hücreleri + ADC)

- **Görevi:** Ağırlık; bal akımı, tarlacı kaybı, ani kayıp/oğul, hırsızlık/devrilme, kış stoku.
- **Cihaz tipi:** tarti
- **Parça:** Seçilen: HX711 ×4 (T-Weigh üzerinde; 24 bit Σ∆, 10 veya 80 SPS, kazanç 128/64/32) + 4 köşe yük hücresi (model/kapasite: Veri yok) · platform: hardware/platform
- **Kuralların gerektirdiği özellik:** 15 dk okuma; ≤0,1 kg çözünürlük (tarlacı kuralı tarlaciMinKg 0,1 kg); 1 kg ani düşüş (oğul çıktı doğrulama), 3 kg/6 saat ani kayıp
- **Bağlı kurallar:** Tarlacı kaybı, oğul çıktı (doğrulama), ani kayıp, koloni sönmüş, bal akımı/taşıma planı
- **Kaynak:** HX711 datasheet (Avia) · lilygo.cc T-Weigh
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek

## 6. Mikrofon

- **Görevi:** Oğul öncesi ses, ana ötmesi, rahatsızlık, eşek arısı tıslaması.
- **Cihaz tipi:** ses
- **Parça:** Seçilen: Knowles SPH0645LM4H (I2S, saat 2,048–4,096 MHz → 32–64 kHz örnekleme, SNR 65 dB(A)) · alternatif (seçilmedi): TDK INMP441
- **Kuralların gerektirdiği özellik:** Örnekleme ≥ 32 kHz (eşek arısı tıslaması 4,5–7,3 kHz, esekMinOrneklemeHz 32000); cihaz örnekleme hızını (sr) göndermeli; ham ses LoRa'ya gitmez, kovanda özet çıkarılır
- **Bağlı kurallar:** Oğul öncesi (110 Hz, 300 Hz), ana ötmesi (400–500 Hz), rahatsızlık (300–450 Hz), eşek arısı tıslaması
- **Kaynak:** SPH0645LM4H datasheet (Knowles) · INMP441 datasheet (TDK InvenSense)
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek

## 7. İvmeölçer (titreşim)

- **Görevi:** Gece titreşimi (oğul hazırlığı), ana ötmesi, darbe/rahatsızlık, kış hareketsizliği.
- **Cihaz tipi:** titresim
- **Parça:** Seçilen: ADXL345 (ODR en çok 3200 Hz → bant ≈1600 Hz; ±2–16 g; 4 mg/LSB; I²C/SPI; 32 FIFO) · alternatif: ADXL355 (gürültü 22,5 µg/√Hz, ±2/4/8 g, 20 bit; daha hassas, daha pahalı)
- **Kuralların gerektirdiği özellik:** Analiz bandı 20–800 Hz (titOgulHz) → örnekleme ≥ 2 kHz (ADXL345 3,2 kHz ile yeterli ama sınıra yakın); darbe için ≥2 g aralık; kovan çerçevesine sabit montaj; cihaz darbe gücünü (g) ve ötme türünü göndermeli — şu an göndermiyor
- **Bağlı kurallar:** Oğul hazırlığı (titreşim), ana ötmesi, rahatsız edilme/darbe, kış hareketsizliği, eşek arısı (titreşim artışı)
- **Kaynak:** ADXL345 datasheet Rev. G · st.com LIS3DH · analog.com ADXL355
- **Fiyat:** ADXL345 1ku 3,74 USD'den · ADXL355 1ku 46,03 USD'den (analog.com)
- **Durum:** onaylandı – test edilecek

## 8. IR giriş sayacı (çift ışınlı, çift yönlü)

- **Görevi:** Giren/çıkan arı sayısı; kanal başına sayım.
- **Cihaz tipi:** ir
- **Parça:** Seçilen yapı: çift ışınlı, çift yönlü, kanal başına sayım (her kanalda 2 kızılötesi verici/alıcı çifti → yön) · hardware/mounting/ir-entrance.md, 3D baskı giriş kapısı; belirli verici/alıcı parçası: Veri yok
- **Kuralların gerektirdiği özellik:** Her kanal için iki ışın (yön tayini), giren ve çıkan ayrı, kanal başına sayım (sayaç arızası kuralı kanal sıfır sayıyor mu bakar); dar kanal; güneş/yağmur koruması; propolis/çöp tıkanmasına karşı temizlenebilir; erkek arı ayrımı yok → «Erkek arı uçuşu» Veri yok
- **Bağlı kurallar:** İlaçlama şüphesi, dönmeyen tarlacı, beklenenden düşük aktivite, sayaç arızası, oğul çıktı, eşek arısı IR yolu, koloni sönmüş
- **Kaynak:** Odemer 2021 (kanal tıkanması) · repo hardware/mounting
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek

## 9. Ağ geçidi (gateway)

- **Görevi:** Kovan düğümlerinden LoRa alır, internete (4G / Wi‑Fi) iletir; ayarları düğümlere dağıtır.
- **Cihaz tipi:** gateway
- **Parça:** Seçilen: LilyGO T-Beam V1.2 (ESP32, SX1262 LoRa EU868 +22 dBm, AXP2101 PMU, 18650 yuvası, GNSS) + SIMCom A7670E (LTE Cat 1, LTE-FDD B1/B3/B5/B7/B8/B20, GSM 900/1800, 3,4–4,2 V) — ARILIK BAŞINA 1 gateway: LoRa düğümleri → arılığın tek gateway'i → 4G
- **Kuralların gerektirdiği özellik:** EU868 bandı; HTTPS POST /api/ingest; ayar indirme (ölçüm aralığı) ve düğümlere iletme; pil/şebeke durumu göndermeli (gateway pil kuralı); Cihazlar sayfası arılıkta >1 gateway ya da gateway'siz kovan cihazı görürse uyarır; LoRa menzili arazide doğrulanmalı
- **Bağlı kurallar:** Gateway çevrimdışı/pil uyarıları, tüm sensör verisinin buluta gelmesi
- **Kaynak:** lilygo.cc T-Beam · SIMCom A7670 series spec
- **Fiyat:** T-Beam SoftRF 40,98 USD (lilygo.cc, 17.10.2026)
- **Durum:** onaylandı – test edilecek

## 10. Güç: kovan pili / gateway aküsü / güneş paneli

- **Görevi:** Düğüm ve gateway beslemesi; pil yüzdesi uygulamaya gelir.
- **Cihaz tipi:** aku_kovan · aku_merkez
- **Parça:** Seçilen: 18650 Li-ion (düğüm ve gateway) + güneş paneli isteğe bağlı · kapasite: Veri yok · güneş paneli / şarj devresi modeli: Veri yok (açık karar) · T-Weigh 5–12 V DC girişi
- **Kuralların gerektirdiği özellik:** Pil yüzdesi ve şarj durumu gönderilmeli (pil kuralları: %10 bitti, 7/14 gün tahmini); kapasite hesabı ölçüm aralığına bağlı — Veri yok
- **Bağlı kurallar:** Pil bitiyor / bitti, şarj, gateway pil
- **Kaynak:** lilygo.cc T-Beam / T-Weigh
- **Fiyat:** Veri yok
- **Durum:** onaylandı – test edilecek (kapasite ve güneş paneli modeli açık)

## 11. Kutu ve montaj

- **Görevi:** Elektroniği nem/yağmur/arılardan korur; sensör yerleşimi.
- **Cihaz tipi:** —
- **Parça:** Su geçirmez kutu (IP sınıfı ve model: Veri yok) · hardware/platform (tartı), hardware/mounting (IR, kovan), 3d-print/giris-kapisi
- **Kuralların gerektirdiği özellik:** Mikrofon ve ivmeölçer kovan içinde, propolise karşı korumalı (file); sıcaklık/nem kuluçka alanına yakın; anten dışarıda
- **Bağlı kurallar:** Tümü
- **Kaynak:** repo hardware/
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## 12. Kamera (ileride)

- **Görevi:** Varroa taşıyan arı, eşek arısı görüntü tanıma; fotoğraf.
- **Cihaz tipi:** kamera_kovan · kamera_arilik
- **Parça:** Veri yok (model seçilmedi)
- **Kuralların gerektirdiği özellik:** Görüntü modeli gerekir; tek tek arı izleme (varroa şüphesi kuralı için)
- **Bağlı kurallar:** Varroa şüphesi (beklemede)
- **Kaynak:** Veri yok
- **Fiyat:** Veri yok
- **Durum:** taslak – kullanıcı onayı bekliyor

## Verilen kararlar

- **Bağlantı türü:** LoRa (kovan düğümleri) + 4G gateway (T-Beam V1.2 + A7670E) — Kullanıcı kararı · 17.10.2026
- **Gateway yerleşimi:** Arılık başına tek gateway — Kullanıcı kararı · 17.10.2026 · LoRa menzili arazide doğrulanmalı
- **Düğüm kartı:** LilyGO T-Weigh — Kullanıcı kararı · 17.10.2026 · T-U2T programlayıcı gerekir
- **Sıcaklık/nem sensörü:** SHT41 (kovan içi + dış); giriş DS18B20 — Kullanıcı kararı · 17.10.2026
- **Güç (tür):** 18650 Li-ion + güneş paneli isteğe bağlı — Kullanıcı kararı · 17.10.2026

## Açık kararlar

- **Pil kapasitesi:** 18650 hücre sayısı / mAh — Veri yok — Ölçüm aralığına ve LoRa gönderim sıklığına bağlı; sahada ölçülmeli
- **Güneş paneli modeli:** Panel gücü (W) ve şarj devresi modeli — Veri yok — Güneş isteğe bağlı; arılık gölgesine bağlı

## Uygulamadaki karşılığı

- Cihazlar sayfası: bir arılıkta birden fazla gateway varsa ya da kovan cihazı olan bir arılıkta gateway yoksa uyarı gösterir; Cihaz ekle formu ikinci gateway eklerken uyarır.
- Firmware: düğüm DHT22 yerine SHT41 sürücüsü (firmware/node/src/sensors/sht41.cpp, taslak; cihazda test edilecek), giriş DS18B20 (ds18b20.cpp taslak).

## Yapılacaklar (veritabanında)

- **Donanım: açık kararlar** — tamamlandı (bağlantı, gateway yerleşimi, düğüm kartı, sıcaklık/nem sensörü karara bağlandı).
- **Donanım: pil kapasitesi ve güneş paneli modeli** — açık.
- **Donanım: /api/ingest**, **cihaz ayar indirme**, **firmware sensör kodları** — açık (koloni-238).
