/**
 * Skor modüllerinin derin katmanı — katkılar, neden, öneri, tahmin.
 */

const {
  SENSOR,
  SCORE,
  SWARM,
  DISEASE,
  WEATHER,
  SWARM_DROP_6H_KG,
  SWARM_DROP_24H_KG,
  BROOD,
  RISK,
} = require("../../../../packages/shared/constants");

const { beeCountSwarmTier } = require("../colony");

function swarmSeasonFactor(iso) {
  const m = new Date(iso).getUTCMonth() + 1;
  if (m >= 4 && m <= 8) return 22;
  if (m === 3 || m === 9) return 10;
  return 0;
}

function analyzeSwarmDeep(history, reading, colony) {
  const swarm = {
    score: colony?.swarmRiskScore ?? 0,
    phase: colony?.swarmPhase,
    signals: colony?.swarmSignals ?? [],
  };
  const traffic = colony?.middayTraffic || { beeOut: 0, beeIn: 0 };
  const est = colony?.beeEstimate;
  const katkilar = [];

  const season = swarmSeasonFactor(reading?.ts);
  if (season > 0) katkilar.push({ kaynak: "mevsim", puan: season, label: "Oğul sezonu" });

  if (est >= 58000) katkilar.push({ kaynak: "ari", puan: 28, label: "~58k+ arı" });
  else if (est >= 48000) katkilar.push({ kaynak: "ari", puan: 20, label: "~48k+ arı" });
  else if (est >= 40000) katkilar.push({ kaynak: "ari", puan: 12, label: "~40k+ arı" });

  if (traffic.beeOut >= 1700) katkilar.push({ kaynak: "ir", puan: 18, label: "Çok yoğun trafik" });
  else if (traffic.beeOut >= 1300) katkilar.push({ kaynak: "ir", puan: 12, label: "Yoğun trafik" });

  if (reading?.weightKg >= 29 && (colony?.dailyWeightSwingKg ?? 1) < 0.15) {
    katkilar.push({ kaynak: "tarti", puan: 14, label: "Ağırlık platosu — yer dar" });
  }

  const drop6h = colony?.weightDrop6hKg;
  if (drop6h != null && drop6h <= SWARM_DROP_6H_KG) {
    katkilar.push({ kaynak: "tarti", puan: 100, label: "Oğul gerçekleşmiş olabilir" });
  }

  let tahminGun = null;
  if (swarm.score >= SWARM.RISK_CRITICAL) tahminGun = "2–5";
  else if (swarm.score >= SWARM.RISK_ELEVATED) tahminGun = "5–10";
  else if (swarm.score >= SWARM.RISK_WATCH) tahminGun = "10–21";

  const oneriler = [...(colony?.prevention || [])];
  const tier = beeCountSwarmTier(est);

  let ariciya = `Oğul riski ${swarm.score}/100 — ${colony?.swarmRiskLabel || "—"}`;
  if (tahminGun && swarm.phase !== "occurred") {
    ariciya += ` · tahmini ${tahminGun} gün pencere`;
  }
  if (katkilar[0]) ariciya += `. Ana etken: ${katkilar[0].label}`;

  return {
    swarmRiskScore: swarm.score,
    phase: swarm.phase,
    katkilar: katkilar.slice(0, 6),
    tahminGun,
    beeSwarmTier: tier.tier,
    beeSwarmTierLabel: tier.tierLabel,
    nedenler: swarm.signals,
    oneriler: oneriler.slice(0, 4),
    ariciya,
  };
}

function analyzeDiseaseDeep(history, reading, colony, meta, weather) {
  const raining =
    (weather?.precipMm ?? 0) >= WEATHER.PRECIP_MM || weather?.condition === "yagmur";
  const traffic = colony?.middayTraffic || { beeOut: 0, samples: 0 };

  let varroaProxy = 0;
  let chalkbroodProxy = 0;
  let zayiflikProxy = 0;
  const katkilar = [];
  const muayene = [];

  if (colony?.healthScore < SCORE.HEALTH_CRITICAL) {
    zayiflikProxy += 25;
    katkilar.push({ tip: "zayiflik", puan: 25, label: "Sağlık kritik" });
  }
  if (reading?.humidity >= SENSOR.HUM_HIGH_PCT) {
    chalkbroodProxy += 30;
    katkilar.push({ tip: "chalkbrood", puan: 30, label: "Aşırı nem" });
    muayene.push("Chalkbrood — ölü yavru tablası");
  }
  if (
    traffic.samples > 0 &&
    traffic.beeOut < DISEASE.TRAFFIC_LOW &&
    !raining
  ) {
    varroaProxy += 22;
    katkilar.push({ tip: "varroa", puan: 22, label: "Düşük trafik (açık hava)" });
    muayene.push("Varroa — damla / alkol yıkama sayımı");
  }
  if (colony?.beeEstimate != null && colony.beeEstimate < SCORE.BEE_WEAK) {
    zayiflikProxy += 18;
    katkilar.push({ tip: "zayiflik", puan: 18, label: "Zayıf koloni" });
  }
  if (meta?.petekEski || (meta?.petekYasYil ?? 0) >= RISK.COMB_AGE_WARN_YEARS) {
    chalkbroodProxy += 12;
    muayene.push("Eski petek — değiştirme planı");
  }
  if (meta?.queenless || meta?.anaDurum === "supheli") {
    zayiflikProxy += 15;
    muayene.push("Ana durumu — açık yavru kontrol");
  }

  const dominant =
    varroaProxy >= chalkbroodProxy && varroaProxy >= zayiflikProxy
      ? "varroa_proxy"
      : chalkbroodProxy >= zayiflikProxy
        ? "chalkbrood_proxy"
        : "zayiflik_proxy";

  const oneriler = [];
  if (varroaProxy >= 20) oneriler.push("Varroa sayımı — ilaçlama eşiğine bak.");
  if (chalkbroodProxy >= 20) oneriler.push("Havalandırma + nem düşür; eski petek ayır.");
  if (zayiflikProxy >= 20) oneriler.push("Besleme + ana kontrolü.");

  let ariciya = `${colony?.diseaseRiskLabel || "Hastalık riski"} (${colony?.diseaseRiskScore ?? 0})`;
  ariciya += ` · baskın: ${dominant.replace("_proxy", "")}`;
  if (colony?.diseaseSignals?.[0]) ariciya += `. ${colony.diseaseSignals[0]}`;

  return {
    diseaseRiskScore: colony?.diseaseRiskScore,
    phase: colony?.diseasePhase,
    varroaProxy,
    chalkbroodProxy,
    zayiflikProxy,
    dominant,
    katkilar: katkilar.slice(0, 5),
    muayene: [...new Set(muayene)].slice(0, 4),
    nedenler: colony?.diseaseSignals ?? [],
    oneriler: oneriler.slice(0, 3),
    ariciya,
  };
}

function analyzeHealthDeep(reading, colony) {
  const katkilar = [];
  const nedenler = [];
  const oneriler = [];

  if (reading?.tempC >= SENSOR.TEMP_IDEAL_MIN_C && reading?.tempC <= SENSOR.TEMP_IDEAL_MAX_C) {
    katkilar.push({ kaynak: "sicaklik", etki: "+18", label: "İdeal ısı" });
  } else if (reading?.tempC > SENSOR.TEMP_HIGH_C || reading?.tempC < SENSOR.TEMP_LOW_C) {
    katkilar.push({ kaynak: "sicaklik", etki: "-15", label: "Isı stresi" });
    nedenler.push(`Sıcaklık ${reading.tempC}°C`);
    oneriler.push("Isı normuna getir — gölge veya yalıtım.");
  }

  if (
    reading?.humidity >= SENSOR.HUM_IDEAL_MIN_PCT &&
    reading?.humidity <= SENSOR.HUM_IDEAL_MAX_PCT
  ) {
    katkilar.push({ kaynak: "nem", etki: "+12", label: "İdeal nem" });
  } else if (reading?.humidity >= SENSOR.HUM_HIGH_PCT) {
    katkilar.push({ kaynak: "nem", etki: "-12", label: "Yüksek nem" });
    nedenler.push(`Nem %${reading.humidity}`);
  }

  const drop6h = colony?.weightDrop6hKg;
  if (drop6h != null && drop6h <= SWARM_DROP_6H_KG) {
    katkilar.push({ kaynak: "tarti", etki: "-25", label: "Ani düşüş" });
    nedenler.push("Ani ağırlık kaybı");
  }

  const traffic = colony?.middayTraffic;
  if (traffic?.beeOut >= SCORE.TRAFFIC_HEALTH_MIN) {
    katkilar.push({ kaynak: "ir", etki: "+8", label: "İyi trafik" });
  } else if (traffic?.beeOut > 0 && traffic.beeOut < SCORE.TRAFFIC_HEALTH_WEAK) {
    katkilar.push({ kaynak: "ir", etki: "-10", label: "Düşük trafik" });
    nedenler.push("Düşük öğlen çıkışı");
  }

  let ariciya = `Sağlık ${colony?.healthScore ?? "—"}/100 — ${colony?.healthLabel || "—"}`;
  if (nedenler[0]) ariciya += `. ${nedenler[0]}`;

  return {
    healthScore: colony?.healthScore,
    katkilar: katkilar.slice(0, 6),
    nedenler: nedenler.slice(0, 4),
    oneriler: oneriler.slice(0, 3),
    ariciya,
  };
}

function analyzeBroodDeep(history, reading, colony) {
  const brood = colony?.broodEmergence || {};
  const swing = colony?.dailyWeightSwingKg ?? 0;
  const traffic = colony?.middayTraffic || { beeOut: 0 };
  const nedenler = [];
  const oneriler = [];

  let kaynak = "belirsiz";
  if (brood.active && brood.emergePerDay >= BROOD.EMERGE_MIN) {
    kaynak = "yavru_cikisi";
    nedenler.push(`Günde ~${Math.round((brood.emergePerDay || 0) / 100) / 10}k yavru çıkışı tahmini`);
    oneriler.push("Kat veya süper planla — koloni büyüyor.");
  }
  if (swing >= BROOD.GAIN_ACTIVE_7D_KG && swing <= SCORE.SWING_IDEAL_MAX_KG && traffic.beeOut >= SCORE.TRAFFIC_GOOD) {
    if (kaynak === "belirsiz") kaynak = "nektar";
    nedenler.push(`Tartı salınım ${swing} kg + trafik — nektar toplama olabilir`);
  }
  if (reading?.humidity >= SENSOR.HUM_HIGH_PCT && brood.active) {
    nedenler.push("Yüksek nem + aktif yavru — chalkbrood izle");
  }

  let ariciya = brood.active
    ? `Yavru çıkışı aktif — ${brood.note || "yaz büyümesi"}`
    : "Belirgin yavru çıkışı sinyali yok";
  if (kaynak === "nektar") ariciya = "Ağırlık salınımı — nektar akışı baskın olabilir";

  return {
    active: brood.active,
    kaynak,
    emergePerDay: brood.emergePerDay,
    weightGain21dKg: brood.weightGain21dKg,
    nedenler: nedenler.slice(0, 3),
    oneriler: oneriler.slice(0, 2),
    ariciya,
  };
}

function buildScoresDeep(history, reading, colony, meta, weather) {
  return {
    swarm: analyzeSwarmDeep(history, reading, colony),
    disease: analyzeDiseaseDeep(history, reading, colony, meta, weather),
    health: analyzeHealthDeep(reading, colony),
    brood: analyzeBroodDeep(history, reading, colony),
  };
}

module.exports = {
  analyzeSwarmDeep,
  analyzeDiseaseDeep,
  analyzeHealthDeep,
  analyzeBroodDeep,
  buildScoresDeep,
};
