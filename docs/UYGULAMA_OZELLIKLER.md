# koloni — uygulama özellikleri (tam sensör paketi)

> **Özellik dosya ağacı (Türkçe, her özellik ayrı dosya):**  
> [`docs/ozellikler/`](ozellikler/README.md) · ağaç: [`ozellikler/AGAC.md`](ozellikler/AGAC.md)

tüm sensörler: **4× tartı · DHT22 · IR×2 · mic · ADXL345 · pil · (c) kamera**  
modlar: **normal · gezginci taşıma · yerleşme · abonelik paketi**

---

## 1. çekirdek ekranlar

| ekran | özellikler |
|-------|------------|
| **giriş / kayıt** | e-posta veya telefon, abonelik planı |
| **özet** | arılık sayısı, kovan sayısı, riskli kovan, taşıma durumu |
| **kovan listesi** | #, kg, koloni skoru, sağlık, oğul, arı tahmini, durum noktası |
| **kovan detay** | canlı değerler, 24s/7g/90g grafik, skor açıklaması |
| **alarmlar** | okunmamış, filtre (oğul / tartı / batarya / taşıma) |
| **kalibrasyon** | tare, comb, öğlen beeOut, referans arı sayısı |
| **ayarlar** | bildirim, birim, dil, abonelik, API anahtarı |

---

## 2. sensör → ekran eşlemesi

| sensör | panelde göster | alarm / skor |
|--------|----------------|--------------|
| **4× tartı** | kg, günlük salınım, köşe dengesi | oğul (−3kg), devrilme, yağma, hasat trendi |
| **DHT22** | °C, % nem | sağlık skoru, aşırı sıcak/nem |
| **IR ×2** | beeIn, beeOut, net trafik | arı tahmini, öğlen kalibrasyon |
| **mikrofon** | ses seviyesi / bant özeti (grafik) | oğul/ana AI (v2), aktivite |
| **ADXL345** | titreşim olayı sayısı | darbe, taşıma sarsıntısı |
| **pil** | % batarya | düşük pil |
| **kamera (c)** | son kare / canlı (pro+) | giriş yoğunluğu, cv sayım (v2) |

---

## 3. zekâ ve skorlar

| özellik | girdi | çıktı |
|---------|-------|--------|
| **koloni skoru** | tartı, ir, th, trafik | 0–100 + etiket |
| **sağlık skoru** | th, tartı düşüş, trafik | 0–100 |
| **oğul risk skoru** | kalabalık, mevsim, plato, ir | 0–100 + faz + önleme listesi |
| **arı tahmini** | tartı + ir (ağırlıklı) | sayı + min/max + güven |
| **dengesizlik** | cornerKg[4] | eğim / devrilme uyarısı |
| **önleme** | oğul + sağlık | max 3 Türkçe madde |

kod: `apps/api/src/colony.js`

---

## 4. gezginci modu

| özellik | açıklama |
|---------|----------|
| **arılık yönetimi** | Yanıkdağ, Tortum, yayla — manuel konum |
| **taşıma başlat / bitir** | seçili kovanlar veya tüm arılık |
| **taşıma kuralları** | oğul/trafik alarmı kapalı; devrilme/titreşim açık |
| **hedef arılık** | bitince kovanlar yeni arılığa taşınır |
| **yerleşme 48s** | toparlanma + ir dönüşü izleme |
| **sezon takvimi** | taşıma tarihi hatırlatma |

kod hedefi: `apps/api/src/services/transportMode.js`

---

## 5. abonelik (koloni paket)

| özellik | başlangıç | pro | kurumsal |
|---------|:---------:|:---:|:--------:|
| canlı panel + skorlar | ✓ | ✓ | ✓ |
| geçmiş veri | 7 gün | 90 gün | sınırsız |
| push | ✓ | ✓ | ✓ |
| sms | — | ✓ | ✓ |
| gezginci / taşıma | ~ | ✓ | ✓ |
| kamera | — | ✓ | ✓ |
| çok arılık | 2 | sınırsız | sınırsız |
| takım kullanıcı | — | 3 | sınırsız |
| API | — | ~ | ✓ |

detay: `docs/ABONELIK_MODELI.md`

---

## 6. API uçları (hedef)

| method | path | durum |
|--------|------|--------|
| GET | `/api/health` | ✓ |
| GET | `/api/hives` | ✓ |
| GET | `/api/hives/:id` | ✓ |
| POST | `/api/hives/:id/calibrate` | ✓ |
| GET | `/api/alerts` | ✓ |
| POST | `/api/ingest` | ✓ |
| GET | `/api/apiaries` | plan |
| POST | `/api/apiaries` | plan |
| POST | `/api/transport/start` | plan |
| POST | `/api/transport/end` | plan |
| GET | `/api/subscription` | plan |
| GET | `/api/hives/:id/camera` | ✓ demo (CV + snapshot) |
| GET | `/api/hives/:id/camera/snapshot` | ✓ demo |
| GET | `/api/locations/:id/camera` | ✓ demo (arılık analiz) |

---

## 7. bildirimler

| tip | tetik |
|-----|--------|
| `swarm_risk` | oğul risk ≥50 / ≥75 |
| `swarm_occurred` | ani −3 kg |
| `weight_drop` | ≥1 kg düşüş |
| `low_battery` | pil <20% |
| `imbalance` | köşe farkı eşik |
| `vibration` | taşıma dışı şiddetli darbe |
| `transport` | taşıma / yerleşme olayları |

---

## 8. faz planı (uygulama)

| faz | ne |
|-----|-----|
| **v0 (şimdi)** | liste, 3 skor, alarm, kalibrasyon, mock |
| **v1** | tam ingest alanları, grafik, köşe dengesi |
| **v1.1** | arılık, gezginci taşıma |
| **v2** | abonelik kilidi, push/sms |
| **v2.1** | mic grafik, oğul AI |
| **v3** | kamera, cv sayım, native app |

---

## 9. dosya karşılıkları

| özellik | dosya / klasör |
|---------|----------------|
| skor algoritması | `apps/api/src/colony.js` |
| HTTP sunucu | `apps/api/src/server.js` |
| web panel | `apps/web/` |
| ingest şema | `packages/shared/schemas/ingest.schema.json` |
| firmware NODE | `firmware/node/` |
| firmware GATE | `firmware/gate/` |
| proje ağacı | `docs/PROJECT_TREE.md` |
