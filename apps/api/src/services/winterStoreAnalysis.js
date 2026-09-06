/**
 * Kış açlığı / store tüketimi — tartı trendi + mevsim modeli.
 */

const { FEEDING, WEATHER } = require("../../../../packages/shared/constants");

function weightTrend(series, days = 14) {
  const pts = (series || [])
    .filter((r) => r.weightKg != null)
    .slice(-Math.ceil((days * 24 * 60) / 15));
  if (pts.length < 4) return { dropKg: 0, dailyKg: 0, samples: pts.length };
  const first = pts[0].weightKg;
  const last = pts[pts.length - 1].weightKg;
  const spanDays = Math.max(1, (new Date(pts[pts.length - 1].ts) - new Date(pts[0].ts)) / 86400000);
  return {
    dropKg: Math.round((last - first) * 100) / 100,
    dailyKg: Math.round(((last - first) / spanDays) * 1000) / 1000,
    samples: pts.length,
  };
}

function isWinterSeason(month) {
  return month >= 11 || month <= 2;
}

function analyzeWinterStore(series, reading, colony, weather = {}) {
  const month = new Date(reading?.ts || Date.now()).getMonth() + 1;
  const weight = reading?.weightKg ?? colony?.weightKg;
  const trend = weightTrend(series, 21);
  const frost = (weather?.tempC ?? 99) <= WEATHER.FROST_TEMP_C;

  let storeKg = Math.max(0, (weight ?? 0) - (reading?.tareKg ?? 8));
  const beeCount = colony?.beeEstimate ?? 20000;
  const dailyNeedKg = Math.max(0.015, (beeCount / 1000) * 0.008 + (frost ? 0.012 : 0.006));
  const daysLeft = storeKg > 0 && dailyNeedKg > 0 ? Math.floor(storeKg / dailyNeedKg) : 0;

  let riskSkoru = 0;
  const sinyaller = [];
  const oneriler = [];

  if (weight != null && weight < FEEDING.WEIGHT_URGENT_KG) {
    riskSkoru += 40;
    sinyaller.push(`Tartı kritik düşük (${weight} kg)`);
    oneriler.push("Acil şurup / fondant besleme.");
  } else if (weight != null && weight < FEEDING.WEIGHT_KG) {
    riskSkoru += 22;
    sinyaller.push(`Tartı düşük (${weight} kg)`);
    oneriler.push("Besleme planla.");
  }

  if (isWinterSeason(month) && trend.dailyKg < -0.08) {
    riskSkoru += 18;
    sinyaller.push(`Kış tüketimi hızlı (${Math.abs(trend.dailyKg)} kg/gün)`);
  }

  if (daysLeft > 0 && daysLeft < 14 && isWinterSeason(month)) {
    riskSkoru += 25;
    sinyaller.push(`Store ~${daysLeft} gün yetebilir`);
    oneriler.push("Kış beslemesi ekle.");
  } else if (daysLeft > 0 && daysLeft < 30 && frost) {
    riskSkoru += 12;
    sinyaller.push(`Don + store ~${daysLeft} gün`);
  }

  if ((colony?.healthScore ?? 100) < 50 && isWinterSeason(month)) {
    riskSkoru += 10;
    sinyaller.push("Zayıf koloni — kış riski");
  }

  riskSkoru = Math.min(100, riskSkoru);
  let durum = "guvenli";
  if (riskSkoru >= 50) durum = "kritik";
  else if (riskSkoru >= 25) durum = "dikkat";

  const ariciya =
    durum === "guvenli"
      ? `Kış store yeterli (~${daysLeft || "?"} gün · ${storeKg.toFixed(1)} kg bal)`
      : `Kış açlık riski ${durum} — ${sinyaller[0] || ""}`;

  return {
    mod: "calisiyor",
    storeKg: Math.round(storeKg * 10) / 10,
    daysLeftEstimate: daysLeft,
    dailyNeedKg: Math.round(dailyNeedKg * 1000) / 1000,
    trend14d: trend,
    mevsim: isWinterSeason(month) ? "kis" : month >= 9 && month <= 10 ? "sonbahar" : "aktif",
    riskSkoru,
    durum,
    sinyaller: sinyaller.slice(0, 4),
    oneriler: [...new Set(oneriler)].slice(0, 3),
    ariciya,
  };
}

module.exports = { analyzeWinterStore, weightTrend };
