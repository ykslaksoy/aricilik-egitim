/**
 * Hava × koloni birleşik indeksler.
 */

const {
  SENSOR,
  SCORE,
  WEATHER,
} = require("../../../../packages/shared/constants");

function analyzeWeatherIndices(reading, colony, weather = {}, station = null) {
  const swing = colony?.dailyWeightSwingKg ?? 0;
  const traffic = colony?.middayTraffic || { beeOut: 0 };
  const outdoor = station?.tempC ?? weather?.tempC ?? 20;
  const precip =
    station?.rainMm != null ? Number(station.rainMm) : weather?.precipMm ?? 0;
  const solarW = station?.solarW != null ? Number(station.solarW) : null;

  let nektar = 40;
  if (outdoor >= 18 && outdoor <= 32 && precip < WEATHER.PRECIP_MM) nektar += 25;
  if (swing >= 0.8 && swing <= 2.5) nektar += 20;
  if (traffic.beeOut >= SCORE.TRAFFIC_GOOD) nektar += 15;
  if (precip >= WEATHER.PRECIP_MM) nektar -= 25;
  if (outdoor < 12) nektar -= 15;
  if (solarW != null) {
    if (solarW >= 500 && precip < 1) nektar += 8;
    else if (solarW < 120) nektar -= 8;
  }
  nektar = Math.max(0, Math.min(100, Math.round(nektar)));

  let ucus = "orta";
  let ucusLabel = "Orta uçuş penceresi";
  if (precip >= WEATHER.PRECIP_MM || weather?.condition === "yagmur") {
    ucus = "kapali";
    ucusLabel = "Yağmur — uçuş zayıf";
  } else if (outdoor >= 15 && outdoor <= 30 && traffic.beeOut >= 400) {
    ucus = "iyi";
    ucusLabel = "İyi uçuş günü";
  } else if (outdoor <= WEATHER.FROST_TEMP_C) {
    ucus = "don";
    ucusLabel = "Don — uçuş yok";
  } else if (traffic.beeOut < SCORE.TRAFFIC_WEAK) {
    ucus = "zayif";
    ucusLabel = "Zayıf trafik — hava veya koloni";
  }

  let stres = 0;
  if (reading?.tempC > SENSOR.TEMP_HIGH_C) stres += 25;
  if (reading?.humidity >= SENSOR.HUM_HIGH_PCT) stres += 20;
  if (reading?.vibration >= SENSOR.VIBRATION_HIGH) stres += 20;
  if (traffic.beeOut > 0 && traffic.beeOut < SCORE.TRAFFIC_WEAK) stres += 15;
  if (outdoor >= WEATHER.HEAT_OUTDOOR_C) stres += 10;
  stres = Math.min(100, stres);

  let ariciya = `Nektar indeksi ${nektar}/100 · ${ucusLabel}`;
  if (stres >= 40) ariciya += ` · stres ${stres}/100`;

  return {
    nektarIndeksi: nektar,
    nectarIndex: nektar,
    nektarLabel: nektar >= 70 ? "Güçlü" : nektar >= 45 ? "Orta" : "Zayıf",
    ucusPenceresi: ucus,
    ucusLabel,
    stresIndeksi: stres,
    stresLabel: stres >= 50 ? "Yüksek" : stres >= 25 ? "Orta" : "Düşük",
    stationLinked: Boolean(station?.present),
    precipMm: precip,
    solarW,
    ariciya,
  };
}

module.exports = { analyzeWeatherIndices };
