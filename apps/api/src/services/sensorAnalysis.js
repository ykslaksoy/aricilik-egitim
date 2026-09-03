/**
 * Sensör bazlı derin analizler + iki sensör çift birleştirmeleri.
 */

const {
  SENSOR,
  SCORE,
  WEATHER,
  DISEASE,
  SWARM,
  SWARM_DROP_6H_KG,
  RISK,
  IR,
  CONNECTIVITY,
  FEEDING,
} = require("../../../../packages/shared/constants");
const { isAvailable } = require("./sensorHealth");
const { analyzePowerSensorQuality } = require("./powerSensorCalibration");
const { analyzeCellularSensorQuality } = require("./cellularSensorCalibration");
const { analyzeLoraSensorQuality } = require("./loraSensorCalibration");

function cornerImbalance(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length !== 4) return 0;
  const vals = cornerKg.map(Number).filter((x) => x > 0);
  if (vals.length < 4) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

function seriesDelta(series, field, hoursBack) {
  if (!series || series.length < 2) return null;
  const latest = series[series.length - 1];
  const target = new Date(latest.ts).getTime() - hoursBack * 3600000;
  let ref = series[0];
  for (let i = series.length - 2; i >= 0; i--) {
    if (new Date(series[i].ts).getTime() <= target) {
      ref = series[i];
      break;
    }
  }
  const a = latest[field];
  const b = ref[field];
  if (a == null || b == null) return null;
  return Math.round((a - b) * 10) / 10;
}

function isRaining(weather) {
  return (
    weather?.condition === "yagmur" ||
    (weather?.precipMm ?? 0) >= WEATHER.PRECIP_MM
  );
}

function analyzeIrTraffic(history, reading, colony, weather = {}, health = null, cfg = {}) {
  const { analyzeIrSensorQuality } = require("./irSensorCalibration");
  const h = health || colony?.sensorHealth;
  if (h && !isAvailable(h, "ir")) {
    const fallback = (h.fallbacks || []).find((f) => f.startsWith("ir→")) || null;
    const off = {
      profile: "ariza",
      profileLabel: "IR arızalı",
      mod: "degraded",
      unavailable: true,
      fallback,
      beeIn: reading?.beeIn ?? 0,
      beeOut: reading?.beeOut ?? 0,
      inOutRatio: null,
      middayOut: null,
      samples: 0,
      rainMasked: false,
      nedenler: [{ key: "ariza", label: "IR sayaç arızalı" }],
      oneriler: fallback ? ["Yedek kaynakla trafik tahmini devam ediyor"] : ["IR sensörünü kontrol et"],
      ariciya: fallback
        ? `IR devre dışı — yedek: ${fallback.replace("→", " → ")}`
        : "IR sayaç arızalı — trafik analizi atlandı",
    };
    off.quality = analyzeIrSensorQuality(off, cfg, reading, colony);
    return off;
  }

  const traffic = colony?.middayTraffic || { samples: 0, beeOut: 0, beeIn: 0 };
  const beeIn = reading?.beeIn ?? 0;
  const beeOut = reading?.beeOut ?? 0;
  const raining = isRaining(weather);
  const ratio =
    beeIn + beeOut > 0
      ? Math.min(beeIn, beeOut) / Math.max(beeIn, beeOut, 1)
      : 0;

  let profile = "normal";
  let profileLabel = "Normal";
  if (traffic.samples > 0 && traffic.beeOut >= SCORE.TRAFFIC_STRONG) {
    profile = "yogun";
    profileLabel = "Yoğun";
  } else if (
    traffic.samples > 0 &&
    traffic.beeOut < SCORE.TRAFFIC_WEAK &&
    !raining
  ) {
    profile = "dusuk";
    profileLabel = "Düşük";
  } else if (traffic.samples > 0 && traffic.beeOut < DISEASE.TRAFFIC_LOW && raining) {
    profile = "dusuk_yagmur";
    profileLabel = "Düşük (yağmur)";
  } else if (beeIn === 0 && beeOut === 0) {
    profile = "sifir";
    profileLabel = "Sıfır";
  }

  const nedenler = [];
  const oneriler = [];
  if (profile === "dusuk" && !raining) {
    nedenler.push("Hava açıkken düşük trafik — zayıflık veya zehirlenme?");
    oneriler.push("Yerinde muayene; pestisit şüphesi varsa 24 saat izle.");
  }
  if (profile === "dusuk_yagmur") {
    nedenler.push("Yağmurda düşük trafik beklenen — hastalık sanma.");
  }
  if (profile === "yogun" && (colony?.swarmRiskScore ?? 0) >= SWARM.RISK_ELEVATED) {
    nedenler.push("Yoğun trafik + yüksek oğul riski.");
    oneriler.push("Süper veya kat planla.");
  }
  if (ratio < IR.INOUT_RATIO_LOW && beeOut > 100) {
    nedenler.push(`In/out oranı düşük (${Math.round(ratio * 100)}%) — dönüş az`);
    oneriler.push("Ana / yavru veya giriş tıkanıklığı kontrol et.");
  }
  if (ratio > IR.INOUT_RATIO_HIGH && beeOut > 200) {
    nedenler.push("Dengeli in/out — sağlıklı uçuş profili.");
  }

  const prevOut = seriesDelta(history, "beeOut", 24);
  if (
    prevOut != null &&
    prevOut < -IR.PESTICIDE_TRAFFIC_MAX &&
    !raining &&
    profile !== "yogun"
  ) {
    nedenler.push("24 saatte ani trafik düşüşü — ilaçlama veya zehirlenme?");
    oneriler.push("Çevrede ilaçlama var mı sor; girişi daralt.");
  }

  let ariciya = `Öğlen out ${traffic.beeOut ?? beeOut} — ${profileLabel}`;
  if (ratio > 0) ariciya += ` · in/out ${Math.round(ratio * 100)}%`;
  if (nedenler[0]) ariciya += `. ${nedenler[0]}`;

  const base = {
    profile,
    profileLabel,
    beeIn,
    beeOut,
    inOutRatio: Math.round(ratio * 100) / 100,
    middayOut: traffic.beeOut,
    samples: traffic.samples,
    rainMasked: raining && profile === "dusuk_yagmur",
    nedenler: nedenler.slice(0, 4),
    oneriler: oneriler.slice(0, 2),
    ariciya,
  };
  const quality = analyzeIrSensorQuality(base, cfg, reading, colony);
  base.quality = quality;
  base.ariciya = `${ariciya} · kalite ${quality.score}/100`;
  return base;
}

function analyzeWeight(history, reading, colony, cfg = {}, health = null) {
  const h = health || colony?.sensorHealth;
  if (h && !isAvailable(h, "scale")) {
    const fallback = (h.fallbacks || []).find((f) => f.startsWith("tartı→")) || null;
    return {
      profile: "ariza",
      profileLabel: "Tartı arızalı",
      mod: "degraded",
      unavailable: true,
      fallback,
      weightKg: null,
      netBeeKg: null,
      drop6hKg: null,
      drop24hKg: null,
      swingKg: null,
      feedingDaysEstimate: null,
      nedenler: [{ key: "ariza", label: "Tartı sensörü arızalı" }],
      oneriler: fallback
        ? ["IR/kamera/ses ile koloni izleme devam ediyor"]
        : ["Tartıyı kontrol et; diğer sensörlerle izleme sürüyor"],
      ariciya: fallback
        ? `Tartı devre dışı — yedek: ${fallback.replace("→", " → ")}`
        : "Tartı arızalı — ağırlık analizi atlandı",
    };
  }

  const weightKg = reading?.weightKg ?? 0;
  const drop6h = colony?.weightDrop6hKg ?? seriesDelta(history, "weightKg", 6);
  const drop24h = colony?.weightDrop24hKg ?? seriesDelta(history, "weightKg", 24);
  const swing = colony?.dailyWeightSwingKg ?? 0;
  const tare = cfg.tareKg ?? 8;
  const comb = cfg.combKg ?? 18;
  const netBeeKg = weightKg > 0 ? Math.max(0, weightKg - tare - comb) : 0;

  let profile = "normal";
  if (drop6h != null && drop6h <= SWARM_DROP_6H_KG) profile = "ogul_dusus";
  else if (weightKg > 0 && weightKg < FEEDING.WEIGHT_KG) profile = "dusuk";
  else if (weightKg >= 32) profile = "kalabalik";
  else if (swing >= IR.NECTAR_SWING_MIN_KG && swing <= SCORE.SWING_IDEAL_MAX_KG) {
    profile = "nektar_akisi";
  }

  const nedenler = [];
  const oneriler = [];
  let feedingDays = null;
  if (profile === "dusuk" && weightKg > 0) {
    const dailyUse = 0.15;
    feedingDays = Math.max(0, Math.round((weightKg - tare) / dailyUse));
    nedenler.push(`Düşük stok (~${feedingDays} gün runway tahmini)`);
    oneriler.push("Şurup veya fondant planla.");
  }
  if (profile === "ogul_dusus") {
    nedenler.push(`6 saatte ${drop6h} kg — oğul düşüşü eşiği`);
    oneriler.push("Oğul gerçekleşti mi kontrol et; yavru ana / birleştirme.");
  }
  if (profile === "nektar_akisi") {
    nedenler.push(`Günlük salınım ${swing} kg — nektar akışı veya yavru büyümesi`);
  }
  if (profile === "kalabalik") {
    nedenler.push("Yüksek tartı — kalabalık koloni / bal stoku");
  }

  return {
    profile,
    weightKg,
    netBeeKg: Math.round(netBeeKg * 10) / 10,
    drop6hKg: drop6h,
    drop24hKg: drop24h,
    swingKg: swing,
    feedingDaysEstimate: feedingDays,
    nedenler: nedenler.slice(0, 4),
    oneriler: oneriler.slice(0, 2),
    ariciya:
      weightKg > 0
        ? `${weightKg} kg${feedingDays != null ? ` · ~${feedingDays} gün stok` : ""}${nedenler[0] ? ` — ${nedenler[0]}` : ""}`
        : "Tartı verisi yok",
  };
}

function analyzeAudio(reading, colony, meta = {}, health = null) {
  const h = health || colony?.sensorHealth;
  if (h && !isAvailable(h, "mic")) {
    return {
      profile: "ariza",
      mod: "degraded",
      unavailable: true,
      audioRms: null,
      queenlessSignal: false,
      nedenler: [{ key: "ariza", label: "Mikrofon arızalı" }],
      oneriler: isAvailable(h, "ir")
        ? ["Ses yok — IR trafik ve tartı ile devam"]
        : ["Mikrofonu değiştir veya yerinde muayene"],
      ariciya: "Mikrofon arızalı — akustik analiz atlandı",
    };
  }

  const audio = reading?.audioRms ?? 0;
  const traffic = colony?.middayTraffic || { beeIn: 0, beeOut: 0 };
  const ratio =
    traffic.beeIn + traffic.beeOut > 0
      ? traffic.beeIn / Math.max(traffic.beeOut, 1)
      : 1;

  let profile = "normal";
  if (audio >= SENSOR.AUDIO_HIGH) profile = "yuksek";
  else if (audio <= SENSOR.AUDIO_LOW) profile = "sessiz";

  const nedenler = [];
  const oneriler = [];
  if (profile === "yuksek") {
    nedenler.push("Yüksek uğultu — kavga, panik veya oğul hazırlığı");
    oneriler.push("Girişte kalabalık mı bak; yağma veya oğul ayrımı yap.");
  }
  if (profile === "sessiz") {
    nedenler.push("Sessiz kovan — zayıflık veya soğuk");
  }
  if (
    audio >= SENSOR.QUEENLESS_AUDIO_MIN &&
    ratio < SENSOR.QUEENLESS_INOUT_RATIO_MAX &&
    (colony?.healthScore ?? 100) < SENSOR.QUEENLESS_HEALTH_MAX
  ) {
    nedenler.push("Ses + bozuk in/out + düşük sağlık — ana kaybı şüphesi");
    oneriler.push("Açık yavru ve ana arama kontrolü.");
  }
  if (meta.queenless || meta.anaDurum === "supheli") {
    nedenler.push("Kayıtta ana şüphesi var — ses destekliyor");
  }

  return {
    profile,
    audioRms: audio,
    queenlessSignal:
      audio >= SENSOR.QUEENLESS_AUDIO_MIN &&
      ratio < SENSOR.QUEENLESS_INOUT_RATIO_MAX,
    nedenler: nedenler.slice(0, 3),
    oneriler: oneriler.slice(0, 2),
    ariciya: `RMS ${audio} — ${profile === "yuksek" ? "gürültülü" : profile === "sessiz" ? "sessiz" : "normal"}${nedenler[0] ? `. ${nedenler[0]}` : ""}`,
  };
}

function analyzeVibration(reading, colony, meta = {}, cfg = {}, history = []) {
  const { analyzeVibrationSensorQuality } = require("./vibrationSensorCalibration");
  const vib = reading?.vibration ?? 0;
  const drop6h = colony?.weightDrop6hKg;
  const audio = reading?.audioRms ?? 0;

  if (vib < 0 || reading?.fault === "vibration") {
    const off = {
      profile: "ariza",
      vibration: null,
      nedenler: ["Titreşim sensörü arızalı"],
      oneriler: ["ADXL345 kontrol / değiştir"],
      ariciya: "Titreşim sensörü arızalı",
    };
    off.quality = analyzeVibrationSensorQuality(off, cfg, reading, colony, meta);
    return off;
  }

  let profile = "normal";
  if (vib >= SENSOR.VIBRATION_HIGH) profile = "yuksek";
  else if (vib >= RISK.ROBBING_VIBRATION_MIN) profile = "orta";
  else if (vib === 0) profile = "sifir";

  const recent = (history || []).slice(-8).map((r) => r.vibration).filter((v) => v != null && v >= 0);
  const vibTrend =
    recent.length >= 3 && vib > recent[0] + 2
      ? "artiyor"
      : recent.length >= 3 && vib < recent[0] - 2
        ? "azaliyor"
        : "stabil";

  const nedenler = [];
  const oneriler = [];
  let sinif = "normal";

  if (profile === "yuksek") {
    if (drop6h != null && drop6h <= RISK.ROBBING_WEIGHT_DROP_KG) {
      nedenler.push("Titreşim + tartı kaybı — yağma olası");
      oneriler.push("Girişi daralt; komşu kovanları kontrol et.");
      sinif = "yagma";
    } else if (audio >= SENSOR.AUDIO_HIGH) {
      nedenler.push("Yüksek titreşim + ses — kavga / panik");
      sinif = "kavga";
    } else {
      nedenler.push("Yüksek titreşim — darbe, devrilme veya kavga");
      oneriler.push("Kovan sabit mi; gece hırsızlık / hayvan?");
      sinif = "darbe";
    }
  }
  if (meta.transportMode || reading?.transportMode) {
    nedenler.push("Taşıma modu — titreşim beklenen");
    sinif = "tasima";
  }
  if (meta.fizikselHasar) {
    nedenler.push("Fiziksel hasar bayrağı — titreşimle uyumlu");
  }
  if (vibTrend === "artiyor" && profile !== "normal") {
    nedenler.push("Titreşim artıyor — olay gelişiyor olabilir");
  }

  const base = {
    profile,
    vibration: vib,
    sinif,
    vibTrend,
    nedenler: nedenler.slice(0, 3),
    oneriler: oneriler.slice(0, 2),
    ariciya: `Titreşim ${vib} — ${profile}${nedenler[0] ? `. ${nedenler[0]}` : ""}`,
  };
  const quality = analyzeVibrationSensorQuality(base, cfg, reading, colony, meta);
  base.quality = quality;
  base.ariciya = `${base.ariciya} · kalite ${quality.score}/100`;
  return base;
}

function analyzeConnectivity(reading, history = [], cfg = {}) {
  const battery = reading?.battery ?? 100;
  const rssi = reading?.loraRssi ?? reading?.rssi ?? -70;
  const ageMs = reading?.ts
    ? Date.now() - new Date(reading.ts).getTime()
    : 0;

  let profile = "iyi";
  if (ageMs > SENSOR.OFFLINE_MS) profile = "offline";
  else if (battery < SENSOR.BATTERY_LOW_PCT) profile = "pil_dusuk";
  else if (rssi <= SENSOR.RSSI_LOW_DBM) profile = "sinyal_zayif";

  const solarChargeW =
    reading?.solarChargeW ??
    reading?.solarPanelW ??
    (reading?.charging ? reading?.weatherStation?.solarW ?? reading?.solarW ?? null : null) ??
    reading?.weatherStation?.solarW ??
    reading?.solarW ??
    null;

  const sleepModeActive =
    cfg.sleepModeModel !== false &&
    (reading?.sleepMode === true || (battery < 35 && (reading?.beeOut ?? 0) < 50));

  let daysLeft =
    battery > 0
      ? Math.round(battery * CONNECTIVITY.BATTERY_DAYS_PER_PCT)
      : null;
  if (solarChargeW != null && solarChargeW >= 2 && battery < 100) {
    daysLeft = Math.round((daysLeft || 0) * 1.25 + 2);
  }
  if (sleepModeActive && daysLeft != null) {
    daysLeft = Math.round(daysLeft * 1.15);
  }

  const uplink =
    reading?.uplink ||
    (reading?.cellPresent || reading?.cellularRssi != null ? "4g" : "lora");
  const cellularRssi = reading?.cellularRssi ?? reading?.gsmRssi ?? null;
  const offlineBufferOk = cfg.offlineBufferModel !== false;
  const loraFailover = cfg.loraFailoverModel !== false || cfg.lora4gFailover !== false;

  const nedenler = [];
  const oneriler = [];
  if (profile === "pil_dusuk") {
    nedenler.push(`Pil %${battery}${daysLeft != null ? ` — tahmini ~${daysLeft} gün` : ""}`);
    oneriler.push("Pil veya güneş paneli kontrol.");
  }
  if (profile === "sinyal_zayif") {
    nedenler.push(`RSSI ${rssi} dBm — LoRa zayıf`);
    oneriler.push("GATE mesafesi veya anten yönünü kontrol et.");
  }
  if (profile === "offline") {
    nedenler.push(`${Math.round(ageMs / 3600000)} saat veri yok`);
    oneriler.push("NODE veya GATE bağlantısını saha kontrol.");
  }
  if (solarChargeW != null && solarChargeW >= 3) {
    nedenler.push(`Güneş şarj ~${Math.round(Number(solarChargeW))}W`);
  }

  const base = {
    profile,
    battery,
    rssi,
    loraRssi: rssi,
    cellularRssi,
    uplink,
    solarChargeW: solarChargeW != null ? Math.round(Number(solarChargeW) * 10) / 10 : null,
    sleepModeActive,
    daysLeftEstimate: daysLeft,
    offlineHours: ageMs > SENSOR.OFFLINE_MS ? Math.round(ageMs / 3600000) : null,
    offlineBufferOk,
    loraFailover,
    retryOk: cfg.loraRetryModel !== false,
    failoverReady: loraFailover,
    cellPresent: Boolean(reading?.cellPresent || cellularRssi != null || cfg.cellularBom !== false),
    nedenler: nedenler.slice(0, 3),
    oneriler: oneriler.slice(0, 2),
    ariciya: `Pil %${battery} · LoRa ${rssi} dBm · uplink ${uplink}${daysLeft != null ? ` · ~${daysLeft}g` : ""}`,
  };

  base.powerQuality = analyzePowerSensorQuality(base, cfg, reading);
  base.cellularQuality = analyzeCellularSensorQuality(
    { ...base, cellularMod: faultCellular(reading) ? "ariza" : "calisiyor" },
    cfg,
    reading
  );
  base.loraQuality = analyzeLoraSensorQuality(base, cfg, reading);
  base.quality = {
    power: base.powerQuality.score,
    cellular: base.cellularQuality.score,
    lora: base.loraQuality.score,
    score: Math.min(
      base.powerQuality.score,
      base.cellularQuality.score,
      base.loraQuality.score
    ),
  };
  base.ariciya = `${base.ariciya} · güç ${base.powerQuality.score}/4G ${base.cellularQuality.score}/LoRa ${base.loraQuality.score}`;
  return base;
}

function faultCellular(reading) {
  return (
    reading?.fault === "cellular" ||
    reading?.fault === "4g" ||
    reading?.fault === "gsm" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("cellular") ||
        reading.faults.includes("4g") ||
        reading.faults.includes("gsm")))
  );
}

function analyzeCornerBalance(history, reading, cfg = {}) {
  const {
    normalizeCorners,
    suggestCornerOffsets,
    checkIntegrity,
  } = require("./cornerScaleCalibration");
  const rawCorners = reading?.cornerKgRaw ?? reading?.cornerKg;
  const normalized = normalizeCorners(reading, cfg) || reading?.cornerKg;
  const imb = cornerImbalance(normalized);
  const rawImb = cornerImbalance(rawCorners);
  const recent = (history || []).slice(-8);
  const imbs = recent.map((r) => cornerImbalance(r.cornerKg)).filter((x) => x > 0);
  const trend =
    imbs.length >= 3 && imb > imbs[0] + 0.5
      ? "kotulesiyor"
      : imb >= SENSOR.CORNER_IMBALANCE_KG
        ? "dengesiz"
        : "normal";

  const nedenler = [];
  const oneriler = [];
  const integrity = checkIntegrity(normalized, reading?.weightKg, rawCorners);
  const suggest = rawImb >= SENSOR.CORNER_IMBALANCE_KG ? suggestCornerOffsets(rawCorners) : null;

  if (cfg.factoryCalibCert) {
    nedenler.push("Fabrika kalibrasyon sertifikası kayıtlı");
  }
  if (imb >= SENSOR.CORNER_IMBALANCE_KG) {
    nedenler.push(`Köşe farkı ${imb.toFixed(1)} kg`);
    oneriler.push("Platformu terazi; zemin çökme / devrilme riski.");
    if (suggest && !cfg.cornerOffsetsKg) {
      oneriler.push("Köşe offset kalibrasyonu uygula (otomatik sıfırlama).");
    }
  } else if (rawImb >= SENSOR.CORNER_IMBALANCE_KG && cfg.cornerOffsetsKg) {
    nedenler.push(`Offset sonrası denge OK (ham fark ${rawImb.toFixed(1)} kg)`);
  }
  if (integrity.ok === false) {
    nedenler.push(`Köşe toplamı sapması ${integrity.deltaKg} kg`);
    oneriler.push("Load-cell bütünlük kontrolü — sensör kontrol et.");
  }
  if (trend === "kotulesiyor") {
    nedenler.push("Dengesizlik artıyor — zemin veya petek kayması");
  }

  return {
    profile: trend,
    imbalanceKg: Math.round(imb * 10) / 10,
    rawImbalanceKg: Math.round(rawImb * 10) / 10,
    corners: normalized ?? null,
    integrity,
    suggestOffsets: suggest,
    factoryCalibCert: Boolean(cfg.factoryCalibCert),
    nedenler: nedenler.slice(0, 3),
    oneriler: oneriler.slice(0, 3),
    ariciya:
      imb >= SENSOR.CORNER_IMBALANCE_KG
        ? `Köşe farkı ${imb.toFixed(1)} kg — platform düzelt`
        : cfg.cornerOffsetsKg
          ? `Köşe dengesi normal (offset kalibre)`
          : "Köşe dengesi normal",
  };
}

function analyzePairFusions(reading, colony, weather, meta, slices) {
  const pairs = [];
  const celiskiler = [];

  const temp = colony?.temperature;
  const hum = colony?.humidity;
  const ir = slices?.ir;
  const weight = slices?.weight;
  const audio = slices?.audio;
  const vib = slices?.vibration;

  if (hum?.condensationRisk) {
    pairs.push({
      id: "nem_sicaklik",
      label: "Nem × sıcaklık",
      yorum: "Yoğuşma / havalandırma yetersiz — chalkbrood riski",
      oncelik: 2,
    });
  }
  if (
    (hum?.humidity ?? 0) >= SENSOR.HUM_HIGH_PCT &&
    (colony?.healthScore ?? 100) < SCORE.HEALTH_ATTENTION
  ) {
    pairs.push({
      id: "nem_saglik",
      label: "Nem × sağlık",
      yorum: "Yüksek nem + düşük sağlık — chalkbrood / mantar proxy",
      oncelik: 2,
    });
  }
  if (weight?.profile === "nektar_akisi" && ir?.profile === "yogun") {
    pairs.push({
      id: "tarti_ir",
      label: "Tartı salınım × IR",
      yorum: "Nektar akışı veya yoğun toplama — koloni aktif",
      oncelik: 5,
    });
  }
  if (vib?.profile === "yuksek" && audio?.profile === "yuksek") {
    pairs.push({
      id: "titresim_ses",
      label: "Titreşim × ses",
      yorum: "Yağma kavgası veya panik uğultusu olası",
      oncelik: 2,
    });
  }
  if (ir?.profile === "dusuk" && isRaining(weather)) {
    pairs.push({
      id: "ir_hava",
      label: "IR × hava",
      yorum: "Yağmurda düşük trafik normal — zayıflık sanma",
      oncelik: 5,
    });
    if ((colony?.healthScore ?? 100) < SCORE.HEALTH_CRITICAL) {
      celiskiler.push({
        id: "ir_hava_saglik",
        label: "IR düşük ama sağlık da kritik",
        cozum: "Yağmur trafiği maskeliyor olabilir — yağmur bitince tekrar ölç",
      });
    }
  }
  if (audio?.queenlessSignal && (meta.anaDurum === "var" || !meta.queenless)) {
    pairs.push({
      id: "ses_ir_ana",
      label: "Ses × IR in/out",
      yorum: "Ana kaybı sensör imzası — yerinde doğrula",
      oncelik: 1,
    });
  }
  if (weight?.profile === "ogul_dusus" && ir?.profile === "yogun") {
    celiskiler.push({
      id: "tarti_ir_ogul",
      label: "Tartı oğul düşüşü ama trafik hâlâ yüksek",
      cozum: "Kısmi oğul veya tartı gecikmesi — görsel kontrol",
    });
  }
  if (
    (temp?.zone === "yuksek" || temp?.zone === "kritik_yuksek") &&
    (hum?.zone === "yuksek" || hum?.zone === "kritik_yuksek")
  ) {
    pairs.push({
      id: "sicak_nem_stres",
      label: "Sıcaklık × nem stresi",
      yorum: "Isı + nem yüksek — acil havalandırma ve gölge",
      oncelik: 1,
    });
  }
  if (
    vib?.profile === "yuksek" &&
    weight?.drop6hKg != null &&
    weight.drop6hKg <= RISK.ROBBING_WEIGHT_DROP_KG &&
    weight.profile !== "ogul_dusus"
  ) {
    pairs.push({
      id: "titresim_tarti",
      label: "Titreşim × tartı kaybı",
      yorum: "Yağma şüphesi — girişi daralt",
      oncelik: 1,
    });
  }

  pairs.sort((a, b) => a.oncelik - b.oncelik);

  return {
    pairs: pairs.slice(0, 8),
    celiskiler: celiskiler.slice(0, 4),
    ozet:
      pairs[0]?.yorum ||
      celiskiler[0]?.cozum ||
      "Sensör çiftleri uyumlu görünüyor",
  };
}

function analyzeAllSensors(history, reading, colony, weather, meta, cfg = {}, health = null) {
  const h = health || colony?.sensorHealth;
  const ir = analyzeIrTraffic(history, reading, colony, weather, h, cfg);
  const weight = analyzeWeight(history, reading, colony, cfg, h);
  const audio = analyzeAudio(reading, colony, meta, h);
  const vibration = analyzeVibration(reading, colony, meta, cfg, history);
  const connectivity = analyzeConnectivity(reading, history, cfg);
  const corner = analyzeCornerBalance(history, reading, cfg);
  const slices = { ir, weight, audio, vibration, connectivity, corner };
  const pairs = analyzePairFusions(reading, colony, weather, meta, slices);
  return {
    ...slices,
    pairs,
    degradation: h?.mode === "degraded" ? { mode: h.mode, down: h.down, fallbacks: h.fallbacks } : null,
  };
}

module.exports = {
  analyzeIrTraffic,
  analyzeWeight,
  analyzeAudio,
  analyzeVibration,
  analyzeConnectivity,
  analyzeCornerBalance,
  analyzePairFusions,
  analyzeAllSensors,
  cornerImbalance,
};
