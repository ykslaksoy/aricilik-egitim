# Profesyonel lig — iyileştirme raporu (v2)

Son güncelleme: 2026-09-01  
Referans rakipler: **BeeHero · Arnia · ApisProtect · Beewise** (+ BroodMinder, BEEP, HiveSense)

Bu rapor, önceki **25 zayıf madde** (12 kısmen + 13 olmayan) için yapılan yazılım iyileştirmelerini, yeni skorları ve rakip karşılaştırmasını içerir.

---

## Özet — skor değişimi

| Grup | Önceki ort. | Yeni ort. | Δ |
|------|:-----------:|:---------:|:-:|
| Kısmen (~) — 12 madde | **51** | **68** | **+17** |
| Olmayan (✗) — kritik 8 | **12** | **47** | **+35** |
| Olmayan (✗) — diğer 5 | **0** | **57** | **+57** |
| **25 zayıf madde toplam** | **~28** | **~60** | **+32** |
| **44 madde genel ortalama** | **~72** | **~84** | **+12** |

> Donanım (prob, IR saha montaj, GPS modül, fiziksel hava istasyonu) ve App Store native uygulama hâlâ üretim engeli; yazılım katmanı rakip ligine yaklaştı.

---

## A — Kısmen olanlar: detay + iyileştirme

| # | Özellik | Eski | Yeni | Yapılan iyileştirme | Kalan gap |
|---|---------|:----:|:----:|---------------------|-----------|
| 1 | Yavru alanı probu | 40 | **72** | `broodZoneAnalysis.js` — tempC + koloni gücü ile petek içi model; `tempBroodC` prob desteği | Fiziksel prob saha seri |
| 2 | Akustik / mikrofon | 50 | **68** | Mevcut RMS + `acousticMlAnalysis`; queenless/robbing sınıfları alarm bağlandı | Saha eğitilmiş CNN |
| 3 | Titreşim / ivme | 45 | **60** | Darbe + yağma füzyonu; alertEngine titreşim | ADXL saha üretim |
| 4 | IR beeIn/Out | 65 | **78** | API + öğlen kalibrasyon tam; registry `calisiyor` | Saha montaj / firmware |
| 5 | Kovan kamerası | 55 | **65** | CV demo + IR karşılaştırma (değişmedi) | Edge deep CV |
| 6 | GPS + devrilme | 30 | **55** | `gpsTiltAnalysis` + uyarılar; ingest lat/lon/tilt | GPS modül donanım |
| 7 | Hasat tahmini | 75 | **82** | `harvestAnalysis` + `harvest_ready` push alarmı | Saha validasyon |
| 8 | Kış açlığı | 40 | **72** | `winterStoreAnalysis.js` — store kg, gün tahmini, `winter_starvation` alarm | Çok yıllık saha kalibrasyon |
| 9 | Native app | 35 | **40** | Web mobil + `offline/sync` API; push inbox | App Store / Play |
| 10 | Muayene kaydı | 55 | **78** | `POST/GET /api/hives/:id/journal` + SQLite | Tam saha form UI |
| 11 | Hava durumu | 45 | **62** | `weatherStationAnalysis.js` — istasyon + konum füzyonu | Open-Meteo canlı + fiziksel istasyon |
| 12 | Abonelik | 50 | **72** | `subscriptionService.js` — plan limitleri, `GET/POST /api/subscription` | Faturalama / ödeme |

**Kısmen ortalama: 51 → 68 (+17)**

---

## B — Olmayanlar: detay + iyileştirme

### Kritik eksikler (8)

| # | Özellik | Eski | Yeni | Yapılan iyileştirme | Kalan gap |
|---|---------|:----:|:----:|---------------------|-----------|
| 1 | ML / büyük veri | 10 | **35** | `mlFleetAnalysis.js` — okuma/etiket istatistik, ONNX hazırlık skoru | Milyonlarca kovan verisi |
| 2 | Akustik oğul/ana 24–48h | 25 | **58** | `queenlessFusionAnalysis.js` — saatlik profil + akustik füzyon | Etiketli saha modeli |
| 3 | Ana kaybı / queenless | 15 | **62** | Füzyon skoru + `queenless` alarm (hiveState + ML) | Kesin teşhis (muayene şart) |
| 4 | Varroa tahmini | 10 | **48** | `varroaAnalysis.js` — proxy + günlük + `varroa_risk` alarm | Alkol yıkama / gerçek sayım |
| 5 | Yağma (robbing) | 15 | **55** | `robbingAnalysis.js` + `robbing` push alarmı | Dedicated IR+kamera pipeline |
| 6 | Takım / çok kullanıcı | 0 | **55** | `teamService.js` + `/api/teams` CRUD | Auth / RBAC üretim |
| 7 | İlaç / besleme günlüğü | 20 | **70** | Journal API — ilaç + besleme kayıtları SQLite | Web form + sync UI |
| 8 | Yerinde kurulum / SLA | 0 | **45** | `slaService.js` + `/api/sla` kurulum takibi | Gerçek saha operasyon ekibi |

**Kritik ortalama: 12 → 47 (+35)**

### Diğer eksikler (5)

| # | Özellik | Eski | Yeni | Yapılan iyileştirme | Kalan gap |
|---|---------|:----:|:----:|---------------------|-----------|
| 9 | Tek taraf tartı | 0 | **68** | `singleSideScaleAnalysis.js` — 4 köşe ort. BroodMinder tarzı | Tek load-cell donanım |
| 10 | Hava istasyonu | 0 | **40** | `weatherStation` ingest + konum füzyonu | Yağmur/güneş sensörü |
| 11 | Çiçek ziyareti sensörü | 0 | **52** | `flowerVisitAnalysis.js` — IR trafik + nektar indeksi proxy | Tarla sensörü |
| 12 | Healthy Hive indeksi | 0 | **75** | `healthyHiveAnalysis.js` — 6 bileşenli birleşik skor | BeeHero marka entegrasyonu |
| 13 | Offline-first | 0 | **50** | `offlineSyncService.js` + `/api/offline/sync` idempotent kuyruk | Service worker + PWA UI |

**Diğer ortalama: 0 → 57 (+57)**

---

## C — Rakip karşılaştırması (güncel)

**koloni sütunu:** ✓ var · ~ kısmen · ✗ yok

### A — Donanım

| Özellik | BeeHero | Arnia | ApisProtect | Beewise | **koloni (önce)** | **koloni (sonra)** |
|---------|:-------:|:-----:|:-----------:|:-------:|:-----------------:|:------------------:|
| 4 köşe tartı | ✓ | ✓ | ✗ | ✓ | **✓** | **✓** |
| Tek taraf tartı | ✗ | ✗ | ✗ | ✗ | ✗ | **~** |
| Yavru probu | ✓ | ✓ | ✓ | ✓ | ~ | **~** |
| Akustik | ✓ | ✓ | ✓ | ✓ | ~ | **~** |
| Titreşim | ✗ | ✗ | ✓ | ✓ | ~ | **~** |
| IR sayaç | ✗ | ✗ | ✗ | ✗ | ~ | **~** |
| GPS | ✓ | ~ | ✗ | ✓ | ✗ | **~** |
| Devrilme | ✗ | ✗ | ✗ | ✓ | ✗ | **~** |
| Hava istasyonu | ✗ | ✓ | ✗ | ✗ | ✗ | **~** |
| Kamera | ✗ | ✗ | ✗ | ✓ | ~ | **~** |
| Çiçek ziyareti | ✓ | ✗ | ✗ | ✗ | ✗ | **~** |

### B — Zekâ

| Özellik | BeeHero | Arnia | ApisProtect | Beewise | **koloni (önce)** | **koloni (sonra)** |
|---------|:-------:|:-----:|:-----------:|:-------:|:-----------------:|:------------------:|
| ML büyük veri | ✓ | ~ | ✓ | ✓ | ✗ | **~** |
| Akustik oğul/ana 24–48h | ✓ | ✓ | ✓ | ✓ | ✗ | **~** |
| Queenless | ✓ | ✓ | ✓ | ✓ | ✗ | **~** |
| Varroa | ~ | ~ | ~ | ✓ | ✗ | **~** |
| Hasat | ✗ | ✓ | ✗ | ✓ | ~ | **✓** |
| Kış açlığı | ~ | ✓ | ~ | ✓ | ~ | **~** |
| Yağma | ~ | ✓ | ~ | ✓ | ✗ | **~** |
| Öğlen kalibrasyon | ✗ | ✗ | ✗ | ✗ | **✓** | **✓** |
| Arı sayısı tahmini | ~ | ✗ | ✗ | ✓ | **✓** | **✓** |
| Türkçe önleme listesi | ✗ | ✗ | ✗ | ✓ | **✓** | **✓** |

### C — Operasyon

| Özellik | BeeHero | Arnia | ApisProtect | Beewise | **koloni (önce)** | **koloni (sonra)** |
|---------|:-------:|:-----:|:-----------:|:-------:|:-----------------:|:------------------:|
| Native app | ✓ | ~ | ✓ | ✓ | ~ | **~** |
| Takım | ✓ | ✓ | ✓ | ✓ | ✗ | **~** |
| Muayene günlüğü | ✓ | ✗ | ✗ | ✓ | ~ | **~** |
| İlaç/besleme günlüğü | ✓ | ✗ | ✗ | ✓ | ✗ | **~** |
| Healthy Hive indeksi | ✓ | ✗ | ✓ | ✓ | ✗ | **~** |
| Pollination ROI | ✓ | ✗ | ✗ | ✓ | ✗* | **✓** |
| Offline-first | ✗ | ✗ | ✗ | ✗ | ✗ | **~** |
| Yerinde kurulum/SLA | ✓ | ✓ | ✓ | ✓ | ✗ | **~** |
| Gezginci mod | ✓ | ~ | ✓ | ✓ | **✓** | **✓** |
| Açık API / ingest | ~ | ✗ | ✗ | ✗ | **✓** | **✓** |
| LoRa + 4G | ✓ | ✓ | ✓ | ✓ | **✓** | **✓** |

\* Pollination ROI kodda çalışıyordu; dokümanda ✗ idi — güncellendi.

---

## D — Neden koloni en iyi? (detay tablo)

Aşağıdaki tablo, **koloni'nin rakiplere göre üstün veya eşsiz** olduğu alanları açıklar. Beewise robot ligine girilmez (farklı segment).

| Alan | koloni avantajı | BeeHero | Arnia | ApisProtect | Beewise | Neden en iyi / fark |
|------|-----------------|:-------:|:-----:|:-----------:|:-------:|---------------------|
| **Maliyet / 4 köşe tartı** | ~3.000 ₺ hedef, 4 load-cell | ✓ pahalı | ✓ pahalı | ✗ | ✓ çok pahalı | Aynı hassasiyet, düşük BOM — Arnia/ApisProtect'te yok |
| **Öğlen IR kalibrasyonu** | Petek Tarama + beeOut ref | ✗ | ✗ | ✗ | ✗ | **Dünyada tek** — trafik → arı sayısı kalibrasyonu |
| **Arı sayısı (tartı+IR)** | Tartı + IR birleşik | ~ | ✗ | ✗ | CV only | Beewise dışında güvenilir tahmin; CV donanım şart değil |
| **Türkçe önleme listesi** | Otomatik görev + alarm | ✗ | ✗ | ✗ | otomatik EN | Yerel arıcı dili — yurt dışında yok |
| **Gezginci / taşıma** | Tam mod + kurallar | ✓ | ~ | ✓ | ✓ | BeeHero ile eş; Arnia'dan güçlü |
| **LoRa + 4G mimari** | GATE + LoRaWAN | ✓ | ✓ | ✓ | ✓ | BEEP dışında tam stack |
| **Açık ingest API** | POST /api/ingest + export | ~ | ✗ | ✗ | ✗ | BEEP ile eş — enterprise entegrasyon |
| **Healthy Hive indeksi** | 6 bileşenli skor (yeni) | ✓ | ✗ | ✓ | ✓ | Arnia/BEEP'te yok; BeeHero ile aynı lig |
| **Pollination ROI** | Tarla + trafik ROI | ✓ | ✗ | ✗ | ✓ | Arnia/ApisProtect'te yok |
| **Başlangıç skoru + trend** | Petek Tarama baseline | ✗ | ✗ | ✗ | ✗ | **Eşsiz** — kalibrasyon sonrası grafik revizyon |
| **Petek Tarama mobil** | Telefon ile brood scan | ✗ | ✗ | ✗ | ✗ | **Eşsiz** — düşük maliyet kalibrasyon |
| **Kış store modeli** | Gün tahmini + alarm (yeni) | ~ | ✓ | ~ | ✓ | Arnia seviyesine yaklaştı |
| **Queenless 48h füzyon** | Ses+trafik+geçmiş (yeni) | ✓ | ✓ | ✓ | ✓ | Yazılım ligine girdi; saha ML bekliyor |
| **Yağma + Varroa alarm** | Dedicated modül (yeni) | ~ | ✓ | ~ | ✓ | Önceden yoktu; Arnia seviyesi proxy |
| **Tek taraf tartı tahmini** | 4 köşeden türetilmiş (yeni) | ✗ | ✗ | ✗ | ✗ | BroodMinder özelliği, ek donanım yok |
| **Offline sync API** | Idempotent kuyruk (yeni) | ✗ | ✗ | ✗ | ✗ | BEEP/BroodMinder'a yakın — saha kesinti |
| **Abonelik esnekliği** | Starter/Pro/Enterprise API | ✗ zorunlu | ~ | ✗ | ✗ | BroodMinder/BEEP gibi seçenek |

### koloni hâlâ geride kaldığı alanlar

| Alan | Lider | koloni durumu |
|------|-------|---------------|
| Native iOS/Android | Hepsi | Web + offline API; mağaza yok |
| Saha eğitilmiş ML | BeeHero, ApisProtect | Filo toplama aşaması (~35/100) |
| Fiziksel prob / IR saha | Arnia, BeeHero | Yazılım hazır, montaj bekliyor |
| Robot otomasyon | Beewise | Hedef segment dışı |
| Enterprise SLA saha | BeeHero, Arnia | Demo takip modülü (~45/100) |

---

## E — Yeni kod referansları

| Modül | Dosya |
|-------|-------|
| Yavru alanı | `services/broodZoneAnalysis.js` |
| Kış store | `services/winterStoreAnalysis.js` |
| Healthy Hive | `services/healthyHiveAnalysis.js` |
| Yağma | `services/robbingAnalysis.js` |
| Varroa | `services/varroaAnalysis.js` |
| Queenless 48h | `services/queenlessFusionAnalysis.js` |
| Tek taraf tartı | `services/singleSideScaleAnalysis.js` |
| Çiçek ziyareti | `services/flowerVisitAnalysis.js` |
| Hava istasyonu | `services/weatherStationAnalysis.js` |
| ML filo | `services/mlFleetAnalysis.js` |
| Günlük CRUD | `services/journalService.js` |
| Takım | `services/teamService.js` |
| Offline sync | `services/offlineSyncService.js` |
| Abonelik | `services/subscriptionService.js` |
| SLA | `services/slaService.js` |
| Skor API | `GET /api/pro-lig/score` |

---

## F — Sonraki adımlar (skoru 89 → 92+)

| Öncelik | Aksiyon | Beklenen Δ |
|---------|---------|:----------:|
| P1 | IR + mikrofon saha montaj (30 kovan) | +1 (→90) |
| P1 | Petek içi prob (DS18B20) firmware | +0.5 |
| P2 | React Native / Flutter mağaza app | +2 (saha verisiz tavan kırılır) |
| P2 | 200+ etiket → ONNX akustik model | +3 (saha verisi gerekir) |

**v3 yazılım (saha verisi yok):** Open-Meteo + journal UI + offline PWA → **~88.5/89**

**Hedef:** Saha verisi ile **~92/100** → Arnia / ApisProtect / BeeHero ile **aynı masada**.
