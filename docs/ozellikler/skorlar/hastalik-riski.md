# Hastalık riski

**Durum:** calisiyor (sensör proxy)  
**Kod:** `analyzeDiseaseRisk()` · `colony.diseaseRiskScore`  
**Durum:** `evaluation.durumlar.hastalikRiski`

Sağlık skoru **fizyoloji** ölçer; hastalık riski **Varroa / chalkbrood / zayıflık** gibi sorunlar için ayrı 0–100 skor üretir.  
Kesin teşhis değil — **yerinde muayene** önerisi.

---

## Sağlık vs hastalık riski

| | Sağlık (`healthScore`) | Hastalık riski (`diseaseRiskScore`) |
|--|------------------------|-------------------------------------|
| Ne | Sıcaklık, nem, kg, trafik, arı gücü | Aynı sinyaller + hava ayrımı + yavaş zayıflama |
| Amaç | Koloni fizyolojisi | Hastalık / Varroa şüphesi |
| Oğul | Bağımsız | Oğul sonrası bastırılır |

---

## Sinyaller (proxy)

| Sinyal | Risk katkısı | Not |
|--------|--------------|-----|
| Sağlık &lt; 45 | +28 | Kritik |
| Sağlık 45–64 | +12 | Dikkat |
| Nem ≥ 85% | +18 | Chalkbrood / küf |
| Nem ≤ 32% | +10 | Kuru stres |
| İç sıcaklık düşük / yüksek | +12–14 | Yavru stresi |
| Düşük IR + **hava açık** | +22 | Hastalık şüphesi |
| Düşük IR + **yağmur** | +3 | Normal olabilir |
| Arı &lt; 18k | +15 | Varroa / zayıflık |
| Sessiz kovan (düşük RMS) | +12 | Aktivite düşük |
| Yavaş kg kaybı (7 gün) | +14 | Kronik zayıflama |
| Ana şüpheli | +18 | Savunma zayıf |

---

## Seviyeler

| Skor | Durum | `seviye` |
|------|--------|----------|
| ≥ 65 | Hastalık riski yüksek | 1 |
| 45–64 | Artmış | 2 |
| 28–44 | İzle | 3 |
| &lt; 28 | Düşük | 5 |

**Görev:** `disease_risk` · Öncelik 2–3 · “Hastalık riski — muayene”

---

## Demo

- **Kovan 10** — zayıf tartı + düşük arı → yüksek risk  
- **Kovan 13** — Tortum yağmur + düşük IR → risk **düşük tutulur** (hava maskesi)  
- **Kovan 21** — yüksek nem → chalkbrood riski  

**Bağlı:** `saglik-skoru.md` · `kovan-durumlari.md` · `sensorler/degerlendirme.md`
