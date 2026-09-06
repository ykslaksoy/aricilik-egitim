/**
 * Yavru alanı sıcaklık — DS18B20 petek prob + tempC model füzyonu.
 */

const { SENSOR, BROOD } = require("../../../../packages/shared/constants");

function applyBroodProbeOffset(tempBroodC, cfg = {}) {
  if (tempBroodC == null) return null;
  const offset = cfg.broodProbeOffsetC ?? 0;
  return Math.round((Number(tempBroodC) - offset) * 10) / 10;
}

function estimateBroodTempModel(reading, colony) {
  const ambient = reading?.tempC;
  if (ambient == null || ambient < SENSOR.TEMP_FAULT_MIN_C) {
    return { tempBroodC: null, guven: 0, kaynak: "yok" };
  }
  const beeFactor = Math.min(1, (colony?.beeEstimate ?? 20000) / 35000);
  const weightFactor = Math.min(1, (reading?.weightKg ?? 20) / 28);
  const broodOffset = 1.2 + beeFactor * 1.4 + weightFactor * 0.6;
  const tempBroodC = Math.round((ambient + broodOffset) * 10) / 10;
  return {
    tempBroodC,
    guven: 55 + Math.round(beeFactor * 25),
    kaynak: "tempC_fusion",
    olcum: "model",
  };
}

function fuseBroodTemp(probC, model, cfg = {}) {
  if (probC == null && model.tempBroodC == null) {
    return { tempBroodC: null, guven: 0, kaynak: "yok", olcum: "yok", fusionDeltaC: null };
  }
  if (probC == null) {
    return { ...model, fusionDeltaC: null };
  }
  if (model.tempBroodC == null) {
    return {
      tempBroodC: probC,
      guven: 92,
      kaynak: "petek_probu",
      olcum: "prob",
      fusionDeltaC: null,
    };
  }

  const delta = Math.abs(probC - model.tempBroodC);
  let tempBroodC;
  let guven;
  let kaynak;
  let olcum;

  if (delta <= 0.5) {
    tempBroodC = Math.round(((probC + model.tempBroodC) / 2) * 10) / 10;
    guven = 98;
    kaynak = "prob_model_fusion";
    olcum = "fusion";
  } else if (delta <= 1.5) {
    tempBroodC = Math.round((probC * 0.65 + model.tempBroodC * 0.35) * 10) / 10;
    guven = 88;
    kaynak = "prob_agirlikli";
    olcum = "fusion";
  } else {
    tempBroodC = probC;
    guven = 82;
    kaynak = "petek_probu";
    olcum = "prob";
  }

  if (cfg.factoryProbeCert) guven = Math.min(100, guven + 2);
  if (cfg.referenceBroodTempC != null) {
    const refD = Math.abs(tempBroodC - cfg.referenceBroodTempC);
    if (refD <= 0.35) guven = Math.min(100, guven + 3);
  }

  return {
    tempBroodC,
    guven,
    kaynak,
    olcum,
    fusionDeltaC: Math.round(delta * 10) / 10,
    modelTempC: model.tempBroodC,
    probTempC: probC,
  };
}

function estimateBroodTemp(reading, colony, cfg = {}) {
  const model = estimateBroodTempModel(reading, colony);
  const probRaw = reading?.tempBroodC;
  const probC = probRaw != null ? applyBroodProbeOffset(probRaw, cfg) : null;
  return fuseBroodTemp(probC, model, cfg);
}

function analyzeBroodZoneQuality(result, cfg = {}, reading = null, colony = null) {
  if (!result || result.mod === "off") {
    return {
      score: 0,
      shParityPct: 0,
      strengths: [],
      issues: ["Yavru alanı hesaplanamıyor"],
      katmanlar: [],
      ariciya: "Yavru prob kalite 0/100",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 68;

  katmanlar.push({ id: "model", label: "tempC + koloni modeli", puan: 68, max: 68 });

  if (cfg.broodProbePresent !== false) {
    score += 8;
    katmanlar.push({ id: "bom", label: "DS18B20 BOM + ingest", puan: 8 });
    strengths.push("DS18B20 petek probu (BOM)");
  }

  if (reading?.tempBroodC != null) {
    score += 10;
    katmanlar.push({ id: "prob_live", label: "Canlı prob okuması", puan: 10 });
    strengths.push(`Prob okuma ${reading.tempBroodC}°C`);
  } else {
    issues.push("Canlı prob okuması yok — model modu");
  }

  if (result.olcum === "fusion" || result.kaynak === "prob_model_fusion") {
    score += 8;
    katmanlar.push({ id: "fusion", label: "Prob + model füzyonu", puan: 8 });
    strengths.push(`Füzyon Δ ${result.fusionDeltaC ?? 0}°C`);
  } else if (result.olcum === "prob") {
    score += 5;
    katmanlar.push({ id: "fusion", label: "Prob öncelikli", puan: 5 });
  }

  if (cfg.referenceBroodTempC != null) {
    const refD = Math.abs(result.tempBroodC - cfg.referenceBroodTempC);
    if (refD <= 0.35) {
      score += 4;
      katmanlar.push({ id: "field_ref", label: "Saha referans prob", puan: 4 });
      strengths.push(`Referans uyum (Δ ${refD.toFixed(2)}°C)`);
    } else if (refD <= 1) {
      score += 2;
      katmanlar.push({ id: "field_ref", label: "Saha referans (yakın)", puan: 2 });
    } else {
      issues.push(`Referans sapma ${refD.toFixed(1)}°C`);
      score -= 2;
    }
  } else {
    issues.push("Saha referans prob kaydı yok (R #24)");
  }

  if (cfg.factoryProbeCert) {
    score += 3;
    katmanlar.push({ id: "factory", label: "Prob fabrika kalibrasyon", puan: 3 });
    strengths.push("Fabrika kalibrasyon sertifikası");
  }

  if (result.skor >= 75 && result.durum === "ideal") {
    score += 3;
    katmanlar.push({ id: "ideal", label: "İdeal yavru aralığı", puan: 3 });
  }

  if (colony?.broodEmergence?.active) {
    score += 2;
    strengths.push("Yavru çıkışı korelasyonu");
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
    referenceBroodTempC: cfg.referenceBroodTempC ?? null,
    refDeltaC:
      cfg.referenceBroodTempC != null
        ? Math.round(Math.abs(result.tempBroodC - cfg.referenceBroodTempC) * 10) / 10
        : null,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Yavru prob kalite 100/100 — SH 96 geçildi"
        : score >= 96
          ? `Yavru prob kalite ${score}/100 · SH parity %${shParityPct}`
          : `Yavru prob kalite ${score}/100 · SH ${shRef}${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — mevcut ayarları koru"]
        : [
            ...(reading?.tempBroodC == null ? ["tempBroodC ingest aktif et"] : []),
            ...(cfg.referenceBroodTempC == null ? ["Saha referans prob kalibrasyonu"] : []),
            "30 kovan R kalibrasyon serisi (#24)",
          ].slice(0, 3),
  };
}

function analyzeBroodZone(reading, colony, cfg = {}, meta = {}) {
  const fused = estimateBroodTemp(reading, colony, cfg);
  const tempBroodC = fused.tempBroodC;
  const { olcum, kaynak, guven } = fused;

  if (tempBroodC == null) {
    return {
      mod: "off",
      ariciya: "Yavru alanı sıcaklığı hesaplanamıyor",
      skor: 0,
    };
  }

  const idealMin = SENSOR.TEMP_IDEAL_MIN_C;
  const idealMax = SENSOR.TEMP_IDEAL_MAX_C;
  let skor = 100;
  const sinyaller = [];

  if (tempBroodC < idealMin) {
    skor -= Math.min(40, (idealMin - tempBroodC) * 12);
    sinyaller.push(`Yavru alanı soğuk (${tempBroodC}°C)`);
  } else if (tempBroodC > idealMax) {
    skor -= Math.min(35, (tempBroodC - idealMax) * 10);
    sinyaller.push(`Yavru alanı sıcak (${tempBroodC}°C)`);
  }

  if ((colony?.beeEstimate ?? 0) < 15000 && tempBroodC < 33) {
    skor -= 15;
    sinyaller.push("Zayıf koloni + düşük brood ısısı");
  }

  const broodEmergence = colony?.broodEmergence;
  if (broodEmergence?.active && tempBroodC >= idealMin && tempBroodC <= idealMax) {
    sinyaller.push(`Yavru çıkışı aktif (~${broodEmergence.dailyEmergence ?? "?"} / gün)`);
  }

  if (fused.fusionDeltaC != null && fused.fusionDeltaC > 1.5) {
    sinyaller.push(`Prob-model sapması ${fused.fusionDeltaC}°C`);
    skor -= 8;
  }

  skor = Math.max(0, Math.min(100, Math.round(skor)));
  let durum = "ideal";
  if (skor < 50) durum = "kritik";
  else if (skor < 75) durum = "dikkat";

  const base = {
    mod: "calisiyor",
    tempBroodC,
    tempAmbientC: reading?.tempC,
    idealMin,
    idealMax,
    olcum,
    kaynak,
    guven,
    skor,
    durum,
    broodCycleDays: BROOD.CYCLE_DAYS,
    fusionDeltaC: fused.fusionDeltaC ?? null,
    modelTempC: fused.modelTempC ?? null,
    probTempC: fused.probTempC ?? reading?.tempBroodC ?? null,
    broodProbePresent: cfg.broodProbePresent !== false,
    sinyaller: sinyaller.slice(0, 4),
  };

  const quality = analyzeBroodZoneQuality(base, cfg, reading, colony);
  base.quality = quality;
  base.ariciya =
    skor >= 75
      ? `Yavru alanı ideal (${tempBroodC}°C · ${olcum === "fusion" ? "prob+model" : olcum === "prob" ? "prob" : "model"}) · kalite ${quality.score}/100`
      : `Yavru alanı ${durum} (${tempBroodC}°C) — ${sinyaller[0] || ""} · kalite ${quality.score}/100`;

  return base;
}

function referenceBroodTempFromReading(reading, colony, cfg = {}) {
  const fused = estimateBroodTemp(reading, colony, cfg);
  return fused.tempBroodC;
}

module.exports = {
  analyzeBroodZone,
  analyzeBroodZoneQuality,
  estimateBroodTemp,
  estimateBroodTempModel,
  fuseBroodTemp,
  applyBroodProbeOffset,
  referenceBroodTempFromReading,
};
