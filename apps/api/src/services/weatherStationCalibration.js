/**
 * Hava istasyonu — yağmur + güneş BOM kalite katmanı (#10 → K=100).
 * Arılık seviyesi: 1 istasyon / ~15 kovan; Open-Meteo yedek füzyon.
 */

function analyzeWeatherStationQuality(result, cfg = {}, reading = null, locationWeather = null) {
  const station = reading?.weatherStation || {};
  const fault =
    reading?.fault === "weather" ||
    reading?.fault === "weather_station" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("weather") || reading.faults.includes("weather_station")));

  if (fault || result?.mod === "ariza") {
    return {
      score: 28,
      shParityPct: 29,
      strengths: [],
      issues: ["Hava istasyonu kanalı arızalı"],
      katmanlar: [],
      ariciya: "Hava istasyonu kalite 28/100 — sensör arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 70;

  const bomOk = cfg.weatherStationBom !== false;
  katmanlar.push({
    id: "bom",
    label: "Yağmur + güneş istasyonu BOM (1/15 kovan)",
    puan: bomOk ? 70 : 40,
    max: 70,
  });
  if (bomOk) {
    strengths.push("Yağmur+güneş istasyonu BOM");
  } else {
    score = 40;
    issues.push("BOM'da fiziksel istasyon yok");
  }

  if (cfg.factoryWeatherCert !== false) {
    score += 6;
    katmanlar.push({ id: "factory", label: "İstasyon fabrika kalibrasyon", puan: 6 });
    strengths.push("Fabrika kalibrasyon");
  }

  if (cfg.weatherFirmwareProd !== false) {
    score += 4;
    katmanlar.push({ id: "fw", label: "İstasyon firmware rain/solar", puan: 4 });
    strengths.push("Firmware rain/solar aktif");
  }

  if (cfg.weatherMountStandard !== false) {
    score += 2;
    katmanlar.push({ id: "mount", label: "Arılık direk standart montaj", puan: 2 });
    strengths.push("Standart arılık montaj");
  }

  const hasRain = station.rainMm != null || reading?.rainMm != null;
  const hasSolar = station.solarW != null || reading?.solarW != null;
  if (hasRain && hasSolar) {
    score += 5;
    katmanlar.push({ id: "ingest", label: "rainMm + solarW ingest", puan: 5 });
    strengths.push("İstasyon ingest canlı");
  } else if (hasRain || hasSolar) {
    score += 2;
    katmanlar.push({ id: "ingest", label: "Kısmi istasyon ingest", puan: 2 });
    issues.push("rainMm ve solarW birlikte beklenir");
  } else if (result?.present) {
    score += 2;
    katmanlar.push({ id: "ingest", label: "İstasyon present bayrağı", puan: 2 });
  } else {
    issues.push("İstasyon ingest yok — konum proxy");
  }

  if (station.windKmh != null || reading?.windKmh != null) {
    score += 2;
    katmanlar.push({ id: "wind", label: "Rüzgâr kanalı", puan: 2 });
  }

  if (locationWeather && (locationWeather.precipMm != null || locationWeather.source === "open-meteo" || locationWeather.source === "openmeteo")) {
    score += 3;
    katmanlar.push({ id: "meteo", label: "Open-Meteo çapraz doğrulama", puan: 3 });
    strengths.push("Open-Meteo füzyon");
  } else if (locationWeather?.condition) {
    score += 2;
    katmanlar.push({ id: "meteo", label: "Konum hava çapraz", puan: 2 });
  }

  if (result?.nectarLinked || cfg.weatherNectarModel !== false) {
    score += 3;
    katmanlar.push({ id: "nectar", label: "İstasyon→nektar modeli", puan: 3 });
    strengths.push("Nektar indeksi bağlı");
  }

  const scenarios = Number(cfg.weatherScenarioTests ?? cfg.weatherScenarioCount ?? 0);
  if (scenarios >= 15) {
    score += 4;
    katmanlar.push({ id: "scenario", label: "Yağmur/güneş senaryo R ≥15", puan: 4 });
    strengths.push(`${scenarios} senaryo testi`);
  } else if (scenarios >= 6) {
    score += 2;
    katmanlar.push({ id: "scenario", label: "Senaryo R (kısmi)", puan: 2 });
  } else {
    issues.push("Yağmur/güneş senaryo R seti güçlendirilebilir");
  }

  const rainVal = station.rainMm ?? reading?.rainMm ?? result?.rainMm;
  if (cfg.referenceRainMm != null && rainVal != null) {
    const d = Math.abs(Number(rainVal) - Number(cfg.referenceRainMm));
    if (d <= 1.5) {
      score += 2;
      katmanlar.push({ id: "refRain", label: "Referans yağış kalibrasyon", puan: 2 });
      strengths.push(`Yağış ref Δ${d.toFixed(1)}mm`);
    }
  }

  const solarVal = station.solarW ?? reading?.solarW ?? result?.solarW;
  if (cfg.referenceSolarW != null && solarVal != null) {
    const d = Math.abs(Number(solarVal) - Number(cfg.referenceSolarW));
    if (d <= 80) {
      score += 1;
      katmanlar.push({ id: "refSolar", label: "Referans güneş kalibrasyon", puan: 1 });
    }
  }

  if (station.tempC != null || station.humidityPct != null || reading?.outdoorTempC != null) {
    score += 2;
    katmanlar.push({ id: "outdoor", label: "Dış sıcaklık/nem füzyon", puan: 2 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 96;
  const shParityPct =
    score >= shRef
      ? 100
      : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    weatherStationBom: bomOk,
    factoryWeatherCert: cfg.factoryWeatherCert !== false,
    weatherFirmwareProd: cfg.weatherFirmwareProd !== false,
    weatherScenarioTests: scenarios,
    referenceRainMm: cfg.referenceRainMm ?? null,
    referenceSolarW: cfg.referenceSolarW ?? null,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Hava istasyonu kalite 100/100 — yağmur+güneş + Open-Meteo + nektar (SH 96 geçildi)"
        : score >= 90
          ? `Hava istasyonu kalite ${score}/100 · SH parity %${shParityPct}`
          : `Hava istasyonu kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — arılık istasyon ofsetlerini koru"]
        : [
            ...(scenarios < 15 ? ["Yağmur / güneş / fırtına senaryo testlerini artır"] : []),
            ...(cfg.referenceRainMm == null ? ["Referans yağış (mm) kaydı"] : []),
            ...(!hasRain || !hasSolar ? ["rainMm + solarW ingest bağla"] : []),
          ].slice(0, 3),
  };
}

module.exports = { analyzeWeatherStationQuality };
