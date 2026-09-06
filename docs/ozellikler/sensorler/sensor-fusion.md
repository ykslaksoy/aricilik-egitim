# Sensör birleştirme (fusion)

**Durum:** calisiyor (demo)  
**Kod:** `sensorAnalysis.js` · `sensorFusion.js`

---

## Katmanlar

```
Tek sensör analizi (sensorAnalysis.js)
    ir · tartı · ses · titreşim · bağlantı · köşe
    ↓
İki sensör çiftleri (analyzePairFusions)
    nem×sıcaklık · IR×hava · titreşim×tartı · ses×IR …
    ↓
Genel özet (fuseHiveNarrative → sensorFusion)
    kanıtlar · çelişkiler · yapılacaklar · tek arıcı hikâyesi
```

---

## API / UI

| Alan | İçerik |
|------|--------|
| `colony.sensors` | Sensör bazlı analizler + `pairs` |
| `sensorFusion` | Tüm modüllerin birleşik özeti |
| UI | Kovan detay — “Sensör analizleri” + “Kovan özeti (tüm sensörler)” |

---

## Çift sensör örnekleri

| Çift | Yorum |
|------|--------|
| Nem × sıcaklık | Yoğuşma / havalandırma yetersiz |
| Nem × sağlık | Chalkbrood proxy |
| Tartı salınım × IR | Nektar akışı |
| Titreşim × ses | Yağma kavgası |
| IR × hava | Yağmurda düşük trafik normal |
| Ses × IR | Ana kaybı imzası |
| Titreşim × tartı | Yağma şüphesi |

**Bağlı:** `degerlendirme.md` · `donanim/giris-kapisi.md` (kapı fusion)
