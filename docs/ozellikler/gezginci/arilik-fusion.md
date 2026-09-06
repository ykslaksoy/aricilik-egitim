# Arılık fusion

**Durum:** calisiyor (demo)

## Ne demek?

**Arılık fusion**, tek kovan analizinin bir üst katmanıdır.

| Katman | Kapsam | Örnek |
|--------|--------|--------|
| Sensör analizi | 1 kovan, 1 sensör | “IR trafiği düşük” |
| Kovan fusion (`sensorFusion`) | 1 kovan, tüm sensörler | “Yağmur trafiği maskeliyor → zayıflık sanma” |
| **Arılık fusion** | **Aynı konumdaki tüm kovanlar** | “3 kovandan 1’i zayıf — komşu yağması?” |

Aynı arılıktaki (ör. Yayla Tortum) kovanların skor, trafik, oğul riski ve ana kamera verisi birlikte okunur.

## Ne üretir?

- Ortalama skor / trafik / oğul riski
- Arılıktan sapan kovanlar (zayıf, yüksek oğul, trafik sapması)
- Arılık geneli yapılacaklar
- Hava + ana kamera ile çelişki kontrolü

## API

- `GET /api/locations/:id/fusion`
- Kovan detayında `apiaryFusion`

**Bağlı:** `sensor-fusion.md` · `ana-kamera.md` · `gezginci/arilik.md`
