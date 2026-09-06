# Özellik dosya ağacı

Her özellik ayrı Türkçe dosya.  
Kameralar opsiyonel (takılmazsa sistem çalışır).

```
docs/ozellikler/
├── README.md
├── AGAC.md                          ← bu dosya
│
├── ekranlar/
│   ├── giris-kayit.md
│   ├── ozet.md
│   ├── gorev-listesi.md             — öncelikli yapılacaklar (oğul, sağlık…)
│   ├── kovan-listesi.md
│   ├── liste-suzgecleri.md
│   ├── kovan-detay.md
│   ├── alarmlar.md
│   ├── kalibrasyon.md
│   ├── gezginci.md
│   ├── kovan-profili.md
│   ├── kamera-goruntusu.md
│   └── ayarlar.md
│
├── skorlar/
│   ├── liste.md                     — kovan bazlı akış (100 kovan)
│   ├── koloni-skoru.md              — genel güç 0–100
│   ├── kovan-durumlari.md           — sağlık, oğul, ana, arı… durum boyutları
│   ├── saglik-skoru.md              — fizyoloji 0–100
│   ├── hastalik-riski.md            — Varroa / chalkbrood proxy 0–100
│   ├── risk-kategorileri.md         — 4 ana risk başlığı (biyolojik…)
│   ├── ogul-riski.md                — oğul öncesi risk 0–100
│   ├── ari-tahmini.md               — tahmini arı sayısı
│   ├── yavru-cikisi-yaz.md          — yaz yavru çıkışı, kg değişimi
│   ├── ari-sayisi-katmanlari.md     — 35k→55k oğul katmanları
│   ├── kamera-ari-sayimi.md         — CV (opsiyonel)
│   └── onleme-onerileri.md          — ne yapmalı
│
├── analiz/
│   └── KATALOG.md                   — 37 analiz kataloğu, API, yeni ekleme
│
├── kovan-kaydi/
│   ├── isletme-sahip.md
│   ├── kovan-numarasi.md
│   ├── ana-ari.md
│   ├── baba-hatti.md
│   ├── ana-baba-suzme.md            — Ana {ırk} × Baba {ırk}
│   ├── irk-listesi.md               — genişletilebilir ırklar
│   ├── irk-ve-yavru.md
│   ├── kovan-duzeni.md
│   ├── konum.md
│   └── yuz-kovan-kayit.md
│
├── sensorler/
│   ├── liste.md                     — Sensör listesi (özet)
│   ├── tarti.md                     — Tartı (4× load cell)
│   ├── sicaklik.md                  — Sıcaklık (DHT22, kovan içi)
│   ├── nem.md                       — Nem (DHT22, kovan içi)
│   ├── ir-sayac.md                  — IR sayaç ×2 (giriş / çıkış)
│   ├── degerlendirme.md             — eşikler + alertEngine akışı
│   ├── mikrofon.md                  — Mikrofon
│   ├── titresim.md                  — Titreşim (ADXL345)
│   ├── pil.md                       — Pil
│   ├── kamera.md                    — Kovan üzeri giriş kamerası (opsiyonel)
│   └── ana-kamera.md                — Ana kamera, arılık (opsiyonel)
│
├── alarmlar/
│   ├── ogul-risk-alarmi.md
│   ├── ogul-gerceklesti.md
│   ├── ari-sayisi-alarmi.md
│   ├── agirlik-dususu.md
│   ├── dusuk-pil.md
│   ├── dengesizlik.md
│   ├── titresim-darbe.md
│   ├── ana-kaybi.md
│   └── sensor-arizasi.md            — tartı/TH/IR/mic/offline arıza
│
├── kalibrasyon/
│   ├── tare-ve-petek.md
│   ├── petek-tarama.md              — Kovan Petek Tarama (telefon 10×2)
│   ├── baslangic-skoru-ve-trend.md  — başlangıç skoru + grafik analiz
│   ├── ogle-trafik.md
│   ├── petek-silkme.md
│   ├── tam-silkme.md
│   ├── kamera-ir-karsilastirma.md   ← c: kamera vs IR
│   └── yapay-zeka-ses-titresim.md
│
├── gezginci/
│   ├── arilik.md
│   ├── tasima-baslat-bitir.md
│   ├── tasima-kurallari.md
│   ├── yerlesme-penceresi.md
│   ├── sezon-takvimi.md
│   └── hava-durumu.md               — konumdan hava + kamera destek (demo)
│
├── abonelik/
│   ├── paketler.md
│   ├── gecmis-veri.md
│   ├── takim-kullanici.md
│   └── api-erisim.md
│
├── bildirimler/
│   ├── uygulama-ici.md
│   ├── push.md
│   └── sms.md
│
└── donanim/
    ├── liste.md                     — Donanım Türkçe isimleri
    ├── paket-standart.md            — Standart kovan paketi (eski: beepack s)
    ├── paket-kamera.md              — Kameralı paket (eski: beepack c)
    ├── kovan-karti.md               — Kovan kartı (eski: düğüm / NODE)
    ├── giris-kapisi.md              — Servo giriş kapısı (otomatik aç/kapa)
    ├── giris-kapisi-3d.md           — 3D baskı tasarım özeti
    ├── gecit.md                     — LoRa→4G köprü (eski: GATE)
    ├── wifi-ag-kutusu.md            — Kameralar için WiFi (eski: hub)
    └── kamera-politikasi.md         — Takılmazsa kamerasız çalışır
```

## Durum özeti (eksik tamamlama için)

| Klasör | Dosya | Durum |
|--------|-------|--------|
| ekranlar | giris-kayit | plan |
| ekranlar | ozet | taslak |
| ekranlar | kovan-listesi | calisiyor |
| ekranlar | kovan-detay | plan |
| ekranlar | alarmlar | calisiyor |
| ekranlar | kalibrasyon | taslak |
| ekranlar | gezginci | plan |
| ekranlar | kovan-profili | plan |
| ekranlar | **kamera-goruntusu** | calisiyor (demo) |
| ekranlar | ayarlar | plan |
| skorlar | koloni / sağlık / oğul / arı / katman / önleme | calisiyor |
| skorlar | **kamera-ari-sayimi** | calisiyor (demo CV) |
| kovan-kaydi | hepsi | plan |
| sensorler | tartı–pil | plan/mock |
| sensorler | **kamera** (kovan üzeri) | calisiyor (demo) / plan (edge CV) |
| sensorler | **ana-kamera** (arılık) | calisiyor (demo analiz) |
| alarmlar | oğul / arı / kg | calisiyor |
| alarmlar | pil / densizlik / darbe / ana | plan |
| kalibrasyon | tare / öğlen | calisiyor |
| kalibrasyon | silkme / YZ / **kamera-ir** | calisiyor (demo) |
| gezginci | hepsi | plan |
| abonelik | hepsi | plan |
| bildirimler | uygulama-içi | calisiyor |
| bildirimler | push | calisiyor (demo · web inbox) |
| bildirimler | sms | plan |
| donanim | standart paket / kovan kartı / geçit | plan (alım) |
| donanim | **kameralı paket / WiFi ağ kutusu** | plan (aşama 3) |
