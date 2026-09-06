#!/usr/bin/env bash
# örnek ingest — tüm sensör alanları
curl -s -X POST "${API_URL:-http://localhost:3847/api/ingest}" \
  -H 'Content-Type: application/json' \
  -d '{
    "hiveId": 7,
    "weightKg": 30.2,
    "cornerKg": [7.6, 7.5, 7.5, 7.6],
    "tempC": 34.1,
    "humidity": 58,
    "beeIn": 920,
    "beeOut": 1050,
    "vibration": 3,
    "audioRms": 0.18,
    "battery": 84,
    "ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }' | jq .
