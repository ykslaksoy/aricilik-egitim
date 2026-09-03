/**
 * Çiçek ziyareti — giriş ROI polen (ek tuzak yok) kalite katmanı (#12 → K=100).
 * Kamera yoksa IR+nektar+hava proxy; saha çiçeklenme GT sayılmaz.
 */

function analyzeFlowerVisitQuality(result, cfg = {}, reading = null, weatherIndices = null) {
  const fault =
    reading?.fault === "flower" ||
    reading?.fault === "pollen" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("flower") || reading.faults.includes("pollen")));

  if (fault || result?.mod === "ariza") {
    return {
      score: 28,
      shParityPct: 32,
      strengths: [],
      issues: ["Çiçek ziyareti kanalı arızalı"],
      katmanlar: [],
      ariciya: "Çiçek ziyareti kalite 28/100 — kanal arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 68;

  const bomOk = cfg.flowerVisitBom !== false;
  katmanlar.push({
    id: "bom",
    label: "Giriş ROI polen (ek tuzak yok)",
    puan: bomOk ? 68 : 32,
    max: 68,
  });
  if (bomOk) {
    strengths.push("Giriş kamera ROI polen (BOM yok)");
  } else {
    score = 32;
    issues.push("Polen ROI tasarımı BOM'da yok");
  }

  if (cfg.factoryFlowerCert !== false) {
    score += 6;
    katmanlar.push({ id: "factory", label: "Polen sınıfı fabrika kalibrasyon", puan: 6 });
    strengths.push("Fabrika polen sınıfı");
  }

  if (cfg.flowerFirmwareProd !== false) {
    score += 4;
    katmanlar.push({ id: "fw", label: "Edge firmware polen sepeti", puan: 4 });
    strengths.push("Firmware pollen-load");
  }

  if (cfg.flowerRoiStandard !== false) {
    score += 2;
    katmanlar.push({ id: "mount", label: "Uçuş deliği ROI standart", puan: 2 });
    strengths.push("Standart giriş ROI");
  }

  const hasPollen =
    result?.pollenLoadPct != null ||
    reading?.pollenLoadPct != null ||
    reading?.flowerVisit?.pollenLoadPct != null;
  if (hasPollen) {
    score += 5;
    katmanlar.push({ id: "ingest", label: "pollenLoadPct ingest", puan: 5 });
    strengths.push("Polen yükü ingest");
  } else if (reading?.cameraPresent || reading?.beeOut != null) {
    score += 2;
    katmanlar.push({ id: "ingest", label: "IR/kamera proxy ingest", puan: 2 });
    issues.push("pollenLoadPct ingest bağla");
  } else {
    issues.push("Çiçek ziyareti ingest yok");
  }

  if (reading?.beeOut != null || reading?.beeIn != null) {
    score += 3;
    katmanlar.push({ id: "ir", label: "IR forager füzyon", puan: 3 });
    strengths.push("IR çıkış füzyon");
  }

  const nectar =
    weatherIndices?.nectarIndex ?? weatherIndices?.nektarIndeksi ?? result?.nectarIndex;
  if (nectar != null) {
    score += 4;
    katmanlar.push({ id: "nectar", label: "Nektar/tartı füzyon", puan: 4 });
    strengths.push("Nektar indeksi bağlı");
  }

  if (
    weatherIndices?.stationLinked ||
    weatherIndices?.precipMm != null ||
    weatherIndices?.solarW != null
  ) {
    score += 3;
    katmanlar.push({ id: "weather", label: "Yağmur/güneş uçuş kapısı", puan: 3 });
  }

  if (cfg.flowerContractModel !== false || result?.contractLinked) {
    score += 3;
    katmanlar.push({ id: "contract", label: "Pollination ROI bağ", puan: 3 });
    strengths.push("Kontrat ROI bağlı");
  }

  const scenarios = Number(cfg.flowerScenarioTests ?? cfg.flowerScenarioCount ?? 0);
  if (scenarios >= 10) {
    score += 2;
    katmanlar.push({ id: "scenario", label: "Çiçeklenme senaryo R ≥10", puan: 2 });
    strengths.push(`${scenarios} senaryo testi`);
  } else if (scenarios >= 4) {
    score += 1;
    katmanlar.push({ id: "scenario", label: "Senaryo R (kısmi)", puan: 1 });
  } else {
    issues.push("Yağmur / çiçek bitmiş senaryo R güçlendirilebilir");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 88;
  const shParityPct =
    score >= shRef
      ? 100
      : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    flowerVisitBom: bomOk,
    factoryFlowerCert: cfg.factoryFlowerCert !== false,
    flowerFirmwareProd: cfg.flowerFirmwareProd !== false,
    flowerScenarioTests: scenarios,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Çiçek ziyareti kalite 100/100 — giriş ROI polen + IR + nektar + ROI kontrat (SH 88 geçildi)"
        : score >= 90
          ? `Çiçek ziyareti kalite ${score}/100 · SH parity %${shParityPct}`
          : `Çiçek ziyareti kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — ROI ofsetini ve polen sınıfını koru"]
        : [
            ...(scenarios < 10 ? ["Yağmur / çiçek bitmiş / yoğun nektar senaryoları"] : []),
            ...(!hasPollen ? ["pollenLoadPct ingest veya kamera ROI bağla"] : []),
          ].slice(0, 3),
  };
}

module.exports = { analyzeFlowerVisitQuality };
