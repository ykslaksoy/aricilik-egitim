/**
 * Kovan giriş kamerası CV — kalite katmanı (#11 → K=100).
 * BOM opsiyonel: takılmazsa IR+tartı yolu; takılırsa edge YOLO/ONNX + IR çapraz.
 */

function analyzeCameraSensorQuality(result, cfg = {}, reading = null) {
  const fault =
    reading?.fault === "camera" ||
    (Array.isArray(reading?.faults) && reading.faults.includes("camera")) ||
    result?.mod === "degraded" ||
    result?.fault === "camera";

  if (fault && reading?.cameraPresent !== false) {
    return {
      score: 28,
      shParityPct: 29,
      strengths: [],
      issues: ["Giriş kamerası kanalı arızalı"],
      katmanlar: [],
      ariciya: "Kamera kalite 28/100 — sensör arızalı",
    };
  }

  if (reading?.cameraPresent === false || result?.fault === "missing") {
    return {
      score: 68,
      shParityPct: 69,
      strengths: ["Giriş kamerası BOM (opsiyonel — IR yolu aktif)"],
      issues: ["Bu kovanda kamera takılı değil"],
      katmanlar: [{ id: "bom", label: "Giriş kamera + edge BOM (takılı değil)", puan: 68, max: 68 }],
      ariciya: "Kamera yok — tasarım 68/100 BOM; IR+tartı ile devam",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 68;

  const bomOk = cfg.cameraBom !== false;
  katmanlar.push({
    id: "bom",
    label: "Giriş kamera + edge box BOM",
    puan: bomOk ? 68 : 40,
    max: 68,
  });
  if (bomOk) {
    strengths.push("Giriş kamera + edge BOM");
  } else {
    score = 40;
    issues.push("BOM'da giriş kamerası yok");
  }

  if (cfg.factoryCameraCert !== false) {
    score += 6;
    katmanlar.push({ id: "factory", label: "Kamera fabrika kalibrasyon", puan: 6 });
    strengths.push("Fabrika lens/odak kalibrasyon");
  }

  if (cfg.cameraFirmwareProd !== false) {
    score += 4;
    katmanlar.push({ id: "fw", label: "Edge firmware motion+YOLO", puan: 4 });
    strengths.push("Edge firmware prod");
  }

  if (cfg.cameraMountStandard !== false) {
    score += 2;
    katmanlar.push({ id: "mount", label: "Uçuş deliği standart montaj", puan: 2 });
    strengths.push("Standart giriş montaj");
  }

  const hasCounts =
    (reading?.cameraBeeIn != null && reading?.cameraBeeOut != null) ||
    (result?.counts?.inPerInterval != null && result?.counts?.outPerInterval != null);
  if (hasCounts) {
    score += 5;
    katmanlar.push({ id: "ingest", label: "cameraBeeIn/Out ingest", puan: 5 });
    strengths.push("CV ingest canlı");
  } else if (reading?.cameraPresent || result?.present) {
    score += 2;
    katmanlar.push({ id: "ingest", label: "Kamera present bayrağı", puan: 2 });
    issues.push("cameraBeeIn/Out ingest bağla");
  } else {
    issues.push("Kamera ingest yok");
  }

  const hasIr =
    reading?.beeIn != null ||
    reading?.beeOut != null ||
    result?.irComparison != null;
  if (hasIr && (reading?.cameraPresent || result?.present)) {
    score += 3;
    katmanlar.push({ id: "ir", label: "Kamera ↔ IR çapraz doğrulama", puan: 3 });
    strengths.push("IR çapraz kanal");
  }

  const labeled = Number(cfg.cameraLabeledFrames ?? cfg.cameraLabeledCount ?? 0);
  if (labeled >= 500) {
    score += 5;
    katmanlar.push({ id: "labeled", label: "Etiketli kare R ≥500", puan: 5 });
    strengths.push(`${labeled} etiketli kare`);
  } else if (labeled >= 120) {
    score += 2;
    katmanlar.push({ id: "labeled", label: "Etiketli kare (kısmi)", puan: 2 });
  } else {
    issues.push("500+ etiketli kare R seti güçlendirilebilir");
  }

  const scenarios = Number(cfg.cameraScenarioTests ?? cfg.cameraScenarioCount ?? 0);
  if (scenarios >= 12) {
    score += 4;
    katmanlar.push({ id: "scenario", label: "CV senaryo R ≥12", puan: 4 });
    strengths.push(`${scenarios} senaryo testi`);
  } else if (scenarios >= 4) {
    score += 2;
    katmanlar.push({ id: "scenario", label: "Senaryo R (kısmi)", puan: 2 });
  } else {
    issues.push("Yoğun/yağmur/gece senaryo R seti güçlendirilebilir");
  }

  if (cfg.cameraYoloOnnx !== false) {
    score += 3;
    katmanlar.push({ id: "yolo", label: "YOLO/ONNX arı sayımı", puan: 3 });
    strengths.push("YOLO/ONNX edge yolu");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 98;
  const shParityPct =
    score >= shRef
      ? 100
      : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    cameraBom: bomOk,
    factoryCameraCert: cfg.factoryCameraCert !== false,
    cameraFirmwareProd: cfg.cameraFirmwareProd !== false,
    cameraYoloOnnx: cfg.cameraYoloOnnx !== false,
    cameraLabeledFrames: labeled,
    cameraScenarioTests: scenarios,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Kamera CV kalite 100/100 — giriş edge YOLO + IR çapraz + 500 etiket (SH 98)"
        : score >= 90
          ? `Kamera CV kalite ${score}/100 · SH parity %${shParityPct}`
          : `Kamera CV kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — lens ofsetini ve etiket arşivini koru"]
        : [
            ...(labeled < 500 ? ["500+ gündüz/gece etiketli kare"] : []),
            ...(scenarios < 12 ? ["Yoğun trafik / yağmur / gece senaryo testleri"] : []),
            ...(!hasCounts ? ["cameraBeeIn + cameraBeeOut ingest bağla"] : []),
          ].slice(0, 3),
  };
}

module.exports = { analyzeCameraSensorQuality };
