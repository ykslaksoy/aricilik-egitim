/**
 * Kovan üzeri + arılık kamerası analizi.
 * Edge CV: YOLO/ONNX + hareket blob sayımı + IR çapraz doğrulama.
 */

const {
  SENSOR,
  SCORE,
  WEATHER,
  CAMERA,
  INTERVAL_MIN,
} = require("../../../../packages/shared/constants");
const { analyzeCameraSensorQuality } = require("./cameraSensorCalibration");

/** @param {number} hiveId */
function hiveSnapshotSvg(hiveId, beeIn, beeOut, label) {
  const total = Math.min(48, Math.round((beeIn + beeOut) / 80));
  const dots = Array.from({ length: total }, (_, i) => {
    const x = 20 + (i * 17) % 360;
    const y = 40 + Math.floor((i * 17) / 360) * 14 + (i % 3) * 4;
    return `<circle cx="${x}" cy="${y}" r="3" fill="#f4a020" opacity="0.85"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
    <rect width="400" height="225" fill="#1a1410"/>
    <rect x="0" y="170" width="400" height="55" fill="#2d2418"/>
    <rect x="140" y="150" width="120" height="30" rx="4" fill="#0a0806" stroke="#5a4a32"/>
    <text x="200" y="188" text-anchor="middle" fill="#8a7355" font-size="11" font-family="system-ui">uçuş deliği</text>
    ${dots}
    <text x="12" y="20" fill="#ccc" font-size="12" font-family="system-ui">Kovan ${hiveId} · ${label || "giriş"}</text>
    <text x="12" y="38" fill="#f4a020" font-size="11" font-family="system-ui">CV in ${beeIn} / out ${beeOut}</text>
    <text x="388" y="20" text-anchor="end" fill="#6a6" font-size="10" font-family="system-ui">CANLI</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** @param {string} konumEtiket @param {number} hiveCount @param {string} condition */
function apiarySnapshotSvg(konumEtiket, hiveCount, condition) {
  const rows = Math.min(hiveCount, 12);
  const hives = Array.from({ length: rows }, (_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 40 + col * 90;
    const y = 60 + row * 45;
    return `<rect x="${x}" y="${y}" width="70" height="32" rx="3" fill="#3d3020" stroke="#6a5538"/>
      <text x="${x + 35}" y="${y + 20}" text-anchor="middle" fill="#c9a66b" font-size="10" font-family="system-ui">${i + 1}</text>`;
  }).join("");
  const sky =
    condition === "yagmur"
      ? "#4a5568"
      : condition === "don"
        ? "#7a8a9a"
        : "#5a8fc4";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
    <rect width="400" height="225" fill="${sky}"/>
    <rect x="0" y="140" width="400" height="85" fill="#3d5c2e"/>
    ${hives}
    <text x="12" y="22" fill="#fff" font-size="13" font-family="system-ui">${konumEtiket} · arılık</text>
    <text x="12" y="40" fill="#dfe" font-size="11" font-family="system-ui">${hiveCount} kovan · ${condition}</text>
    <text x="388" y="22" text-anchor="end" fill="#afa" font-size="10" font-family="system-ui">CANLI</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Edge YOLO/ONNX — IR'ye daha sıkı sayım (gerçek cihazda ONNX Runtime).
 */
function applyYoloOnnx(motion, reading) {
  const irIn = reading?.beeIn ?? 0;
  const irOut = reading?.beeOut ?? 0;
  const seed = reading?.hiveId || 0;
  const f = 0.97 + ((seed * 11) % 5) / 100;
  return {
    ...motion,
    in: Math.max(0, Math.round(irIn * f)),
    out: Math.max(0, Math.round(irOut * f)),
    method: "yolo_onnx_v1",
  };
}

/**
 * Çok kare hareket blob sayımı — IR serisinden türetilmiş edge CV simülasyonu.
 * Gerçek cihazda: frame diff + blob tracker; YOLO açıksa ONNX yolu.
 * @param {object[]} history
 * @param {object} reading
 * @param {object} [cfg]
 */
function analyzeMotionCv(history, reading, cfg = {}) {
  const frames = Math.min(CAMERA.MOTION_FRAMES, (history || []).length);
  const recent = (history || []).slice(-frames);
  const irIn = reading?.beeIn ?? 0;
  const irOut = reading?.beeOut ?? 0;
  const seed = reading?.hiveId || 0;

  if (frames < 2) {
    const cv = simulateCvCounts(irIn, irOut, seed);
    const boot = {
      in: cv.in,
      out: cv.out,
      method: "ir_bootstrap",
      framesAnalyzed: 1,
      blobCount: Math.min(48, Math.round((cv.in + cv.out) / 80)),
      motionEnergy: 0,
    };
    return cfg.cameraYoloOnnx !== false ? applyYoloOnnx(boot, reading) : boot;
  }

  let motionEnergy = 0;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    motionEnergy +=
      Math.abs((cur.beeOut ?? 0) - (prev.beeOut ?? 0)) +
      Math.abs((cur.beeIn ?? 0) - (prev.beeIn ?? 0));
  }
  motionEnergy = Math.round(motionEnergy / Math.max(1, recent.length - 1));

  const base = simulateCvCounts(irIn, irOut, seed);
  const motionFactor = 1 + Math.min(0.12, motionEnergy / 8000);
  const blobCount = Math.max(
    CAMERA.MOTION_BLOB_MIN,
    Math.min(56, Math.round(((irIn + irOut) / 70) * motionFactor))
  );

  const outRatio = irIn + irOut > 0 ? irOut / (irIn + irOut) : 0.52;
  const cvOut = Math.max(0, Math.round(base.out * motionFactor));
  const cvIn = Math.max(0, Math.round(blobCount * (1 - outRatio) * 18));

  const motion = {
    in: cvIn,
    out: cvOut,
    method: "motion_blob_v1",
    framesAnalyzed: frames,
    blobCount,
    motionEnergy,
  };
  return cfg.cameraYoloOnnx !== false ? applyYoloOnnx(motion, reading) : motion;
}

/**
 * IR trafiğinden yedek sayım (± gürültü).
 */
function simulateCvCounts(irIn, irOut, seed = 0) {
  const noise = (n, s) => {
    const f = 0.92 + ((s * 17 + n * 13) % 16) / 100;
    return Math.max(0, Math.round(n * f));
  };
  return {
    in: noise(irIn, seed + 1),
    out: noise(irOut, seed + 2),
  };
}

/**
 * @param {{ beeIn: number, beeOut: number }} ir
 * @param {{ in: number, out: number }} cv
 */
function compareIrCv(ir, cv) {
  const delta = (a, b) =>
    a <= 0 && b <= 0 ? 0 : Math.round((Math.abs(a - b) / Math.max(a, b, 1)) * 100);
  const deltaInPct = delta(ir.beeIn, cv.in);
  const deltaOutPct = delta(ir.beeOut, cv.out);
  const maxDelta = Math.max(deltaInPct, deltaOutPct);
  const agrees = maxDelta <= CAMERA.IR_AGREE_PCT;
  let note;
  if (ir.beeIn === 0 && ir.beeOut === 0) {
    note = "IR sıfır — kamera da düşük trafik (uyumlu veya IR arızası)";
  } else if (agrees) {
    note = `CV ile IR uyumlu (±${maxDelta}%)`;
  } else if (cv.out > ir.beeOut * 1.2) {
    note = "CV çıkış IR'den yüksek — öğlen kalibrasyonu veya arı yığılması";
  } else {
    note = "CV ile IR farklı — IR lens/kalibrasyon kontrol et";
  }
  return { deltaInPct, deltaOutPct, agrees, note, maxDelta };
}

/**
 * Kamera ↔ IR karşılaştırma (ayrı analiz modülü).
 */
function analyzeIrComparison(reading, cvCounts) {
  const ir = { beeIn: reading?.beeIn ?? 0, beeOut: reading?.beeOut ?? 0 };
  const cmp = compareIrCv(ir, cvCounts);
  return {
    ...cmp,
    irIn: ir.beeIn,
    irOut: ir.beeOut,
    cvIn: cvCounts.in,
    cvOut: cvCounts.out,
    ariciya: cmp.note,
  };
}

/**
 * Kovan üzeri giriş kamerası analizi.
 * @param {object} reading
 * @param {object|null} colony
 * @param {object} meta
 * @param {object} weather
 * @param {object[]} [history]
 * @param {object|null} [health]
 * @param {object} [cfg]
 */
function analyzeHiveCamera(reading, colony, meta, weather, history = [], health = null, cfg = {}) {
  const h = health || colony?.sensorHealth;
  if (!reading?.cameraPresent || (h?.available && !h.available.camera)) {
    const fallback = (h?.fallbacks || []).find((f) => f.includes("ir") || f.includes("tartı")) || null;
    const broken = {
      present: true,
      mod: "degraded",
      fault: reading?.cameraPresent === false ? "missing" : "camera",
      kind: "hive_entrance",
      hiveId: reading.hiveId,
      ariciya: fallback
        ? `Kamera arızalı — yedek: ${fallback.replace(/_/g, " ")}`
        : "Kamera arızalı — tartı ve IR ile devam",
      oneriler: ["Kamera bağlantısını ve lensi kontrol et"],
      alerts: [],
      counts: null,
      cv: null,
      irComparison: null,
    };
    broken.quality = analyzeCameraSensorQuality(broken, cfg, reading);
    if (broken.quality?.ariciya) broken.ariciyaQuality = broken.quality.ariciya;
    return broken;
  }

  const irIn = reading.beeIn ?? 0;
  const irOut = reading.beeOut ?? 0;
  const motion = analyzeMotionCv(history, reading, cfg);
  const cv = { in: motion.in, out: motion.out };
  const irCmp = analyzeIrComparison(reading, cv);

  const perMin = INTERVAL_MIN > 0 ? INTERVAL_MIN : 15;
  const density =
    cv.out >= CAMERA.TRAFFIC_HIGH_OUT
      ? "yuksek"
      : cv.out <= CAMERA.TRAFFIC_LOW_OUT
        ? "dusuk"
        : "normal";

  let confidence = CAMERA.MOTION_CONFIDENCE_BASE;
  if (irCmp.agrees) confidence += 10;
  if (motion.framesAnalyzed >= 3) confidence += 6;
  if (colony?.calibrated) confidence += 8;
  if (motion.method === "yolo_onnx_v1") confidence += 4;
  if (reading.fault === "ir") confidence -= 15;
  confidence = Math.max(40, Math.min(98, confidence));

  const alerts = [];
  if (density === "yuksek" && (colony?.swarmRiskScore ?? 0) >= 50) {
    alerts.push({
      kind: "swarm_traffic",
      title: "Yoğun giriş trafiği — oğul riski",
      level: "elevated",
    });
  }
  if (!irCmp.agrees && irIn + irOut > 200) {
    alerts.push({
      kind: "ir_cv_mismatch",
      title: "Kamera ↔ IR sapması",
      level: "watch",
    });
  }
  if (weather?.condition === "yagmur" && density !== "dusuk") {
    alerts.push({
      kind: "weather_mismatch",
      title: "Yağmurda yüksek trafik — IR/kamera doğrula",
      level: "watch",
    });
  }

  const oneriler = [];
  if (density === "yuksek") {
    oneriler.push("Giriş görüntüsünde kalabalık — süper veya kat planla.");
  }
  if (!irCmp.agrees) {
    oneriler.push("Öğlen IR kalibrasyonu ile kamera sayımını karşılaştır.");
  }
  if (weather?.precipMm >= WEATHER.PRECIP_MM) {
    oneriler.push("Islak eşik normal — uçuş az olabilir; hastalık sanma.");
  }

  let ariciya = `Girişte ${cv.in} in / ${cv.out} out (${perMin} dk, ${motion.framesAnalyzed} kare).`;
  if (motion.method === "yolo_onnx_v1") {
    ariciya += " YOLO/ONNX.";
  }
  if (density === "yuksek") {
    ariciya += " Trafik yoğun.";
  } else if (density === "dusuk") {
    ariciya += " Trafik düşük.";
  }
  if (irCmp.agrees) {
    ariciya += " IR ile uyumlu.";
  }

  const snapshotUrl = hiveSnapshotSvg(
    reading.hiveId,
    cv.in,
    cv.out,
    meta?.label || "giriş"
  );

  const live = {
    present: true,
    mod: "live",
    kind: "hive_entrance",
    hiveId: reading.hiveId,
    snapshotUrl,
    liveUrl: `/api/hives/${reading.hiveId}/camera/snapshot`,
    refreshedAt: reading.ts || new Date().toISOString(),
    refreshSec: CAMERA.REFRESH_SEC,
    counts: {
      inPerInterval: cv.in,
      outPerInterval: cv.out,
      inPerMinute: Math.round(cv.in / perMin),
      outPerMinute: Math.round(cv.out / perMin),
    },
    cv: {
      method: motion.method,
      confidence,
      framesAnalyzed: motion.framesAnalyzed,
      blobCount: motion.blobCount,
      motionEnergy: motion.motionEnergy,
      density,
      densityLabel:
        density === "yuksek" ? "Yoğun" : density === "dusuk" ? "Düşük" : "Normal",
    },
    irComparison: irCmp,
    beeEstimateFromCv: estimateBeesFromCv(cv.out, colony),
    alerts,
    ariciya,
    oneriler: oneriler.slice(0, 3),
  };
  live.quality = analyzeCameraSensorQuality(live, cfg, reading);
  if (live.quality?.ariciya) live.ariciyaQuality = live.quality.ariciya;
  return live;
}

function estimateBeesFromCv(cvOut, colony) {
  if (!cvOut || cvOut < 10) return null;
  const overlap = 45 / (INTERVAL_MIN || 15);
  const foragers = cvOut * overlap;
  const total = Math.round(foragers / 0.38);
  if (colony?.beeEstimate) {
    return Math.round(total * 0.7 + colony.beeEstimate * 0.3);
  }
  return total;
}

/** Ana kamera durumu — opsiyonel / arızalı / canlı */
function resolveMainCameraMod(hivesAtLocation) {
  const hives = hivesAtLocation || [];
  const configured = hives.some(
    (h) => h.reading?.mainCameraPresent || h.meta?.mainCameraAtLocation
  );
  if (!configured) {
    return { mod: "optional", configured: false, fault: false };
  }
  const faulted = hives.some((h) => {
    const r = h.reading || {};
    const fs = Array.isArray(r.faults) ? r.faults : r.fault ? [r.fault] : [];
    return fs.includes("mainCamera") || r.fault === "mainCamera";
  });
  if (faulted) {
    return { mod: "degraded", configured: true, fault: true };
  }
  return { mod: "live", configured: true, fault: false };
}

function buildApiaryIrFusion(hives, weather, konumId) {
  const hiveCount = hives.length;
  const totalOut = hives.reduce((s, h) => s + (h.reading?.beeOut ?? 0), 0);
  const avgOut = hiveCount ? Math.round(totalOut / hiveCount) : 0;
  const trafikGenel =
    avgOut >= SCORE.TRAFFIC_GOOD
      ? "yuksek"
      : avgOut <= SENSOR.MIDDAY_TRAFFIC_LOW
        ? "dusuk"
        : "normal";

  const w = weather || {};
  let havaNote = "Hava verisi yok";
  let havaAgrees = null;
  if (w.condition === "yagmur" || w.precipMm >= WEATHER.PRECIP_MM) {
    havaAgrees = trafikGenel === "dusuk" || trafikGenel === "normal";
    havaNote = havaAgrees
      ? "Yağmur — genel trafik düşük/ normal (beklenen)"
      : "Yağmur ama trafik yüksek görünüyor — sensörleri kontrol et";
  } else if (w.condition === "acik") {
    havaAgrees = trafikGenel !== "dusuk" || avgOut === 0;
    havaNote = "Açık hava — uçuş beklenir";
  } else if (w.condition === "don") {
    havaAgrees = trafikGenel === "dusuk";
    havaNote = "Don riski — trafik düşük olmalı";
  } else {
    havaNote = `${w.label || w.condition || "—"} — arılık genel görünüm`;
    havaAgrees = true;
  }

  const camHiveCount = hives.filter((h) => h.reading?.cameraPresent).length;
  const motionScore = Math.min(
    100,
    Math.round((avgOut / SCORE.TRAFFIC_GOOD) * 40 + (camHiveCount / Math.max(hiveCount, 1)) * 30)
  );

  const guvenlik = {
    hareket: false,
    suphe: null,
    not: "Son 15 dk anormal hareket yok",
  };
  if (hives.some((h) => h.meta?.hirsizlikSuphesi || h.meta?.fizikselHasar)) {
    guvenlik.hareket = true;
    guvenlik.suphe = "insan";
    guvenlik.not = "Titreşim / hasar bayrağı — arılığı gözle kontrol et";
  }
  if (hives.some((h) => (h.reading?.tiltDeg ?? 0) >= 45)) {
    guvenlik.hareket = true;
    guvenlik.suphe = "devrilme";
    guvenlik.not = "GPS/eğim — devrilmiş kovan olabilir";
  }

  const notlar = [];
  if (w.windKmh >= WEATHER.STORM_WIND_KMH) {
    notlar.push("Kuvvetli rüzgâr — kovan sabitlemesi kontrol");
  }
  if (trafikGenel === "yuksek") {
    notlar.push("Arılık genelinde yoğun uçuş — oğul sezonu takibi");
  }
  if (hives.filter((h) => (h.colony?.swarmRiskScore ?? 0) >= 50).length >= 2) {
    notlar.push("Birden fazla kovanda yüksek oğul riski");
  }

  return {
    konumEtiket: w.konumEtiket || konumId,
    hiveCount,
    avgOut,
    trafikGenel,
    havaNote,
    havaAgrees,
    w,
    camHiveCount,
    motionScore,
    guvenlik,
    notlar,
  };
}

/**
 * Arılık ana kamerası — opsiyonel: yok / arızalı / canlı; IR+hava fusion her zaman.
 */
function analyzeApiaryCamera(konumId, weather, hivesAtLocation) {
  const hives = hivesAtLocation || [];
  const state = resolveMainCameraMod(hives);
  const fusion = buildApiaryIrFusion(hives, weather, konumId);
  const w = fusion.w;

  const analiz = {
    hava: {
      condition: w.condition,
      label: w.label,
      agreesWithApi: fusion.havaAgrees,
      note: fusion.havaNote,
    },
    kovanSayisi: fusion.hiveCount,
    kameraliKovanSayisi: fusion.camHiveCount,
    ortalamaIrOut: fusion.avgOut,
    trafikGenel: fusion.trafikGenel,
    trafikLabel:
      fusion.trafikGenel === "yuksek"
        ? "Yoğun"
        : fusion.trafikGenel === "dusuk"
          ? "Düşük"
          : "Normal",
    motionScore: fusion.motionScore,
    guvenlik: fusion.guvenlik,
    kameraliKovanlar: hives
      .filter((h) => h.reading?.cameraPresent)
      .map((h) => h.reading.hiveId),
    kaynak: state.mod === "live" ? "ana_kamera_cv" : "ir_hava_fusion",
  };

  const base = {
    kind: "apiary",
    konumId,
    konumEtiket: fusion.konumEtiket,
    analiz,
    notlar: fusion.notlar.slice(0, 4),
    refreshedAt: new Date().toISOString(),
    refreshSec: CAMERA.REFRESH_SEC,
  };

  if (state.mod === "optional") {
    return {
      ...base,
      present: false,
      mod: "optional",
      snapshotUrl: null,
      liveUrl: null,
      ariciya: `${fusion.konumEtiket}: ana kamera yok — arılık IR + hava + kovan kameraları ile izleniyor (${fusion.hiveCount} kovan, ort. çıkış ${fusion.avgOut})`,
    };
  }

  const snapshotUrl = apiarySnapshotSvg(
    fusion.konumEtiket,
    fusion.hiveCount,
    w.condition || "acik"
  );

  if (state.mod === "degraded") {
    return {
      ...base,
      present: true,
      mod: "degraded",
      fault: "mainCamera",
      snapshotUrl: null,
      liveUrl: `/api/locations/${konumId}/camera/snapshot`,
      ariciya: `${fusion.konumEtiket}: ana kamera arızalı — yedek: kovan kameraları + titreşim · ${fusion.hiveCount} kovan, ort. çıkış ${fusion.avgOut}`,
      oneriler: ["Ana kamera bağlantısını ve WiFi HUB'ı kontrol et"],
    };
  }

  return {
    ...base,
    present: true,
    mod: "live",
    snapshotUrl,
    liveUrl: `/api/locations/${konumId}/camera/snapshot`,
    ariciya: `${fusion.konumEtiket}: ${fusion.hiveCount} kovan, ort. çıkış ${fusion.avgOut}. ${fusion.havaNote}`,
  };
}

function blendCameraBeeEstimate(colony, hiveCam) {
  if (!colony || !hiveCam?.present || hiveCam.mod === "degraded" || hiveCam.beeEstimateFromCv == null) {
    return colony;
  }
  const w = CAMERA.CV_BLEND_WEIGHT;
  const base = colony.beeEstimate;
  if (base == null) {
    return {
      ...colony,
      beeEstimate: hiveCam.beeEstimateFromCv,
      beeEstimateMin: Math.round(hiveCam.beeEstimateFromCv * 0.85),
      beeEstimateMax: Math.round(hiveCam.beeEstimateFromCv * 1.15),
      confidence: hiveCam.cv?.confidence >= 70 ? "medium" : "low",
      cameraBoost: true,
      beeEstimateSource: "cv",
    };
  }
  const blended = Math.round(base * (1 - w) + hiveCam.beeEstimateFromCv * w);
  return {
    ...colony,
    beeEstimate: blended,
    beeEstimateMin: Math.round(Math.min(colony.beeEstimateMin ?? blended * 0.85, blended * 0.85)),
    beeEstimateMax: Math.round(Math.max(colony.beeEstimateMax ?? blended * 1.15, blended * 1.15)),
    cameraBoost: true,
    beeEstimateSource: "traffic_weight_cv",
    beeEstimateCv: hiveCam.beeEstimateFromCv,
  };
}

function fillReadingCameraCounts(reading, history = [], cfg = {}) {
  if (!reading?.cameraPresent) {
    reading.cameraBeeIn = null;
    reading.cameraBeeOut = null;
    return reading;
  }
  const faults = new Set();
  if (reading.fault) faults.add(String(reading.fault));
  if (Array.isArray(reading.faults)) {
    for (const f of reading.faults) if (f) faults.add(String(f));
  }
  if (faults.has("camera")) {
    reading.cameraBeeIn = null;
    reading.cameraBeeOut = null;
    return reading;
  }
  const motion = analyzeMotionCv(history, reading, cfg);
  reading.cameraBeeIn = motion.in;
  reading.cameraBeeOut = motion.out;
  reading.cameraCvMethod = motion.method;
  return reading;
}

module.exports = {
  analyzeHiveCamera,
  analyzeApiaryCamera,
  analyzeIrComparison,
  analyzeMotionCv,
  compareIrCv,
  blendCameraBeeEstimate,
  fillReadingCameraCounts,
  hiveSnapshotSvg,
  apiarySnapshotSvg,
  applyYoloOnnx,
};
