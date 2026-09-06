/**
 * Varroa / hastalık tahmini — sensör proxy + günlük + akustik füzyon.
 */

const { DISEASE, INSPECTION } = require("../../../../packages/shared/constants");

function daysSince(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

function analyzeVarroaRisk(colony, meta = {}, inspectionJournal = null, acousticMl = null) {
  let skor = colony?.diseaseRiskScore ?? 0;
  const sinyaller = [...(colony?.diseaseSignals || [])];
  const kanit = ["colony_proxy"];

  const sonVarroaGun = inspectionJournal?.sonVarroaGun;
  if (sonVarroaGun == null || sonVarroaGun >= INSPECTION.VARROA_TREATMENT_MAX_DAYS) {
    skor += 18;
    sinyaller.push(
      sonVarroaGun == null ? "Varroa ilacı kaydı yok" : `Son ilaç ${sonVarroaGun} gün önce`
    );
    kanit.push("journal_gap");
  }

  if ((colony?.healthScore ?? 100) < 55 && (colony?.middayTraffic?.beeOut ?? 999) < 200) {
    skor += 12;
    sinyaller.push("Zayıf sağlık + düşük trafik");
    kanit.push("health+traffic");
  }

  if (acousticMl?.siniflar?.stress >= 40 && acousticMl?.siniflar?.queenless < 30) {
    skor += 8;
    sinyaller.push("Stres sesi (Varroa proxy)");
    kanit.push("acoustic_stress");
  }

  const varroaProxy = colony?.scoresDeep?.disease?.varroaProxy;
  if (varroaProxy != null && varroaProxy >= 50) {
    skor = Math.max(skor, varroaProxy);
    kanit.push("score_deep");
  }

  skor = Math.min(100, Math.round(skor));
  let durum = "dusuk";
  if (skor >= DISEASE.RISK_HIGH) durum = "yuksek";
  else if (skor >= DISEASE.RISK_ELEVATED) durum = "orta";

  const oneriler = [];
  if (durum !== "dusuk") {
    oneriler.push("Alkol yıkama / şeker testi yap.");
    oneriler.push("Varroa tedavi planı güncelle.");
  }

  return {
    mod: "calisiyor",
    varroaSkoru: skor,
    durum,
    kesinTeshis: false,
    kanit: [...new Set(kanit)],
    sinyaller: [...new Set(sinyaller)].slice(0, 4),
    oneriler: oneriler.slice(0, 2),
    sonVarroaGun,
    ariciya:
      durum === "dusuk"
        ? "Varroa riski düşük (proxy — muayene şart)"
        : `Varroa riski ${durum} (${skor}/100) — ${sinyaller[0] || ""}`,
  };
}

module.exports = { analyzeVarroaRisk };
