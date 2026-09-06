/**
 * Open-Meteo — canlı hava (saha istasyonu yokken konum bazlı).
 * Cache: 30 dk · fallback: statik konum hava
 */

const CACHE_MS = 30 * 60 * 1000;
/** @type {Map<string, { at: number, data: object }>} */
const cache = new Map();

function cacheKey(lat, lon) {
  return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
}

function mapCondition(code, precipMm, windKmh) {
  if (precipMm >= 2 || (code >= 51 && code <= 67) || code >= 80) return "yagmur";
  if (windKmh >= 40 || code >= 95) return "firtina";
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return "don";
  }
  if (code <= 3) return "acik";
  return "bulutlu";
}

function mapLabel(condition, tempC) {
  const map = {
    acik: "Açık",
    bulutlu: "Bulutlu",
    yagmur: "Yağmurlu",
    firtina: "Fırtına",
    don: tempC <= 5 ? "Don riski" : "Kar / soğuk",
  };
  return map[condition] || "Bulutlu";
}

async function fetchOpenMeteo(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
    `&wind_speed_unit=kmh&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`open_meteo_${res.status}`);
  const json = await res.json();
  const cur = json.current || {};
  const tempC = Math.round((cur.temperature_2m ?? 20) * 10) / 10;
  const precipMm = Math.round((cur.precipitation ?? 0) * 10) / 10;
  const windKmh = Math.round(cur.wind_speed_10m ?? 0);
  const humidity = Math.round(cur.relative_humidity_2m ?? 50);
  const condition = mapCondition(cur.weather_code ?? 0, precipMm, windKmh);
  return {
    tempC,
    precipMm,
    windKmh,
    humidity,
    condition,
    label: mapLabel(condition, tempC),
    weatherCode: cur.weather_code,
    fetchedAt: new Date().toISOString(),
  };
}

async function getWeatherForLocation(lat, lon, fallback = null) {
  const key = cacheKey(lat, lon);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { ...hit.data, source: "open_meteo", cached: true };
  }
  try {
    const data = await fetchOpenMeteo(lat, lon);
    cache.set(key, { at: Date.now(), data });
    return { ...data, source: "open_meteo", cached: false };
  } catch {
    if (fallback) return { ...fallback, source: "konum_fallback", cached: false };
    return null;
  }
}

function warmCache(locations = []) {
  for (const loc of locations) {
    if (loc.lat == null || loc.lon == null) continue;
    getWeatherForLocation(loc.lat, loc.lon, loc.weather).catch(() => {});
  }
}

function getCacheStats() {
  return { entries: cache.size, ttlMin: CACHE_MS / 60000 };
}

module.exports = {
  getWeatherForLocation,
  warmCache,
  getCacheStats,
  fetchOpenMeteo,
};
