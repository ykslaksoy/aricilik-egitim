/**
 * GeoNames TR su özellikleri — yerel JSON (bulk indirme sonrası).
 * Örnek: data/seed/geonames-tr-water.sample.json
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_PATH = path.join(__dirname, '../../../../data/seed/geonames-tr-water.sample.json');

/** @type {Array<{ name: string, lat: number, lon: number, featureClass?: string, featureCode?: string }>} */
let cache = null;

function loadCatalog() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(SAMPLE_PATH, 'utf8');
    const json = JSON.parse(raw);
    cache = Array.isArray(json.features) ? json.features : [];
  } catch {
    cache = [];
  }
  return cache;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} [maxM]
 */
function nearestWaterFeature(lat, lon, maxM = 5000) {
  const list = loadCatalog();
  let best = null;
  for (const f of list) {
    const d = haversineM(lat, lon, f.lat, f.lon);
    if (d > maxM) continue;
    if (!best || d < best.metres) {
      best = { ...f, metres: d, source: 'geonames_local' };
    }
  }
  return best;
}

module.exports = {
  loadCatalog,
  nearestWaterFeature,
  SAMPLE_PATH,
};
