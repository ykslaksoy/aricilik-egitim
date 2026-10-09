/**
 * OpenStreetMap Overpass — su kaynakları ve akarsu sorguları (SüperArı geo).
 * Tarayıcı: landcover-sync.js; sunucu: apps/api/src/geo/overpassService.js
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const DEFAULT_WATER_SCAN_RADIUS_M = [300, 800, 1500];

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusM
 * @returns {string}
 */
function buildWaterQuery(lat, lon, radiusM) {
  const la = Number(lat);
  const lo = Number(lon);
  const r = Math.round(Number(radiusM));
  if (!Number.isFinite(la) || !Number.isFinite(lo) || !Number.isFinite(r) || r <= 0) {
    throw new Error('invalid_coords');
  }
  const around = `(around:${r},${la},${lo})`;
  return (
    '[out:json][timeout:18];(' +
    `node["natural"="spring"]${around};` +
    `node["amenity"="drinking_water"]${around};` +
    `node["man_made"="water_well"]${around};` +
    `way["waterway"~"^(stream|brook)$"]${around};` +
    `way["waterway"="river"]${around};` +
    ');out tags center;'
  );
}

module.exports = {
  OVERPASS_ENDPOINTS,
  DEFAULT_WATER_SCAN_RADIUS_M,
  buildWaterQuery,
};
