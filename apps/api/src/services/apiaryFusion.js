/**
 * Arılık fusion — aynı konumdaki tüm kovanların birleşik analizi.
 *
 * Tek kovan `sensorFusion` = bir kovanın hikâyesi.
 * Arılık fusion = arılıktaki 3–100 kovanı birlikte okuyup:
 * - hangi kovan zayıf / güçlü sapma gösteriyor
 * - yağma veya oğul riski arılık genelinde mi
 * - hava + ortalama trafik + ana kamera birlikte ne söylüyor
 */

const { SCORE, SWARM, SENSOR, WEATHER } = require("../../../../packages/shared/constants");

function fuseApiaryNarrative(konumId, konumEtiket, weather, hiveEntries, apiaryCamera = null) {
  const hives = hiveEntries || [];
  if (!hives.length) {
    return { present: false, mod: "off", konumId, ariciya: "Bu konumda kovan yok" };
  }

  const stats = hives.map((h) => ({
    hiveId: h.reading.hiveId,
    label: h.meta?.label,
    score: h.colony?.score ?? 0,
    health: h.colony?.healthScore ?? 0,
    swarm: h.colony?.swarmRiskScore ?? 0,
    beeOut: h.reading?.beeOut ?? 0,
    weightKg: h.reading?.weightKg ?? 0,
    meta: h.meta,
    colony: h.colony,
  }));

  const avgScore = Math.round(stats.reduce((s, x) => s + x.score, 0) / stats.length);
  const avgOut = Math.round(stats.reduce((s, x) => s + x.beeOut, 0) / stats.length);
  const avgSwarm = Math.round(stats.reduce((s, x) => s + x.swarm, 0) / stats.length);

  const zayiflar = stats.filter((x) => x.score < SCORE.COLONY_WEAK || x.health < SCORE.HEALTH_CRITICAL);
  const ogulRisk = stats.filter((x) => x.swarm >= SWARM.RISK_ELEVATED);
  const sapmalar = stats.filter((x) => {
    const outDiff = avgOut > 0 ? Math.abs(x.beeOut - avgOut) / avgOut : 0;
    return outDiff > 0.45 && x.beeOut < avgOut * 0.6;
  });

  const yapilacaklar = [];
  const bulgular = [];
  const celiskiler = [];

  if (ogulRisk.length >= 2) {
    bulgular.push(`${ogulRisk.length} kovanda yüksek oğul riski — arılık geneli baskı altında`);
    yapilacaklar.push({ oncelik: 2, ne: "Arılıkta oğul önleme turu planla", kaynak: "ogul" });
  }
  if (zayiflar.length >= 1 && zayiflar.length < stats.length) {
    bulgular.push(
      `${zayiflar.map((z) => `#${z.hiveId}`).join(", ")} arılık ortalamasının altında`
    );
    yapilacaklar.push({
      oncelik: 2,
      ne: `Zayıf kovanları besle / muayene et (${zayiflar.map((z) => z.hiveId).join(", ")})`,
      kaynak: "zayif",
    });
  }
  if (sapmalar.length >= 1) {
    bulgular.push(
      `Trafik sapması: ${sapmalar.map((s) => `#${s.hiveId}`).join(", ")} — komşu yağması?`
    );
    yapilacaklar.push({
      oncelik: 2,
      ne: "Düşük trafikli kovanları yerinde kontrol et",
      kaynak: "yagma",
    });
  }

  const raining =
    (weather?.precipMm ?? 0) >= WEATHER.PRECIP_MM || weather?.condition === "yagmur";
  if (raining && avgOut < SCORE.TRAFFIC_WEAK) {
    bulgular.push("Yağmur + düşük ortalama trafik — arılık normal");
  } else if (raining && avgOut >= SCORE.TRAFFIC_GOOD) {
    celiskiler.push({
      label: "Yağmur ama trafik yüksek",
      cozum: "Bazı kovanlar korunaklı veya veri gecikmeli — tekrar ölç",
    });
  }

  if (apiaryCamera?.analiz?.guvenlik?.hareket) {
    bulgular.push(apiaryCamera.analiz.guvenlik.not);
    yapilacaklar.push({ oncelik: 1, ne: "Arılığı gözle kontrol et", kaynak: "kamera" });
  }

  if (weather?.windKmh >= WEATHER.STORM_WIND_KMH) {
    yapilacaklar.push({ oncelik: 2, ne: "Fırtına — kovan sabitlemesi", kaynak: "hava" });
  }

  yapilacaklar.sort((a, b) => a.oncelik - b.oncelik);

  let ariciya = `${konumEtiket || konumId}: ${stats.length} kovan · ort. skor ${avgScore} · ort. çıkış ${avgOut}`;
  if (bulgular[0]) ariciya += `. ${bulgular[0]}`;
  else ariciya += ". Arılık dengeli görünüyor";

  return {
    present: true,
    mod: "calisiyor",
    kind: "apiary_fusion",
    konumId,
    konumEtiket: konumEtiket || konumId,
    kovanSayisi: stats.length,
    ortalama: { skor: avgScore, irOut: avgOut, ogulRisk: avgSwarm },
    zayifKovanlar: zayiflar.map((z) => z.hiveId),
    ogulRiskKovanlar: ogulRisk.map((z) => z.hiveId),
    sapmaKovanlar: sapmalar.map((s) => s.hiveId),
    bulgular: bulgular.slice(0, 5),
    celiskiler: celiskiler.slice(0, 3),
    yapilacaklar: yapilacaklar.slice(0, 6),
    yapilacakOzet: yapilacaklar[0]?.ne || "Rutin arılık turu yeterli",
    ariciya,
    apiaryCamera: apiaryCamera?.present ? { konumEtiket: apiaryCamera.konumEtiket } : null,
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = { fuseApiaryNarrative };
