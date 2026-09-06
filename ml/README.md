# koloni ML — veri ve eğitim

Sensör + etiket biriktir → Python ile eğit → ONNX → API.

## Veri akışı

```
NODE ingest (15 dk)  →  SQLite readings
Muayene formu        →  SQLite labels   ← ML hedef değişkeni
GET /api/export/dataset  →  ml/data/
python ml/train_acoustic.py  →  data/models/acoustic_v1.onnx
API acousticMlAnalysis  →  ONNX veya kural fallback
```

## API

| Endpoint | Açıklama |
|----------|----------|
| `POST /api/labels` | Muayene / olay etiketi |
| `GET /api/labels?hiveId=` | Etiket listesi |
| `GET /api/export/dataset` | JSON (readings + labels) |
| `GET /api/export/dataset?format=csv` | CSV indir |
| `GET /api/ml/config` | Model durumu |

## Etiket tipleri

`normal`, `queen_present`, `queenless`, `swarm_risk`, `swarm_occurred`, `varroa`, `robbing`, `inspection`, `sensor_fault`, `harvest`, `other`

## Kurulum

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Eğitim (iskelet)

```bash
# Sunucudan veri indir
curl -o data/dataset.json http://localhost:3847/api/export/dataset

python train_acoustic.py --dataset data/dataset.json
# Çıktı: ../data/models/acoustic_v1.onnx (henüz placeholder)
```

## Hedef

- **30 kovan × 1 yıl** sensör + haftalık etiket → ilk saha modeli
- **MSPB** açık veri → ön eğitim (ana / oğul)
- Kamera **gerekmez** — tartı + IR + ses yeterli
