/**
 * Profesyonel lig skoru — v2 taban + iyileştirme bayrakları.
 * Saha verisi gerektirmez; donanım planı opsiyonel.
 */

const BASELINE_V2 = 84;
const MAX_WITHOUT_FIELD = 90;

const IMPROVEMENTS = {
  openMeteo: { delta: 1.2, label: "Open-Meteo canlı hava", items: ["hava_entegrasyon"] },
  journalUi: { delta: 1.3, label: "Muayene / ilaç günlüğü UI", items: ["muayene", "ilac_gunlugu"] },
  offlinePwa: { delta: 2.0, label: "Offline PWA + sync", items: ["offline", "native_app"] },
  acousticV2: { delta: 0.8, label: "Akustik kural v2", items: ["akustik", "queenless", "yagma"] },
  teamApi: { delta: 0.5, label: "Takım API", items: ["takim"] },
  subscriptionApi: { delta: 0.4, label: "Abonelik API", items: ["abonelik"] },
  slaApi: { delta: 0.3, label: "SLA takip", items: ["sla"] },
  hardwarePlan: { delta: 1.5, label: "IR + prob + GPS montaj planı", items: ["ir_sayac", "yavru_probu", "gps"] },
};

/** v2 yazılım tabanında zaten dahil */
const V2_INCLUDED = ["acousticV2", "teamApi", "subscriptionApi", "slaApi"];

function defaultFlags() {
  const f = {};
  for (const k of Object.keys(IMPROVEMENTS)) {
    f[k] = V2_INCLUDED.includes(k);
  }
  return f;
}

function flagsFromEnv() {
  return {
    ...defaultFlags(),
    openMeteo: process.env.OPEN_METEO !== "0",
    journalUi: process.env.JOURNAL_UI !== "0",
    offlinePwa: process.env.OFFLINE_PWA !== "0",
    hardwarePlan: process.env.HARDWARE_READY === "1",
  };
}

function computeProLigScore(extraFlags = {}) {
  const flags = { ...defaultFlags(), ...extraFlags };
  let overall = BASELINE_V2;
  const applied = [];

  for (const [key, cfg] of Object.entries(IMPROVEMENTS)) {
    if (!flags[key]) continue;
    if (V2_INCLUDED.includes(key)) continue;
    overall += cfg.delta;
    applied.push({ key, delta: cfg.delta, label: cfg.label });
  }

  overall = Math.min(MAX_WITHOUT_FIELD, Math.round(overall * 10) / 10);

  return {
    overall,
    baseline: BASELINE_V2,
    band:
      overall >= 90
        ? "profesyonel_ust"
        : overall >= 87
          ? "profesyonel"
          : overall >= 80
            ? "guclu"
            : "gelisen",
    flags,
    applied,
    targetWithoutFieldData: 89,
    targetWithHardware: 90,
    note: "Saha ML verisi olmadan tavan ~90. 100 kovan × 1 yıl → ~92+.",
  };
}

module.exports = {
  BASELINE_V2,
  IMPROVEMENTS,
  computeProLigScore,
  flagsFromEnv,
  defaultFlags,
};
