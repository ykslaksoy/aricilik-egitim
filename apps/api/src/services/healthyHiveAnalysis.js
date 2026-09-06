/**
 * Healthy Hive / pollination indeksi — BeeHero tarzı birleşik skor.
 */

const { POLLINATION } = require("../../../../packages/shared/constants");

function analyzeHealthyHiveIndex(colony, weatherIndices, pollination, inspectionJournal, winterStore) {
  const weights = {
    colony: 0.28,
    health: 0.22,
    flight: 0.15,
    pollination: 0.15,
    records: 0.1,
    winter: 0.1,
  };

  const colonyScore = colony?.score ?? 50;
  const healthScore = colony?.healthScore ?? 50;
  const flightScore = weatherIndices?.flightIndex ?? 50;
  const pollScore = pollination?.score ?? pollination?.roiScore ?? 50;
  const recordScore = inspectionJournal
    ? Math.max(0, 100 - (inspectionJournal.riskSkoru ?? 0))
    : 60;
  const winterScore = winterStore ? Math.max(0, 100 - (winterStore.riskSkoru ?? 0)) : 70;

  const raw =
    colonyScore * weights.colony +
    healthScore * weights.health +
    flightScore * weights.flight +
    pollScore * weights.pollination +
    recordScore * weights.records +
    winterScore * weights.winter;

  const index = Math.round(Math.min(100, Math.max(0, raw)));
  const target = POLLINATION.TARGET_SCORE_PER_HIVE;

  let band = "orta";
  if (index >= 85) band = "mukemmel";
  else if (index >= 70) band = "iyi";
  else if (index >= 55) band = "orta";
  else if (index >= 40) band = "zayif";
  else band = "kritik";

  const underperform = index < target * (POLLINATION.UNDERPERFORM_PCT / 100);
  const overperform = index > target * (POLLINATION.OVERPERFORM_PCT / 100);

  const drivers = [
    { key: "koloni", skor: colonyScore, agirlik: weights.colony },
    { key: "saglik", skor: healthScore, agirlik: weights.health },
    { key: "ucus", skor: flightScore, agirlik: weights.flight },
    { key: "pollination", skor: pollScore, agirlik: weights.pollination },
    { key: "kayit", skor: recordScore, agirlik: weights.records },
    { key: "kis", skor: winterScore, agirlik: weights.winter },
  ].sort((a, b) => b.skor * b.agirlik - a.skor * a.agirlik);

  const zayif = drivers.filter((d) => d.skor < 55).slice(0, 2).map((d) => d.key);

  return {
    mod: "calisiyor",
    healthyHiveIndex: index,
    band,
    hedef: target,
    underperform,
    overperform,
    bilesenler: Object.fromEntries(drivers.map((d) => [d.key, d.skor])),
    zayifAlanlar: zayif,
    ariciya:
      index >= 70
        ? `Healthy Hive ${index}/100 (${band}) — kontrat hedefi ${underperform ? "altında" : "karşılanıyor"}`
        : `Healthy Hive ${index}/100 (${band}) — iyileştir: ${zayif.join(", ") || "genel"}`,
  };
}

module.exports = { analyzeHealthyHiveIndex };
