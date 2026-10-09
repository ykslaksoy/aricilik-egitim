# Coğrafi veri içe aktarma (SüperArı)

Kullanıcı dokümantasyonu: Project Context → `docs/geo-data-sources.md`.

| Kaynak | Betik / dosya |
|--------|----------------|
| Turkomp / arıcılık haritası | `import-turkomp-apiaries.js` + `data/seed/turkomp-apiaries.template.csv` |
| GeoNames TR su | `download-geonames-tr.sh` |
| OGM meşcere .shp | `import-ogm-mescere.md` |
| Copernicus CLMS / CORINE | `README-corine-clms.md` |
| NASA/ESA NDVI (Earth Engine) | `earth-engine-ndvi.md` |

PostGIS üretim ortamı zorunlu değil; MVP statik JSON/GeoJSON (`data/seed/`) ve API `/api/geo/context?demo=1`.
