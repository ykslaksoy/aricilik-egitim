/**
 * Hava istasyonu — fiziksel sensör + Open-Meteo / konum hava füzyonu (#10).
 */

const { WEATHER } = require("../../../../packages/shared/constants");
const { analyzeWeatherStationQuality } = require("./weatherStationCalibration");

function resolveStationFields(reading = {}) {
  const station = reading.weatherStation || {};
  return {
    present: Boolean(
      station.present ||
        station.rainMm != null ||
        station.solarW != null ||
        reading.rainMm != null ||
        reading.solarW != null
    ),
    rainMm: station.rainMm ?? reading.rainMm,
    solarW: station.solarW ?? reading.solarW,
    windKmh: station.windKmh ?? reading.windKmh,
    tempC: station.tempC ?? reading.outdoorTempC ?? station.outdoorTempC,
    humidityPct: station.humidityPct ?? station.humidity ?? reading.outdoorHumidityPct,
  };
}

function fuseWeatherStation(reading, locationWeather = {}, cfg = {}) {
  const raw = resolveStationFields(reading);
  const hasStation = raw.present;
  const fault =
    reading?.fault === "weather" ||
    reading?.fault === "weather_station" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("weather") || reading.faults.includes("weather_station")));

  if (fault) {
    const broken = {
      mod: "ariza",
      present: false,
      kaynak: "ariza",
      rainMm: null,
      solarW: null,
      windKmh: null,
      tempC: null,
      sinyaller: ["Hava istasyonu arızalı"],
      nectarLinked: false,
      ariciya: "Hava istasyonu arızalı — konum proxy kullan",
    };
    broken.quality = analyzeWeatherStationQuality(broken, cfg, reading, locationWeather);
    return broken;
  }

  const rainMm =
    raw.rainMm ??
    (locationWeather.condition === "yagmur" || locationWeather.condition === "saganak"
      ? Number(locationWeather.precipMm) || 0
      : Number(locationWeather.precipMm) || 0);
  const solarW =
    raw.solarW ??
    (locationWeather.condition === "acik"
      ? 650
      : locationWeather.condition === "bulutlu"
        ? 280
        : 120);
  const windKmh = raw.windKmh ?? locationWeather.windKmh ?? 0;
  const tempC = raw.tempC ?? locationWeather.tempC ?? reading?.outdoorTempC;
  const humidityPct = raw.humidityPct ?? locationWeather.humidityPct ?? null;

  let kaynak = hasStation ? "istasyon+konum" : "konum";
  if (hasStation && raw.rainMm != null && raw.solarW != null) kaynak = "istasyon";

  // Open-Meteo çapraz: istasyon yağışı ile konum farkı
  let meteoDeltaMm = null;
  if (hasStation && raw.rainMm != null && locationWeather.precipMm != null) {
    meteoDeltaMm = Math.round((Number(raw.rainMm) - Number(locationWeather.precipMm)) * 10) / 10;
  }

  const sinyaller = [];
  if (rainMm >= WEATHER.PRECIP_MM) sinyaller.push("Yağış — uçuş düşük beklenir");
  if (solarW >= 500 && rainMm < 1) sinyaller.push("Güneşli — nektar uçuşu uygun");
  if (windKmh >= WEATHER.STORM_WIND_KMH) sinyaller.push("Kuvvetli rüzgâr");
  if (tempC != null && tempC >= WEATHER.HEAT_OUTDOOR_C) sinyaller.push("Sıcak hava stresi");
  if (meteoDeltaMm != null && Math.abs(meteoDeltaMm) >= 3) {
    sinyaller.push(`İstasyon×Meteo Δ${meteoDeltaMm}mm`);
  }

  // İstasyon → nektar modeli (weatherIndices ile uyumlu sinyal)
  let nectarBoost = 0;
  if (rainMm < WEATHER.PRECIP_MM && solarW >= 400 && (tempC == null || (tempC >= 16 && tempC <= 32))) {
    nectarBoost = 12;
  } else if (rainMm >= WEATHER.PRECIP_MM) {
    nectarBoost = -18;
  } else if (solarW < 150) {
    nectarBoost = -6;
  }

  const fused = {
    mod: hasStation ? "calisiyor" : "konum_proxy",
    present: hasStation,
    kaynak,
    rainMm: Math.round(Number(rainMm) * 10) / 10,
    solarW: Math.round(Number(solarW)),
    windKmh: Math.round(Number(windKmh) * 10) / 10,
    tempC: tempC != null ? Math.round(Number(tempC) * 10) / 10 : null,
    humidityPct: humidityPct != null ? Math.round(Number(humidityPct) * 10) / 10 : null,
    meteoDeltaMm,
    nectarLinked: cfg.weatherNectarModel !== false,
    nectarBoost,
    sinyaller,
    ariciya: hasStation
      ? `Hava istasyonu aktif — ${Math.round(Number(rainMm) * 10) / 10}mm yağış · ${Math.round(Number(solarW))}W/m²`
      : `Konum hava proxy — istasyon sensörü yok (${locationWeather.label || locationWeather.konumEtiket || "?"})`,
  };

  fused.quality = analyzeWeatherStationQuality(fused, cfg, reading, locationWeather);
  if (fused.quality?.ariciya) {
    fused.ariciyaQuality = fused.quality.ariciya;
  }
  return fused;
}

module.exports = { fuseWeatherStation, resolveStationFields };
