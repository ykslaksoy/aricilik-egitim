/**
 * Pollination / tarla ROI — kovan gücü × trafik × kontrat.
 */

const { SCORE, POLLINATION } = require("../../../../packages/shared/constants");

function hiveContribution(reading, colony) {
  const score = colony?.score ?? 0;
  const bees = colony?.beeEstimate ?? 0;
  const out = reading?.beeOut ?? 0;
  const trafficScore = Math.min(100, Math.round((out / SCORE.TRAFFIC_GOOD) * 50));
  const strengthScore = Math.min(100, Math.round((score / 100) * 40 + (bees / SCORE.BEE_STRONG) * 30));
  return Math.round(trafficScore * 0.45 + strengthScore * 0.55);
}

/**
 * Kovan bazında pollination katkısı.
 */
function analyzePollinationRoi(reading, colony, meta = {}, weather = {}) {
  const contract = meta.pollination || null;
  if (!contract?.aktif) {
    return {
      mod: "off",
      ariciya: "Pollination kontratı yok",
      katkiSkoru: null,
    };
  }

  const katki = hiveContribution(reading, colony);
  const hedef = contract.hedefSkorPerHive ?? POLLINATION.TARGET_SCORE_PER_HIVE;
  const oran = hedef > 0 ? Math.round((katki / hedef) * 100) : 0;

  let durum = "yeterli";
  if (oran < POLLINATION.UNDERPERFORM_PCT) durum = "dusuk";
  else if (oran >= POLLINATION.OVERPERFORM_PCT) durum = "guclu";

  const gunlukTahmini = contract.ucretPerHiveGun ?? 0;
  const katkiPayi = Math.round((katki / 100) * gunlukTahmini * 100) / 100;

  const oneriler = [];
  if (durum === "dusuk") {
    oneriler.push("Trafik düşük — konum / besleme / ana kontrolü.");
  }
  if (weather?.condition === "yagmur" && katki < hedef * 0.7) {
    oneriler.push("Yağmur trafiği düşürdü — ROI günü uzatmayı kontratla görüş.");
  }

  return {
    mod: "calisiyor",
    kontrat: {
      urun: contract.urun,
      hektar: contract.hektar,
      bitis: contract.bitisAt,
    },
    katkiSkoru: katki,
    hedefSkor: hedef,
    performansPct: oran,
    durum,
    gunlukKatkiTl: katkiPayi,
    oneriler: oneriler.slice(0, 2),
    ariciya: `${contract.urun || "Tarla"} — katkı %${oran} (${durum})`,
  };
}

/**
 * Arılık geneli ROI özeti.
 */
function analyzeApiaryPollination(konumId, konumEtiket, hiveEntries, weather = {}) {
  const entries = hiveEntries || [];
  const withContract = entries.filter((h) => h.meta?.pollination?.aktif);
  if (!withContract.length) {
    return { present: false, konumId, ariciya: "Bu arılıkta pollination kontratı yok" };
  }

  const contract = withContract[0].meta.pollination;
  const contributions = withContract.map((h) => ({
    hiveId: h.reading.hiveId,
    ...analyzePollinationRoi(h.reading, h.colony, h.meta, weather),
  }));

  const avgPct =
    contributions.reduce((s, c) => s + (c.performansPct ?? 0), 0) / contributions.length;
  const kovanSayisi = withContract.length;
  const hektar = contract.hektar ?? 1;
  const kovanPerHa = hektar > 0 ? Math.round((kovanSayisi / hektar) * 10) / 10 : kovanSayisi;
  const toplamGunluk = contributions.reduce((s, c) => s + (c.gunlukKatkiTl ?? 0), 0);
  const kontratToplam = (contract.ucretPerHiveGun ?? 0) * kovanSayisi;
  const roiPct = kontratToplam > 0 ? Math.round((toplamGunluk / kontratToplam) * 100) : 0;

  const dusukler = contributions.filter((c) => c.durum === "dusuk").map((c) => c.hiveId);

  return {
    present: true,
    mod: "calisiyor",
    konumId,
    konumEtiket,
    urun: contract.urun,
    hektar,
    kovanSayisi,
    kovanPerHa,
    ortalamaPerformansPct: Math.round(avgPct),
    roiPct,
    gunlukGelirTl: Math.round(toplamGunluk * 100) / 100,
    dusukKovanlar: dusukler,
    ariciya: `${contract.urun}: ${kovanSayisi} kovan / ${hektar} ha · ROI %${roiPct}${dusukler.length ? ` · zayıf #${dusukler.join(", #")}` : ""}`,
  };
}

module.exports = { analyzePollinationRoi, analyzeApiaryPollination, hiveContribution };
