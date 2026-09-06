/**
 * IR beeIn/Out — öğlen kalibrasyon + kamera çapraz + saha montaj kalitesi.
 */

function analyzeIrSensorQuality(result, cfg = {}, reading = null, colony = null, meta = {}) {
  if (!result || result.profile === "ariza" || result.unavailable) {
    return {
      score: 32,
      shParityPct: 100,
      strengths: [],
      issues: ["IR sayaç arızalı"],
      katmanlar: [],
      ariciya: "IR kalite 32/100 — sensör arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 80;

  katmanlar.push({ id: "bom", label: "IR sayaç BOM + ingest", puan: 80, max: 80 });
  strengths.push("IR beeIn/Out (BOM)");

  if (cfg.factoryIrCert !== false) {
    score += 4;
    katmanlar.push({ id: "factory", label: "IR fabrika kalibrasyon", puan: 4 });
    strengths.push("Fabrika kalibrasyon sertifikası");
  }

  if (cfg.irMountStandard !== false) {
    score += 2;
    katmanlar.push({ id: "mount", label: "Standart giriş montajı", puan: 2 });
    strengths.push("Standart IR montaj");
  }

  const samples = result.samples ?? colony?.middayTraffic?.samples ?? 0;
  if (cfg.middayBeeOutRef != null || samples >= 20) {
    score += 6;
    katmanlar.push({ id: "midday", label: "Öğlen kalibrasyon serisi", puan: 6 });
    strengths.push(
      cfg.middayBeeOutRef != null
        ? `Öğlen ref ${cfg.middayBeeOutRef}`
        : `${samples} öğlen örneği`
    );
  } else if (samples >= 8) {
    score += 3;
    katmanlar.push({ id: "midday", label: "Öğlen örnekleri (kısmi)", puan: 3 });
  } else {
    issues.push("Öğlen kalibrasyon serisi yetersiz");
  }

  if (cfg.referenceBeeCount != null) {
    score += 3;
    katmanlar.push({ id: "bee_ref", label: "Referans arı × IR füzyon", puan: 3 });
    strengths.push(`Ref arı ${cfg.referenceBeeCount}`);
  }

  if (reading?.cameraPresent && reading?.cameraBeeOut != null) {
    const irOut = reading.beeOut ?? 0;
    const camOut = Number(reading.cameraBeeOut);
    const delta = Math.abs(irOut - camOut);
    const rel = irOut > 0 ? delta / irOut : delta;
    if (rel <= 0.25 || delta <= 50) {
      score += 4;
      katmanlar.push({ id: "cam", label: "Kamera ↔ IR çapraz", puan: 4 });
      strengths.push("Kamera ↔ IR uyumlu");
    } else {
      issues.push("Kamera ↔ IR sapması");
      score -= 2;
    }
  } else if (colony?.calibrated) {
    score += 2;
    katmanlar.push({ id: "cam", label: "Kalibrasyon bayrağı", puan: 2 });
  }

  if (result.rainMasked || result.profile === "dusuk_yagmur") {
    score += 1;
    strengths.push("Yağmur maskesi aktif");
  }

  if (result.inOutRatio != null && result.inOutRatio >= 0.7) {
    score += 3;
    katmanlar.push({ id: "ratio", label: "Sağlıklı in/out oranı", puan: 3 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 0;
  const shParityPct = 100;

  return {
    score,
    shParityPct,
    shRef,
    middaySamples: samples,
    middayBeeOutRef: cfg.middayBeeOutRef ?? null,
    factoryIrCert: cfg.factoryIrCert !== false,
    irMountStandard: cfg.irMountStandard !== false,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "IR kalite 100/100 — öğlen kal. + montaj + kamera çapraz (SH 0, eşsiz)"
        : score >= 90
          ? `IR kalite ${score}/100 · eşsiz avantaj`
          : `IR kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — mevcut ayarları koru"]
        : [
            ...(samples < 20 && cfg.middayBeeOutRef == null
              ? ["Öğlen kalibrasyon serisini tamamla"]
              : []),
            ...(cfg.referenceBeeCount == null ? ["Referans arı sayımı gir"] : []),
            "30 kovan IR saha montaj serisi (R #17)",
          ].slice(0, 3),
  };
}

module.exports = { analyzeIrSensorQuality };
