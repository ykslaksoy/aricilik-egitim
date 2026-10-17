# firmware

| klasör | kart | rol |
|--------|------|-----|
| `node/` | T-Weigh | kovan sensörleri |
| `gate/` | T-Beam + A7670E | LoRa → 4G |

payload: `packages/shared/schemas/ingest.schema.json`

Donanım kararı (koloni-243, 17.10.2026): kovan başına 1 node (T-Weigh) → LoRa EU868 → **arılık başına 1 gateway** → 4G. Sıcaklık/nem SHT41 (DHT22 kaldırıldı), giriş DS18B20, mikrofon SPH0645, ivmeölçer ADXL345. Liste: `docs/donanim-listesi.md` · Yönetici › Donanım.
