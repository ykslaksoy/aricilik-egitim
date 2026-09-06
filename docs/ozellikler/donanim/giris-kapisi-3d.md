# Giriş kapısı — 3D baskı

**Durum:** tasarim  
**Kaynak:** `hardware/3d-print/giris-kapisi/`

Özel kapı **3D yazıcı** ile üretilir; ticari reducer + servo birleşimi.

---

## Neden 3D?

| | Ticari reducer | 3D özel kapı |
|--|----------------|--------------|
| Maliyet | Düşük (pasif) | Düşük (filament + servo) |
| Uzaktan kapatma | Hayır | **Evet** |
| IR / sensör yuvası | Sonradan | **Tasarımda** |
| Langstroth uyumu | Genelde evet | **Parametrik ayar** |

---

## Parçalar

1. **Çerçeve** — alt tahtaya vida, uçuş deliği 39×10 mm  
2. **Sürgü kapak** — servo ile kayar (açık → kapalı)  
3. **Servo braketi** — SG90 / MG90S  

OpenSCAD: `giris-kapisi.scad` → STL export.

---

## Yazılım eşlemesi

| `entranceGate.hedef` | Açık genişlik | Servo |
|----------------------|---------------|-------|
| `acik` | ~39 mm | 170° |
| `orta` | ~26 mm | 120° |
| `dar` | ~12 mm | 60° |
| `kapali` | ~2 mm | 20° |

`servo-acilar.json` — firmware kalibrasyonu.

---

## Montaj özeti

Alt tahta → çerçeve → sürgü → servo → kovan kartı PWM.

Tam adımlar: `hardware/3d-print/giris-kapisi/montaj.md`

**Bağlı:** `giris-kapisi.md` (yazılım + otomasyon)
