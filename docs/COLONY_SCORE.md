# Koloni skoru, sağlık ve oğul riski

Uygulama **kesin arı sayısı** vermez; tartı + sıcaklık/nem + giriş/çıkış ile **tahmin aralığı** ve üç ayrı skor üretir:

| Skor | Anlam |
|------|--------|
| **Koloni skoru** (0–100) | Genel güç ve denge |
| **Sağlık skoru** (0–100) | Fizyoloji: sıcaklık, nem, trafik, ani düşüş |
| **Oğul riski** (0–100) | Gitmeden önce tahmin — yüksek = acil müdahale |

> Oğul riski **oğul gerçekleşmeden önce** uyarı vermek içindir. Ani −3 kg / 6 saat veya −4 kg / 24 saat düşüşte sistem **oğul oldu** fazına geçer.

---

## Girdiler

| Veri | Kaynak |
|------|--------|
| `weightKg` | 4× load cell |
| `tempC`, `humidity` | DHT22 / BME280 |
| `beeIn`, `beeOut` | IR kapı sayacı (15 dk periyot) |

---

## Öğlen kalibrasyon (11:00–15:00)

1. Son 24 saatte **11–15** arası okumaların ortalama `beeOut` değeri alınır.
2. Gezen arı dışarıda ≈ `beeOut × (45 dk / 15 dk)` — aynı arının dışarıda kalma süresi.
3. Toplam koloni ≈ `gezen / 0,38` (yaz, güçlü kovan gezen oranı).

**Kalibrasyon API:**

```bash
curl -X POST http://localhost:3847/api/hives/7/calibrate \
  -H 'Content-Type: application/json' \
  -d '{"tareKg":8,"combKg":17,"middayBeeOut":1800,"referenceBeeCount":50000}'
```

Arıcı bilinen güçlü kovan + öğlen sayımı girer → tahmin o kovana göre ayarlanır.

---

## Tartı tahmini

```
Arı kg ≈ weightKg − tareKg − combKg
Arı sayısı ≈ Arı kg / 0,0001
```

`tareKg`: boş platform + kovan + petek (arı yokken bir kez tart).  
`combKg`: bal/petek payı (ayarlardan veya sezon ortalaması).

---

## Birleşik tahmin

Trafik ve tartı ikisi de varsa:

```
tahmin = 0,55 × trafik_tahmini + 0,45 × tartı_tahmini
aralık = ±10–15%
```

---

## Koloni skoru (0–100)

| Faktör | Etki |
|--------|------|
| Tahmini arı sayısı | 45k+ iyi, 18k altı kötü |
| Öğlen beeOut | 1200+ iyi |
| Günlük kg salınımı | 0,4–2,5 kg normal gezi |
| Sıcaklık 32–36°C | iyi |
| Nem 45–75% | iyi |

**Etiket:** Zayıf / Orta / İyi / Mükemmel  
**Güç:** Zayıf / Orta / Güçlü / Çok güçlü (arı tahminine göre)

---

## Sağlık skoru (0–100)

Koloni **fizyolojisi** — oğul riskinden bağımsız.

| Faktör | Etki |
|--------|------|
| Sıcaklık 32–36°C | +18 |
| Nem 45–70% | +12 |
| 6 saatte −3 kg | −25 (oğul veya kriz) |
| Günlük salınım 0,4–2,5 kg | +10 (normal gezi) |
| Öğlen beeOut 400+ | +8 |
| Tahmini arı 28k+ | +5 |

**Etiket:** Kritik / Dikkat / İyi / Çok iyi

---

## Oğul riski (0–100) — gitmeden önce

Amaç: arılar **kovanı terk etmeden** süper ekleme, kat bölme veya genişletme için uyarı.

### Fazlar

| Faz | Risk | Anlam |
|-----|------|--------|
| `normal` | 0–27 | Rutin takip |
| `watch` | 28–49 | İzle, trafiği günlük kontrol et |
| `elevated` | 50–74 | Bu hafta müdahale planla |
| `critical` | 75+ | 48 saat içinde süper veya kat böl |
| `occurred` | 100 | Ani düşüş — oğul gerçekleşmiş olabilir |

### Risk faktörleri

| Sinyal | Puan |
|--------|------|
| Oğul mevsimi (May–Tem) | +22 |
| Tahmini 48k+ arı | +20 |
| Öğlen beeOut 1700+ | +18 |
| Ağırlık ≥29 kg + plato (düşük varyans) | +14 |
| Son 7 günde +1,2 kg artış | +10 |
| Çıkış/giriş oranı >1,15 | +8 |

### Oğul gerçekleşti mi?

Normal gezi düşüşü gün içinde **geri gelir** (−1 ila −2 kg). Oğul:

- **6 saatte −3 kg** veya **24 saatte −4 kg**
- Aynı gün **toparlanmaz**

Bu durumda `swarmPhase: "occurred"` ve sağlık skoru düşer.

---

## Arı sayısı alarm katmanları (oğul gitmeden)

Arı sayısı tahmin edilebildiğinde (tartı + öğlen trafiği + kalibrasyon) oğul **gerçekleşmeden önce** kademeli uyarı verilir. Her eşik risk skorunun alt sınırını yükseltir — trafik veya ağırlık henüz alarm vermese bile yoğunluk tek başına uyarır.

| Arı sayısı | Katman | `beeSwarmAlarmLevel` | Min. risk | Anlam |
|------------|--------|----------------------|-----------|--------|
| 35k+ | 1 — İzle | `watch` | 30 | Takibe al |
| 40k+ | 2 — Artan | `elevated` | 45 | Günlük izle, genişletme planla |
| 45k+ | 3 — Yüksek | `elevated` | 58 | Bu hafta süper veya kat |
| 48k+ | 4 — Kritik | `critical` | 75 | 48 saat içinde müdahale |
| 55k+ | 5 — Maksimum | `critical` | 88 | Oğul kaçınılmaz olabilir |

Kod: `beeCountSwarmTier()` → `beeSwarmTier`, `beeSwarmTierLabel`, `beeSwarmAlarmLevel`

---

## Önleyici bakım (`prevention`)

Oğul riskine göre en fazla 3 kısa Türkçe öneri:

| Risk | Örnek |
|------|--------|
| ≥75 | ACİL: 48 saat içinde süper ekle veya kat böl |
| 50–74 | Bu hafta süper veya kat planla |
| 28–49 | Takipte kal — trafik ve ağırlığı günlük izle |
| occurred | Kovanı kontrol et — ana var mı bak |

Sağlık <50 ise Varroa/ana/yavru kontrolü eklenir.

---

## API yanıtı örneği

```json
{
  "colony": {
    "score": 92,
    "scoreLabel": "Mükemmel",
    "healthScore": 88,
    "healthLabel": "Çok iyi",
    "swarmRiskScore": 78,
    "swarmRiskLabel": "Acil",
    "swarmPhase": "critical",
    "beeSwarmTier": 4,
    "beeSwarmTierLabel": "Kritik (~48k+)",
    "beeSwarmAlarmLevel": "critical",
    "swarmSignals": [
      "Kovan çok kalabalık (tahmini yüksek arı sayısı).",
      "Öğlen çıkış trafiği çok yoğun.",
      "Ağırlık yüksek ve plato — yer darlığı işareti."
    ],
    "prevention": [
      "ACİL: 48 saat içinde süper ekle veya kat böl.",
      "İşleme peteği varsa yavru alanı aç; kovanı genişlet."
    ],
    "strengthLabel": "Çok güçlü",
    "beeEstimate": 52000,
    "weightDrop6hKg": -0.2,
    "weightDrop24hKg": 0.1,
    "care": ["ACİL: 48 saat içinde süper ekle veya kat böl."],
    "note": "Tahmini değerler; oğul riski gitmeden önce tahmindir, yerinde doğrulayın."
  }
}
```

---

## Uyarılar (`/api/alerts`)

| type | Koşul |
|------|--------|
| `bee_swarm_tier` | arı sayısı ≥35k — katmanlı yoğunluk uyarısı |
| `swarm_risk` | risk ≥50 (yüksek) veya ≥75 (acil) |
| `swarm_occurred` | ani ağırlık düşüşü |
| `weight_drop` | iki ölçüm arası ≥1 kg |

Arı sayısı bilinirse `bee_swarm_tier` + `swarm_risk` birlikte gelebilir — maksimum erken uyarı.

Kod: `apps/api/src/colony.js`, `apps/api/src/server.js`
