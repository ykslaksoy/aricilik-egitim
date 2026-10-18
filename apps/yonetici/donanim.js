/* SüperArı — yönetici: Donanım (koloni-238 taslak, koloni-243 kararlar, koloni önizleme: aday kartları, aynı yazılımla çalışan alternatifler, düzenler, satın alma + TCMB kuru). */
window.SA_DONANIM_TASLAK = {"surum_notu": "Kullanıcı kararları 17.10.2026: önerilen parçalar, SHT41 (DHT22 yerine), arılık başına 1 gateway, LoRa + 4G, 18650 + güneş isteğe bağlı", "durum": "onaylandı – test edilecek (2 açık karar: pil kapasitesi, güneş paneli modeli)", "kalemler": [{"id": "node", "ad": "Kovan düğümü (mikrodenetleyici kartı)", "cihazTipi": "—", "rol": "Kovandaki sensörleri okur, ölçüm aralığına göre gönderir (LoRa / Wi‑Fi).", "adaylar": "Seçilen: LilyGO T-Weigh (ESP32, 4× HX711, SX1262 LoRa EU868, Wi‑Fi b/g/n, BLE 4.2, 4 MB flash, 5–12 V DC, I2S/I2C/SPI) — kovan başına 1 · alternatif (seçilmedi): ESP32-S3 kartı + ayrı LoRa + HX711", "gerekenOzellik": "I2S (SPH0645), I²C (SHT41, ADXL345), 1-Wire (DS18B20 giriş), 4 kanal tartı girişi (dahili HX711), IR kesme girişleri, derin uyku; T-Weigh'de USB-seri yok → T-U2T programlayıcı gerekir; LoRa ile arılığın tek gateway'ine gönderir", "kurallar": "Tüm sensör kuralları", "kaynak": "lilygo.cc/products/t-weigh · Espressif ESP32-S3 datasheet", "fiyat": "T-Weigh 20,88 USD (lilygo.cc, 17.10.2026)", "durum": "onaylandı – test edilecek"}, {"id": "isi_nem", "ad": "Kovan içi sıcaklık / nem", "cihazTipi": "isi_nem", "rol": "Kuluçka sıcaklığı, nem, yoğuşma, havalandırma, oğul öncesi sıcaklık, eşek arısı ani değişimi.", "adaylar": "Seçilen: Sensirion SHT41 (±0,2 °C tip., ±1,8 %RH tip., 1,08–3,6 V, I²C adres 0x44, −40…125 °C) — DHT22 yerine (DHT22 ±0,5 °C eşek arısı 0,5 °C sınırı için yetersiz) · alternatif (seçilmedi): SHT31-DIS", "gerekenOzellik": "Çözünürlük ≤0,1 °C ve doğruluk ≈±0,2 °C (eşek arısı kuralı 0,5 °C ani değişim arar); okuma 30 dk, tıslama/titreşimde ~2 dk hızlı okuma; firmware sürücüsü firmware/node/src/sensors/sht41.cpp (taslak, cihazda test edilecek)", "kurallar": "Koloni sönmüş, yavrusuz/anasız, havalandırma/yoğuşma, oğul öncesi sıcaklık, eşek arısı (sıcaklık değişimi)", "kaynak": "sensirion.com SHT41 / SHT31-DIS-B · DHT22 datasheet · DS18B20 datasheet", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek"}, {"id": "giris_sicak", "ad": "Giriş sıcaklık sensörü", "cihazTipi": "isi_nem (giriş)", "rol": "Kovan girişinde 44 °C üstü (eşek arısı top yapma) kontrolü.", "adaylar": "Seçilen (öneri korundu): DS18B20 su geçirmez prob (±0,5 °C, −55…+125 °C ölçüm aralığı, 1-Wire) · not: girişte de SHT41 kullanılabilir (aynı sürücü; düğümdeki iç SHT41 ile aynı I²C adresi 0x44 → ayrı I²C hattı gerekir). 44 °C eşiği için ±0,5 °C doğruluk yeterli", "gerekenOzellik": "Girişte ölçtüğünün kayıtta işaretlenmesi (konum=giriş); 30 dk okuma, eşek arısı burst ~2 dk", "kurallar": "Eşek arısı (giriş > 44 °C kritik)", "kaynak": "DS18B20 datasheet", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek"}, {"id": "dis_isi_nem", "ad": "Merkezi (dış) ısı / nem", "cihazTipi": "dis_isi_nem", "rol": "Dış hava; uçuşa uygun gün, beklenen aktivite modeli, yoğuşma farkı.", "adaylar": "Seçilen: SHT41 + radyasyon kalkanı (kalkan modeli: Veri yok) — arılık başına 1, gateway'e bağlı", "gerekenOzellik": "30 dk okuma; güneşten korumalı", "kurallar": "Beklenenden düşük aktivite, koloni sönmüş (dış ≥ 6 °C), yoğuşma, eşek arısı IR yolu (uygun uçuş günü)", "kaynak": "sensirion.com", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek"}, {"id": "tarti", "ad": "Tartı (yük hücreleri + ADC)", "cihazTipi": "tarti", "rol": "Ağırlık; bal akımı, tarlacı kaybı, ani kayıp/oğul, hırsızlık/devrilme, kış stoku.", "adaylar": "Seçilen: HX711 ×4 (T-Weigh üzerinde; 24 bit Σ∆, 10 veya 80 SPS, kazanç 128/64/32) + 4 köşe yük hücresi (model/kapasite: Veri yok) · platform: hardware/platform", "gerekenOzellik": "15 dk okuma; ≤0,1 kg çözünürlük (tarlacı kuralı tarlaciMinKg 0,1 kg); 1 kg ani düşüş (oğul çıktı doğrulama), 3 kg/6 saat ani kayıp", "kurallar": "Tarlacı kaybı, oğul çıktı (doğrulama), ani kayıp, koloni sönmüş, bal akımı/taşıma planı", "kaynak": "HX711 datasheet (Avia) · lilygo.cc T-Weigh", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek"}, {"id": "ses", "ad": "Mikrofon", "cihazTipi": "ses", "rol": "Oğul öncesi ses, ana ötmesi, rahatsızlık, eşek arısı tıslaması.", "adaylar": "Seçilen: Knowles SPH0645LM4H (I2S, saat 2,048–4,096 MHz → 32–64 kHz örnekleme, SNR 65 dB(A)) · alternatif (seçilmedi): TDK INMP441", "gerekenOzellik": "Örnekleme ≥ 32 kHz (eşek arısı tıslaması 4,5–7,3 kHz, esekMinOrneklemeHz 32000); cihaz örnekleme hızını (sr) göndermeli; ham ses LoRa'ya gitmez, kovanda özet çıkarılır", "kurallar": "Oğul öncesi (110 Hz, 300 Hz), ana ötmesi (400–500 Hz), rahatsızlık (300–450 Hz), eşek arısı tıslaması", "kaynak": "SPH0645LM4H datasheet (Knowles) · INMP441 datasheet (TDK InvenSense)", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek"}, {"id": "titresim", "ad": "İvmeölçer (titreşim)", "cihazTipi": "titresim", "rol": "Gece titreşimi (oğul hazırlığı), ana ötmesi, darbe/rahatsızlık, kış hareketsizliği.", "adaylar": "Seçilen: ADXL345 (ODR en çok 3200 Hz → bant ≈1600 Hz; ±2–16 g; 4 mg/LSB; I²C/SPI; 32 FIFO) · alternatif: ADXL355 (gürültü 22,5 µg/√Hz, ±2/4/8 g, 20 bit; daha hassas, daha pahalı)", "gerekenOzellik": "Analiz bandı 20–800 Hz (titOgulHz) → örnekleme ≥ 2 kHz (ADXL345 3,2 kHz ile yeterli ama sınıra yakın); darbe için ≥2 g aralık; kovan çerçevesine sabit montaj; cihaz darbe gücünü (g) ve ötme türünü göndermeli — şu an göndermiyor", "kurallar": "Oğul hazırlığı (titreşim), ana ötmesi, rahatsız edilme/darbe, kış hareketsizliği, eşek arısı (titreşim artışı)", "kaynak": "ADXL345 datasheet Rev. G · st.com LIS3DH · analog.com ADXL355", "fiyat": "ADXL345 1ku 3,74 USD'den · ADXL355 1ku 46,03 USD'den (analog.com)", "durum": "onaylandı – test edilecek"}, {"id": "ir", "ad": "IR giriş sayacı (çift ışınlı, çift yönlü)", "cihazTipi": "ir", "rol": "Giren/çıkan arı sayısı; kanal başına sayım.", "adaylar": "Seçilen yapı: çift ışınlı, çift yönlü, kanal başına sayım (her kanalda 2 kızılötesi verici/alıcı çifti → yön) · hardware/mounting/ir-entrance.md, 3D baskı giriş kapısı; belirli verici/alıcı parçası: Veri yok", "gerekenOzellik": "Her kanal için iki ışın (yön tayini), giren ve çıkan ayrı, kanal başına sayım (sayaç arızası kuralı kanal sıfır sayıyor mu bakar); dar kanal; güneş/yağmur koruması; propolis/çöp tıkanmasına karşı temizlenebilir; erkek arı ayrımı yok → «Erkek arı uçuşu» Veri yok", "kurallar": "İlaçlama şüphesi, dönmeyen tarlacı, beklenenden düşük aktivite, sayaç arızası, oğul çıktı, eşek arısı IR yolu, koloni sönmüş", "kaynak": "Odemer 2021 (kanal tıkanması) · repo hardware/mounting", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek"}, {"id": "gateway", "ad": "Ağ geçidi (gateway)", "cihazTipi": "gateway", "rol": "Kovan düğümlerinden LoRa alır, internete (4G / Wi‑Fi) iletir; ayarları düğümlere dağıtır.", "adaylar": "Seçilen: LilyGO T-Beam V1.2 (ESP32, SX1262 LoRa EU868 +22 dBm, AXP2101 PMU, 18650 yuvası, GNSS) + SIMCom A7670E (LTE Cat 1, LTE-FDD B1/B3/B5/B7/B8/B20, GSM 900/1800, 3,4–4,2 V) — ARILIK BAŞINA 1 gateway: LoRa düğümleri → arılığın tek gateway'i → 4G", "gerekenOzellik": "EU868 bandı; HTTPS POST /api/ingest; ayar indirme (ölçüm aralığı) ve düğümlere iletme; pil/şebeke durumu göndermeli (gateway pil kuralı); Cihazlar sayfası arılıkta >1 gateway ya da gateway'siz kovan cihazı görürse uyarır; LoRa menzili arazide doğrulanmalı", "kurallar": "Gateway çevrimdışı/pil uyarıları, tüm sensör verisinin buluta gelmesi", "kaynak": "lilygo.cc T-Beam · SIMCom A7670 series spec", "fiyat": "T-Beam SoftRF 40,98 USD (lilygo.cc, 17.10.2026)", "durum": "onaylandı – test edilecek"}, {"id": "aku", "ad": "Güç: kovan pili / gateway aküsü / güneş paneli", "cihazTipi": "aku_kovan · aku_merkez", "rol": "Düğüm ve gateway beslemesi; pil yüzdesi uygulamaya gelir.", "adaylar": "Seçilen: 18650 Li-ion (düğüm ve gateway) + güneş paneli isteğe bağlı · kapasite: Veri yok · güneş paneli / şarj devresi modeli: Veri yok (açık karar) · T-Weigh 5–12 V DC girişi", "gerekenOzellik": "Pil yüzdesi ve şarj durumu gönderilmeli (pil kuralları: %10 bitti, 7/14 gün tahmini); kapasite hesabı ölçüm aralığına bağlı — Veri yok", "kurallar": "Pil bitiyor / bitti, şarj, gateway pil", "kaynak": "lilygo.cc T-Beam / T-Weigh", "fiyat": "Veri yok", "durum": "onaylandı – test edilecek (kapasite ve güneş paneli modeli açık)"}, {"id": "kutu", "ad": "Kutu ve montaj", "cihazTipi": "—", "rol": "Elektroniği nem/yağmur/arılardan korur; sensör yerleşimi.", "adaylar": "Su geçirmez kutu (IP sınıfı ve model: Veri yok) · hardware/platform (tartı), hardware/mounting (IR, kovan), 3d-print/giris-kapisi", "gerekenOzellik": "Mikrofon ve ivmeölçer kovan içinde, propolise karşı korumalı (file); sıcaklık/nem kuluçka alanına yakın; anten dışarıda", "kurallar": "Tümü", "kaynak": "repo hardware/", "fiyat": "Veri yok", "durum": "taslak – kullanıcı onayı bekliyor"}, {"id": "kamera", "ad": "Kamera (ileride)", "cihazTipi": "kamera_kovan · kamera_arilik", "rol": "Varroa taşıyan arı, eşek arısı görüntü tanıma; fotoğraf.", "adaylar": "Veri yok (model seçilmedi)", "gerekenOzellik": "Görüntü modeli gerekir; tek tek arı izleme (varroa şüphesi kuralı için)", "kurallar": "Varroa şüphesi (beklemede)", "kaynak": "Veri yok", "fiyat": "Veri yok", "durum": "taslak – kullanıcı onayı bekliyor"}], "kararlar": [{"baslik": "Pil kapasitesi", "secenekler": "18650 hücre sayısı / mAh — Veri yok", "not": "Ölçüm aralığına ve LoRa gönderim sıklığına bağlı; sahada ölçülmeli"}, {"baslik": "Güneş paneli modeli", "secenekler": "Panel gücü (W) ve şarj devresi modeli — Veri yok", "not": "Güneş isteğe bağlı; arılık gölgesine bağlı"}], "verilenKararlar": [{"baslik": "Bağlantı türü", "karar": "LoRa (kovan düğümleri) + 4G gateway (T-Beam V1.2 + A7670E)", "not": "Kullanıcı kararı · 17.10.2026"}, {"baslik": "Gateway yerleşimi", "karar": "Arılık başına tek gateway", "not": "Kullanıcı kararı · 17.10.2026 · LoRa menzili arazide doğrulanmalı"}, {"baslik": "Düğüm kartı", "karar": "LilyGO T-Weigh", "not": "Kullanıcı kararı · 17.10.2026 · T-U2T programlayıcı gerekir"}, {"baslik": "Sıcaklık/nem sensörü", "karar": "SHT41 (kovan içi + dış); giriş DS18B20", "not": "Kullanıcı kararı · 17.10.2026"}, {"baslik": "Güç (tür)", "karar": "18650 Li-ion + güneş paneli isteğe bağlı", "not": "Kullanıcı kararı · 17.10.2026"}]};
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!host) return;
  var nav = host.querySelector('nav.nav');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var F = [['ad', 'Kalem'], ['cihazTipi', 'Cihaz tipi'], ['rol', 'Görevi'], ['adaylar', 'Aday parçalar (özgün metin)'], ['gerekenOzellik', 'Kuralların gerektirdiği özellik'], ['kurallar', 'Bağlı kurallar'], ['kaynak', 'Kaynak'], ['fiyat', 'Fiyat (özgün metin)'], ['durum', 'Durum']];
  var KF = [['baslik', 'Karar'], ['secenekler', 'Seçenekler'], ['not', 'Not']];
  var VF = [['baslik', 'Konu'], ['karar', 'Karar'], ['not', 'Not']];
  function dCls(t) { return /^onaylandı/.test(String(t || '')) ? 'dn-d ok' : 'dn-d'; }

  /* ---------- Doğrulanmış veriler (18.10.2026 kontrol). Kaynaksız değer YOK; bulunamayan «Veri yok». ---------- */
  var DS_SHT4X = 'https://sensirion.com/media/documents/33FD6951/6A7C10A0/HT_DS_Datasheet_SHT4x_V7.3.pdf';
  var DS_SHT3X = 'https://sensirion.com/media/documents/213E6A3B/63A5A569/Datasheet_SHT3x_DIS.pdf';
  var LIB_DT = 'https://github.com/milesburton/Arduino-Temperature-Control-Library';
  /* Parça adı → güncel fiyat (TL doğrudan; USD/EUR TCMB kuruyla TL'ye çevrilir). */
  var FIY = [
    [/T-Weigh/i, { tutar: 20.88, para: 'USD', tarih: '2026-10-17', magaza: 'lilygo.cc', url: 'https://lilygo.cc/products/t-weigh', not: 'Türkiye mağazalarında güvenilir TL fiyatı bulunamadı' }],
    [/SHT31/i, { tutar: 226.66, para: 'TL', tarih: '2026-10-18', magaza: 'Direnc.net', url: 'https://www.direnc.net/sht31-sicaklik-ve-nem-sensoru-modulu-i2c-13815', not: 'Modül, KDV dahil · stokta yok' }],
    [/SHT41/i, { tutar: 5.95, para: 'USD', tarih: '2026-10-18', magaza: 'Adafruit (ürün 5776, kart)', url: 'https://www.adafruit.com/product/5776', not: 'Türkiye mağazalarında SHT41 bulunamadı (Robotistan, Direnc.net)' }],
    [/DS18B20/i, { tutar: 76.49, para: 'TL', tarih: '2026-10-18', magaza: 'Robotistan', url: 'https://www.robotistan.com/su-gecirmez-ds18b20-dijital-isi-sensoru', not: 'Su geçirmez prob, KDV dahil' }],
    [/SPH0645/i, { tutar: 415.80, para: 'TL', tarih: '2026-10-18', magaza: 'Robiz', url: 'https://robiz.net/sph0645', not: 'KDV dahil' }],
    [/INMP441/i, { tutar: 145.29, para: 'TL', tarih: '2026-10-18', magaza: 'Direnc.net', url: 'https://www.direnc.net/inmp441-mems-i2s-cok-yonlu-mikrofon-modulu', not: 'Modül, KDV dahil' }],
    [/ADXL345/i, { tutar: 155.38, para: 'TL', tarih: '2026-10-18', magaza: 'Robotistan', url: 'https://www.robotistan.com/adxl345-3-eksen-ivme-olcer-triple-axis-accelerometer-breakout-adxl345', not: 'GY-291 modülü, KDV dahil' }],
    [/ADXL355/i, { tutar: 46.03, para: 'USD', tarih: '2026-10-17', magaza: 'analog.com (1 000 adet liste fiyatı, «…den başlayan»)', url: 'https://www.analog.com/en/products/adxl355.html', not: 'Tek adet modül fiyatı değil' }],
    [/T-Beam/i, { tutar: 4410.00, para: 'TL', tarih: '2026-10-18', magaza: 'Robo90', url: 'https://www.robo90.com/lilygo-t-beam-v12-esp32-lora-gps-gelistirme-karti-868-915mhz', not: 'T-Beam V1.2 868/915 MHz, KDV dahil · ilanda LoRa çipi yazmıyor; LilyGO T-Beam sayfası 868 MHz için SX1276 diyor, yapılandırmamız SX1262 → satın almadan satıcıya sorun' }],
    [/A7670E/i, { tutar: 2034.11, para: 'TL', tarih: '2026-10-18', magaza: 'Direnc.net', url: 'https://www.direnc.net/a7670e-gsm-gps-modulu-ve-ltegnss-anten', not: 'A7670E GSM/GPS modülü + LTE/GNSS anten, KDV dahil' }]
  ];
  /* Parça adı → miktar. k = kovan başına, a = arılık başına; ut = uzman tahmini (metinde yazmıyor); dahil = ayrıca alınmaz. */
  var MIK = [
    [/T-Weigh/i, { k: 1 }], [/HX711 ×4/i, { dahil: 'T-Weigh üzerinde' }], [/yük hücresi/i, { k: 4 }],
    [/radyasyon kalkanı/i, { a: 1 }], [/T-Beam|A7670E/i, { a: 1 }],
    [/ESP32-S3|ayrı LoRa/i, { k: 1, ut: true }], [/^HX711$/i, { yok: 'Adet: Veri yok (T-Weigh\'de 4 adet; ayrı kartta sayı kararı açık)' }],
    [/18650|güneş paneli/i, { yok: 'Adet: Veri yok (kapasite kararı açık)' }],
    [/çift ışınlı/i, { yok: 'Parça seçilmedi: Veri yok' }]
  ];
  var MIK_KALEM = { isi_nem: { k: 1, ut: true }, giris_sicak: { k: 1, ut: true }, dis_isi_nem: { a: 1 }, ses: { k: 1, ut: true }, titresim: { k: 1, ut: true }, kutu: { k: 1, ut: true } };
  /* Firmware'de bugün ne var (firmware/node, firmware/gate incelendi 18.10.2026). */
  var FW = {
    node: 'firmware/node/src/main.cpp yalnız plan yorumu; kart için yazılmış kod yok.',
    isi_nem: 'firmware/node/src/sensors/sht41.cpp: kütüphanesiz Wire, I²C adres 0x44 (SHT41_I2C_ADDR), ölçüm 0xFD, sıfırlama 0x94, 6 bayt yanıt + CRC-8 (0x31). Taslak; main.cpp çağırmıyor, cihazda test edilmedi.',
    giris_sicak: 'firmware/node/platformio.ini: OneWire + DallasTemperature kütüphanesi tanımlı; sensors/ds18b20.cpp yalnız yorum (okuma kodu yok).',
    dis_isi_nem: 'firmware/gate/src/config.h: OUTDOOR_TEMP_HUM_SHT41 = düğümdeki sht41.cpp ile aynı sürücü öngörülüyor; gateway\'de sürücü kodu yok.',
    tarti: 'firmware/node/src/sensors/loadcells.cpp yalnız «4× HX711» yorumu.', ses: 'firmware/node/src/sensors/microphone.cpp yalnız «ADC / I2S» yorumu.',
    titresim: 'firmware/node/src/sensors/adxl345.cpp yalnız «I2C ADXL345» yorumu.', ir: 'firmware/node/src/sensors/ir_counter.cpp yalnız «GPIO interrupt» yorumu.',
    gateway: 'firmware/gate/src/lora_receive.cpp ve cellular_forward.cpp yalnız yorum.', aku: 'Firmware\'de karşılığı yok.', kutu: 'Firmware\'de karşılığı yok.', kamera: 'Firmware\'de karşılığı yok.'
  };
  function sht4x(ek) {
    var u = 'Aynı SHT4x komut seti (ölçüm 0xFD, sıfırlama 0x94), aynı 6 bayt + CRC-8 yanıtı, adres 0x44 → sht41.cpp değişmeden okur.' + (ek || '');
    return [
      { ad: 'Sensirion SHT45-AD1B', fark: 'Daha doğru: ±0,1 °C ve ±1,0 %RH tipik (SHT41: ±0,2 °C, ±1,8 %RH).', uyum: u, durum: 'uyumlu', kaynak: DS_SHT4X, fiyat: null },
      { ad: 'Sensirion SHT43-ADCB', fark: 'ISO 17025 3 noktalı kalibrasyon sertifikası; uzun dönem sıcaklık kayması <0,01 °C/yıl (SHT41 <0,03). Tipik sıcaklık doğruluğu verilmiyor, yalnız maksimum eğrisi.', uyum: u, durum: 'uyumlu', kaynak: DS_SHT4X, fiyat: null },
      { ad: 'Sensirion SHT40-AD1B', fark: 'Tipik doğruluk SHT41 ile aynı (±0,2 °C, ±1,8 %RH); maksimum sapma eğrisi daha geniş. BD1B (0x45) / CD1B (0x46) sürümleri de var.', uyum: u + ' 0x45/0x46 sürümünde yalnız SHT41_I2C_ADDR derleme ayarı değişir.', durum: 'uyumlu', kaynak: DS_SHT4X, fiyat: null },
      { ad: 'Sensirion SHT40-AD1F', fark: 'SHT40 + polyimid koruyucu membran. Kovandaki toz/propolise karşı yararı uzman tahmini.', uyum: u, durum: 'uyumlu', kaynak: DS_SHT4X, fiyat: null }
    ];
  }
  var ALT = {
    isi_nem: sht4x(''),
    dis_isi_nem: sht4x(' Gateway\'de sürücü kodu henüz yok.'),
    ses: [
      { ad: 'TDK INMP441', fark: 'I²S, 24 bit; SNR 61 dB(A) (SPH0645: 65 dB(A)); düz frekans yanıtı 60 Hz–15 kHz. Üretici durumu: NRND (yeni tasarım için önerilmiyor).', uyum: 'SPH0645 gibi I²S mikrofon; aynı ESP32 I²S okuma koduyla çalışması uzman tahmini — mikrofon sürücüsü (microphone.cpp) henüz yazılmadığı için doğrulanamadı.', durum: 'uzman', kaynak: 'https://product.tdk.com/en/search/sw_piezo/mic/mems-mic/info?part_no=INMP441', fiyat: { tutar: 145.29, para: 'TL', tarih: '2026-10-18', magaza: 'Direnc.net', url: 'https://www.direnc.net/inmp441-mems-i2s-cok-yonlu-mikrofon-modulu', not: 'Modül, KDV dahil' } }
    ],
    giris_sicak: [
      { ad: 'Analog Devices MAX31820', fark: '±0,5 °C yalnız +10…+45 °C (tüm aralık ±2 °C); besleme 3,0–3,7 V; TO-92 gövde — hazır su geçirmez prob değil.', uyum: 'Aile kodu 0x28 (DS18B20 ile aynı); DallasTemperature destekler («also MAX31820»); üretici: «Software Compatible with the DS1822 and DS18B20».', durum: 'uyumlu', kaynak: 'https://www.analog.com/en/products/max31820.html', fiyat: { tutar: 1.87, para: 'USD', tarih: '2026-10-18', magaza: 'analog.com (1 000 adet liste fiyatı)', url: 'https://www.analog.com/en/products/max31820.html', not: 'Çıplak çip' } },
      { ad: 'Analog Devices DS18S20', fark: 'Sabit 9 bit çözünürlük (0,5 °C adım); ±0,5 °C (−10…+85 °C); TO-92/SO gövde.', uyum: 'DallasTemperature destekler (aile kodu 0x10, «9 bit only»). Okuma kodu henüz yazılmadığı için 9 bitin etkisi uzman tahmini.', durum: 'uyumlu', kaynak: LIB_DT, fiyat: { tutar: 3.81, para: 'USD', tarih: '2026-10-18', magaza: 'analog.com (1 000 adet liste fiyatı)', url: 'https://www.analog.com/en/products/ds18s20.html', not: 'Çıplak çip' } }
    ]
  };
  /* ---------- Koruma / dış ortam (önizleme onizleme/donanim-koruma, 18.10.2026 kontrol). Kaynaksız değer «uzman tahmini»; bulunamayan «Veri yok». ---------- */
  var KS = {
    esp32: 'https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf',
    tweigh: 'https://lilygo.cc/products/t-weigh', tbeam: 'https://lilygo.cc/products/t-beam',
    tbeamSema: 'https://github.com/Xinyuan-LilyGO/LilyGo-LoRa-Series/blob/master/schematic/LilyGo_TBeam_V1.2-lastest.pdf',
    axp2101: 'https://files.waveshare.com/wiki/common/X-power-AXP2101_SWcharge_V1.0.pdf',
    sht4x: DS_SHT4X, sf2: 'https://sensirion.com/media/documents/356EC75F/61642475/Sensirion_Humidity_Sensors_SF2_Filter_Cap_Datasheet.pdf',
    ds18b20: 'https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf',
    hx711: 'https://cdn.sparkfun.com/datasheets/Sensors/ForceFlex/hx711_english.pdf',
    sph0645: 'https://cdn-shop.adafruit.com/product-files/3421/i2S+Datasheet.PDF',
    inmp441: 'https://product.tdk.com/en/search/sw_piezo/mic/mems-mic/info?part_no=INMP441',
    adxl345: 'https://www.analog.com/media/en/technical-documentation/data-sheets/ADXL345.pdf',
    a7670: 'https://nostris.ee/pdf/A7670%20Series%20Hardware%20Design_V1.00.pdf',
    s35e: 'https://www.orbtronic.com/content/samsung-35e-datasheet-inr18650-35e.pdf',
    lfp: 'https://www.antbatt.com/wp-content/uploads/2019/09/18650-3.2V-1800mAh-datasheet.pdf',
    iec60529: 'https://www.csagroup.org/en-gb/services/lab-testing-calibration/ingress-protection-ip-testing/'
  };
  /* Kalem başına dış ortam kararı: k = uygun | koruma | degil | veri; ut = uzman tahmini. Bölge: e = Erzurum yayla (−30 °C), kd = Karadeniz nem, f = Fethiye tuzlu hava. */
  var DIS = {
    node: [{ p: 'LilyGO T-Weigh', k: 'koruma', n: 'ESP32 çipi −40…125 °C. Kartın sıcaklık, nem ve IP değeri üreticide yok (Veri yok). Açık kart: IP67 kutu, PTFE nefes tapası, kaplama verniği ve silika jel gerekir.', e: 'Çip aralıkta; kartın diğer parçaları için değer yok (uzman tahmini: çalışır).', kd: 'Yoğuşma: kaplama + silika jel + nefes tapası.', f: 'Tuzlu hava korozyonu: kaplama zorunlu (uzman tahmini).', s: [KS.esp32, KS.tweigh], ut: true }],
    isi_nem: [{ p: 'Sensirion SHT41', k: 'koruma', n: 'Çalışma −40…125 °C, 0–100 %RH, yoğuşmada çalışır. En iyi performans 5–60 °C ve 20–80 %RH; uzun süre >80 %RH geçici kayma yapar (ör. 60 saatte +3 %RH). Isıtıcı yoğuşmayı ve kaymayı giderir (görev oranı ≤ %10). Propolis/toz için SF2 filtre kapağı (IP67, PTFE) ya da membranlı SHT41-AD1F (polyimid, IP68).', e: '−30 °C aralıkta.', kd: 'Kovan içi nem çoğu zaman yüksek: ısıtıcı belirli aralıklarla çalışmalı (firmware, yapılacak).', f: 'Kart kaplanırken sensör ağzı kapatılmalı (SHT41-AD1P koruyucu kapaklı sürüm var).', s: [KS.sht4x, KS.sf2] }],
    giris_sicak: [{ p: 'DS18B20 su geçirmez prob', k: 'uygun', n: 'Çip −55…125 °C; ±0,5 °C yalnız −10…85 °C, tüm aralıkta ±2 °C. Prob zaten kılıflı; kablo kutuya IP68 kablo rakoruyla girmeli.', e: '−30 °C\'de doğruluk ±2 °C\'ye düşer; 44 °C eşiği için önemsiz.', kd: 'Uygun.', f: 'Prob kılıf malzemesi satıcıda yok (uzman tahmini: paslanmaz).', s: [KS.ds18b20] }],
    dis_isi_nem: [{ p: 'SHT41 + radyasyon kalkanı', k: 'koruma', n: 'Sensör aralığı yukarıdaki gibi. Güneş ve yağmur için UV dayanımlı radyasyon kalkanı, toz/su için SF2 filtre kapağı gerekir. Kalkan modeli ve fiyatı: Veri yok.', e: 'Kar/kırağı: ısıtıcı aralıklı çalışmalı.', kd: 'Sis/yoğuşma: ısıtıcı.', f: 'Tuz: kart kaplaması, paslanmaz vida/kelepçe.', s: [KS.sht4x, KS.sf2] }],
    tarti: [
      { p: 'HX711 ×4 (T-Weigh üzerinde)', k: 'koruma', n: 'HX711 −40…85 °C; kart kutusunun içinde kalır.', e: 'Aralıkta.', kd: 'Kutu içinde.', f: 'Kutu içinde, kaplamalı.', s: [KS.hx711] },
      { p: '4 köşe yük hücresi', k: 'veri', n: 'Dışarıda, kovanın altında: IP67/IP68 paslanmaz çelik seçilmeli. Model ve kapasite seçilmedi (Veri yok).', e: 'Soğukta sıfır kayması olabilir; sıcaklık düzeltmesi gerekir (uzman tahmini).', kd: 'IP68 tercih.', f: 'Paslanmaz çelik gövde.', s: [KS.iec60529], ut: true }
    ],
    ses: [
      { p: 'Knowles SPH0645', k: 'koruma', n: 'Belirtilen performans yalnız 0…45 °C; −40…100 °C\'de çalışır ama performans düşer. Ses deliği nem ve propolise açık: akustik PTFE zar + tel kafes gerekir.', e: 'Kışın 0 °C altında ölçüm doğruluğu garanti değil.', kd: 'Akustik PTFE zar.', f: 'Akustik PTFE zar.', s: [KS.sph0645] },
      { p: 'TDK INMP441 (yedek)', k: 'koruma', n: 'Çalışma −40…85 °C. Üretici durumu NRND (yeni tasarım için önerilmiyor).', e: 'Aralıkta.', kd: 'Akustik PTFE zar.', f: 'Akustik PTFE zar.', s: [KS.inmp441] }
    ],
    titresim: [{ p: 'ADXL345 (GY-291)', k: 'koruma', n: 'Çalışma −40…85 °C; kart kutusunda ya da çerçeveye sabit, kaplamalı.', e: 'Aralıkta.', kd: 'Kaplama.', f: 'Kaplama.', s: [KS.adxl345] }],
    ir: [{ p: 'IR giriş sayacı', k: 'veri', n: 'Verici/alıcı parçası seçilmedi (Veri yok). Güneş/yağmur siperi ve temizlenebilir kanal gerekir.', e: 'Veri yok.', kd: 'Veri yok.', f: 'Veri yok.', s: [], ut: true }],
    gateway: [
      { p: 'LilyGO T-Beam V1.2', k: 'koruma', n: 'Kartın sıcaklık, nem ve IP değeri üreticide yok (Veri yok). LoRa çipi: LilyGO T-Beam sayfası ve Direnc.net T-Beam V1.2 ilanı 868 MHz için SX1276 yazıyor; donanım listesi SX1262 diyor, firmware/gate/lora_receive.cpp yorumu SX127x; Robo90 ilanında çip yazmıyor → satın almadan önce satıcıya sorulmalı. AXP2101\'in TS (pil sıcaklığı) ucu kartta 100 Ω ile toprağa bağlı: pil NTC\'si yok, 0 °C altında şarjı donanım kesmiyor.', e: 'Pil sorunu için «Güç» kalemine bakın.', kd: 'Kaplama + silika jel + nefes tapası.', f: 'Kaplama zorunlu (uzman tahmini).', s: [KS.tbeam, 'https://www.direnc.net/ttgo-t-beam-v11-esp32-lora-sx1262-wifi-bluetooth-868mhz-gnss-neo-6m-gps-gelistirme-modulu', KS.tbeamSema, KS.axp2101] },
      { p: 'SIMCom A7670E', k: 'koruma', n: 'Normal çalışma −30…80 °C, genişletilmiş −40…85 °C (performans 3GPP\'nin biraz altında olabilir).', e: '−30 °C normal aralığın sınırında; altı genişletilmiş aralıkta.', kd: 'Kutu içinde.', f: 'Kutu içinde, kaplamalı.', s: [KS.a7670] }
    ],
    aku: [{ p: '18650 Li-ion', k: 'degil', n: 'Samsung 35E: şarj 0…45 °C, deşarj −10…60 °C (hücre yüzeyi). LiFePO4 de 0 °C altında şarj edilmez (0…45 °C; deşarj −20…60 °C). T-Beam\'de pil NTC\'si yok. Soğuk bölgede korumasız kullanılamaz: pil sıcaklığı ölçülüp şarj yazılımla kesilmeli, pil yalıtımlı/ısıtmalı pakette olmalı.', e: '−30 °C deşarj sınırının (−10 °C) da altında → yalıtım + ısıtma şart.', kd: 'Korumayla uygun.', f: 'Güneşte kutu 45 °C üstüne çıkarsa şarj kesilmeli (uzman tahmini: gölge).', s: [KS.s35e, KS.lfp, KS.axp2101] }],
    kutu: [{ p: 'Su geçirmez kutu', k: 'koruma', n: 'IEC 60529: IP67 = toz geçirmez + 1 m suda 30 dk geçici daldırma. IP68 = sürekli daldırma; koşulu üretici belirler, IP67\'den ağır olmalı. Kutuya PTFE nefes tapası (iç-dış basınç ve yoğuşma) ve IP68 kablo rakorları gerekir. Kutu ölçüsü kart ölçüsüyle doğrulanmalı (uzman tahmini).', e: 'ABS kutunun soğuk dayanımı satıcıda yok (Veri yok).', kd: 'Silika jel + nefes tapası.', f: 'Paslanmaz vida/kelepçe; UV için gölge (uzman tahmini).', s: [KS.iec60529] }],
    kamera: [{ p: 'Kamera', k: 'veri', n: 'Model seçilmedi (Veri yok).', e: 'Veri yok.', kd: 'Veri yok.', f: 'Veri yok.', s: [], ut: true }]
  };
  var DIS_AD = { uygun: 'Uygun', koruma: 'Korumayla uygun', degil: 'Uygun değil', veri: 'Veri yok' };
  /* Satın alınacak koruma parçaları. k = kovan başına, a = arılık (gateway) başına; soguk = yalnız soğuk bölge arılıkları; ut = adet/ölçü uzman tahmini. Fiyat yoksa null → «Veri yok» + fiyat_eksik. */
  var KORUMA_PARCA = [
    { ad: 'IP67 ABS kutu SE-212 (115×65×55 mm)', ozellik: 'Kovan düğümü (T-Weigh) kutusu; ölçü kart ölçüsüyle doğrulanmalı', miktar: { k: 1, ut: true }, fiyat: { tutar: 460.87, para: 'TL', tarih: '2026-10-18', magaza: 'Direnc.net', url: 'https://www.direnc.net/se-212-ip-67-abs-contali-gri-kutu-115-x-65-x-55mm', not: 'KDV dahil' } },
    { ad: 'IP67 ABS kutu SE-056 (175×90×100 mm)', ozellik: 'Gateway kutusu (T-Beam + A7670E + 18650); ölçü kart ölçüsüyle doğrulanmalı', miktar: { a: 1, ut: true }, fiyat: { tutar: 684.16, para: 'TL', tarih: '2026-10-18', magaza: 'Direnc.net', url: 'https://www.direnc.net/se-056-ip-67-abs-contali-gri-kutu-175-x-90-x-100mm', not: 'KDV dahil' } },
    { ad: 'PTFE nefes tapası M12 (Fucon RN-AV-PC-M12P15-B001)', ozellik: 'e-PTFE membran, 1200 ml/dk @ 7 kPa, −40…150 °C', miktar: { k: 1, a: 1 }, fiyat: { tutar: 40.11, para: 'TL', tarih: '2026-10-18', magaza: 'TLS Robotik', url: 'https://www.tlsrobotik.com/urun/fucon-12mm-koruyucu-plastik-havalandirma-tapasi/', not: 'KDV dahil' } },
    { ad: 'IP68 kablo rakoru PG7 (Ortaç ORG-01)', ozellik: 'PA6, IP68, kablo 3–6,5 mm', miktar: { k: 4, a: 3, ut: true }, fiyat: { tutar: 9.08, para: 'TL', tarih: '2026-10-18', magaza: 'Doğuş Elektrik', url: 'https://www.doguselektrik.com.tr/pg-7-etanj-polyamid-kablo-rakoru-org-01-ortac-pmu1834', not: 'KDV durumu sayfada yazmıyor' } },
    { ad: 'Kart kaplama verniği (Kontakt Chemie Plastik 70, 400 ml)', ozellik: 'Konformal kaplama spreyi; arılıktaki tüm kartlar için 1 kutu (kaç karta yettiği: Veri yok)', miktar: { a: 1, ut: true }, fiyat: { tutar: 983.31, para: 'TL', tarih: '2026-10-18', magaza: 'Motorobit', url: 'https://www.motorobit.com/plastik-70-konformal-koruyucu-kaplama-spreyi-400ml', not: '819,42 TL + KDV' } },
    { ad: 'SHT41 filtre kapağı Sensirion SF2', ozellik: 'PBT gövde + PTFE filtre, IP67, −40…125 °C; karta delik açılarak takılır (hazır modüle uyumu uzman tahmini). Seçenek: membranlı SHT41-AD1F', miktar: { k: 1, a: 1 }, fiyat: null },
    { ad: 'Akustik PTFE zar (mikrofon)', ozellik: 'Sesi geçiren su geçirmez zar (ör. GORE MEMS vent); model seçilmedi', miktar: { k: 1, ut: true }, fiyat: null },
    { ad: 'Paslanmaz tel kafes (mikrofon, arı geçirmez)', ozellik: 'Arı ve propolise karşı', miktar: { k: 1, ut: true }, fiyat: null },
    { ad: 'Silika jel 5 g', ozellik: 'Kutu içi nem alıcı; düzenli değiştirilmeli', miktar: { k: 1, a: 1, ut: true }, fiyat: { tutar: 6.00, para: 'TL', tarih: '2026-10-18', magaza: 'Robolink (10\'lu paket 60,00 TL)', url: 'https://www.robolinkmarket.com/silikajel-poset-5gr-10-adet', not: 'Adet fiyatı paketten; sayfada stok yok' } },
    { ad: 'IP67/IP68 paslanmaz yük hücresi', ozellik: 'Model ve kapasite seçilmedi; tartı kalemindeki 4 köşe yük hücresinin dış ortam sürümü', miktar: { dahil: 'Tartı kalemindeki 4 köşe yük hücresi — IP67/68 paslanmaz seçilmeli' }, fiyat: null },
    { ad: 'Dış ortam 4G anten LTE-G-823', ozellik: '824–960 / 1710–2170 MHz, IP67, 3 m kablo, SMA, −40…85 °C. A7670E\'nin B1/B3/B5/B8 bantlarını kapsar; B20 (800 MHz) indirme ve B7 (2600 MHz) kapsamda değil', miktar: { a: 1 }, fiyat: { tutar: 245.12, para: 'TL', tarih: '2026-10-18', magaza: 'Robotistan', url: 'https://www.robotistan.com/lte-g-823-harici-gsm-anten', not: 'KDV dahil' } },
    { ad: 'Dış ortam LoRa anten 868 MHz (IP67)', ozellik: 'IP sınıfı yazan 868 MHz anten bulunamadı. Robotistan LTE-G-410 (3 dBi, −40…85 °C, 341,48 TL) IP sınıfı belirtmiyor → kutu içinde kullanılabilir (uzman tahmini)', miktar: { a: 1 }, fiyat: null },
    { ad: 'UV dayanımlı radyasyon kalkanı', ozellik: 'Dış ısı/nem sensörü için; dış ısı/nem kalemindeki kalkan', miktar: { dahil: 'Dış ısı/nem kalemindeki radyasyon kalkanı' }, fiyat: null },
    { ad: 'Paslanmaz vida + kelepçe takımı (A4)', ozellik: 'Tuzlu hava (Fethiye) için paslanmaz montaj', miktar: { k: 1, a: 1, ut: true }, fiyat: null },
    { ad: '10K NTC termistör (pil sıcaklığı)', ozellik: 'Pil sıcaklığını ölçüp 0 °C altında şarjı yazılımla kesmek için (T-Beam\'de pil NTC\'si yok)', miktar: { a: 1, soguk: true }, fiyat: { tutar: 11.26, para: 'TL', tarih: '2026-10-18', magaza: 'Robotistan', url: 'https://www.robotistan.com/10kohm-ntc', not: 'KDV dahil · bağlantı/firmware yapılacak' } },
    { ad: 'Isıtmalı pil paketi / ısıtıcı ped + yalıtım', ozellik: 'Soğuk bölgede pili 0 °C üstünde tutmak için; model seçilmedi', miktar: { a: 1, soguk: true }, fiyat: null }
  ];
  function korumaKalem() {
    return { id: 'koruma', ad: 'Koruma / dış ortam parçaları', cihazTipi: '—', rol: 'Elektroniği nem, yoğuşma, tuzlu hava, soğuk ve arılardan korur.', adaylar: 'Önizleme: koruma parçaları (18.10.2026)', gerekenOzellik: 'IP67 kutu, nefes tapası, IP68 rakor, kaplama, filtre kapağı, akustik zar, silika jel; soğuk bölgede pil sıcaklığına göre şarj kesme', kurallar: 'Tümü', kaynak: 'Üretici belgeleri (Koruma / dış ortam bölümü)', fiyat: 'Parça başına', durum: 'taslak – kullanıcı onayı bekliyor',
      adaylarListe: [{ id: 'koruma-set', secili: true, kaynak: 'Sensirion SF2 / SHT4x datasheet · IEC 60529 · mağaza sayfaları', metin: '', not: '', parcalar: JSON.parse(JSON.stringify(KORUMA_PARCA)) }], alternatifler: [] };
  }
  var SOGUK_IL = ['Erzurum', 'Kars', 'Ardahan', 'Ağrı', 'Bayburt', 'Gümüşhane', 'Muş', 'Bitlis', 'Van', 'Hakkari', 'Sivas'];
  /* Soğuk bölge = rakım ≥ 1100 m ya da doğu yayla ili ya da adında yayla (bakım takvimi bölge profiliyle aynı ölçüt; uzman tahmini). */
  function sogukMu(a) {
    if (!a) return false;
    var alt = Number(a.altitude || a.elevation || a.rakim), nm = String((a.name || '') + ' ' + (a.place || '') + ' ' + (a.il || '')).toLocaleLowerCase('tr');
    if (isFinite(alt) && alt > 0) return alt >= 1100;
    return /yayla|palandöken|tortum|cimil/.test(nm) || SOGUK_IL.indexOf(a.il) >= 0;
  }
  function swDurum(ad) {
    ad = String(ad || '');
    if (/SHT4[0-5]/i.test(ad)) return { d: 'taslak', t: 'Sürücü taslağı var (sht41.cpp), test edilmedi' };
    if (/DS18B20|DS18S20|MAX31820/i.test(ad)) return { d: 'kut', t: 'Kütüphane tanımlı, kod yok — yapılacak' };
    if (/NTC/i.test(ad)) return { d: 'yok', t: 'Yazılım desteği yok, yapılacak (0 °C şarj kesme)' };
    if (/kalkan|18650|güneş|kutu|yük hücresi|tapa|rakor|vernik|filtre kapağı|zar|kafes|silika|anten|vida|ısıt/i.test(ad)) return { d: 'yok0', t: 'Yazılım gerekmez' };
    return { d: 'yok', t: 'Yazılım desteği yok, yapılacak' };
  }

  /* ---------- «Aday parçalar» metnini yapıya çevir (özgün metin k.adaylar'da AYNEN kalır). ---------- */
  function bol(str, sep) { var o = [], d = 0, cur = ''; for (var i = 0; i < str.length; i++) { var c = str[i]; if (c === '(') d++; else if (c === ')') d = Math.max(0, d - 1); if (!d && str.substr(i, sep.length) === sep) { o.push(cur); cur = ''; i += sep.length - 1; continue; } cur += c; } o.push(cur); return o.map(function (x) { return x.trim(); }).filter(Boolean); }
  function parca(t) {
    var m = t.match(/^([^(]*?)\s*\(([\s\S]*)\)\s*([\s\S]*)$/), p = m ? { ad: m[1].trim(), ozellik: m[2].trim(), not: m[3].trim() } : { ad: t.trim(), ozellik: '', not: '' };
    if (/^\(/.test(t)) p = { ad: t, ozellik: '', not: '' };
    return p;
  }
  function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'p'; }
  function fiyatBul(ad) { for (var i = 0; i < FIY.length; i++) if (FIY[i][0].test(ad)) return JSON.parse(JSON.stringify(FIY[i][1])); return null; }
  function mikBul(ad, kid) { for (var i = 0; i < MIK.length; i++) if (MIK[i][0].test(ad)) return JSON.parse(JSON.stringify(MIK[i][1])); return JSON.parse(JSON.stringify(MIK_KALEM[kid] || { yok: 'Adet: Veri yok' })); }
  function yeniParca(t, kid) { var p = parca(t); p.fiyat = fiyatBul(p.ad); p.miktar = mikBul(p.ad, kid); return p; }
  function cozumle(k) {
    var segs = bol(String(k.adaylar || ''), ' · '), L = [], notlar = [];
    segs.forEach(function (sg, i) {
      var m = sg.match(/^(Seçilen[^:]*|alternatif[^:]*):\s*([\s\S]*)$/i), body = m ? m[2] : null;
      if (!m && i === 0 && !/^Veri yok/i.test(sg)) body = sg;
      if (body == null) { if (L.length) L[L.length - 1].not = (L[L.length - 1].not ? L[L.length - 1].not + ' · ' : '') + sg; else notlar.push(sg); return; }
      var a = bol(body, ' — '), ana = a.shift(), parts = bol(ana, ' + ');
      L.push({ id: k.id + '-' + slug(parts[0]), secili: m ? /^Seçilen/i.test(m[1]) : true, kaynak: k.kaynak || '', metin: sg, not: a.join(' — '), parcalar: parts.map(function (t) { return yeniParca(t, k.id); }) });
    });
    return { liste: L, not: notlar.join(' · ') };
  }
  function adayAd(c) { return (c.parcalar || []).map(function (p) { return p.ad; }).join(' + ') || 'Adsız aday'; }
  /* Aday/alternatif yalnız AYNI yazılımla çalışıp AYNI işi görürse gösterilir (kullanıcı kuralı 18.10.2026).
     SHT31-DIS: farklı komut seti · DS1822: ±2 °C, 44 °C giriş eşiği için zayıf · ADXL355: ayrı sürücü gerekir · ESP32-S3 + ayrı LoRa + HX711: yazılımı yok. */
  var UYUMSUZ = [/SHT3\d/i, /DS1822/i, /ADXL355/i, /ESP32-S3|ayrı LoRa/i];
  /* Yazılım uyumu doğrulanmamış (uzman tahmini) parçalar. */
  var UZMAN = [/INMP441/i];
  function uzmanMu(ad) { return UZMAN.some(function (r) { return r.test(String(ad || '')); }); }
  var YEDEK_NOT = 'Taslak – yalnız aynı yazılımla çalışan adaylardan; kullanıcı onayı bekliyor';
  var YEDEK_FW = 'DUZEN=2 (firmware/node/src/duzen.h) — ana düzenle aynı sürücüler; mikrofon INMP441 (yazılım uyumu uzman tahmini)';
  function uyumsuzMu(ad) { return UYUMSUZ.some(function (r) { return r.test(String(ad || '')); }); }
  function normalize(d) {
    var yeni = false;
    d.kalemler = d.kalemler || []; d.kararlar = d.kararlar || []; d.verilenKararlar = d.verilenKararlar || [];
    /* Koruma / dış ortam kalemi (önizleme): kayıtlı veride yoksa bir kez eklenir; kamera kaleminden önce. */
    if (!d.korumaEklendi && !d.kalemler.some(function (k) { return k.id === 'koruma'; })) { var ki = -1; d.kalemler.forEach(function (k, n) { if (k.id === 'kamera') ki = n; }); if (ki < 0) d.kalemler.push(korumaKalem()); else d.kalemler.splice(ki, 0, korumaKalem()); yeni = true; }
    d.kalemler.forEach(function (k) {
      if (!Array.isArray(k.adaylarListe)) { var r = cozumle(k); k.adaylarListe = r.liste; if (r.not) k.adayNot = r.not; yeni = true; }
      if (!Array.isArray(k.alternatifler)) { k.alternatifler = JSON.parse(JSON.stringify(ALT[k.id] || [])); yeni = true; }
      (ALT[k.id] || []).forEach(function (a0) { if (!k.alternatifler.some(function (a) { return a.ad === a0.ad; })) { k.alternatifler.push(JSON.parse(JSON.stringify(a0))); yeni = true; } });
      k.alternatifler.forEach(function (a) { if (uzmanMu(a.ad) && a.durum !== 'uzman') { a.durum = 'uzman'; yeni = true; } });
      var n1 = k.alternatifler.length; k.alternatifler = k.alternatifler.filter(function (a) { return a.durum !== 'uyumsuz' && !uyumsuzMu(a.ad); }); if (k.alternatifler.length !== n1) yeni = true;
      var n2 = k.adaylarListe.length; k.adaylarListe = k.adaylarListe.filter(function (c) { return c.secili || !(c.parcalar || []).some(function (p) { return uyumsuzMu(p.ad); }); }); if (k.adaylarListe.length !== n2) yeni = true;
    });
    if (!Array.isArray(d.duzenler)) {
      var ana = { id: 'ana', ad: 'Ana düzen', not: 'Seçilen parçalar', firmware: 'DUZEN=1 (firmware/node/src/duzen.h)', secim: {} }, yed = { id: 'yedek', ad: 'Yedek düzen', not: YEDEK_NOT, firmware: YEDEK_FW, secim: {} };
      d.kalemler.forEach(function (k) { var s = k.adaylarListe.filter(function (c) { return c.secili; })[0], a = k.adaylarListe.filter(function (c) { return !c.secili; })[0]; if (s) ana.secim[k.id] = s.id; if (a || s) yed.secim[k.id] = (a || s).id; });
      d.duzenler = [ana, yed]; yeni = true;
    }
    /* Düzende silinmiş (uyumsuz) aday kaldıysa: seçilen uyumlu adaya dön; o da yoksa boş → «Veri yok». */
    d.duzenler.forEach(function (z) {
      d.kalemler.forEach(function (k) {
        var id = z.secim && z.secim[k.id]; if (!id || k.adaylarListe.some(function (c) { return c.id === id; })) return;
        var s0 = k.adaylarListe.filter(function (c) { return c.secili; })[0];
        if (s0) z.secim[k.id] = s0.id; else delete z.secim[k.id]; yeni = true;
      });
    });
    d.duzenler.forEach(function (z) { if (z.id === 'yedek' && /#error|sürücüler yok/.test(String(z.firmware || ''))) { z.firmware = YEDEK_FW; yeni = true; } if (z.id === 'yedek' && /mevcut «alternatif» adaylardan/.test(String(z.not || ''))) { z.not = YEDEK_NOT; yeni = true; } });
    /* Kutu kalemindeki «Su geçirmez kutu» artık Koruma kalemindeki IP67 kutuyla alınır (çift sayılmaz). */
    d.kalemler.forEach(function (k) { if (k.id !== 'kutu') return; (k.adaylarListe || []).forEach(function (c) { (c.parcalar || []).forEach(function (p) { if (/^Su geçirmez kutu/i.test(p.ad) && !(p.miktar && p.miktar.dahil)) { p.miktar = { dahil: 'Koruma / dış ortam › IP67 kutu' }; yeni = true; } }); }); });
    if (!d.korumaEklendi) { var kk = d.kalemler.filter(function (k) { return k.id === 'koruma'; })[0], ks = kk && secili(kk); if (ks) d.duzenler.forEach(function (z) { z.secim = z.secim || {}; if (!z.secim.koruma) z.secim.koruma = ks.id; }); d.korumaEklendi = true; yeni = true; }
    d.arilikDuzen = d.arilikDuzen || {};
    return yeni;
  }

  /* ---------- Kur (TCMB, /api/kur) ---------- */
  var KUR = null, KUR_ANAH = 'superari.kur.v1';
  try { KUR = JSON.parse(localStorage.getItem(KUR_ANAH) || 'null'); } catch (e) { KUR = null; }
  function kurYukle() {
    return fetch('/api/kur', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('kur ' + r.status); return r.json(); })
      .then(function (o) { if (o && o.kurlar) { KUR = o; try { localStorage.setItem(KUR_ANAH, JSON.stringify(o)); } catch (e) {} } })
      .catch(function () {}).then(function () { if (!D) return; if (s.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) paintMaliyet(); else paint(); });
  }
  function tl(n) { return n == null || !isFinite(n) ? 'Veri yok' : n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'; }
  function trTarih(iso) { var m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? m[3] + '.' + m[2] + '.' + m[1] : '—'; }
  function gun(iso) { var t = Date.parse(String(iso || '') + 'T12:00:00+03:00'); return isFinite(t) ? Math.floor((Date.now() - t) / 864e5) : null; }
  function birimTL(f) { if (!f || !isFinite(+f.tutar)) return null; if ((f.para || 'TL') === 'TL') return +f.tutar; var r = KUR && KUR.kurlar && KUR.kurlar[f.para]; return r ? +f.tutar * r : null; }
  function fiyatKisa(f) {
    if (!f || !isFinite(+f.tutar)) return '<span class="dn-vy">Veri yok</span>';
    var t = birimTL(f), g = gun(f.tarih), eski = g != null && g > 30 ? ' <span class="dn-b eski">fiyat eski</span>' : '';
    return (f.para && f.para !== 'TL' ? esc(String(f.tutar).replace('.', ',')) + ' ' + esc(f.para) + ' ≈ ' + (t == null ? '<span class="dn-vy">kur: Veri yok</span>' : tl(t)) : tl(t)) + eski;
  }
  function fiyatUzun(f) {
    if (!f || !isFinite(+f.tutar)) return '<span class="dn-vy">Fiyat: Veri yok</span>';
    return 'Fiyat: ' + fiyatKisa(f) + '<br><small>' + esc(f.magaza || '—') + ' · ' + trTarih(f.tarih) + (f.url ? ' · <a href="' + esc(f.url) + '" target="_blank" rel="noopener">bağlantı</a>' : '') + (f.not ? ' · ' + esc(f.not) : '') + (f.para && f.para !== 'TL' && KUR ? ' · kur TCMB ' + esc(KUR.tarih || '') : '') + '</small>';
  }
  function miktarMetin(m) { if (!m) return 'Adet: Veri yok'; if (m.dahil) return 'Ayrıca alınmaz (' + esc(m.dahil) + ')'; if (m.yok) return esc(m.yok); return (m.k ? m.k + ' / kovan' : '') + (m.k && m.a ? ' + ' : '') + (m.a ? m.a + ' / arılık' : '') + (m.ut ? ' <span class="dn-b ut">uzman tahmini</span>' : ''); }
  function swRozet(ad) { var s = swDurum(ad); return '<span class="dn-b sw-' + s.d + '">' + esc(s.t) + '</span>' + (uzmanMu(ad) ? ' <span class="dn-b u-uzman">yazılım uyumu: uzman tahmini</span>' : ''); }
  /* Özgün fiyat metnindeki her USD/EUR tutarının yanına TL karşılığı (TCMB). */
  function metinTL(t) {
    var o = [], re = /(\d+(?:[.,]\d+)?)\s*(USD|EUR)/g, m;
    while ((m = re.exec(String(t || '')))) { var n = +m[1].replace(',', '.'), r = KUR && KUR.kurlar && KUR.kurlar[m[2]]; o.push(m[1] + ' ' + m[2] + ' ≈ ' + (r ? tl(n * r) : 'kur: Veri yok')); }
    return o.length ? '<small class="dn-fw" style="display:block">' + esc(o.join(' · ')) + (KUR && KUR.tarih ? ' · kur TCMB ' + esc(KUR.tarih) : '') + '</small>' : '';
  }

  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-donanim';
  s.innerHTML = '<h2>Donanım</h2><p class="fe-sub">Uygulamanın kurallarına göre çıkarılmış donanım listesi. Durum: <b data-dn-durum>—</b>. Özellikler üretici sayfası / datasheet\'ten; doğrulanamayan «Veri yok». Her kayıt yeni sürüm olur ve değişiklik kaydına yazılır.</p>'
    + '<p class="fe-meta" data-dn-meta style="min-height:1.2em"></p><div data-dn-liste>Yükleniyor…</div>'
    + '<h3 class="dn-h3">Donanım düzenleri</h3><div data-dn-duzen></div>'
    + '<h3 class="dn-h3" id="s-donanim-alim">Satın alma listesi</h3><div data-dn-alim></div>'
    + '<h3 class="dn-h3">Verilen kararlar</h3><div data-dn-verilen></div>'
    + '<h3 class="dn-h3">Açık kararlar</h3><div data-dn-karar></div>'
    + '<div class="dn-alt"><button class="btn" data-dn-ekle>Kalem ekle</button><button class="btn" data-dn-kekle>Karar ekle</button><label class="dn-not">Sürüm notu<input data-dn-not placeholder="Ne değişti?"></label><button class="btn" data-dn-kaydet>Kaydet (yeni sürüm)</button></div>'
    + '<p class="fe-meta" data-dn-stat style="min-height:1.2em"></p><h3 class="dn-h3">Sürümler</h3><div data-dn-surum class="bd" style="max-height:30vh;overflow:auto">—</div>'
    + '<style>.dn-h3{margin:.9rem 0 .3rem;font-size:1rem}.dn-k{border:1px solid #e5e7eb;border-radius:10px;padding:.5rem .6rem;margin:.4rem 0}.dn-k>summary{cursor:pointer;font-weight:600;line-height:1.35}.dn-sec{display:block;font-weight:400;font-size:.8rem;color:#475569;margin-top:2px}'
    + '.dn-g{display:grid;grid-template-columns:11rem 1fr;gap:.25rem .5rem;margin-top:.4rem;font-size:.88rem}.dn-g textarea{width:100%;min-height:2.2rem;font:inherit;font-size:.85rem}'
    + '.dn-d{font-size:.72rem;background:#fdf0cf;color:#7a5300;border-radius:8px;padding:1px 7px;margin-left:6px;font-weight:400}.dn-d.ok{background:#e6f4ea;color:#1e6b34}'
    + '.dn-h4{font-size:.86rem;margin:.6rem 0 .25rem;color:#334155}.dn-c{border:1px solid #e2e8f0;border-radius:9px;margin:.3rem 0;background:#fff}.dn-c.on{border-color:#16a34a;background:#f3fbf5}.dn-c>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:.15rem .5rem;align-items:center;padding:.45rem .55rem;min-height:2.6rem}.dn-c>summary::-webkit-details-marker{display:none}'
    + '.dn-c .ca{font-weight:600;font-size:.88rem;line-height:1.3;min-width:0;overflow-wrap:anywhere}.dn-c .cf{grid-column:1/2;font-size:.78rem;color:#475569}.dn-c .cs{grid-row:1/3;grid-column:2}.dn-c .cb{padding:0 .55rem .55rem;font-size:.82rem;line-height:1.4;color:#334155;overflow-wrap:anywhere}.dn-c .cb p{margin:.25rem 0}'
    + '.dn-ok{display:inline-block;font-size:.78rem;font-weight:700;color:#166534;background:#dcfce7;border-radius:8px;padding:.3rem .55rem;white-space:nowrap}.dn-sb{width:auto!important;padding:.3rem .8rem!important;font-size:.8rem!important;min-height:2rem;white-space:nowrap}.dn-sb[disabled]{opacity:.45}'
    + '.dn-b{display:inline-block;font-size:.7rem;border-radius:7px;padding:0 6px;margin:1px 2px 1px 0;font-weight:500;line-height:1.5}.dn-b.eski{background:#fee2e2;color:#991b1b}.dn-b.ut{background:#ede9fe;color:#5b21b6}.dn-b.sw-taslak{background:#fef3c7;color:#92400e}.dn-b.sw-kut{background:#fef3c7;color:#92400e}.dn-b.sw-yok{background:#fee2e2;color:#991b1b}.dn-b.sw-yok0{background:#f1f5f9;color:#475569}.dn-b.u-uyumlu{background:#dcfce7;color:#166534}.dn-b.u-uzman{background:#ede9fe;color:#5b21b6}.dn-b.u-uyumsuz{background:#fee2e2;color:#991b1b}'
    + '.dn-b.v-uygun{background:#dcfce7;color:#166534}.dn-b.v-koruma{background:#fef3c7;color:#92400e}.dn-b.v-degil{background:#fee2e2;color:#991b1b}.dn-b.v-veri{background:#f1f5f9;color:#475569}.dn-dis>summary .cf{grid-column:1/3;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.dn-dis:not([open]) .dn-tam{display:none}.dn-dis[open]>summary .cf{display:none}.dn-cb{display:flex!important;align-items:center;gap:.4rem;font-size:.8rem;color:#334155}.dn-cb input{width:auto!important;display:inline-block!important;margin:0}.dn-vy{color:#991b1b;font-weight:600}.dn-fw{font-size:.76rem;color:#475569;background:#f8fafc;border-radius:7px;padding:.3rem .45rem;margin:.2rem 0}.dn-form{display:grid;gap:.35rem;margin:.4rem 0}.dn-form label{display:block;font-size:.78rem;color:#475569}.dn-form input,.dn-form select,.dn-form textarea{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:.88rem;margin-top:2px}.dn-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.35rem}.dn-2>label{min-width:0}.dn-form input[type=date]{min-width:0;-webkit-appearance:none;appearance:none;min-height:2.6rem}.dn-r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.1rem .5rem;padding:.4rem 0;border-bottom:1px solid #eef2f7;font-size:.84rem;line-height:1.3}.dn-r .ra{min-width:0;overflow-wrap:anywhere}.dn-r .rt{text-align:right;white-space:nowrap;font-weight:600}.dn-r small{display:block;font-weight:400;color:#64748b;font-size:.74rem}.dn-r.top{font-weight:700;border-bottom:0;border-top:2px solid #cbd5e1}.dn-r.top .ra{font-weight:700}'
    + '.dn-t{width:100%;border-collapse:collapse;font-size:.8rem}.dn-t td,.dn-t th{border-bottom:1px solid #eef2f7;padding:.3rem .25rem;text-align:left;vertical-align:top}.dn-t td.n{text-align:right;white-space:nowrap}.dn-t tfoot td{font-weight:700;border-top:2px solid #cbd5e1}.dn-tw{overflow-x:auto}.dn-kur{font-size:.78rem;color:#334155;background:#eff6ff;border-radius:8px;padding:.35rem .5rem;margin:.3rem 0}'
    + '.dn-alt{display:flex;flex-wrap:wrap;gap:.4rem;align-items:end;margin:.6rem 0}.dn-alt .btn{width:auto;padding:.4rem 1rem}.dn-not{flex:1;min-width:200px;display:block}.dn-not input{display:block;width:100%}'
    + '@media (max-width:640px){.dn-g{grid-template-columns:1fr;gap:.1rem}.dn-g label{margin-top:.35rem;font-size:.78rem;color:#475569}.dn-t{font-size:.76rem}}</style>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-donanim">Donanım</a>');
  var q = function (a) { return s.querySelector('[' + a + ']'); };
  var ORNEK = new URLSearchParams(location.search).get('demo') === '1' || !B, CL = null, D = null, SUR = [], ACIK = {}, ALIM = { duzen: 'ana', kovan: '', soguk: false };
  function stat(t) { q('data-dn-stat').textContent = t || ''; }
  function tf(iso) { var d = new Date(iso); return isFinite(d) ? d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (TSİ)' : '—'; }
  function alan(grp, i, f) { var v = (D[grp][i] || {})[f[0]]; return '<label>' + esc(f[1]) + '</label><div><textarea data-dn-f="' + grp + '|' + i + '|' + f[0] + '">' + esc(v) + '</textarea>' + (f[0] === 'fiyat' ? metinTL(v) : '') + '</div>'; }
  function aday(k, id) { return (k.adaylarListe || []).filter(function (c) { return c.id === id; })[0] || null; }
  function secili(k) { return (k.adaylarListe || []).filter(function (c) { return c.secili; })[0] || null; }
  function duzen(id) { return (D.duzenler || []).filter(function (z) { return z.id === id; })[0] || D.duzenler[0]; }

  function kart(k, i, c, j) {
    var ac = ACIK['c' + c.id] ? ' open' : '', ps = c.parcalar || [];
    var fyt = ps.map(function (p) { return fiyatKisa(p.fiyat); }).join(' + ');
    var b = '<details class="dn-c' + (c.secili ? ' on' : '') + '" data-dn-ac="c' + esc(c.id) + '"' + ac + '><summary><span class="ca">' + esc(adayAd(c)) + '</span><span class="cs">' + (c.secili ? '<span class="dn-ok">✓ Seçilen</span>' : '<button class="btn dn-sb" data-dn-sec="' + i + '|' + j + '">Seç</button>') + '</span><span class="cf">' + fyt + '</span></summary><div class="cb">';
    b += ps.map(function (p, pi) {
      return '<p><b>' + esc(p.ad) + '</b>' + (p.ozellik ? ' — ' + esc(p.ozellik) : '') + (p.not ? ' <i>' + esc(p.not) + '</i>' : '') + '<br>' + fiyatUzun(p.fiyat) + '<br><small>Miktar: ' + miktarMetin(p.miktar) + '</small>' + (p.ad ? '<br>' + swRozet(p.ad) : '') + '</p>';
    }).join('');
    if (c.not) b += '<p><small>Not: ' + esc(c.not) + '</small></p>';
    b += '<p><small>Kaynak: ' + esc(c.kaynak || 'Veri yok') + '</small></p>';
    if (c.metin) b += '<p><small>Özgün metin: «' + esc(c.metin) + '»</small></p>';
    if (c.yeni) b += '<div class="dn-form">' + ['ad|Parça adı', 'ozellik|Özellikler (doğrulanmış)', 'kaynak|Kaynak (datasheet / ürün sayfası)'].map(function (x) { var a = x.split('|'), v = a[0] === 'kaynak' ? c.kaynak : (ps[0] || {})[a[0]]; return '<label>' + a[1] + '<input data-dn-cf="' + i + '|' + j + '|' + a[0] + '" value="' + esc(v || '') + '"></label>'; }).join('')
      + '<div class="dn-2"><label>Fiyat<input inputmode="decimal" data-dn-cf="' + i + '|' + j + '|tutar" value="' + esc(ps[0] && ps[0].fiyat ? ps[0].fiyat.tutar : '') + '"></label><label>Para birimi<select data-dn-cf="' + i + '|' + j + '|para">' + ['TL', 'USD', 'EUR'].map(function (u) { return '<option' + (ps[0] && ps[0].fiyat && ps[0].fiyat.para === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label></div>'
      + '<label>Fiyat tarihi<input type="date" data-dn-cf="' + i + '|' + j + '|tarih" value="' + esc(ps[0] && ps[0].fiyat ? ps[0].fiyat.tarih : '') + '"></label><label>Mağaza<input data-dn-cf="' + i + '|' + j + '|magaza" value="' + esc(ps[0] && ps[0].fiyat ? ps[0].fiyat.magaza : '') + '"></label>'
      + '<label>Bağlantı<input type="url" data-dn-cf="' + i + '|' + j + '|url" value="' + esc(ps[0] && ps[0].fiyat ? ps[0].fiyat.url : '') + '"></label></div>';
    return b + '</div></details>';
  }
  function altKart(k, i, a, j) {
    var ac = ACIK['a' + k.id + j] ? ' open' : '', ut = a.durum === 'uzman';
    var dur = a.durum === 'uyumlu' ? 'Uyumlu' : a.durum === 'uyumsuz' ? 'Uyumsuz' : 'uzman tahmini';
    return '<details class="dn-c" data-dn-ac="a' + esc(k.id + j) + '"' + ac + '><summary><span class="ca">' + esc(a.ad) + ' <span class="dn-b u-' + esc(a.durum) + '">' + dur + '</span></span><span class="cs"><button class="btn dn-sb" data-dn-asec="' + i + '|' + j + '"' + (a.durum === 'uyumsuz' ? ' disabled title="Firmware değişmeden çalışmaz"' : '') + '>Seç</button></span><span class="cf">' + fiyatKisa(a.fiyat) + '</span></summary><div class="cb">'
      + '<p><b>Farkı:</b> ' + esc(a.fark) + '</p><p><b>Uyumluluk:</b> ' + esc(a.uyum) + (ut ? ' <span class="dn-b ut">uzman tahmini</span>' : '') + '</p><p>' + fiyatUzun(a.fiyat) + '</p><p><small>Kaynak: <a href="' + esc(a.kaynak) + '" target="_blank" rel="noopener">' + esc(String(a.kaynak).replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) + '</a></small></p></div></details>';
  }
  /* Koruma / dış ortam: parça başına karar, bölge notları, kaynak (kaynaklar yalnız yönetici panelinde). */
  function kisaUrl(u) { var m = String(u).match(/^https?:\/\/(?:www\.)?([^\/?#]+)[^?#]*?([^\/?#]*)(?:[?#].*)?$/); if (!m) return String(u).slice(0, 40); var f = decodeURIComponent(m[2] || '').replace(/\.(pdf|html?)$/i, '').replace(/[_+]+/g, ' ').slice(0, 28); return m[1] + (f ? ' › ' + f : ''); }
  function disHtml(k) {
    var L = DIS[k.id]; if (!L || !L.length) return '';
    return '<div class="dn-h4">Koruma / dış ortam</div>' + L.map(function (x, j) {
      var ac = ACIK['d' + k.id + j] ? ' open' : '';
      return '<details class="dn-c dn-dis" data-dn-ac="d' + esc(k.id + j) + '"' + ac + '><summary><span class="ca">' + esc(x.p) + ' <span class="dn-b v-' + esc(x.k) + '">' + esc(DIS_AD[x.k] || 'Veri yok') + '</span>' + (x.ut ? ' <span class="dn-b ut">uzman tahmini</span>' : '') + '</span><span class="cf">' + esc(x.n) + '</span></summary><div class="cb">'
        + '<p class="dn-tam">' + esc(x.n) + '</p><p><b>Erzurum yayla (−30 °C):</b> ' + esc(x.e) + '</p><p><b>Karadeniz (nem):</b> ' + esc(x.kd) + '</p><p><b>Fethiye (tuzlu hava):</b> ' + esc(x.f) + '</p>'
        + '<p><small>Kaynak: ' + (x.s && x.s.length ? x.s.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(kisaUrl(u)) + '</a>'; }).join(' · ') : 'Veri yok') + '</small></p></div></details>';
    }).join('');
  }
  function paintKalemler() {
    q('data-dn-liste').innerHTML = (D.kalemler || []).map(function (k, i) {
      var sc = secili(k), alts = k.alternatifler || [];
      return '<details class="dn-k" data-dn-ac="k' + esc(k.id) + '"' + (ACIK['k' + k.id] ? ' open' : '') + '><summary>' + esc(k.ad || 'Yeni kalem') + ' <span class="' + dCls(k.durum) + '">' + esc(k.durum || 'taslak – kullanıcı onayı bekliyor') + '</span><span class="dn-sec">Seçilen: ' + (sc ? esc(adayAd(sc)) : '<span class="dn-vy">Veri yok</span>') + '</span></summary>'
        + '<div class="dn-h4">Aday parçalar</div>' + ((k.adaylarListe || []).map(function (c, j) { return kart(k, i, c, j); }).join('') || '<p class="mk-vy">Veri yok</p>')
        + (k.adayNot ? '<p class="dn-fw">' + esc(k.adayNot) + '</p>' : '')
        + '<button class="btn dn-sb" data-dn-aekle="' + i + '">+ Aday ekle</button>'
        + disHtml(k)
        + '<div class="dn-h4">Aynı yazılımla çalışan alternatifler</div><div class="dn-fw">Bugünkü firmware: ' + esc(FW[k.id] || 'Veri yok') + '</div>'
        + (alts.length ? alts.map(function (a, j) { return altKart(k, i, a, j); }).join('') : '<p class="dn-fw">Veri yok — firmware\'de bu kalem için sürücü kodu olmadığından «aynı yazılımla çalışır» doğrulanamıyor.</p>')
        + '<details class="dn-c" data-dn-ac="f' + esc(k.id) + '"' + (ACIK['f' + k.id] ? ' open' : '') + '><summary><span class="ca">Ayrıntılar (özgün alanlar)</span></summary><div class="cb"><div class="dn-g">' + F.map(function (f) { return alan('kalemler', i, f); }).join('') + '</div><button class="btn dn-sb" data-dn-sil="kalemler|' + i + '" style="margin-top:.3rem">Kalemi sil</button></div></details></details>';
    }).join('') || '<p class="mk-vy">Veri yok</p>';
  }
  function ariliklar() { try { var a = JSON.parse(localStorage.getItem('superari.ariliklar.v1') || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && x.id; }) : []; } catch (e) { return []; } }
  function paintDuzen() {
    var Z = D.duzenler || [];
    var h = Z.map(function (z, zi) {
      var yok = 0, sat = D.kalemler.map(function (k) {
        var c = aday(k, (z.secim || {})[k.id]), ps = c ? c.parcalar : [];
        var sw = ps.map(function (p) { var s = swDurum(p.ad); if (s.d === 'yok' || s.d === 'kut' || s.d === 'taslak') yok++; return (ps.length > 1 ? '<small>' + esc(p.ad) + ':</small> ' : '') + swRozet(p.ad); }).join('<br>');
        return '<label>' + esc(k.ad) + '<select data-dn-zs="' + zi + '|' + esc(k.id) + '"><option value="">— Veri yok —</option>' + (k.adaylarListe || []).map(function (c2) { return '<option value="' + esc(c2.id) + '"' + (c && c2.id === c.id ? ' selected' : '') + '>' + esc(adayAd(c2)) + '</option>'; }).join('') + '</select>' + (ps.length ? '<span style="display:block;margin-top:2px">' + sw + '</span>' : '') + '</label>';
      }).join('');
      return '<details class="dn-k" data-dn-ac="z' + esc(z.id) + '"' + (ACIK['z' + z.id] ? ' open' : '') + '><summary>' + esc(z.ad) + ' <span class="dn-b ' + (yok ? 'sw-yok' : 'u-uyumlu') + '">' + (yok ? 'yazılım desteği yok, yapılacak (' + yok + ' parça)' : 'hazır') + '</span><span class="dn-sec">' + esc(z.not || '') + ' · Firmware: ' + esc(z.firmware || 'Veri yok') + '</span></summary><div class="dn-form">' + sat + '</div></details>';
    }).join('');
    var A = ariliklar();
    h += '<div class="dn-h4">Arılığa düzen ata</div>' + (A.length ? '<div class="dn-form">' + A.map(function (a) {
      return '<label>' + esc(a.name || a.ad || a.id) + ' · ' + (isFinite(+a.hiveCount) ? +a.hiveCount + ' kovan' : 'kovan sayısı: Veri yok') + '<select data-dn-ad="' + esc(a.id) + '">' + Z.map(function (z) { return '<option value="' + esc(z.id) + '"' + ((D.arilikDuzen[a.id] || 'ana') === z.id ? ' selected' : '') + '>' + esc(z.ad) + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div>' : '<p class="mk-vy">Arılık bulunamadı (Veri yok)</p>')
      + '<p class="dn-fw">Düzen arılığa kaydedilir ve satın alma listesi buna göre hesaplanır. Cihaza düzen gönderme (arılık → gateway → düğüm) henüz yok; firmware derleme bayrağıyla seçilir (DUZEN=1/2), test edilmedi.</p>';
    q('data-dn-duzen').innerHTML = h;
  }
  /* ---------- Satın alma listesi + maliyet ---------- */
  var EKSIK_GONDERILDI = {};
  function satirlar(z) {
    var o = [];
    D.kalemler.forEach(function (k) { var c = aday(k, (z.secim || {})[k.id]); (c ? c.parcalar : []).forEach(function (p) { o.push({ k: k, c: c, p: p }); }); });
    return o;
  }
  function hesap(z, kovan, soguk) {
    var tot = 0, eksik = [], kv = 0, gw = 0, kvE = 0, gwE = 0, kvK = 0, gwK = 0, sg = 0, sgE = 0, L = satirlar(z).map(function (r) {
      var m = r.p.miktar || {}, adet = null, kor = r.k.id === 'koruma';
      if (!m.dahil && !m.yok) adet = m.soguk ? (soguk ? (m.a || 0) : 0) : (m.k || 0) * (kovan || 0) + (m.a || 0);
      var bt = birimTL(r.p.fiyat), top = adet != null && bt != null ? adet * bt : null;
      var o = { r: r, adet: adet, bt: bt, top: top };
      if (!m.dahil) { if (top != null) tot += top; else eksik.push(o); }
      /* 1 kovan = kovan başına parçalar; 1 gateway = arılık başına parçalar (gateway, 4G, dış sensör, kalkan, koruma); soğuk bölge eki ayrı. */
      if (!m.dahil && !m.yok) {
        if (m.soguk) { if (bt != null) sg += (m.a || 0) * bt; else sgE++; }
        else {
          if (m.k) { if (bt != null) { kv += m.k * bt; if (kor) kvK += m.k * bt; } else kvE++; }
          if (m.a) { if (bt != null) { gw += m.a * bt; if (kor) gwK += m.a * bt; } else gwE++; }
        }
      }
      return o;
    });
    return { L: L, tot: tot, eksik: eksik, kovanTL: kv, gatewayTL: gw, kovanEksik: kvE, gatewayEksik: gwE, kovanKorumaTL: kvK, gatewayKorumaTL: gwK, sogukTL: sg, sogukEksik: sgE };
  }
  function eksikBildir(list) {
    if (ORNEK || !CL || !list.length) return;
    var items = [], seen = {};
    list.forEach(function (x) { var key = 'donanim:' + x.r.k.id + ':' + slug(x.r.p.ad); if (seen[key] || EKSIK_GONDERILDI[key]) return; seen[key] = 1; items.push({ n: x.adet || 1, key: key, name: x.r.k.ad + ' — ' + x.r.p.ad, unit: 'adet', scope: 'donanim', first: new Date().toISOString(), last: new Date().toISOString() }); });
    if (!items.length) return;
    items.forEach(function (x) { EKSIK_GONDERILDI[x.key] = 1; });
    CL.rpc('sa_report_fiyat_eksik', { p_items: items, p_version: 'donanim' }).then(function (r) { if (r && r.error) throw r.error; }).catch(function () { items.forEach(function (x) { delete EKSIK_GONDERILDI[x.key]; }); });
  }
  /* Koruma parçaları: 1 kovan / 1 gateway / soğuk bölge eki ayrı listeler. */
  function korumaListe(B) {
    var grp = { k: [], a: [], s: [] };
    B.L.forEach(function (x) {
      if (x.r.k.id !== 'koruma') return; var m = x.r.p.miktar || {};
      if (m.dahil || m.yok) return;
      if (m.soguk) grp.s.push({ x: x, n: m.a || 0 }); else { if (m.k) grp.k.push({ x: x, n: m.k }); if (m.a) grp.a.push({ x: x, n: m.a }); }
    });
    function satir(g) {
      var p = g.x.r.p, f = p.fiyat, bt = g.x.bt, m = p.miktar || {};
      return '<div class="dn-r"><div class="ra">' + esc(p.ad) + '<small>' + (f && f.magaza ? esc(f.magaza) + ' · ' + trTarih(f.tarih) : 'fiyat: Veri yok') + '</small></div><div class="rt">' + (bt == null ? '<span class="dn-vy">Veri yok</span><small>' + g.n + (m.ut ? '*' : '') + ' adet</small>' : tl(g.n * bt) + '<small>' + g.n + (m.ut ? '*' : '') + ' × ' + fiyatKisa(f) + '</small>') + '</div></div>';
    }
    if (!grp.k.length && !grp.a.length && !grp.s.length) return '';
    return '<details class="dn-c" data-dn-ac="mk"' + (ACIK.mk ? ' open' : '') + '><summary><span class="ca">Koruma parçaları (1 kovan · 1 gateway · soğuk bölge)</span><span class="cf">' + tl(B.kovanKorumaTL) + ' / kovan · ' + tl(B.gatewayKorumaTL) + ' / gateway</span></summary><div class="cb">'
      + '<div class="dn-h4">1 kovan</div>' + grp.k.map(satir).join('') + '<div class="dn-r top"><div class="ra">Koruma · 1 kovan<small>fiyatı bilinenler</small></div><div class="rt">' + tl(B.kovanKorumaTL) + '</div></div>'
      + '<div class="dn-h4">1 gateway</div>' + grp.a.map(satir).join('') + '<div class="dn-r top"><div class="ra">Koruma · 1 gateway<small>fiyatı bilinenler</small></div><div class="rt">' + tl(B.gatewayKorumaTL) + '</div></div>'
      + '<div class="dn-h4">Soğuk bölge eki (gateway başına)</div>' + grp.s.map(satir).join('')
      + '<p class="dn-fw">* adet/ölçü uzman tahmini. Yük hücresi ve radyasyon kalkanı kendi kalemlerinde sayılır (IP67/68 paslanmaz, UV dayanımlı seçilmeli).</p></div></details>';
  }
  function paintMaliyet() {
    var Z = D.duzenler || [], z = duzen(ALIM.duzen), A = ariliklar(), kov = ALIM.kovan === '' ? 1 : Math.max(0, +ALIM.kovan || 0);
    var kur = KUR && KUR.kurlar ? '<div class="dn-kur">Kur: TCMB döviz satış, bülten ' + esc(KUR.tarih || '—') + ' · 1 USD = ' + (KUR.kurlar.USD ? KUR.kurlar.USD.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) : 'Veri yok') + ' TL · 1 EUR = ' + (KUR.kurlar.EUR ? KUR.kurlar.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) : 'Veri yok') + ' TL · sayfa açılışında güncellenir</div>' : '<div class="dn-kur">Kur: <span class="dn-vy">Veri yok</span> (TCMB okunamadı) — USD/EUR fiyatlar TL\'ye çevrilemedi</div>';
    var H = hesap(z, kov, !!ALIM.soguk);
    var h = kur + '<div class="dn-h4">Birim maliyet (TL) — ' + esc(z.ad) + '</div>';
    var B1 = hesap(z, 1), ek = function (n) { return n ? '<small class="dn-vy">+ ' + n + ' parça Veri yok</small>' : ''; };
    h += '<div class="dn-r"><div class="ra">1 kovan<small>kart, sensörler, tartı · koruma parçaları ' + tl(B1.kovanKorumaTL) + ' dahil</small></div><div class="rt">' + tl(B1.kovanTL) + ek(B1.kovanEksik) + '</div></div>'
      + '<div class="dn-r"><div class="ra">1 gateway<small>gateway, 4G, dış ısı/nem · koruma parçaları ' + tl(B1.gatewayKorumaTL) + ' dahil</small></div><div class="rt">' + tl(B1.gatewayTL) + ek(B1.gatewayEksik) + '</div></div>'
      + '<div class="dn-r"><div class="ra">Soğuk bölge eki (gateway başına)<small>pil sıcaklığı NTC + ısıtmalı paket · yalnız soğuk bölge arılıkları</small></div><div class="rt">' + tl(B1.sogukTL) + ek(B1.sogukEksik) + '</div></div>';
    h += korumaListe(B1);
    h += '<div class="dn-h4">Arılık toplamı (TL) = 1 kovan × kovan sayısı + 1 gateway (+ soğuk bölge eki)</div>';
    var genel = 0, dz = {};
    var satir = A.length ? A.map(function (a) { return { ad: a.name || a.ad || a.id, z: duzen(D.arilikDuzen[a.id] || 'ana'), kov: isFinite(+a.hiveCount) ? +a.hiveCount : null, sg: sogukMu(a) }; }) : [{ ad: 'Hesap (örnek arılık)', z: z, kov: kov, sg: !!ALIM.soguk }];
    h += satir.map(function (r) {
      if (r.kov == null) return '<div class="dn-r"><div class="ra">' + esc(r.ad) + '<small>' + esc(r.z.ad) + ' · kovan sayısı: Veri yok</small></div><div class="rt"><span class="dn-vy">Veri yok</span></div></div>';
      var x = hesap(r.z, r.kov, r.sg), b = hesap(r.z, 1, r.sg), tt = b.kovanTL * r.kov + b.gatewayTL + (r.sg ? b.sogukTL : 0); genel += tt; dz[r.z.ad] = (dz[r.z.ad] || 0) + tt;
      return '<div class="dn-r"><div class="ra">' + esc(r.ad) + '<small>' + esc(r.z.ad) + ' · ' + r.kov + ' kovan × ' + tl(b.kovanTL) + ' + 1 gateway ' + tl(b.gatewayTL) + (r.sg ? ' + soğuk bölge eki ' + tl(b.sogukTL) : '') + '</small></div><div class="rt">' + tl(tt) + ek(x.eksik.length) + '</div></div>';
    }).join('') + Object.keys(dz).map(function (n) { return '<div class="dn-r"><div class="ra">' + esc(n) + ' toplamı</div><div class="rt">' + tl(dz[n]) + '</div></div>'; }).join('')
      + '<div class="dn-r top"><div class="ra">Genel toplam<small>yalnız fiyatı bilinen parçalar</small></div><div class="rt">' + tl(genel) + '</div></div>';
    h += '<div class="dn-h4">Parça listesi</div><div class="dn-form"><div class="dn-2"><label>Düzen<select data-dn-alim="duzen">' + Z.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === z.id ? ' selected' : '') + '>' + esc(x.ad) + '</option>'; }).join('') + '</select></label><label>Kovan sayısı (örnek arılık, 1 gateway)<input type="number" min="0" inputmode="numeric" data-dn-alim="kovan" value="' + esc(ALIM.kovan === '' ? 1 : ALIM.kovan) + '"></label></div><label class="dn-cb"><input type="checkbox" data-dn-alim="soguk"' + (ALIM.soguk ? ' checked' : '') + '> Soğuk bölge arılığı (pil NTC + ısıtmalı paket eklenir)</label></div>'
      + H.L.map(function (x) {
        var p = x.r.p, m = p.miktar || {}, f = p.fiyat;
        var alt = esc(x.r.k.ad) + (f && f.magaza ? ' · ' + esc(f.magaza) + ' ' + trTarih(f.tarih) : '');
        var sag = m.dahil ? '<small>dahil — ' + esc(m.dahil) + '</small>' : m.soguk && !ALIM.soguk ? fiyatKisa(f) + '<small>yalnız soğuk bölge</small>' : x.top == null ? '<span class="dn-vy">Veri yok</span><small>' + (x.adet == null ? 'adet: Veri yok' : x.adet + ' adet') + (f && isFinite(+f.tutar) ? '' : ' · fiyat: Veri yok') + '</small>' : tl(x.top) + '<small>' + x.adet + (m.ut ? '*' : '') + ' × ' + fiyatKisa(f) + '</small>';
        return '<div class="dn-r"><div class="ra">' + esc(p.ad) + '<small>' + alt + '</small></div><div class="rt">' + sag + '</div></div>';
      }).join('')
      + '<div class="dn-r top"><div class="ra">' + esc(z.ad) + ' · ' + kov + ' kovan<small>fiyatı bilinenler</small></div><div class="rt">' + tl(H.tot) + '</div></div>'
      + '<p class="dn-fw">* uzman tahmini adet. Fiyatı «Veri yok» olan ' + H.eksik.length + ' parça toplama girmedi' + (ORNEK ? '' : '; fiyatı olmayanlar fiyat_eksik\'e bildirildi') + '. USD/EUR fiyatlar TCMB kuruyla TL\'ye çevrilir; TL fiyatlar kurla değişmez, 30 günden eskiyse «fiyat eski» yazar.</p>';
    q('data-dn-alim').innerHTML = h;
    eksikBildir(H.eksik.filter(function (x) { var f = x.r.p.fiyat; return !f || !isFinite(+f.tutar) || f.tutar === null; }));
  }
  function paint() {
    paintKalemler(); paintDuzen(); paintMaliyet();
    q('data-dn-durum').textContent = D.durum || 'taslak – kullanıcı onayı bekliyor';
    q('data-dn-verilen').innerHTML = (D.verilenKararlar || []).map(function (k, i) { return '<div class="dn-k"><div class="dn-g">' + VF.map(function (f) { return alan('verilenKararlar', i, f); }).join('') + '</div></div>'; }).join('') || '<p class="mk-vy">Henüz karar yok</p>';
    q('data-dn-karar').innerHTML = (D.kararlar || []).map(function (k, i) { return '<div class="dn-k"><div class="dn-g">' + KF.map(function (f) { return alan('kararlar', i, f); }).join('') + '</div><button class="btn dn-sb" data-dn-sil="kararlar|' + i + '" style="margin-top:.3rem">Kararı sil</button></div>'; }).join('') || '<p class="mk-vy">Açık karar yok</p>';
    q('data-dn-surum').innerHTML = SUR.length ? '<ul style="margin:0;padding-left:1rem">' + SUR.map(function (v, j) { return '<li>Sürüm ' + v.surum + ' · ' + esc(tf(v.at)) + ' · ' + esc(v.email || '—') + (v.surum_notu ? ' · ' + esc(v.surum_notu) : '') + (j ? ' <button class="btn dn-sb" data-dn-don="' + v.id + '">Bu sürüme dön</button>' : ' <b>(güncel)</b>') + '</li>'; }).join('') + '</ul>' : '—';
  }
  function hazirla(d, meta) { var yeni = normalize(d); D = d; q('data-dn-meta').textContent = meta + (yeni ? ' · aday listesi/düzenler metinden çıkarıldı, kaydedince sürüme yazılır' : ''); paint(); }
  function load() {
    if (ORNEK) { SUR = [{ id: 2, surum: 2, at: new Date().toISOString(), email: 'sistem (kullanıcı kararı)', surum_notu: 'Kullanıcı kararları 17.10.2026 (koloni-243)' }, { id: 1, surum: 1, at: '2026-10-17T09:42:33Z', email: 'sistem', surum_notu: 'İlk taslak (koloni-238)' }]; hazirla(JSON.parse(JSON.stringify(window.SA_DONANIM_TASLAK)), 'Demo verisi · sürüm 2'); return; }
    return B.client().then(function (c) { CL = c; return Promise.all([c.from('sa_donanim').select('*').eq('id', 1).maybeSingle(), c.from('sa_donanim_surum').select('id,surum,at,email,surum_notu').order('surum', { ascending: false }).limit(50)]); })
      .then(function (r) { if (r[0].error) throw r[0].error; var row = r[0].data; SUR = r[1].data || []; hazirla((row && row.data) || JSON.parse(JSON.stringify(window.SA_DONANIM_TASLAK)), row ? 'Sürüm ' + row.surum + ' · ' + tf(row.updated_at) + ' · ' + (row.degistiren_email || '—') : 'Veri yok – kayıt bulunamadı (taslak gösteriliyor)'); })
      .catch(function (e) { q('data-dn-liste').innerHTML = '<p class="mk-vy">Veri yok – yüklenemedi (' + esc((e && e.message) || 'bağlantı') + ')</p>'; });
  }
  function kaydet(data, not) {
    if (ORNEK) { paint(); return stat('Demo: kaydedilmez' + (not ? ' (' + not + ')' : '') + '.'); }
    stat('Kaydediliyor…');
    CL.rpc('sa_donanim_kaydet', { p_data: data, p_not: not || null }).then(function (r) { if (r.error) throw r.error; stat('Kaydedildi: sürüm ' + r.data + ' (değişiklik kaydına yazıldı).'); q('data-dn-not').value = ''; load(); })
      .catch(function (e) { stat('Kaydedilemedi: ' + ((e && e.message) || '')); });
  }
  function sec(i, j) {
    var k = D.kalemler[i], c = k.adaylarListe[j]; if (!c) return;
    k.adaylarListe.forEach(function (x, n) { x.secili = n === j; });
    var ana = duzen('ana'); if (ana) { ana.secim = ana.secim || {}; ana.secim[k.id] = c.id; }
    ACIK['k' + k.id] = true;
    kaydet(D, k.ad + ': seçilen → ' + adayAd(c));
  }
  s.addEventListener('toggle', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-dn-ac'); if (a) ACIK[a] = e.target.open; }, true);
  s.addEventListener('input', function (e) {
    var t = e.target, a = t.getAttribute('data-dn-f'), p;
    if (a) { p = a.split('|'); D[p[0]][+p[1]][p[2]] = t.value; return; }
    if ((a = t.getAttribute('data-dn-cf'))) {
      p = a.split('|'); var c = D.kalemler[+p[0]].adaylarListe[+p[1]], pr = c.parcalar[0] = c.parcalar[0] || { ad: '', ozellik: '', not: '', fiyat: null, miktar: { yok: 'Adet: Veri yok' } };
      if (p[2] === 'kaynak') c.kaynak = t.value; else if (p[2] === 'ad' || p[2] === 'ozellik') pr[p[2]] = t.value;
      else { pr.fiyat = pr.fiyat || { tutar: null, para: 'TL', tarih: '', magaza: '', url: '', not: '' }; pr.fiyat[p[2]] = p[2] === 'tutar' ? (t.value === '' ? null : +String(t.value).replace(',', '.')) : t.value; if (pr.fiyat.tutar == null) { /* boş fiyat = Veri yok */ } }
      return;
    }
    if ((a = t.getAttribute('data-dn-alim')) === 'kovan') { ALIM.kovan = t.value; var pos = t.selectionStart; paintMaliyet(); var n = q('data-dn-alim="kovan"'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} } }
  });
  s.addEventListener('change', function (e) {
    var t = e.target, a;
    if ((a = t.getAttribute('data-dn-zs'))) { var p = a.split('|'), z = D.duzenler[+p[0]]; z.secim = z.secim || {}; z.secim[p[1]] = t.value || null; if (z.id === 'ana') D.kalemler.forEach(function (k) { if (k.id === p[1]) k.adaylarListe.forEach(function (c) { c.secili = c.id === t.value; }); }); paint(); stat('Değişti — «Kaydet (yeni sürüm)» ile kaydedin.'); return; }
    if ((a = t.getAttribute('data-dn-ad'))) { D.arilikDuzen[a] = t.value; paintMaliyet(); stat('Değişti — «Kaydet (yeni sürüm)» ile kaydedin.'); return; }
    if (t.getAttribute('data-dn-alim') === 'duzen') { ALIM.duzen = t.value; paintMaliyet(); return; }
    if (t.getAttribute('data-dn-alim') === 'soguk') { ALIM.soguk = !!t.checked; paintMaliyet(); return; }
    if (t.getAttribute('data-dn-cf')) paint();
  });
  s.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-dn-sec]'))) { e.preventDefault(); var p = b.getAttribute('data-dn-sec').split('|'); return sec(+p[0], +p[1]); }
    if ((b = e.target.closest('[data-dn-asec]'))) {
      e.preventDefault(); var pa = b.getAttribute('data-dn-asec').split('|'), k = D.kalemler[+pa[0]], al = k.alternatifler[+pa[1]]; if (!al || al.durum === 'uyumsuz') return;
      var id = k.id + '-' + slug(al.ad), j = -1; k.adaylarListe.forEach(function (c, n) { if (c.id === id) j = n; });
      if (j < 0) { var pr = parca(al.ad); pr.ozellik = al.fark; pr.fiyat = al.fiyat ? JSON.parse(JSON.stringify(al.fiyat)) : null; pr.miktar = mikBul(al.ad, k.id); k.adaylarListe.push({ id: id, secili: false, kaynak: al.kaynak, metin: '', not: 'Aynı yazılımla çalışan alternatiften: ' + al.uyum, parcalar: [pr] }); j = k.adaylarListe.length - 1; }
      return sec(+pa[0], j);
    }
    if ((b = e.target.closest('[data-dn-aekle]'))) { var ki = +b.getAttribute('data-dn-aekle'), kk = D.kalemler[ki], nid = kk.id + '-yeni' + Date.now().toString(36); kk.adaylarListe.push({ id: nid, secili: false, yeni: true, kaynak: '', metin: '', not: '', parcalar: [{ ad: '', ozellik: '', not: '', fiyat: null, miktar: JSON.parse(JSON.stringify(MIK_KALEM[kk.id] || { yok: 'Adet: Veri yok' })) }] }); ACIK['c' + nid] = true; ACIK['k' + kk.id] = true; paint(); return; }
    if (e.target.closest('[data-dn-ekle]')) { D.kalemler.push({ id: 'k' + Date.now(), ad: 'Yeni kalem', durum: 'taslak – kullanıcı onayı bekliyor', fiyat: 'Veri yok', kaynak: 'Veri yok', adaylarListe: [], alternatifler: [] }); paint(); return; }
    if (e.target.closest('[data-dn-kekle]')) { D.kararlar.push({ baslik: '', secenekler: '', not: '' }); paint(); return; }
    if ((b = e.target.closest('[data-dn-sil]'))) { var ps = b.getAttribute('data-dn-sil').split('|'); if (confirm('Silinsin mi? (Kaydet\'e basınca yeni sürüm olur)')) { D[ps[0]].splice(+ps[1], 1); paint(); } return; }
    if (e.target.closest('[data-dn-kaydet]')) return kaydet(D, q('data-dn-not').value.trim());
    if ((b = e.target.closest('[data-dn-don]'))) {
      var vid = b.getAttribute('data-dn-don'); if (!confirm('Bu sürüm yeni sürüm olarak geri yüklensin mi?')) return;
      if (ORNEK) return stat('Demo: geri yükleme yapılmaz.');
      CL.from('sa_donanim_surum').select('surum,data').eq('id', vid).maybeSingle().then(function (r) { if (r.error || !r.data) throw r.error || new Error('Sürüm bulunamadı'); kaydet(r.data.data, 'Sürüm ' + r.data.surum + '\'e dönüldü'); }).catch(function (er) { stat('Geri yüklenemedi: ' + ((er && er.message) || '')); });
    }
  });
  window.SA_DONANIM_TEST = { cozumle: cozumle, normalize: normalize, metinTL: function (t, k) { KUR = k; return metinTL(t); }, fiyatKisa: function (f, k) { KUR = k; return fiyatKisa(f); }, hesap: function (d, zid, kov, sg) { D = d; return hesap(duzen(zid), kov, sg); }, swDurum: swDurum, DIS: DIS, KORUMA_PARCA: KORUMA_PARCA, sogukMu: sogukMu, disHtml: function (k) { return disHtml(k); } };
  load(); kurYukle();
})();
