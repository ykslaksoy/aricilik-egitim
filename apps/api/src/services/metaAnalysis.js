/**
 * Kovan kaydı / meta tabanlı derin analiz.
 */

const { RISK, SCORE, SWARM } = require("../../../../packages/shared/constants");

function daysSince(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

function analyzeMetaInsights(reading, colony, meta = {}) {
  const signals = [];
  const oneriler = [];
  let riskBonus = 0;

  const anaYas = meta.anaYasAy;
  if (anaYas != null) {
    if (anaYas >= 24) {
      signals.push(`Ana ${anaYas} ay — yaşlı ana, oğul eğilimi artar`);
      riskBonus += 8;
      oneriler.push("Ana gençleştirme planı değerlendir.");
    } else if (anaYas <= 6) {
      signals.push(`Ana ${anaYas} ay — genç ana, büyüme potansiyeli`);
    }
  }

  const petekYas = meta.petekYasYil ?? 0;
  if (meta.petekEski || petekYas >= RISK.COMB_AGE_CRITICAL_YEARS) {
    signals.push(`Petek ${petekYas} yıl — hastalık / nem riski`);
    oneriler.push("Eski petekleri değiştir.");
    riskBonus += 10;
  } else if (petekYas >= RISK.COMB_AGE_WARN_YEARS) {
    signals.push(`Petek ${petekYas} yıl — yenileme planla`);
  }

  const muayeneGun = daysSince(meta.sonMuayeneAt);
  if (muayeneGun != null) {
    if (muayeneGun >= RISK.INSPECTION_DAYS_CRITICAL) {
      signals.push(`${muayeneGun} gündür muayene yok — acil`);
      oneriler.push("Yerinde muayene yap.");
      riskBonus += 12;
    } else if (muayeneGun >= RISK.INSPECTION_DAYS_WARN) {
      signals.push(`${muayeneGun} gündür muayene yok`);
      oneriler.push("Muayene planla.");
      riskBonus += 5;
    }
  }

  if (meta.capraz) {
    signals.push(`Genetik: ${meta.capraz}`);
  }

  if (meta.yagmacilikSuphesi) {
    signals.push("Yağmacılık bayrağı — giriş daralt");
    riskBonus += 6;
  }

  let ariciya = signals[0] || "Kayıt verisi yeterli";
  if (muayeneGun != null && muayeneGun >= RISK.INSPECTION_DAYS_WARN) {
    ariciya = `Son muayene ${muayeneGun} gün önce — kontrol gerekli`;
  }

  return {
    anaYasAy: anaYas,
    petekYasYil: petekYas,
    muayeneGunOnce: muayeneGun,
    capraz: meta.capraz,
    riskBonus,
    signals: signals.slice(0, 5),
    oneriler: [...new Set(oneriler)].slice(0, 3),
    ariciya,
  };
}

module.exports = { analyzeMetaInsights };
