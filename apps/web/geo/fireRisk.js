/**
 * Yangın riski — Open-Meteo girdileri + basit skor (0–100).
 * NASA FIRMS sıcak noktaları ayrı modülde (firms.js).
 */

const OPEN_METEO_FORECAST =
  'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}' +
  '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code' +
  '&daily=temperature_2m_max,relative_humidity_2m_min,precipitation_sum,wind_speed_10m_max' +
  '&wind_speed_unit=kmh&timezone=auto&forecast_days=3';

/**
 * @param {{ tempC?: number, humidity?: number, precipMm?: number, windKmh?: number, tempMaxC?: number, humidityMin?: number, windMaxKmh?: number, precipSumMm?: number }} input
 * @returns {{ score: number, level: 'dusuk'|'orta'|'yuksek'|'cok_yuksek', label: string, factors: string[] }}
 */
function scoreFireRisk(input) {
  const factors = [];
  let score = 12;

  const temp = Number(input.tempC ?? input.tempMaxC ?? 20);
  const hum = Number(input.humidity ?? input.humidityMin ?? 50);
  const wind = Number(input.windKmh ?? input.windMaxKmh ?? 0);
  const precip = Number(input.precipMm ?? input.precipSumMm ?? 0);

  if (temp >= 32) {
    score += 28;
    factors.push('Yüksek sıcaklık');
  } else if (temp >= 28) {
    score += 16;
    factors.push('Sıcak hava');
  } else if (temp >= 24) {
    score += 8;
  }

  if (hum <= 25) {
    score += 26;
    factors.push('Çok düşük nem');
  } else if (hum <= 35) {
    score += 14;
    factors.push('Düşük nem');
  } else if (hum <= 45) {
    score += 6;
  }

  if (wind >= 45) {
    score += 22;
    factors.push('Kuvvetli rüzgâr');
  } else if (wind >= 30) {
    score += 12;
    factors.push('Rüzgârlı');
  }

  if (precip >= 5) {
    score -= 18;
    factors.push('Yağış riski düşürür');
  } else if (precip >= 1) {
    score -= 8;
  } else if (precip < 0.1) {
    score += 6;
    factors.push('Kuru hava');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level = 'dusuk';
  let label = 'Düşük yangın riski';
  if (score >= 75) {
    level = 'cok_yuksek';
    label = 'Çok yüksek yangın riski';
  } else if (score >= 55) {
    level = 'yuksek';
    label = 'Yüksek yangın riski';
  } else if (score >= 35) {
    level = 'orta';
    label = 'Orta yangın riski';
  }

  return { score, level, label, factors };
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {typeof fetch} [fetchImpl]
 */
async function fetchOpenMeteoFireInputs(lat, lon, fetchImpl = fetch) {
  const url = OPEN_METEO_FORECAST.replace('{lat}', String(lat)).replace('{lon}', String(lon));
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`open_meteo_${res.status}`);
  const json = await res.json();
  const cur = json.current || {};
  const daily = json.daily || {};
  return {
    tempC: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    precipMm: cur.precipitation,
    windKmh: cur.wind_speed_10m,
    tempMaxC: daily.temperature_2m_max && daily.temperature_2m_max[0],
    humidityMin: daily.relative_humidity_2m_min && daily.relative_humidity_2m_min[0],
    windMaxKmh: daily.wind_speed_10m_max && daily.wind_speed_10m_max[0],
    precipSumMm: daily.precipitation_sum && daily.precipitation_sum[0],
    weatherCode: cur.weather_code,
    fetchedAt: new Date().toISOString(),
    source: 'open_meteo',
  };
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {typeof fetch} [fetchImpl]
 */
async function assessFireRisk(lat, lon, fetchImpl = fetch) {
  const inputs = await fetchOpenMeteoFireInputs(lat, lon, fetchImpl);
  const risk = scoreFireRisk(inputs);
  return { ...risk, inputs };
}

module.exports = {
  OPEN_METEO_FORECAST,
  scoreFireRisk,
  fetchOpenMeteoFireInputs,
  assessFireRisk,
};
