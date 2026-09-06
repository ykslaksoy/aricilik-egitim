/**
 * Tüm sensör analizlerini birleştirip tek kovan hikâyesi + yapılacaklar üretir.
 */

const { SCORE, SWARM } = require("../../../../packages/shared/constants");
const { CRITICAL_FAULTS } = require("./sensorHealth");

function fuseHiveNarrative(reading, colony, meta, weather, ctx = {}) {
  if (!reading || !colony) {
    return { ozet: "Veri yok", mod: "off" };
  }

  const sensors = colony.sensors || {};
  const pairs = sensors.pairs || { pairs: [], celiskiler: [] };
  const yapilacaklar = [];
  const kanitlar = [];
  const celiskiler = [...(pairs.celiskiler || [])];

  function addTask(oncelik, ne, kaynak) {
    yapilacaklar.push({ oncelik, ne, kaynak });
  }

  for (const o of colony.temperature?.oneriler || []) {
    addTask(2, o, "sicaklik");
  }
  for (const o of colony.humidity?.oneriler || []) {
    addTask(2, o, "nem");
  }
  for (const key of ["ir", "weight", "audio", "vibration", "connectivity", "corner"]) {
    for (const o of sensors[key]?.oneriler || []) {
      addTask(3, o, key);
    }
  }
  for (const p of pairs.pairs || []) {
    if (p.oncelik <= 2) addTask(p.oncelik, p.yorum, p.id);
    kanitlar.push({ kaynak: p.label, metin: p.yorum });
  }
  for (const g of ctx.entranceGate?.yapilacaklar || []) {
    addTask(g.oncelik ?? 3, g.ne, "kapi");
  }
  for (const o of ctx.hiveCamera?.oneriler || []) {
    addTask(3, o, "kamera");
  }
  for (const c of colony.care || []) {
    addTask(4, c, "koloni");
  }

  if (colony.temperature?.ariciya) {
    kanitlar.push({ kaynak: "Sıcaklık", metin: colony.temperature.ariciya });
  }
  if (colony.humidity?.ariciya) {
    kanitlar.push({ kaynak: "Nem", metin: colony.humidity.ariciya });
  }
  if (sensors.ir?.ariciya) {
    kanitlar.push({ kaynak: "IR", metin: sensors.ir.ariciya });
  }
  if (sensors.weight?.ariciya) {
    kanitlar.push({ kaynak: "Tartı", metin: sensors.weight.ariciya });
  }
  if (ctx.entranceGate?.ariciya) {
    kanitlar.push({ kaynak: "Kapı", metin: ctx.entranceGate.ariciya });
  }

  yapilacaklar.sort((a, b) => a.oncelik - b.oncelik);
  const seen = new Set();
  const uniqueTasks = yapilacaklar.filter((t) => {
    const k = t.ne.slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const parts = [];
  const ev = ctx.evaluation;
  if (ev?.ozet && ev.ozet !== "Dengeli") parts.push(ev.ozet);
  else {
    if ((colony.swarmRiskScore ?? 0) >= SWARM.RISK_CRITICAL) {
      parts.push("Oğul riski acil");
    } else if (colony.healthScore < SCORE.HEALTH_CRITICAL) {
      parts.push("Sağlık kritik");
    } else if (pairs.pairs?.[0]) {
      parts.push(pairs.pairs[0].yorum);
    } else if (colony.temperature?.zone !== "ideal") {
      parts.push(colony.temperature?.tempLabel || "Sıcaklık dikkat");
    } else {
      parts.push("Kovan dengeli — rutin izleme");
    }
  }

  if (celiskiler.length) {
    parts.push(`(${celiskiler.length} çelişki — dikkat)`);
  }
  if (sensors.ir?.rainMasked) {
    parts.push("Yağmur trafiği maskeliyor");
  }

  const health = ctx.sensorHealth || colony.sensorHealth;
  if (health?.mode === "degraded") {
    parts.unshift(health.ariciya || "Kısmi sensör modu");
  } else if (health?.mode === "critical") {
    parts.unshift("Kritik sensör arızası — sınırlı izleme");
  }

  let guven = "orta";
  if (colony.calibrated && sensors.ir?.samples > 10 && health?.mode !== "degraded") guven = "yuksek";
  if (health?.mode === "degraded") guven = "orta";
  if (health?.mode === "critical" || sensors.connectivity?.profile === "offline") guven = "dusuk";
  if (reading.fault && health?.mode !== "degraded") {
    if ([...(health?.faults || [reading.fault])].some((f) => CRITICAL_FAULTS.has(f))) {
      guven = "dusuk";
    }
  }

  const oncelikliKonu =
    uniqueTasks[0]?.kaynak ||
    pairs.pairs?.[0]?.id ||
    (ev?.oneCikan?.[0]?.alan ?? "rutin");

  return {
    mod: "calisiyor",
    ozet: parts.join(". "),
    ariciya: parts[0] + (uniqueTasks[0] ? ` → ${uniqueTasks[0].ne}` : ""),
    guven,
    oncelikliKonu,
    kanitlar: kanitlar.slice(0, 8),
    celiskiler: celiskiler.slice(0, 5),
    yapilacaklar: uniqueTasks.slice(0, 8),
    yapilacakOzet: uniqueTasks[0]?.ne || "Rutin kontrol yeterli",
    sensorOzeti: {
      sicaklik: colony.temperature?.zone,
      nem: colony.humidity?.zone,
      ir: sensors.ir?.profile,
      tarti: sensors.weight?.profile,
      ses: sensors.audio?.profile,
      titresim: sensors.vibration?.profile,
      baglanti: sensors.connectivity?.profile,
      kose: sensors.corner?.profile,
      mod: health?.mode || "full",
    },
    evaluatedAt: reading.ts || new Date().toISOString(),
  };
}

module.exports = {
  fuseHiveNarrative,
};
