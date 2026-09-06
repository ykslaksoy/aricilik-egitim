/**
 * Akustik sınıflandırma — spektral özellik proxy + kural tabanlı ML benzeri skor.
 * Gerçek cihazda: MFCC / CNN; burada RMS serisi + titreşim + trafik füzyonu.
 */

const { SENSOR, SWARM, RISK } = require("../../../../packages/shared/constants");
const mlModelService = require("./mlModelService");
const { analyzeAcousticSensorQuality } = require("./acousticSensorCalibration");

function audioStats(history) {
  const vals = (history || [])
    .slice(-12)
    .map((r) => r.audioRms)
    .filter((v) => v != null && v >= 0);
  if (!vals.length) return { mean: 0, std: 0, trend: 0 };
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const std = Math.sqrt(variance);
  const trend = vals.length >= 2 ? vals[vals.length - 1] - vals[0] : 0;
  return {
    mean: Math.round(mean * 1000) / 1000,
    std: Math.round(std * 1000) / 1000,
    trend: Math.round(trend * 1000) / 1000,
  };
}

function softmax(scores) {
  const max = Math.max(...Object.values(scores));
  const exp = {};
  let sum = 0;
  for (const [k, v] of Object.entries(scores)) {
    exp[k] = Math.exp(v - max);
    sum += exp[k];
  }
  const out = {};
  for (const [k, v] of Object.entries(exp)) {
    out[k] = Math.round((v / sum) * 100);
  }
  return out;
}

/**
 * @param {object[]} history
 * @param {object} reading
 * @param {object|null} colony
 * @param {object} meta
 * @param {object} [cfg]
 */
function analyzeAcousticMl(history, reading, colony, meta = {}, cfg = {}) {
  const audio = reading?.audioRms ?? 0;
  if (audio < 0 || reading?.fault === "mic") {
    const off = {
      mod: "off",
      ariciya: "Mikrofon verisi yok veya arızalı",
      siniflar: {},
      baskin: null,
      guven: 0,
    };
    off.quality = analyzeAcousticSensorQuality(off, cfg, reading, meta);
    return off;
  }

  const stats = audioStats(history);
  const traffic = colony?.middayTraffic || { beeIn: 0, beeOut: 0 };
  const ratio =
    traffic.beeIn + traffic.beeOut > 0
      ? traffic.beeIn / Math.max(traffic.beeOut, 1)
      : 1;
  const vib = reading?.vibration ?? 0;
  const swarm = colony?.swarmRiskScore ?? 0;

  const raw = {
    normal: 1.2 - Math.abs(audio - 0.32) * 2,
    queenless: 0,
    swarm_prep: 0,
    robbing: 0,
    stress: 0,
  };

  if (
    audio >= SENSOR.QUEENLESS_AUDIO_MIN &&
    ratio < SENSOR.QUEENLESS_INOUT_RATIO_MAX &&
    (colony?.healthScore ?? 100) < SENSOR.QUEENLESS_HEALTH_MAX
  ) {
    raw.queenless += 2.4 + stats.trend * 2;
  }
  if (meta.anaDurum === "supheli" || meta.anaDurum === "yok" || meta.queenless) {
    raw.queenless += 1.8;
  }
  if (audio >= SENSOR.AUDIO_HIGH && swarm >= SWARM.RISK_ELEVATED) {
    raw.swarm_prep += 2.2 + (swarm - SWARM.RISK_ELEVATED) / 40;
  }
  if (stats.std >= 0.08 && audio >= 0.45) {
    raw.swarm_prep += 0.8;
  }
  if (
    vib >= RISK.ROBBING_VIBRATION_MIN &&
    audio >= 0.48 &&
    (colony?.weightDrop6hKg ?? 0) <= RISK.ROBBING_WEIGHT_DROP_KG
  ) {
    raw.robbing += 2.5;
  }
  if (meta.yagmacilikSuphesi || meta.robbingSuspect) {
    raw.robbing += 1.2;
  }
  if (stats.trend >= 0.06 && audio >= 0.5 && vib >= 6) {
    raw.robbing += 0.9;
  }
  if (swarm >= SWARM.RISK_WATCH && stats.std >= 0.05 && audio >= 0.42) {
    raw.swarm_prep += 0.6;
  }
  if (ratio < 0.5 && audio >= 0.5 && stats.mean >= 0.45) {
    raw.queenless += 0.7;
  }
  if (audio >= SENSOR.AUDIO_HIGH && vib >= SENSOR.VIBRATION_HIGH) {
    raw.stress += 1.6;
  }
  if (audio <= SENSOR.AUDIO_LOW) {
    raw.normal -= 0.6;
    raw.stress += 0.9;
  }

  const siniflar = softmax(raw);
  const baskin = Object.entries(siniflar).sort((a, b) => b[1] - a[1])[0];
  const labelMap = {
    normal: "Normal uğultu",
    queenless: "Ana kaybı şüphesi",
    swarm_prep: "Oğul hazırlığı",
    robbing: "Yağma / kavga",
    stress: "Stres / panik",
  };
  const guven = baskin[1];
  const oneriler = [];
  if (baskin[0] === "queenless") {
    oneriler.push("Açık yavru tablası ve ana arama.");
  }
  if (baskin[0] === "swarm_prep") {
    oneriler.push("Süper veya kat planla; giriş trafiğini izle.");
  }
  if (baskin[0] === "robbing") {
    oneriler.push("Girişi daralt; komşu kovanları kontrol et.");
  }

  let ariciya = `${labelMap[baskin[0]] || baskin[0]} (%${guven})`;
  if (stats.std >= 0.06) ariciya += ` · ses değişkenliği ${stats.std}`;

  const mlCfg = mlModelService.getConfig();
  const labeled = Number(cfg.acousticLabeledSamples ?? 0);
  const method =
    mlCfg.acoustic.mode === "onnx" || labeled >= 200 ? (mlCfg.acoustic.fileExists ? "onnx_v1" : "feature_fusion_v1") : "feature_fusion_v1";

  const base = {
    mod: "calisiyor",
    method,
    mlTarget: mlCfg.acoustic.fileExists || labeled >= 200 ? "model_ready" : "collect_labels",
    audioRms: audio,
    stats,
    inOutRatio: Math.round(ratio * 100) / 100,
    siniflar,
    baskin: { key: baskin[0], label: labelMap[baskin[0]], skor: guven },
    guven: guven >= 55 ? "yuksek" : guven >= 35 ? "orta" : "dusuk",
    oneriler: oneriler.slice(0, 2),
    ariciya,
  };
  const quality = analyzeAcousticSensorQuality(base, cfg, reading, meta);
  base.quality = quality;
  base.ariciya = `${ariciya} · kalite ${quality.score}/100`;
  return base;
}

module.exports = { analyzeAcousticMl, audioStats };
