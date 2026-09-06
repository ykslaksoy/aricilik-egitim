# Kovan durum değerlendirmesi

**Durum:** calisiyor  
**Kod:** `apps/api/src/hiveState.js`  
**API:** her kovanda `evaluation` objesi

Her kovan için **birden fazla durum** aynı anda geçerli olabilir.  
Sistem her boyutu ayrı değerlendirir; en kötü durum `ozet` ve `oneCikan` listesinde öne çıkar.

---

## Boyutlar (`evaluation.durumlar`)

| Alan | Ne değerlendirir | Örnek anahtarlar |
|------|------------------|------------------|
| `saglik` | Fizyoloji skoru | kritik · dikkat · iyi · cok_iyi |
| `sicaklik` | İç sıcaklık skoru + trend + neden | ideal · yuksek · dusuk · kritik_* |
| `nem` | İç nem skoru + trend + yoğuşma | ideal · yuksek · dusuk · kritik_* |
| `hastalikRiski` | Varroa / chalkbrood / zayıflık proxy | dusuk · izle · artmis · yuksek |
| `koloni` | Koloni / iş skoru | zayif · orta · iyi · mukemmel |
| `koloniGucu` | Tahmini iş gücü | weak · medium · strong · very_strong |
| `ariSayisi` | Arı yoğunluğu katmanı | normal → maksimum (35k–55k+) |
| `ogulRiski` | Gitmeden önce risk | dusuk · izle · yuksek · acil · gerceklesti |
| `ogulDurumu` | Olay / müdahale | yok · izle · planla · hemen_mudahale · ayrildi |
| `ana` | Ana varlığı | var · supheli · yok |
| `anaOgul` | Ana + oğul birlikte | normal · ana_var_ogul_onleme · ogul_sonrasi_kontrol … |
| `yavru` | Yaz çıkışı | yok · yavas · aktif |
| `besleme` | Besleme ihtiyacı | gerekmez · onerilir · acil |
| `sensor` | Sensör / bağlantı | normal · pil_dusuk · dengesizlik · ariza · offline |
| `operasyon` | Taşıma / konum | sabit · tasimada |
| `kayit` | Genetik kayıt | tam · eksik |

### Risk kategorileri (`evaluation.riskKategorileri`)

Dört ana başlık altında 12 madde: biyolojik, çevresel, yönetimsel, kimyasal/dış.  
Ayrıntı: `risk-kategorileri.md`

---

### Seviye (1–5)

| Seviye | Anlam |
|--------|--------|
| **1** | Acil — hemen |
| **2** | Yüksek — bu hafta |
| **3** | İzle |
| **4–5** | Normal / rutin |

---

## Ana × oğul (birlikte)

| Durum | Ne zaman |
|-------|----------|
| `ogul_sonrasi_kontrol` | Oğul gerçekleşti, ana kaydı iyi |
| `ogul_sonrasi_ana` | Oğul + ana şüpheli |
| `ana_kaybi_ogul_karisik` | Ana şüphe + yüksek oğul riski |
| `ana_kaybi_acil` | Ana kaybı, oğul yok |
| `ana_var_ogul_onleme` | Ana var, oğul acil — süper/kat |
| `ana_var_ogul_izle` | Ana var, oğul planı |
| `normal` | Dengeli |

---

## API yanıtı (örnek)

```json
{
  "evaluation": {
    "ozet": "Oğul acil",
    "enKotuSeviye": 1,
    "oneCikan": [
      { "alan": "ogulRiski", "label": "Oğul acil", "seviye": 1 }
    ],
    "durumlar": {
      "saglik": { "key": "iyi", "label": "Sağlık iyi", "seviye": 4, "score": 72 },
      "ogulRiski": { "key": "acil", "label": "Oğul acil", "seviye": 1, "score": 78 },
      "anaOgul": { "key": "ana_var_ogul_onleme", "label": "Ana var — oğul önleme", "seviye": 2 }
    }
  }
}
```

---

## Süzgeçler (UI)

| Süzgeç | Kural |
|--------|--------|
| Sağlık kritik | `saglik.seviye ≤ 1` |
| Oğul acil | `ogulRiski.acil` veya `ogulDurumu.hemen_mudahale` |
| Oğul oldu | `ogulDurumu.occurred` |
| Ana kaybı | `ana.key ≠ var` |
| Zayıf koloni | `koloni.zayif` veya `koloniGucu.weak` |
| Besleme | `besleme.acil` / `onerilir` |
| Arı kritik | `ariSayisi.tier ≥ 4` |

---

## Akış

```
sensör + history → analyzeColony()
                 → evaluateHiveState(reading, colony, meta)
                 → evaluation (UI + süzgeç)
                 → riskKategorileri (4 kategori × 12 madde)
alertEngine        → aynı ana/ogul kuralları (uyarılar)
```

**Bağlı:** `risk-kategorileri.md` · `liste-suzgecleri.md` · `sensorler/degerlendirme.md` · `ogul-riski.md` · `ana-kaybi.md`
