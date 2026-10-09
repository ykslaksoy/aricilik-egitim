const path = require('path');
const {
  OVERPASS_ENDPOINTS,
  DEFAULT_WATER_SCAN_RADIUS_M,
  buildWaterQuery,
} = require(path.join(__dirname, '../../../web/geo/overpass'));

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

function isSeasonal(tags) {
  return tags?.intermittent === 'yes' || tags?.seasonal === 'yes';
}

function waterRank(tags, metres) {
  let score = metres;
  if (tags?.natural === 'spring') score -= 80;
  else if (tags?.amenity === 'drinking_water') score -= 60;
  else if (tags?.waterway === 'stream') score -= 40;
  else if (tags?.waterway === 'river') score += 220;
  if (isSeasonal(tags)) score += 400;
  return score;
}

function nearestWaterFromElements(lat, lon, elements) {
  let bestPerm = null;
  let bestAny = null;
  for (const e of elements || []) {
    const c = e.center || {};
    const elat = c.lat != null ? c.lat : e.lat;
    const elon = c.lon != null ? c.lon : e.lon;
    if (!Number.isFinite(Number(elat)) || !Number.isFinite(Number(elon))) continue;
    const tags = e.tags || {};
    const d = haversineM(lat, lon, Number(elat), Number(elon));
    const seasonal = isSeasonal(tags);
    const cand = { metres: d, lat: Number(elat), lon: Number(elon), tags, rank: waterRank(tags, d), seasonal };
    if (!bestAny || cand.rank < bestAny.rank) bestAny = cand;
    if (!seasonal && (!bestPerm || cand.rank < bestPerm.rank)) bestPerm = cand;
  }
  return bestPerm || bestAny;
}

async function postOverpass(query, fetchImpl = fetch) {
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(16000),
      });
      if (!res.ok) continue;
      return res.json();
    } catch {
      /* try next mirror */
    }
  }
  throw new Error('overpass_fail');
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {{ radiiM?: number[], fetchImpl?: typeof fetch }} [opts]
 */
async function findNearestWater(lat, lon, opts = {}) {
  const radii = opts.radiiM || DEFAULT_WATER_SCAN_RADIUS_M;
  let lastHit = null;
  for (const r of radii) {
    const query = buildWaterQuery(lat, lon, r);
    const json = await postOverpass(query, opts.fetchImpl);
    const hit = nearestWaterFromElements(lat, lon, json?.elements);
    if (hit && !hit.seasonal) return { ...hit, scanRadiusM: r, source: 'overpass' };
    if (hit) lastHit = hit;
  }
  if (lastHit) return { ...lastHit, source: 'overpass' };
  return null;
}

module.exports = {
  buildWaterQuery,
  findNearestWater,
  postOverpass,
  nearestWaterFromElements,
};
