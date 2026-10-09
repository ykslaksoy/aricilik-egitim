/**
 * NASA FIRMS — yakın sıcak noktalar (VIIRS SNPP NRT).
 * Ücretsiz MAP_KEY: https://firms.modaps.eosdis.nasa.gov/api/map_key/
 * Ortam: NASA_FIRMS_MAP_KEY
 */

const FIRMS_AREA_CSV =
  'https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/{bbox}/{dayRange}/{mapKey}';

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} [radiusKm]
 */
function bboxAround(lat, lon, radiusKm = 25) {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const west = lon - dLon;
  const east = lon + dLon;
  const south = lat - dLat;
  const north = lat + dLat;
  return [west, south, east, north].map((n) => Math.round(n * 1000) / 1000).join(',');
}

/**
 * Minimal CSV parse (latitude,longitude,bright_ti4,frp,...)
 * @param {string} csv
 * @returns {Array<{ lat: number, lon: number, frp?: number, brightness?: number }>}
 */
function parseFirmsCsv(csv) {
  const lines = String(csv || '').trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const latI = header.indexOf('latitude');
  const lonI = header.indexOf('longitude');
  const frpI = header.indexOf('frp');
  const brightI = header.indexOf('bright_ti4');
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const lat = Number(cols[latI]);
    const lon = Number(cols[lonI]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      lat,
      lon,
      frp: frpI >= 0 ? Number(cols[frpI]) : undefined,
      brightness: brightI >= 0 ? Number(cols[brightI]) : undefined,
    });
  }
  return out;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {{ mapKey?: string, dayRange?: number, radiusKm?: number, fetchImpl?: typeof fetch }} [opts]
 */
async function fetchNearbyHotspots(lat, lon, opts = {}) {
  const mapKey = opts.mapKey || process.env.NASA_FIRMS_MAP_KEY || '';
  if (!mapKey) {
    return {
      hotspots: [],
      source: 'firms',
      configured: false,
      message: 'NASA_FIRMS_MAP_KEY tanımlı değil',
    };
  }
  const dayRange = opts.dayRange ?? 1;
  const radiusKm = opts.radiusKm ?? 30;
  const bbox = bboxAround(lat, lon, radiusKm);
  const url = FIRMS_AREA_CSV.replace('{bbox}', bbox)
    .replace('{dayRange}', String(dayRange))
    .replace('{mapKey}', mapKey);
  const fetchImpl = opts.fetchImpl || fetch;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`firms_${res.status}`);
  const csv = await res.text();
  const raw = parseFirmsCsv(csv);
  const hotspots = raw
    .map((h) => ({
      ...h,
      distanceKm: Math.round(haversineKm(lat, lon, h.lat, h.lon) * 10) / 10,
    }))
    .filter((h) => h.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return {
    hotspots,
    source: 'firms',
    configured: true,
    bbox,
    dayRange,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  FIRMS_AREA_CSV,
  bboxAround,
  parseFirmsCsv,
  fetchNearbyHotspots,
};
