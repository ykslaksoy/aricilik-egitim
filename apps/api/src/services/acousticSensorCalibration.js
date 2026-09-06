/**
 * Akustik / mikrofon — MEMS kalibrasyon + etiket arşivi + SH parity kalitesi.
 */

function analyzeAcousticSensorQuality(result, cfg = {}, reading = null, meta = {}) {
  if (!result || result.mod === "off") {
    return {
      score: 28,
      shParityPct: 29,
      strengths: [],
      issues: ["Mikrofon verisi yok veya arızalı"],
      katmanlar: [],
      ariciya: "Akustik kalite 28/100 — mikrofon arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 72;

  katmanlar.push({ id: "bom", label: "MEMS mikrofon BOM + ingest", puan: 72, max: 72 });
  strengths.push("MEMS mikrofon (BOM)");

  if (cfg.factoryMicCert !== false) {
    score += 5;
    katmanlar.push({ id: "factory", label: "MEMS fabrika kalibrasyon", puan: 5 });
    strengths.push("Fabrika kalibrasyon sertifikası");
  }

  if (cfg.micMountIsolated !== false) {
    score += 3;
    katmanlar.push({ id: "mount", label: "İzole montaj", puan: 3 });
    strengths.push("İzole MEMS montaj");
  }

  if (result.method === "onnx_v1") {
    score += 8;
    katmanlar.push({ id: "onnx", label: "ONNX model deploy", puan: 8 });
    strengths.push("ONNX akustik model");
  } else if (result.mlTarget === "model_ready") {
    score += 8;
    katmanlar.push({ id: "onnx", label: "200+ etiket → model-ready", puan: 8 });
    strengths.push("Feature fusion model-ready (200+ etiket)");
  } else if (result.method === "feature_fusion_v1") {
    score += 6;
    katmanlar.push({ id: "fusion", label: "5 sınıf feature fusion", puan: 6 });
    strengths.push("Feature fusion v1 (5 sınıf)");
  }

  const labeled = Number(cfg.acousticLabeledSamples ?? 0);
  if (labeled >= 200) {
    score += 6;
    katmanlar.push({ id: "labels", label: "200+ etiketli ses arşivi", puan: 6 });
    strengths.push(`${labeled} etiketli kayıt`);
  } else if (labeled >= 50) {
    score += 3;
    katmanlar.push({ id: "labels", label: "Etiket arşivi (kısmi)", puan: 3 });
    strengths.push(`${labeled} etiketli kayıt`);
  } else {
    issues.push("Etiketli ses arşivi <50 — R #17");
  }

  if (reading?.vibration != null && reading.audioRms != null) {
    score += 3;
    katmanlar.push({ id: "vib", label: "Titreşim × akustik füzyon", puan: 3 });
  }

  if (result.guven === "yuksek" || (result.baskin?.skor ?? 0) >= 55) {
    score += 3;
    katmanlar.push({ id: "guven", label: "Sınıf güveni yüksek", puan: 3 });
  } else if (result.guven === "orta") {
    score += 1;
  }

  if (cfg.referenceAudioRms != null && reading?.audioRms != null) {
    const d = Math.abs(Number(reading.audioRms) - Number(cfg.referenceAudioRms));
    if (d <= 0.08) {
      score += 2;
      katmanlar.push({ id: "ref", label: "Referans RMS kalibrasyon", puan: 2 });
      strengths.push(`RMS ref Δ ${d.toFixed(3)}`);
    }
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
    acousticLabeledSamples: labeled,
    referenceAudioRms: cfg.referenceAudioRms ?? null,
    factoryMicCert: cfg.factoryMicCert !== false,
    micMountIsolated: cfg.micMountIsolated !== false,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Akustik kalite 100/100 — MEMS + fusion + etiket arşivi (SH 98 geçildi)"
        : score >= 90
          ? `Akustik kalite ${score}/100 · SH parity %${shParityPct}`
          : `Akustik kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — mevcut ayarları koru"]
        : [
            ...(labeled < 200 ? ["Queenless/oğul/yağma etiketli ses arşivini büyüt"] : []),
            ...(cfg.referenceAudioRms == null ? ["Referans RMS kalibrasyonu"] : []),
            "ONNX model eğitimi (ml/train_acoustic.py)",
          ].slice(0, 3),
  };
}

module.exports = { analyzeAcousticSensorQuality };
