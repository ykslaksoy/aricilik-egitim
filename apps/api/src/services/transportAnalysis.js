/**
 * Taşıma / yerleşme analizi.
 */

const { SCORE, SENSOR } = require("../../../../packages/shared/constants");

function analyzeTransport(reading, colony, meta = {}, weather = {}) {
  const active = Boolean(reading?.transportMode || meta.transportMode);
  const traffic = colony?.middayTraffic || { beeOut: 0, samples: 0 };

  if (!active && !meta.sonTasimaAt) {
    return {
      mod: "sabit",
      yerlesmeSkoru: null,
      ariciya: "Kovan sabit konumda",
      oneriler: [],
    };
  }

  let yerlesmeSkoru = 50;
  const oneriler = [];
  const nedenler = [];

  if (active) {
    nedenler.push("Taşıma modu aktif — oğul/trafik alarmları bastırılmış");
    oneriler.push("Varışta taşımayı bitir; 1 saat sonra sensörleri kontrol et.");
    yerlesmeSkoru = null;
    return {
      mod: "tasimada",
      yerlesmeSkoru,
      nedenler,
      oneriler,
      ariciya: "Taşımada — titreşim ve sabitleme izle",
    };
  }

  if (traffic.samples > 0 && traffic.beeOut >= SCORE.TRAFFIC_WEAK) {
    yerlesmeSkoru += 25;
    nedenler.push("Trafik normale dönüyor");
  }
  if (
    reading?.tempC >= SENSOR.TEMP_IDEAL_MIN_C &&
    reading?.tempC <= SENSOR.TEMP_IDEAL_MAX_C
  ) {
    yerlesmeSkoru += 15;
    nedenler.push("İç ısı oturdu");
  }
  if (reading?.vibration < SENSOR.VIBRATION_HIGH) {
    yerlesmeSkoru += 10;
  } else {
    oneriler.push("Hâlâ yüksek titreşim — sabitlemeyi kontrol et.");
    yerlesmeSkoru -= 15;
  }

  // v2 — tartı stabilitesi + taşıma sonrası süre
  if (meta.sonTasimaAt) {
    const hoursSince =
      (Date.now() - new Date(meta.sonTasimaAt).getTime()) / (3600 * 1000);
    if (hoursSince >= 24 && hoursSince <= 72) {
      yerlesmeSkoru += 8;
      nedenler.push("24–72 saat yerleşme penceresi");
    }
    if (hoursSince > 72 && yerlesmeSkoru >= 65) {
      yerlesmeSkoru += 5;
      nedenler.push("Yerleşme süresi yeterli");
    }
  }
  if (reading?.weightKg != null && meta.weightAtArrival != null) {
    const drift = Math.abs(reading.weightKg - meta.weightAtArrival);
    if (drift <= 0.5) {
      yerlesmeSkoru += 7;
      nedenler.push("Tartı stabil");
    }
  }

  yerlesmeSkoru = Math.max(0, Math.min(100, yerlesmeSkoru));

  return {
    mod: "yerlesme",
    yerlesmeSkoru,
    nedenler: nedenler.slice(0, 3),
    oneriler: oneriler.slice(0, 2),
    ariciya:
      yerlesmeSkoru >= 70
        ? `Yerleşme iyi (${yerlesmeSkoru}/100)`
        : `Yerleşme devam ediyor (${yerlesmeSkoru}/100)`,
  };
}

module.exports = { analyzeTransport };
