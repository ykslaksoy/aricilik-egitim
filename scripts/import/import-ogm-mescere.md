# OGM meşcere shapefile → statik katman

1. OGM’den indirilen `.shp` (+ `.shx`, `.dbf`, `.prj`) dosyalarını `data/raw/ogm-mescere/` altına koyun.
2. `ogr2ogr` ile WGS84 GeoJSON (basitleştirilmiş):

```bash
ogr2ogr -f GeoJSON -t_srs EPSG:4326 -simplify 0.001 \
  data/seed/ogm-mescere.geojson \
  data/raw/ogm-mescere/mescere.shp
```

3. Üretimde PostGIS: `shp2pgsql -I -s 4326 mescere public.ogm_mescere | psql $DATABASE_URL`
4. API MVP: `data/seed/ogm-mescere.sample.geojson` + `apps/api/src/geo/staticLayers.js` nokta-içi sorgu.
