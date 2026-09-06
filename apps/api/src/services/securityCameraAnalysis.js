/**
 * Kamera tabanlı güvenlik / hırsızlık analizi.
 * GPS yerine: arılık + kovan kamerası hareket, gece profili, titreşim çapraz doğrulama.
 */

const { SENSOR, RISK } = require("../../../../packages/shared/constants");

const GECE_BAS = 22;
const GECE_BITIS = 5;

function localHour(ts) {
  const d = new Date(ts || Date.now());
  return (d.getUTCHours() + 3 + 24) % 24;
}

function isNight(ts) {
  const h = localHour(ts);
  return h >= GECE_BAS || h < GECE_BITIS;
}

function motionScore(hiveCamera, apiaryCamera) {
  const hiveMotion = hiveCamera?.cv?.motionEnergy ?? 0;
  const apiaryMotion = apiaryCamera?.analiz?.motionScore ?? 0;
  return Math.max(hiveMotion / 40, apiaryMotion);
}

/**
 * @param {object} reading
 * @param {object|null} colony
 * @param {object} meta
 * @param {object} weather
 * @param {object|null} hiveCamera
 * @param {object|null} apiaryCamera
 */
function analyzeSecurityCameras(reading, colony, meta = {}, weather = {}, hiveCamera = null, apiaryCamera = null) {
  const hasHiveCam = Boolean(hiveCamera?.present && hiveCamera?.mod === "live");
  const apiaryMod = apiaryCamera?.mod;
  const hasApiaryCam = apiaryMod === "live" || apiaryMod === "degraded";
  const hasApiaryLive = apiaryMod === "live";

  if (!hasHiveCam && !hasApiaryCam) {
    return {
      mod: "calisiyor",
      method: "vibration_scale_v1",
      ariciya: "Ana/kovan kamerası yok veya arızalı — titreşim + tartı ile koruma",
      seviye: "sinirli",
      uyari: false,
      kameralar: { kovan: false, arilik: false },
    };
  }

  const night = isNight(reading?.ts);
  const beeOut = reading?.beeOut ?? 0;
  const beeIn = reading?.beeIn ?? 0;
  const traffic = beeIn + beeOut;
  const vib = reading?.vibration ?? 0;
  const motion = motionScore(hiveCamera, apiaryCamera);
  const imbalance =
    Array.isArray(reading?.cornerKg) && reading.cornerKg.length === 4
      ? Math.max(...reading.cornerKg) - Math.min(...reading.cornerKg)
      : 0;

  const sinyaller = [];
  const oneriler = [];
  let skor = 0;

  if (night && traffic < 40 && motion >= 25) {
    skor += 35;
    sinyaller.push("Gece — düşük arı trafiği ama kamera hareketi");
  }
  if (night && vib >= RISK.ROBBING_VIBRATION_MIN) {
    skor += 25;
    sinyaller.push(`Gece titreşim ${vib} — darbe veya müdahale`);
  }
  if (vib >= SENSOR.VIBRATION_HIGH) {
    skor += 20;
    sinyaller.push("Yüksek titreşim — kovan sarsıntısı");
  }
  if (imbalance >= SENSOR.CORNER_IMBALANCE_KG) {
    skor += 15;
    sinyaller.push(`Platform dengesizliği ${imbalance.toFixed(1)} kg`);
  }
  if (meta.hirsizlikSuphesi) {
    skor += 30;
    sinyaller.push("Kayıtta hırsızlık şüphesi");
  }
  if (meta.fizikselHasar) {
    skor += 25;
    sinyaller.push("Fiziksel hasar bayrağı");
  }
  if (hasApiaryCam && apiaryCamera?.analiz?.guvenlik?.hareket) {
    skor += 20;
    sinyaller.push(apiaryCamera.analiz.guvenlik.not || "Arılık kamerası hareket");
  } else if (apiaryMod === "degraded") {
    sinyaller.push("Ana kamera arızalı — kovan kamerası + titreşim yedek");
  }

  let sinif = "normal";
  if (skor >= 55) sinif = "intrusion";
  else if (skor >= 30) sinif = "suphe";

  const alerts = [];
  if (sinif === "intrusion") {
    alerts.push({
      kind: "theft_intrusion",
      level: "critical",
      title: "Hırsızlık / müdahale şüphesi — kamera + sensör",
    });
    oneriler.push("Son kareyi aç; arılığa git veya komşuya haber ver.");
    oneriler.push("Polis / jandarma için snapshot URL kaydet.");
  } else if (sinif === "suphe") {
    alerts.push({
      kind: "theft_watch",
      level: "elevated",
      title: "Gece hareketi — izle",
    });
    oneriler.push("Canlı görüntüyü kontrol et; hayvan mı insan mı ayır.");
  }

  let ariciya = "Güvenlik normal — anormal gece hareketi yok";
  if (sinif === "intrusion") {
    ariciya = `KRİTİK: Kamera + sensör hırsızlık/müdahale imzası (skor ${skor})`;
  } else if (sinif === "suphe") {
    ariciya = `Şüpheli hareket (skor ${skor})${night ? " · gece" : ""}`;
  } else if (hasHiveCam || hasApiaryCam) {
    const yedek = !hasApiaryLive && apiaryMod === "degraded" ? " (ana kamera arızalı)" : "";
    ariciya = `Kamera güvenliği aktif${yedek}${night ? " · gece modu" : ""} — olay yok`;
  }

  return {
    mod: "calisiyor",
    method: "camera_motion_fusion_v1",
    seviye: sinif,
    skor: Math.min(100, skor),
    geceModu: night,
    kameralar: {
      kovan: hasHiveCam,
      arilik: hasApiaryLive,
      arilikDegraded: apiaryMod === "degraded",
    },
    motion,
    traffic,
    vib,
    sinifLabel:
      sinif === "intrusion"
        ? "Müdahale şüphesi"
        : sinif === "suphe"
          ? "İzle"
          : "Normal",
    sinyaller: sinyaller.slice(0, 5),
    alerts,
    oneriler: oneriler.slice(0, 3),
    snapshotUrl: apiaryCamera?.snapshotUrl || hiveCamera?.snapshotUrl || null,
    uyari: sinif !== "normal",
    ariciya,
  };
}

module.exports = { analyzeSecurityCameras, isNight, localHour };
