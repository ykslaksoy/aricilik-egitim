/**
 * Ana kaybı / queenless — 24–48 saat füzyon (akustik + trafik + meta + geçmiş).
 */

const { SENSOR } = require("../../../../packages/shared/constants");
const { isQueenlessSuspect } = require("../hiveState");

function queenlessHistory(history) {
  const recent = (history || []).slice(-48);
  let suspectHours = 0;
  for (const r of recent) {
    const audio = r.audioRms ?? 0;
    const lowTraffic = (r.beeOut ?? 999) < 150 && (r.beeIn ?? 999) < 120;
    if (audio >= SENSOR.QUEENLESS_AUDIO_MIN && lowTraffic) suspectHours += 0.25;
  }
  return { suspectHours: Math.round(suspectHours * 10) / 10, samples: recent.length };
}

function analyzeQueenlessFusion(history, reading, colony, meta = {}, acousticMl = null) {
  const suspect = isQueenlessSuspect(reading, colony, meta);
  const hist = queenlessHistory(history);
  const acousticHit =
    acousticMl?.baskin?.key === "queenless" && (acousticMl.baskin.skor ?? 0) >= 40;

  let skor = 0;
  const sinyaller = [];
  const kanit = [];

  if (suspect) {
    skor += 35;
    sinyaller.push("Ses/trafik/ana kaydı uyumsuz");
    kanit.push("hive_state");
  }
  if (acousticHit) {
    skor += 25 + (acousticMl.baskin.skor - 40) * 0.4;
    sinyaller.push(`Akustik ana kaybı (%${acousticMl.baskin.skor})`);
    kanit.push("acoustic_ml");
  }
  if (hist.suspectHours >= 6) {
    skor += Math.min(25, hist.suspectHours * 2);
    sinyaller.push(`${hist.suspectHours} saat queenless profili`);
    kanit.push("history_24_48h");
  }
  if (meta.anaDurum === "yok" || meta.queenless) {
    skor += 20;
    sinyaller.push("Meta: ana yok / şüpheli");
    kanit.push("meta");
  }

  skor = Math.min(100, Math.round(skor));
  let guven = "dusuk";
  if (skor >= 70) guven = "yuksek";
  else if (skor >= 45) guven = "orta";

  let pencere = "24h";
  if (hist.suspectHours >= 12) pencere = "48h";

  return {
    mod: "calisiyor",
    queenlessSkoru: skor,
    guven,
    pencere,
    suspect,
    suspectHours: hist.suspectHours,
    kanit,
    sinyaller: sinyaller.slice(0, 4),
    oneriler:
      skor >= 45
        ? ["Açık yavru tablası kontrol.", "Yeni ana veya ana hücresi planla."]
        : [],
    ariciya:
      skor < 45
        ? "Ana kaybı belirtisi düşük"
        : `Ana kaybı ${guven} güven (${skor}/100 · ${pencere}) — ${sinyaller[0] || ""}`,
  };
}

module.exports = { analyzeQueenlessFusion, queenlessHistory };
