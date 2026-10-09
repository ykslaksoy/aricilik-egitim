# NASA/ESA NDVI (Google Earth Engine) — entegrasyon taslağı

Uygulama içinde **canlı Earth Engine çağrısı yok** (GCP proje + servis hesabı gerekir).

## MVP

- Aylık NDVI ortalamasını GEE `Export` ile GeoTIFF/CSV olarak indirin.
- `data/seed/ndvi-monthly.sample.json` formatında arılık ızgarasına özetleyin.
- İleride: `apps/api/src/geo/ndviProxy.js` — sunucu tarafı GEE REST veya önceden hesaplanmış tile URL.

## Ortam değişkenleri (ileride)

- `GEE_SERVICE_ACCOUNT_JSON` — dosya yolu (repo dışı)
- `GEE_PROJECT_ID`

Şimdilik foraj analizi Open-Meteo + statik örtü ile çalışır; NDVI yalnızca dokümante edilmiş ingestion yolu.
