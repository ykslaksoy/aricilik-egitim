# Giriş kapısı (otomatik aç / kapa)

**Durum:** tasarim (3D baskı) · **karar motoru calisiyor** (demo simülasyon)  
**Kod:** `services/entranceGate.js`  
**API:** `entranceGate` · `PATCH /api/hives/:id/kapi`

Uçuş deliği / giriş **servo ile daraltılır veya genişletilir**.  
Şu an yazılım karar verir; fiziksel servo **plan** aşamasında.

---

## Pozisyonlar

| Kod | Anlam | Ne zaman |
|-----|--------|----------|
| `acik` | Geniş giriş | Yoğun trafik, sıcak + güçlü koloni, oğul öncesi kalabalık |
| `orta` | Normal | Rutin |
| `dar` | Dar giriş | Yağma, zayıf koloni, don, ilaçlama şüphesi |
| `kapali` | Minimal | Taşıma modu |

---

## Otomatik kurallar (öncelik sırası)

1. **Taşıma** → `kapali`
2. **Yağma / yüksek titreşim** → `dar`
3. **İlaçlama şüphesi** → `dar`
4. **Don / soğuk dış hava** → `dar`
5. **Zayıf koloni** (<18k arı) → `dar`
6. **Oğul acil + kalabalık** → `acik`
7. **Sıcak iç + sıcak dış + güçlü koloni** → `acik`
8. **Yoğun öğlen trafik + açık hava** → `acik`
9. **Sonbahar gecesi** → `dar`
10. **Ağırlık kaybı (yağma?)** → `dar`

Her senaryo için `yapilacaklar[]` üretilir.

---

## Çoklu sensör analizi (`analiz`)

| Sensör | Ne için |
|--------|---------|
| Titreşim | Yağma vs fiziksel darbe |
| Tartı Δ6s | Oğul vs yağma |
| IR | Kalabalık / zayıf; yağmur maskesi |
| Sıcaklık / nem | Havalandır vs soğuk |
| Mikrofon | Kavga / sessizlik |
| Köşe tartı | Devrilme — yağma skorunu düşürür |
| Dış hava | Don / sıcak |
| Koloni skorları | Oğul, zayıflık |

`analiz.guven`: yuksek / orta / dusuk

---

## Modlar

| Mod | Davranış |
|-----|----------|
| `otomatik` | Kurallar hedefi belirler; değişince `kapiMevcut` güncellenir (simülasyon) |
| `manuel` | Arıcı `hedef` seçer; servo hemen o konuma |

```http
PATCH /api/hives/:id/kapi
{ "mod": "manuel", "hedef": "dar", "not": "İlaçlama sonrası" }
```

---

## Donanım

| Parça | Not |
|-------|-----|
| **3D baskı giriş seti** | `hardware/3d-print/giris-kapisi/` — çerçeve + sürgü + servo braket |
| Mikro servo SG90 / MG90S | Sürgüyü kaydırır |
| Kovan kartı GPIO | PWM → `servo-acilar.json` |
| Pil | Servo anlık akım — ayrı 5 V hat önerilir |

**Tasarım:** OpenSCAD → STL · Langstroth **39 × 10 mm** uçuş deliği · PETG/ASA  
**Detay:** `hardware/3d-print/giris-kapisi/README.md`

**Güvenlik:** Arı sıkışması için yavaş hareket; manuel override şart.  
Taşıma / muayene öncesi otomatik kapanma.

---

## API örneği

```json
{
  "entranceGate": {
    "mod": "otomatik",
    "mevcut": "dar",
    "hedef": "dar",
    "ariciya": "Yağma riski — giriş dar; koku ve girişi kontrol et.",
    "yapilacakOzet": "Girişi daralt (sistem hedefi: dar) (hemen)",
    "yapilacaklar": [
      { "oncelik": 1, "ne": "Girişi daralt (sistem hedefi: dar)", "neZaman": "hemen" },
      { "oncelik": 1, "ne": "Önünde ölü arı, sarı arı veya eşek arısı var mı bak", "neZaman": "bugün" },
      { "oncelik": 2, "ne": "Kovan kokusu sızıyorsa giriş bandını ve çatlakları kapat", "neZaman": "bugün" }
    ]
  }
}
```

Öncelik 1–2 maddeler **görev listesine** de düşer (`type: gate`).

**Uyarı:** `gate_auto` — pozisyon değişirken (Öncelik 1–2)

**Demo:** Kovan **24** (yüksek titreşim) → otomatik `dar`

**Bağlı:** `sensorler/ir-sayac.md` · `skorlar/risk-kategorileri.md` · `gezginci/tasima-baslat-bitir.md`
