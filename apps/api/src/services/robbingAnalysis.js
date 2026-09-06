/**
 * Yağma (robbing) tespiti — akustik + titreşim + trafik + arılık füzyonu.
 */

const { SENSOR, RISK } = require("../../../../packages/shared/constants");

function analyzeRobbing(history, reading, colony, meta = {}, acousticMl = null) {
  const audio = reading?.audioRms ?? 0;
  const vib = reading?.vibration ?? 0;
  const traffic = colony?.middayTraffic || { beeIn: 0, beeOut: 0 };
  const inOut = traffic.beeIn + traffic.beeOut > 0 ? traffic.beeIn / Math.max(traffic.beeOut, 1) : 1;

  let skor = 0;
  const sinyaller = [];
  const kanit = [];

  if (acousticMl?.baskin?.key === "robbing" && (acousticMl.baskin.skor ?? 0) >= 35) {
    skor += 35 + (acousticMl.baskin.skor - 35) * 0.5;
    sinyaller.push(`Akustik yağma sınıfı (%${acousticMl.baskin.skor})`);
    kanit.push("akustik_ml");
  }

  if (vib >= RISK.ROBBING_VIBRATION_MIN && audio >= 0.45) {
    skor += 22;
    sinyaller.push("Yüksek titreşim + agresif ses");
    kanit.push("vibration+audio");
  }

  if (inOut > 1.4 && audio >= SENSOR.AUDIO_HIGH) {
    skor += 18;
    sinyaller.push("Giriş trafiği giriş > çıkış (kavga)");
    kanit.push("ir_ratio");
  }

  if (meta.yagmacilikSuphesi || meta.robbingSuspect) {
    skor += 15;
    sinyaller.push("Saha yağma şüphesi kaydı");
    kanit.push("meta");
  }

  if ((colony?.weightDrop6hKg ?? 0) <= RISK.ROBBING_WEIGHT_DROP_KG && audio >= 0.5) {
    skor += 12;
    sinyaller.push("Tartı düşüşü + kavga sesi");
    kanit.push("weight+audio");
  }

  skor = Math.min(100, Math.round(skor));
  let durum = "yok";
  if (skor >= 65) durum = "aktif";
  else if (skor >= 40) durum = "suphe";

  const oneriler = [];
  if (durum !== "yok") {
    oneriler.push("Giriş daralt / kovan taşı.");
    oneriler.push("Komşu kovanları ve açık bal kaynaklarını kontrol et.");
  }

  return {
    mod: "calisiyor",
    robbingSkoru: skor,
    durum,
    kanit,
    inOutRatio: Math.round(inOut * 100) / 100,
    sinyaller: sinyaller.slice(0, 4),
    oneriler: oneriler.slice(0, 2),
    ariciya:
      durum === "yok"
        ? "Yağma belirtisi yok"
        : `Yağma ${durum} (${skor}/100) — ${sinyaller[0] || ""}`,
  };
}

module.exports = { analyzeRobbing };
