/**
 * Muayene / ilaç günlüğü analizi — kayıt boşlukları, tedavi aralığı.
 */

const { RISK, INSPECTION } = require("../../../../packages/shared/constants");

function daysSince(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

function parseEntries(meta) {
  const raw = meta.muayeneGunlugu || meta.muayeneKayitlari || [];
  return (Array.isArray(raw) ? raw : [])
    .map((e) => ({
      tarih: e.tarih || e.date || e.at,
      tip: e.tip || e.type || "muayene",
      not: e.not || e.note || "",
      ilac: e.ilac || e.treatment || null,
    }))
    .filter((e) => e.tarih)
    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
}

/**
 * @param {object|null} colony
 * @param {object} meta
 */
function analyzeInspectionJournal(colony, meta = {}) {
  const entries = parseEntries(meta);
  const sonMuayene = entries.find((e) => e.tip === "muayene") || entries[0];
  const sonMuayeneGun = sonMuayene
    ? daysSince(sonMuayene.tarih)
    : daysSince(meta.sonMuayeneAt);

  const ilacKayitlari = (meta.ilacGecmisi || [])
    .concat(entries.filter((e) => e.ilac).map((e) => ({ ilac: e.ilac, tarih: e.tarih })))
    .filter((e) => e.ilac && e.tarih)
    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  const sonVarroa = ilacKayitlari.find((e) =>
    /varroa|amitraz|oksalik|formik/i.test(String(e.ilac))
  );
  const sonVarroaGun = sonVarroa ? daysSince(sonVarroa.tarih) : null;

  const sinyaller = [];
  const oneriler = [];
  let riskSkoru = 0;

  if (sonMuayeneGun == null) {
    sinyaller.push("Muayene kaydı yok");
    riskSkoru += 20;
    oneriler.push("İlk muayene kaydını gir.");
  } else if (sonMuayeneGun >= RISK.INSPECTION_DAYS_CRITICAL) {
    sinyaller.push(`${sonMuayeneGun} gündür muayene yok — kritik`);
    riskSkoru += 25;
    oneriler.push("Acil yerinde muayene.");
  } else if (sonMuayeneGun >= RISK.INSPECTION_DAYS_WARN) {
    sinyaller.push(`${sonMuayeneGun} gündür muayene yok`);
    riskSkoru += 12;
    oneriler.push("Muayene planla.");
  }

  if (
    sonVarroaGun == null ||
    sonVarroaGun >= INSPECTION.VARROA_TREATMENT_MAX_DAYS
  ) {
    sinyaller.push(
      sonVarroaGun == null
        ? "Varroa ilacı kaydı yok"
        : `Son Varroa ilacı ${sonVarroaGun} gün önce`
    );
    riskSkoru += 15;
    oneriler.push("Varroa sayımı / ilaç takvimi kontrol et.");
  }

  if ((colony?.diseaseRiskScore ?? 0) >= 45 && sonMuayeneGun != null && sonMuayeneGun > 14) {
    sinyaller.push("Hastalık riski yüksek ama yakın muayene yok");
    riskSkoru += 10;
  }

  const kayitSayisi = entries.length;
  let durum = "guncel";
  if (riskSkoru >= 30) durum = "kritik";
  else if (riskSkoru >= 15) durum = "gecikmis";

  let ariciya = "Muayene kayıtları güncel";
  if (sonMuayeneGun != null) {
    ariciya = `Son muayene ${sonMuayeneGun} gün önce`;
    if (durum !== "guncel") ariciya += ` — ${durum}`;
  } else {
    ariciya = "Muayene günlüğü eksik";
  }
  if (sonVarroaGun != null && sonVarroaGun >= INSPECTION.VARROA_TREATMENT_MAX_DAYS) {
    ariciya += ` · Varroa ilacı ${sonVarroaGun} gün`;
  }

  return {
    mod: "calisiyor",
    kayitSayisi,
    sonMuayeneGun,
    sonVarroaGun,
    sonKayit: sonMuayene
      ? { tarih: sonMuayene.tarih, tip: sonMuayene.tip, not: sonMuayene.not?.slice(0, 80) }
      : null,
    durum,
    riskSkoru: Math.min(100, riskSkoru),
    sinyaller: sinyaller.slice(0, 4),
    oneriler: [...new Set(oneriler)].slice(0, 3),
    ariciya,
  };
}

module.exports = { analyzeInspectionJournal, parseEntries };
