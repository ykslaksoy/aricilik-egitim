# Copernicus CLMS / CORINE — ~3 km flora örtüsü

Canlı CLMS API yok; raster/vektör ön-işleme gerekir.

## Önerilen akış

1. [Copernicus Land Monitoring](https://land.copernicus.eu/) veya CORINE Land Cover Türkiye katmanını indirin.
2. Arılık ızgarası (~3 km) için her hücrede dominant sınıf + orman yüzdesi hesaplayın (GDAL `gdalwarp` + `zonal_stats` veya PostGIS `ST_SummaryStats`).
3. JSON şeması: `data/seed/corine-flora-grid.sample.json` (`cells[]`: `lat`, `lon`, `halfDeg`, `dominance`, `forestPct`, `label`).
4. Uygulama: `floraAtPoint()` — tam grid dosyasını `corine-flora-grid.json` olarak `data/seed/` içine koyun ve `staticLayers.js` yolunu güncelleyin.

## NDVI ile birleştirme

CLMS örtü + NDVI trendi için `earth-engine-ndvi.md`.
