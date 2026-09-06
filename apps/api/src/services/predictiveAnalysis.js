/**
 * Tahmin ve anomali katmanı.
 */

const {
  SCORE,
  SWARM,
  SWARM_DROP_6H_KG,
  FEEDING,
  CONNECTIVITY,
} = require("../../../../packages/shared/constants");

function seriesMean(series, field, n = 16) {
  const slice = (series || []).slice(-n);
  const vals = slice.map((r) => r[field]).filter((v) => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function analyzePredictive(history, reading, colony, meta = {}) {
  const est = colony?.beeEstimate;
  const swarmScore = colony?.swarmRiskScore ?? 0;
  const weightKg = reading?.weightKg ?? 0;

  let swarmTahminGun = null;
  if (swarmScore >= SWARM.RISK_CRITICAL) swarmTahminGun = 3;
  else if (swarmScore >= SWARM.RISK_ELEVATED) swarmTahminGun = 7;
  else if (swarmScore >= SWARM.RISK_WATCH) swarmTahminGun = 14;

  if (colony?.scoresDeep?.swarm?.tahminGun) {
    swarmTahminGun = colony.scoresDeep.swarm.tahminGun;
  }

  let beslemeGun = colony?.sensors?.weight?.feedingDaysEstimate ?? null;
  if (beslemeGun == null && weightKg > 0 && weightKg < FEEDING.WEIGHT_KG) {
    beslemeGun = Math.max(0, Math.round((weightKg - 8) / 0.15));
  }

  const battery = reading?.battery ?? 100;
  const pilGun = Math.round(battery * CONNECTIVITY.BATTERY_DAYS_PER_PCT);

  const meanWeight = seriesMean(history, "weightKg");
  const meanOut = seriesMean(history, "beeOut");
  let anomaliSkor = 0;
  const anomali = [];
  if (meanWeight != null && reading?.weightKg > 0) {
    const d = Math.abs(reading.weightKg - meanWeight);
    if (d > 2) {
      anomaliSkor += 25;
      anomali.push(`Tartı ortalamadan ${d.toFixed(1)} kg sapma`);
    }
  }
  if (meanOut != null && reading?.beeOut != null) {
    const d = Math.abs(reading.beeOut - meanOut);
    if (d > meanOut * 0.5 && d > 200) {
      anomaliSkor += 20;
      anomali.push(`IR çıkış ortalamadan ${Math.round(d)} sapma`);
    }
  }
  if (reading?.tempC != null) {
    const meanT = seriesMean(history, "tempC");
    if (meanT != null && Math.abs(reading.tempC - meanT) > 2) {
      anomaliSkor += 15;
      anomali.push("Sıcaklık baseline sapması");
    }
  }

  const metaBonus = colony?.metaInsights?.riskBonus ?? 0;
  if (metaBonus > 0) anomali.push(`Kayıt riski +${metaBonus} puan`);

  let ariciya = "";
  if (swarmTahminGun) ariciya += `Oğul penceresi ~${swarmTahminGun} gün. `;
  if (beslemeGun != null && beslemeGun < 14) ariciya += `Stok ~${beslemeGun} gün. `;
  if (pilGun < 10) ariciya += `Pil ~${pilGun} gün. `;
  if (anomaliSkor >= 30) ariciya += "Baseline sapması var.";
  if (!ariciya) ariciya = "Tahmin: rutin izleme yeterli";

  return {
    swarmTahminGun,
    beslemeGunKalan: beslemeGun,
    pilGunKalan: pilGun,
    anomaliSkor: Math.min(100, anomaliSkor),
    anomali,
    ariciya: ariciya.trim(),
  };
}

module.exports = { analyzePredictive };
