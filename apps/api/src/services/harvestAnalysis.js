/**
 * Hasat zamanı tahmini — tartı platosu, nektar akışı düşüşü, mevsim.
 */

const { SCORE, BROOD, HARVEST } = require("../../../../packages/shared/constants");

function seriesDelta(history, field, hoursBack) {
  if (!history || history.length < 2) return null;
  const latest = history[history.length - 1];
  const target = new Date(latest.ts).getTime() - hoursBack * 3600000;
  let ref = history[0];
  for (let i = history.length - 2; i >= 0; i--) {
    if (new Date(history[i].ts).getTime() <= target) {
      ref = history[i];
      break;
    }
  }
  const a = latest[field];
  const b = ref[field];
  if (a == null || b == null) return null;
  return Math.round((a - b) * 10) / 10;
}

function monthFromTs(ts) {
  return new Date(ts || Date.now()).getUTCMonth() + 1;
}

/**
 * @param {object[]} history
 * @param {object} reading
 * @param {object|null} colony
 * @param {object} meta
 * @param {object} weather
 */
function analyzeHarvestTiming(history, reading, colony, meta = {}, weather = {}) {
  const weightKg = reading?.weightKg ?? 0;
  if (weightKg <= 0 || reading?.fault === "scale") {
    return { mod: "off", ariciya: "Tartı yok — hasat tahmini üretilemedi", hazirlikSkoru: 0 };
  }

  const cfg = meta;
  const tare = cfg.tareKg ?? 8;
  const comb = cfg.combKg ?? 18;
  const honeyKg = Math.max(0, weightKg - tare - comb);
  const swing = colony?.dailyWeightSwingKg ?? 0;
  const gain7d = seriesDelta(history, "weightKg", 24 * 7);
  const gain3d = seriesDelta(history, "weightKg", 72);
  const month = monthFromTs(reading?.ts);

  let hazirlikSkoru = 0;
  const sinyaller = [];

  if (honeyKg >= HARVEST.HONEY_KG_READY) {
    hazirlikSkoru += 28;
    sinyaller.push(`Bal stoku ~${Math.round(honeyKg * 10) / 10} kg`);
  } else if (honeyKg >= HARVEST.HONEY_KG_PARTIAL) {
    hazirlikSkoru += 14;
    sinyaller.push(`Kısmi stok ${Math.round(honeyKg * 10) / 10} kg`);
  }

  if (weightKg >= 32 && swing < SCORE.SWING_IDEAL_MIN_KG) {
    hazirlikSkoru += 22;
    sinyaller.push("Tartı platosu — nektar akışı yavaşladı");
  }
  if (gain3d != null && gain3d >= 0 && gain3d < HARVEST.GAIN_3D_PLATEAU_KG) {
    hazirlikSkoru += 15;
    sinyaller.push(`3 günde +${gain3d} kg — yavaş büyüme / olgunlaşma`);
  }
  if (gain7d != null && gain7d < 0.2 && honeyKg >= HARVEST.HONEY_KG_PARTIAL) {
    hazirlikSkoru += 12;
    sinyaller.push("7 günde net artış yok — süzme penceresi");
  }
  if (month >= HARVEST.SEASON_START_MONTH && month <= HARVEST.SEASON_END_MONTH) {
    hazirlikSkoru += 10;
    sinyaller.push("Hasat sezonu içinde");
  } else if (month < HARVEST.SEASON_START_MONTH) {
    hazirlikSkoru -= 15;
    sinyaller.push("Erken — ana mevsim öncesi");
  }

  if ((colony?.broodEmergence?.active) && honeyKg < HARVEST.HONEY_KG_READY) {
    hazirlikSkoru -= 10;
    sinyaller.push("Aktif yavru çıkışı — bal süzmeden önce düşün");
  }

  hazirlikSkoru = Math.max(0, Math.min(100, hazirlikSkoru));

  let durum = "bekle";
  let durumLabel = "Bekle";
  if (hazirlikSkoru >= HARVEST.SCORE_READY) {
    durum = "hazir";
    durumLabel = "Hasat uygun";
  } else if (hazirlikSkoru >= HARVEST.SCORE_SOON) {
    durum = "yakin";
    durumLabel = "1–2 hafta içinde";
  } else if (hazirlikSkoru >= 25) {
    durum = "izle";
    durumLabel = "İzle";
  }

  const tahminiGun =
    durum === "hazir"
      ? 0
      : durum === "yakin"
        ? Math.round(7 + (HARVEST.SCORE_READY - hazirlikSkoru) / 3)
        : durum === "izle"
          ? Math.round(14 + (HARVEST.SCORE_SOON - hazirlikSkoru) * 2)
          : null;

  const oneriler = [];
  if (durum === "hazir") {
    oneriler.push("Süzme planla; en az 1 süper bırak.");
  } else if (durum === "yakin") {
    oneriler.push("Petek doluluk kontrolü; yağmur sonrası tartı tekrar ölç.");
  }
  if (honeyKg >= HARVEST.HONEY_KG_READY && (colony?.swarmRiskScore ?? 0) >= 50) {
    oneriler.push("Oğul riski var — hasat sırasında alan genişlet.");
  }

  let ariciya = `${durumLabel} (skor ${hazirlikSkoru})`;
  if (honeyKg > 0) ariciya += ` · ~${Math.round(honeyKg * 10) / 10} kg bal`;
  if (tahminiGun != null && tahminiGun > 0) ariciya += ` · ~${tahminiGun} gün`;

  return {
    mod: "calisiyor",
    hazirlikSkoru,
    durum,
    durumLabel,
    honeyKgEstimate: Math.round(honeyKg * 10) / 10,
    tahminiGun,
    sinyaller: sinyaller.slice(0, 5),
    oneriler: oneriler.slice(0, 2),
    ariciya,
  };
}

module.exports = { analyzeHarvestTiming };
