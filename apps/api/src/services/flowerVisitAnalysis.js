/**
 * Tarla içi çiçek ziyareti — giriş ROI polen + IR + nektar + hava (#12).
 * Ek polen tuzağı yok: kamera takılıysa YOLO polen sepeti; yoksa IR proxy.
 */

const { SCORE, IR, WEATHER } = require("../../../../packages/shared/constants");
const { analyzeFlowerVisitQuality } = require("./flowerVisitCalibration");

/**
 * Polen yükü % — ingest > kamera ROI > IR proxy.
 */
function resolvePollenLoad(reading = {}, cfg = {}) {
  if (reading?.pollenLoadPct != null) {
    return { pollenLoadPct: Math.max(0, Math.min(100, Number(reading.pollenLoadPct))), kaynak: "ingest" };
  }
  const nested = reading?.flowerVisit;
  if (nested?.pollenLoadPct != null) {
    return { pollenLoadPct: Math.max(0, Math.min(100, Number(nested.pollenLoadPct))), kaynak: "ingest" };
  }

  if (reading?.cameraPresent && (reading?.cameraBeeIn != null || reading?.beeIn != null)) {
    const seed = Number(reading.hiveId) || 0;
    const inCount = reading.cameraBeeIn ?? reading.beeIn ?? 0;
    const trafficBoost = Math.min(18, Math.round(inCount / 80));
    const pct = Math.max(8, Math.min(92, 36 + (seed % 14) + trafficBoost));
    return { pollenLoadPct: pct, kaynak: "camera_roi" };
  }

  if (reading?.beeOut != null || reading?.beeIn != null) {
    const out = reading.beeOut ?? 0;
    const pct = Math.max(0, Math.min(70, Math.round((out / Math.max(SCORE.TRAFFIC_STRONG, 1)) * 48)));
    return { pollenLoadPct: pct, kaynak: "ir_proxy" };
  }

  return { pollenLoadPct: null, kaynak: cfg.flowerVisitBom !== false ? "tasarim" : "yok" };
}

function fillReadingPollenLoad(reading, cfg = {}) {
  if (!reading) return reading;
  const resolved = resolvePollenLoad(reading, cfg);
  if (reading.pollenLoadPct == null && resolved.pollenLoadPct != null) {
    reading.pollenLoadPct = resolved.pollenLoadPct;
  }
  reading.pollenLoadKaynak = resolved.kaynak;
  return reading;
}

function analyzeFlowerVisit(
  series,
  reading,
  colony,
  weatherIndices = null,
  cfg = {},
  weather = null,
  meta = {}
) {
  const pollen = resolvePollenLoad(reading, cfg);
  const traffic = colony?.middayTraffic || { beeIn: 0, beeOut: 0 };
  const beeOut = traffic.beeOut ?? reading?.beeOut ?? 0;
  const beeIn = traffic.beeIn ?? reading?.beeIn ?? 0;

  const recent = (series || []).slice(-7);
  const outAvg =
    recent.length > 0
      ? recent.reduce((s, r) => s + (r.beeOut ?? 0), 0) / recent.length
      : beeOut;

  let visitScore = 0;
  if (beeOut >= SCORE.TRAFFIC_STRONG) visitScore += 28;
  else if (beeOut >= SCORE.TRAFFIC_GOOD) visitScore += 20;
  else if (beeOut >= SCORE.TRAFFIC_WEAK) visitScore += 10;

  const ratio = beeIn + beeOut > 0 ? beeOut / Math.max(beeIn, 1) : 0;
  if (ratio >= 0.9 && ratio <= 1.3) visitScore += 10;

  const nectarIdx =
    weatherIndices?.nectarIndex ?? weatherIndices?.nektarIndeksi ?? 50;
  visitScore += (nectarIdx / 100) * 18;

  const swing = colony?.weightSwing24hKg ?? colony?.dailyWeightSwingKg ?? 0;
  if (swing >= IR.NECTAR_SWING_MIN_KG) visitScore += 12;
  else if (swing >= 0.3) visitScore += 6;

  if (pollen.pollenLoadPct != null) {
    visitScore += Math.round((pollen.pollenLoadPct / 100) * 22);
  }

  const precip =
    weatherIndices?.precipMm ?? weather?.precipMm ?? weather?.rainMm ?? 0;
  if (precip >= (WEATHER?.PRECIP_MM ?? 1) || weather?.condition === "yagmur") {
    visitScore = Math.round(visitScore * 0.55);
  }

  visitScore = Math.max(0, Math.min(100, Math.round(visitScore)));

  let band = "dusuk";
  if (visitScore >= 75) band = "yuksek";
  else if (visitScore >= 50) band = "orta";

  const ziyaretSaat = beeOut > 0 ? Math.round((beeOut / Math.max(outAvg, 1)) * 4) / 4 : 0;
  const contract = meta?.pollination;
  const contractLinked = Boolean(cfg.flowerContractModel !== false || contract?.aktif);

  const fused = {
    mod: "calisiyor",
    flowerVisitIndex: visitScore,
    band,
    beeOutMidday: beeOut,
    beeInMidday: beeIn,
    pollenLoadPct: pollen.pollenLoadPct,
    pollenKaynak: pollen.kaynak,
    nectarIndex: nectarIdx,
    outVsBaseline: Math.round((beeOut / Math.max(outAvg, 1)) * 100),
    nectarFlowKg24h: swing,
    ziyaretSaatTahmini: ziyaretSaat,
    contractLinked,
    contractUrun: contract?.aktif ? contract.urun : null,
    ariciya:
      visitScore >= 50
        ? `Çiçek ziyareti ${band} (${visitScore}/100 · polen %${pollen.pollenLoadPct ?? "—"} · ${pollen.kaynak})`
        : `Düşük çiçek ziyareti (${visitScore}/100) — nektar veya hava kontrol`,
  };

  fused.quality = analyzeFlowerVisitQuality(fused, cfg, reading, weatherIndices);
  if (fused.quality?.ariciya) fused.ariciyaQuality = fused.quality.ariciya;
  return fused;
}

module.exports = {
  analyzeFlowerVisit,
  resolvePollenLoad,
  fillReadingPollenLoad,
};
