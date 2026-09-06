/**
 * Kovan durum değerlendirmesi — sağlık, koloni gücü, arı, oğul, ana, operasyon…
 * Tek giriş: evaluateHiveState(reading, colony, meta)
 */

const {
  SENSOR,
  SWARM,
  SCORE,
  FEEDING,
  DISEASE,
  WEATHER,
  RISK,
  SWARM_DROP_6H_KG,
} = require("../../../packages/shared/constants");
const { CRITICAL_FAULTS, collectFaults } = require("./services/sensorHealth");

function cornerSpread(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length < 4) return 0;
  return Math.max(...cornerKg) - Math.min(...cornerKg);
}

/** @typedef {{ key: string, label: string, seviye: number, ozet?: string, detail?: string, score?: number }} StateSlice */

function seviyeFromScore(score, kritik, dikkat, iyi) {
  if (score < kritik) return 1;
  if (score < dikkat) return 2;
  if (score < iyi) return 3;
  return 4;
}

function evaluateSaglik(colony) {
  const score = colony?.healthScore ?? 0;
  let key = "kritik";
  let label = "Sağlık kritik";
  if (score >= 85) {
    key = "cok_iyi";
    label = "Sağlık çok iyi";
  } else if (score >= 65) {
    key = "iyi";
    label = "Sağlık iyi";
  } else if (score >= SCORE.HEALTH_CRITICAL) {
    key = "dikkat";
    label = "Sağlık dikkat";
  }
  return {
    key,
    label,
    seviye: seviyeFromScore(score, SCORE.HEALTH_CRITICAL, 65, 85),
    score,
    ozet: colony?.healthLabel || label,
  };
}

/** Hastalık riski — sensör proxy (Varroa, nem, trafik, zayıflık) */
function evaluateHastalikRiski(colony) {
  const score = colony?.diseaseRiskScore ?? 0;
  const phase = colony?.diseasePhase || "none";
  const seviyeMap = { high: 1, elevated: 2, watch: 3, none: 5 };
  let key = "dusuk";
  if (phase === "high") key = "yuksek";
  else if (phase === "elevated") key = "artmis";
  else if (phase === "watch") key = "izle";

  return {
    key,
    label: colony?.diseaseRiskLabel || "Hastalık riski düşük",
    seviye: seviyeMap[phase] ?? 5,
    score,
    phase,
    signals: colony?.diseaseSignals || [],
    ozet:
      (colony?.diseaseSignals && colony.diseaseSignals[0]) ||
      colony?.diseaseRiskLabel ||
      "Düşük",
  };
}

/** Koloni skoru — iş gücü / genel performans */
function evaluateKoloni(colony) {
  const score = colony?.score ?? 0;
  let key = "zayif";
  let label = "Koloni zayıf";
  if (score >= 85) {
    key = "mukemmel";
    label = "Koloni mükemmel";
  } else if (score >= 65) {
    key = "iyi";
    label = "Koloni iyi";
  } else if (score >= SCORE.COLONY_WEAK) {
    key = "orta";
    label = "Koloni orta";
  }
  return {
    key,
    label,
    seviye: seviyeFromScore(score, SCORE.COLONY_WEAK, 65, 85),
    score,
    ozet: colony?.scoreLabel || label,
  };
}

/** Koloni gücü — tahmini arı yoğunluğu / iş kapasitesi */
function evaluateKoloniGucu(colony) {
  const key = colony?.strength || "weak";
  const label = colony?.strengthLabel || "Zayıf";
  const seviyeMap = { weak: 1, medium: 3, strong: 4, very_strong: 4 };
  return {
    key,
    label: `Koloni gücü: ${label}`,
    seviye: seviyeMap[key] ?? 3,
    estimate: colony?.beeEstimate ?? null,
    ozet: label,
  };
}

function evaluateAriSayisi(colony) {
  const tier = colony?.beeSwarmTier ?? 0;
  const keys = ["normal", "izle", "artan", "yuksek", "kritik", "maksimum"];
  const labels = [
    "Arı normal",
    "Arı izle (~35k+)",
    "Arı artan (~40k+)",
    "Arı yüksek (~45k+)",
    "Arı kritik (~48k+)",
    "Arı maksimum (~55k+)",
  ];
  const seviyeMap = [5, 4, 3, 2, 1, 1];
  return {
    key: keys[tier] || "normal",
    label: colony?.beeSwarmTierLabel || labels[tier] || "Arı normal",
    seviye: seviyeMap[tier] ?? 5,
    tier,
    estimate: colony?.beeEstimate ?? null,
    estimateMin: colony?.beeEstimateMin ?? null,
    estimateMax: colony?.beeEstimateMax ?? null,
    confidence: colony?.confidence ?? "low",
    ozet: colony?.beeEstimate
      ? `~${Math.round(colony.beeEstimate / 1000)}k arı`
      : "Tahmin yok",
  };
}

function evaluateOgulRiski(colony) {
  if (colony?.swarmPhase === "occurred") {
    return {
      key: "gerceklesti",
      label: "Oğul gerçekleşti",
      seviye: 1,
      score: colony?.swarmRiskScore ?? 100,
      phase: "occurred",
      ozet: "Ani kg düşüşü — ana / oğul kontrol",
    };
  }
  const score = colony?.swarmRiskScore ?? 0;
  let key = "dusuk";
  let label = "Oğul riski düşük";
  let seviye = 5;
  if (score >= SWARM.RISK_CRITICAL) {
    key = "acil";
    label = "Oğul acil";
    seviye = 1;
  } else if (score >= SWARM.RISK_ELEVATED) {
    key = "yuksek";
    label = "Oğul riski yüksek";
    seviye = 2;
  } else if (score >= SWARM.RISK_WATCH) {
    key = "izle";
    label = "Oğul izle";
    seviye = 3;
  }
  return {
    key,
    label,
    seviye,
    score,
    phase: colony?.swarmPhase || "normal",
    ozet: colony?.swarmRiskLabel || label,
    signals: (colony?.swarmSignals || []).slice(0, 2),
  };
}

function evaluateOgulDurumu(colony) {
  const phase = colony?.swarmPhase || "normal";
  if (phase === "occurred") {
    return {
      key: "ayrildi",
      label: "Oğul ayrılmış olabilir",
      seviye: 1,
      occurred: true,
      drop6hKg: colony?.weightDrop6hKg,
      drop24hKg: colony?.weightDrop24hKg,
      ozet: `${colony?.weightDrop6hKg ?? "?"} kg / 6 saat`,
    };
  }
  if (phase === "critical" || (colony?.swarmRiskScore ?? 0) >= SWARM.RISK_CRITICAL) {
    return {
      key: "hemen_mudahale",
      label: "Oğul öncesi — hemen müdahale",
      seviye: 1,
      occurred: false,
      ozet: "Süper / kat / bölme planla",
    };
  }
  if (phase === "elevated" || (colony?.swarmRiskScore ?? 0) >= SWARM.RISK_ELEVATED) {
    return {
      key: "planla",
      label: "Oğul planı gerekli",
      seviye: 2,
      occurred: false,
      ozet: "Bu hafta yer aç",
    };
  }
  if (phase === "watch") {
    return {
      key: "izle",
      label: "Oğul izlemede",
      seviye: 3,
      occurred: false,
      ozet: "Günlük kontrol",
    };
  }
  return {
    key: "yok",
    label: "Oğul yok",
    seviye: 5,
    occurred: false,
    ozet: "Rutin yeterli",
  };
}

function isQueenlessSuspect(reading, colony, meta = {}) {
  return (
    Boolean(meta.queenless) ||
    meta.anaDurum === "supheli" ||
    meta.anaDurum === "yok" ||
    (reading?.audioRms >= SENSOR.QUEENLESS_AUDIO_MIN &&
      colony?.middayTraffic?.beeOut > 0 &&
      colony.middayTraffic.beeIn / Math.max(colony.middayTraffic.beeOut, 1) <
        SENSOR.QUEENLESS_INOUT_RATIO_MAX &&
      (colony?.healthScore ?? 100) < SENSOR.QUEENLESS_HEALTH_MAX)
  );
}

function evaluateAna(reading, colony, meta = {}) {
  const recorded = meta.anaDurum || "var";
  const suspect = isQueenlessSuspect(reading, colony, meta);
  let key = "var";
  let label = "Ana var";
  let seviye = 5;

  if (recorded === "yok" || meta.queenless) {
    key = "yok";
    label = "Ana yok (kayıt)";
    seviye = 1;
  } else if (recorded === "supheli" || suspect) {
    key = "supheli";
    label = "Ana kaybı şüphesi";
    seviye = 1;
  }

  return {
    key,
    label,
    seviye,
    recorded,
    suspect,
    ozet:
      key === "var"
        ? "Profil: ana var"
        : key === "supheli"
          ? "Ses/trafik veya kayıt şüpheli"
          : "Ana kaydı yok",
  };
}

/** Ana × oğul birlikte değerlendirme */
function evaluateAnaOgul(reading, colony, meta, ana, ogulDurumu, ogulRiski) {
  const swarmOccurred = colony?.swarmPhase === "occurred";
  const queenBad = ana.key === "yok" || ana.key === "supheli";
  const swarmUrgent =
    ogulRiski.key === "acil" ||
    ogulDurumu.key === "hemen_mudahale" ||
    ogulDurumu.key === "ayrildi";

  if (swarmOccurred && queenBad) {
    return {
      key: "ogul_sonrasi_ana",
      label: "Oğul + ana şüpheli",
      seviye: 1,
      ozet: "Oğul ayrıldı — yavru ana / birleştirme veya yeni ana",
      detail: "Ana oğulla gitmiş veya koloni ana kaybı yaşıyor olabilir.",
    };
  }
  if (swarmOccurred) {
    return {
      key: "ogul_sonrasi_kontrol",
      label: "Oğul sonrası ana kontrol",
      seviye: 1,
      ozet: "Kalan kolonide ana / yavru ana var mı bak",
      detail: "Oğul ayrıldıktan sonra ana genelde kovanda kalır; yerinde doğrula.",
    };
  }
  if (queenBad && swarmUrgent) {
    return {
      key: "ana_kaybi_ogul_karisik",
      label: "Ana şüpheli + oğul riski",
      seviye: 1,
      ozet: "Önce ana varlığını doğrula; oğul müdahalesini ona göre planla",
      detail: "Panik uğultusu oğul öncesi de olabilir — açmadan karar verme.",
    };
  }
  if (queenBad) {
    return {
      key: "ana_kaybi_acil",
      label: "Ana kaybı — acil",
      seviye: 1,
      ozet: "Ana ver veya yavru ana / çerçeve",
      detail: "Yumurta ve genç larva kontrolü.",
    };
  }
  if (swarmUrgent && ana.key === "var") {
    return {
      key: "ana_var_ogul_onleme",
      label: "Ana var — oğul önleme",
      seviye: 2,
      ozet: "Süper ekle, kat böl veya genişlet",
      detail: "Ana yerinde; kalabalık oğula gider.",
    };
  }
  if (ogulDurumu.key === "planla") {
    return {
      key: "ana_var_ogul_izle",
      label: "Ana var — oğul izle",
      seviye: 3,
      ozet: "Yer açma planı yap",
    };
  }
  return {
    key: "normal",
    label: "Ana ve oğul dengeli",
    seviye: 5,
    ozet: "Rutin bakım",
  };
}

function evaluateYavru(colony) {
  const b = colony?.broodEmergence;
  if (!b?.active) {
    return {
      key: "yok",
      label: "Belirgin yavru çıkışı yok",
      seviye: 5,
      ozet: b?.note?.slice(0, 60) || "—",
    };
  }
  return {
    key: b.phase === "aktif" ? "aktif" : "yavas",
    label: b.phase === "aktif" ? "Yaz yavru çıkışı aktif" : "Yavru çıkışı yavaş",
    seviye: 4,
    emergePerDay: b.emergePerDay,
    ozet: b.emergePerDay
      ? `~${Math.round(b.emergePerDay / 100) / 10}k / gün`
      : "—",
  };
}

/** Nem skoru + trend + arıcı mesajı */
function evaluateNem(reading, colony) {
  const h = colony?.humidity;
  if (!reading || !h) {
    return { key: "bilinmiyor", label: "Nem — veri yok", seviye: 5, ozet: "—" };
  }
  const seviyeMap = {
    kritik_yuksek: 1,
    kritik_dusuk: 1,
    yuksek: 2,
    dusuk: 2,
    kabul: 4,
    ideal: 5,
  };
  return {
    key: h.zone,
    label: `Nem: ${h.humLabel}`,
    seviye: seviyeMap[h.zone] ?? (h.humScore < 50 ? 2 : 4),
    score: h.humScore,
    trend: h.trend,
    trendLabel: h.trendLabel,
    delta6hPct: h.delta6hPct,
    condensationRisk: h.condensationRisk,
    nedenler: h.nedenler,
    oneriler: h.oneriler,
    ozet: h.ariciya,
  };
}

/** Sıcaklık skoru + trend + arıcı mesajı */
function evaluateSicaklik(reading, colony) {
  const t = colony?.temperature;
  if (!reading || !t) {
    return { key: "bilinmiyor", label: "Sıcaklık — veri yok", seviye: 5, ozet: "—" };
  }
  const seviyeMap = {
    kritik_yuksek: 1,
    kritik_dusuk: 1,
    yuksek: 2,
    dusuk: 2,
    kabul: 4,
    ideal: 5,
  };
  return {
    key: t.zone,
    label: `Sıcaklık: ${t.tempLabel}`,
    seviye: seviyeMap[t.zone] ?? (t.tempScore < 50 ? 2 : 4),
    score: t.tempScore,
    trend: t.trend,
    trendLabel: t.trendLabel,
    delta6hC: t.delta6hC,
    delta24hC: t.delta24hC,
    disTempC: t.disTempC,
    nedenler: t.nedenler,
    oneriler: t.oneriler,
    ozet: t.ariciya,
  };
}

function evaluateBesleme(reading, colony) {
  if (!reading || !colony) {
    return { key: "bilinmiyor", label: "Besleme — veri yok", seviye: 5, ozet: "—" };
  }
  const faults = collectFaults(reading);
  if ([...faults].some((f) => CRITICAL_FAULTS.has(f))) {
    return { key: "bilinmiyor", label: "Besleme — veri yok", seviye: 5, ozet: "Bağlantı kesildi" };
  }
  const scaleOk = colony?.sensorHealth?.available?.scale !== false;
  const reasons = [];
  if (scaleOk && reading.weightKg > 0 && reading.weightKg < FEEDING.WEIGHT_KG) {
    reasons.push(`tartı ${reading.weightKg} kg`);
  }
  if (colony.score < SCORE.COLONY_WEAK) reasons.push(`skor ${colony.score}`);
  if (colony.beeEstimate != null && colony.beeEstimate < FEEDING.BEE_MIN) {
    reasons.push(`~${Math.round(colony.beeEstimate / 1000)}k arı`);
  }
  if (reading.tempC <= SENSOR.TEMP_LOW_C) {
    reasons.push(`düşük ısı ${reading.tempC}°C`);
  }
  if (!reasons.length) {
    return { key: "gerekmez", label: "Besleme gerekmez", seviye: 5, ozet: "Yeterli güç" };
  }
  const urgent =
    (scaleOk && reading.weightKg > 0 && reading.weightKg < FEEDING.WEIGHT_URGENT_KG) ||
    colony.score < SCORE.COLONY_WEAK;
  return {
    key: urgent ? "acil" : "onerilir",
    label: urgent ? "Besleme — acil" : "Besleme önerilir",
    seviye: urgent ? 2 : 3,
    ozet: reasons.join(" · "),
  };
}

function evaluateSensorSlice(data, title, warnProfiles = [], critProfiles = []) {
  if (!data?.ariciya && !data?.profile) {
    return { key: "yok", label: `${title} — veri yok`, seviye: 5, ozet: "—" };
  }
  const p = data.profile || "normal";
  let seviye = 4;
  if (critProfiles.includes(p)) seviye = 1;
  else if (warnProfiles.includes(p)) seviye = 2;
  else if (p === "normal" || p === "iyi" || p === "nektar_akisi") seviye = 5;
  return {
    key: p,
    label: `${title}: ${data.profileLabel || p}`,
    seviye,
    ozet: data.ariciya || "—",
  };
}

function evaluateIr(colony) {
  return evaluateSensorSlice(colony?.sensors?.ir, "IR trafik", ["dusuk", "sifir"], []);
}

function evaluateTarti(colony) {
  return evaluateSensorSlice(
    colony?.sensors?.weight,
    "Tartı",
    ["dusuk"],
    ["ogul_dusus"]
  );
}

function evaluateSes(colony) {
  return evaluateSensorSlice(colony?.sensors?.audio, "Ses", ["sessiz"], ["yuksek"]);
}

function evaluateTitresim(colony) {
  return evaluateSensorSlice(colony?.sensors?.vibration, "Titreşim", ["orta"], ["yuksek"]);
}

function evaluateBaglanti(colony) {
  return evaluateSensorSlice(
    colony?.sensors?.connectivity,
    "Bağlantı",
    ["pil_dusuk", "sinyal_zayif"],
    ["offline"]
  );
}

function evaluateFusion(sensorFusion) {
  if (!sensorFusion?.ozet) {
    return { key: "yok", label: "Fusion — yok", seviye: 5, ozet: "—" };
  }
  const p1 = sensorFusion.yapilacaklar?.[0]?.oncelik ?? 5;
  return {
    key: sensorFusion.guven || "orta",
    label: "Sensör fusion",
    seviye: p1 <= 1 ? 1 : p1 <= 2 ? 2 : p1 <= 3 ? 3 : 5,
    ozet: sensorFusion.yapilacakOzet || sensorFusion.ozet,
  };
}

function evaluateSensor(reading, colony = null) {
  if (!reading) {
    return { key: "bilinmiyor", label: "Sensör bilinmiyor", seviye: 5, ozet: "—" };
  }
  const ageMs = Date.now() - new Date(reading.ts).getTime();
  if (ageMs > SENSOR.OFFLINE_MS || reading.fault === "offline") {
    return {
      key: "offline",
      label: "Çevrimdışı",
      seviye: 1,
      ozet: `${Math.round(ageMs / 3600000)} saat veri yok`,
    };
  }

  const health = colony?.sensorHealth;
  const faults = health?.faults?.length ? health.faults : [...collectFaults(reading)];
  const criticalFaults = faults.filter((f) => CRITICAL_FAULTS.has(f));

  if (criticalFaults.length) {
    return {
      key: "ariza",
      label: "Sensör arızası",
      seviye: 1,
      fault: criticalFaults[0] || "offline",
      ozet: criticalFaults[0] || "Bağlantı kesildi",
    };
  }

  const partialFaults = faults.filter((f) => !CRITICAL_FAULTS.has(f));
  if (partialFaults.length || health?.mode === "degraded") {
    const down = (health?.down || partialFaults).map((d) =>
      typeof d === "string" ? d : d.label || d.id
    );
    return {
      key: "degraded",
      label: "Kısmi mod",
      seviye: 3,
      faults: partialFaults,
      ozet: down.length
        ? `Devre dışı: ${down.join(", ")} — diğer sensörlerle devam`
        : "Bazı sensörler devre dışı — izleme devam ediyor",
    };
  }
  if (reading.battery < SENSOR.BATTERY_LOW_PCT) {
    return {
      key: "pil_dusuk",
      label: "Pil düşük",
      seviye: 3,
      ozet: `%${reading.battery}`,
    };
  }
  const imb = cornerSpread(reading.cornerKg);
  if (imb >= SENSOR.CORNER_IMBALANCE_KG) {
    return {
      key: "dengesizlik",
      label: "Platform dengesiz",
      seviye: 2,
      ozet: `Köşe farkı ${imb.toFixed(1)} kg`,
    };
  }
  return { key: "normal", label: "Sensörler normal", seviye: 5, ozet: "OK" };
}

function evaluateOperasyon(reading, meta) {
  if (reading?.transportMode || meta.transportMode) {
    return {
      key: "tasimada",
      label: "Taşımada",
      seviye: 3,
      ozet: "Oğul/trafik alarmları bastırılmış",
    };
  }
  const konum = meta.konumEtiket || "Ev";
  return {
    key: "sabit",
    label: `Sabit — ${konum}`,
    seviye: 5,
    konumEtiket: konum,
    konumTipi: meta.konumTipi || "ev",
    ozet: konum,
  };
}

function evaluateKayit(meta) {
  const incomplete =
    !meta.anaIrk ||
    meta.anaIrk === "Bilinmiyor" ||
    !meta.babaIrk ||
    meta.babaIrk === "Bilinmiyor";
  if (incomplete) {
    return {
      key: "eksik",
      label: "Genetik kayıt eksik",
      seviye: 5,
      ozet: "Ana / baba ırkı gir",
    };
  }
  return {
    key: "tam",
    label: meta.capraz || "Kayıt tam",
    seviye: 5,
    ozet: meta.capraz || "—",
  };
}

function riskItem(key, label, mod, seviye, ozet, extra = {}) {
  return { key, label, mod, seviye, ozet, ...extra };
}

function categoryFromItems(key, label, items) {
  const seviye = items.length ? Math.min(...items.map((i) => i.seviye)) : 5;
  const worst = [...items].sort((a, b) => a.seviye - b.seviye)[0];
  return {
    key,
    label,
    seviye,
    ozet: worst?.ozet || "Belirgin risk yok",
    maddeler: items,
  };
}

function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function isAutumnMonth(date = new Date()) {
  const m = date.getMonth() + 1;
  return m >= RISK.AUTUMN_MONTH_START && m <= RISK.AUTUMN_MONTH_END;
}

function isRaining(weather) {
  return (
    (weather?.precipMm ?? 0) >= WEATHER.PRECIP_MM ||
    weather?.condition === "yagmur"
  );
}

/**
 * Dört risk kategorisi — kullanıcı listesine bire bir eşleme.
 * mod: calisiyor | proxy | plan
 */
function evaluateRiskKategorileri(reading, colony, meta, slices, weather) {
  const traffic = colony?.middayTraffic || { samples: 0, beeOut: 0, beeIn: 0 };
  const raining = isRaining(weather);
  const clearWeather = weather && !raining && weather.condition !== "firtina";

  // --- 1. Biyolojik ---
  const varroaSignals = [];
  let varroaSeviye = 5;
  if (colony?.beeEstimate != null && colony.beeEstimate < SCORE.BEE_WEAK) {
    varroaSeviye = 2;
    varroaSignals.push("Zayıf koloni");
  }
  if (
    traffic.samples > 0 &&
    traffic.beeOut < DISEASE.TRAFFIC_LOW &&
    clearWeather
  ) {
    varroaSeviye = Math.min(varroaSeviye, 2);
    varroaSignals.push("Düşük trafik (hava açık)");
  }
  if ((colony?.diseaseRiskScore ?? 0) >= DISEASE.RISK_ELEVATED) {
    varroaSeviye = Math.min(varroaSeviye, 1);
    varroaSignals.push("Yüksek hastalık riski");
  }
  const varroa = riskItem(
    "varroa",
    "Varroa zararlısı",
    "proxy",
    varroaSeviye,
    varroaSeviye <= 2
      ? `Muayene / akar sayımı — ${varroaSignals.join(" · ")}`
      : "Proxy sinyal yok — rutin Varroa takibi",
    { signals: varroaSignals }
  );

  let afbSeviye = 5;
  const afbSignals = [];
  if (
    (colony?.healthScore ?? 100) < SCORE.HEALTH_CRITICAL &&
    (colony?.beeEstimate ?? 99999) < SCORE.BEE_WEAK
  ) {
    afbSeviye = 1;
    afbSignals.push("Kritik sağlık + zayıf koloni");
  } else if (
    (colony?.healthScore ?? 100) < SCORE.HEALTH_ATTENTION &&
    (reading?.humidity ?? 0) >= SENSOR.HUM_HIGH_PCT
  ) {
    afbSeviye = 2;
    afbSignals.push("Düşük sağlık + yüksek nem");
  } else if (
    (colony?.diseaseSignals || []).some((s) => s.includes("AFB/EFB"))
  ) {
    afbSeviye = 2;
    afbSignals.push("Hastalık riski sinyali");
  }
  const yavruCuruklugu = riskItem(
    "yavru_curuklugu",
    "Yavru çürüklüğü (AFB / EFB)",
    "proxy",
    afbSeviye,
    afbSeviye <= 2
      ? `Larva / koku muayenesi — ${afbSignals.join(" · ")}`
      : "Sensörle teşhis yok — rutin kontrol",
    { signals: afbSignals }
  );

  let mantarSeviye = 5;
  const mantarSignals = [];
  if ((reading?.humidity ?? 0) >= SENSOR.HUM_HIGH_PCT) {
    mantarSeviye = 2;
    mantarSignals.push(`Nem %${reading.humidity}`);
  }
  if (
    (colony?.diseaseSignals || []).some((s) =>
      /chalkbrood|Nosema/i.test(s)
    )
  ) {
    mantarSeviye = Math.min(mantarSeviye, 2);
    mantarSignals.push("Hastalık riski eşleşmesi");
  }
  if (
    (colony?.beeEstimate ?? 99999) < SCORE.BEE_WEAK &&
    traffic.samples > 0 &&
    traffic.beeOut < DISEASE.TRAFFIC_LOW &&
    clearWeather
  ) {
    mantarSeviye = Math.min(mantarSeviye, 3);
    mantarSignals.push("Nosema şüphesi (zayıf + düşük trafik)");
  }
  const mantarSindirim = riskItem(
    "mantar_sindirim",
    "Mantar ve sindirim (chalkbrood / Nosema)",
    mantarSeviye <= 3 ? "proxy" : "plan",
    mantarSeviye,
    mantarSeviye <= 3
      ? mantarSignals.join(" · ")
      : "Mikroskop / görsel muayene gerekir",
    { signals: mantarSignals }
  );

  let yagmaSeviye = 5;
  const yagmaSignals = [];
  const drop6h = colony?.weightDrop6hKg;
  const notSwarm =
    colony?.swarmPhase !== "occurred" &&
    (drop6h == null || drop6h > SWARM_DROP_6H_KG + 0.5);
  if (
    (reading?.vibration ?? 0) >= RISK.ROBBING_VIBRATION_MIN &&
    notSwarm
  ) {
    yagmaSeviye = 2;
    yagmaSignals.push(`Titreşim ${reading.vibration}`);
  }
  if (
    drop6h != null &&
    drop6h <= RISK.ROBBING_WEIGHT_DROP_KG &&
    drop6h > SWARM_DROP_6H_KG + 0.5 &&
    notSwarm
  ) {
    yagmaSeviye = Math.min(yagmaSeviye, 2);
    yagmaSignals.push(`Ağırlık ${drop6h} kg / 6 saat`);
  }
  if (
    isAutumnMonth() &&
    (colony?.beeEstimate ?? 99999) < SCORE.BEE_WEAK &&
    (reading?.vibration ?? 0) >= 5
  ) {
    yagmaSeviye = Math.min(yagmaSeviye, 3);
    yagmaSignals.push("Sonbahar + zayıf kovan");
  }
  if (meta.yagmacilikSuphesi) {
    yagmaSeviye = 1;
    yagmaSignals.push("Kayıt: yağma şüphesi");
  }
  const yagmacilik = riskItem(
    "yagmacilik",
    "Yağmacılık ve zararlı baskınları",
    yagmaSeviye <= 3 ? "proxy" : "plan",
    yagmaSeviye,
    yagmaSeviye <= 3
      ? `Giriş / koku kontrolü — ${yagmaSignals.join(" · ")}`
      : "Eşek arısı / sarı arı için kamera veya gözlem",
    { signals: yagmaSignals }
  );

  const biyolojik = categoryFromItems("biyolojik", "Biyolojik riskler", [
    varroa,
    yavruCuruklugu,
    mantarSindirim,
    yagmacilik,
  ]);

  // --- 2. Çevresel ---
  let nemSeviye = 5;
  const nemSignals = [];
  if ((reading?.humidity ?? 0) >= SENSOR.HUM_HIGH_PCT) {
    nemSeviye = 2;
    nemSignals.push(`Nem %${reading.humidity}`);
  } else if (
    (reading?.humidity ?? 0) > SENSOR.HUM_IDEAL_MAX_PCT &&
    (reading?.tempC ?? 99) > SENSOR.TEMP_HIGH_C
  ) {
    nemSeviye = 3;
    nemSignals.push("Sıcak + nemli — havalandırma");
  }
  const nemHavalandirma = riskItem(
    "nem_havalandirma",
    "Yüksek nem ve kötü havalandırma",
    "calisiyor",
    nemSeviye,
    nemSeviye <= 3 ? nemSignals.join(" · ") : "Nem aralığı normal",
    { signals: nemSignals }
  );

  let iklimSeviye = 5;
  const iklimSignals = [];
  if (
    (weather?.tempC ?? 99) <= WEATHER.FROST_TEMP_C ||
    weather?.condition === "don"
  ) {
    iklimSeviye = 2;
    iklimSignals.push(`Don — dış ${weather?.tempC}°C`);
  }
  if ((weather?.windKmh ?? 0) >= WEATHER.STORM_WIND_KMH) {
    iklimSeviye = Math.min(iklimSeviye, 2);
    iklimSignals.push(`Rüzgâr ${weather.windKmh} km/s`);
  }
  if ((reading?.tempC ?? 99) <= SENSOR.TEMP_LOW_C) {
    iklimSeviye = Math.min(iklimSeviye, 2);
    iklimSignals.push(`Kovan içi ${reading.tempC}°C`);
  }
  if (weather?.condition === "firtina") {
    iklimSeviye = 1;
    iklimSignals.push("Fırtına uyarısı");
  }
  const iklimKis = riskItem(
    "iklim_kis",
    "Aşırı hava ve kışlatma kayıpları",
    iklimSeviye <= 3 ? "calisiyor" : "proxy",
    iklimSeviye,
    iklimSeviye <= 3 ? iklimSignals.join(" · ") : "İklim normal",
    { signals: iklimSignals }
  );

  const beslemeSlice = slices?.besleme;
  let besinSeviye = beslemeSlice?.seviye ?? 5;
  const besinSignals = [];
  if (beslemeSlice?.key === "acil") besinSignals.push("Acil besleme");
  else if (beslemeSlice?.key === "onerilir") besinSignals.push("Besleme önerilir");
  if (meta.suKaynagiYakin === false) {
    besinSeviye = Math.min(besinSeviye, 3);
    besinSignals.push("Su kaynağı uzak (kayıt)");
  }
  if (meta.kuraklikBolgesi) {
    besinSeviye = Math.min(besinSeviye, 2);
    besinSignals.push("Kuraklık bölgesi (kayıt)");
  }
  const besinSu = riskItem(
    "besin_su",
    "Yetersiz besin ve su kaynağı",
    besinSeviye <= 3 ? "calisiyor" : "proxy",
    besinSeviye,
    besinSignals.length ? besinSignals.join(" · ") : "Yeterli stok (tartı proxy)",
    { signals: besinSignals }
  );

  const cevresel = categoryFromItems("cevresel", "Çevresel ve iklimsel riskler", [
    nemHavalandirma,
    iklimKis,
    besinSu,
  ]);

  // --- 3. Yönetimsel ---
  const anaSlice = slices?.ana;
  const anaYas = meta.anaYasAy;
  let anaSeviye = anaSlice?.seviye ?? 5;
  const anaSignals = [];
  if (anaSlice?.key === "yok") anaSignals.push("Ana kaydı yok");
  if (anaSlice?.key === "supheli") anaSignals.push("Ana şüphesi");
  if (anaYas != null && anaYas >= 24) {
    anaSeviye = Math.min(anaSeviye, 3);
    anaSignals.push(`Ana yaşı ~${anaYas} ay`);
  }
  if (anaYas != null && anaYas >= 30) {
    anaSeviye = Math.min(anaSeviye, 2);
    anaSignals.push("Yaşlı ana — değişim düşün");
  }
  const anaAri = riskItem(
    "ana_ari",
    "Ana arı sorunları",
    anaSeviye <= 3 ? "calisiyor" : "proxy",
    anaSeviye,
    anaSignals.length ? anaSignals.join(" · ") : "Ana durumu normal",
    { signals: anaSignals }
  );

  const petekYas = meta.petekYasYil ?? meta.combAgeYears;
  let petekSeviye = 5;
  const petekSignals = [];
  if (petekYas != null && petekYas >= RISK.COMB_AGE_CRITICAL_YEARS) {
    petekSeviye = 2;
    petekSignals.push(`Petek ~${petekYas} yıl`);
  } else if (petekYas != null && petekYas >= RISK.COMB_AGE_WARN_YEARS) {
    petekSeviye = 3;
    petekSignals.push(`Petek ~${petekYas} yıl`);
  }
  if (meta.petekTransferSon) {
    petekSeviye = Math.min(petekSeviye, 2);
    petekSignals.push("Yakın petek transferi");
  }
  if (meta.petekEski || meta.eskiPetek) {
    petekSeviye = Math.min(petekSeviye, 2);
    petekSignals.push("Siyah / eski petek (kayıt)");
  }
  const petekKullanim = riskItem(
    "petek",
    "Hatalı petek kullanımı",
    petekSeviye <= 3 ? "proxy" : "plan",
    petekSeviye,
    petekSeviye <= 3
      ? petekSignals.join(" · ")
      : "Petek yaşı kaydı girilmedi",
    { signals: petekSignals }
  );

  const muayeneGun = daysSince(meta.sonMuayeneAt);
  let kontrolSeviye = 5;
  const kontrolSignals = [];
  if (muayeneGun == null) {
    kontrolSeviye = 3;
    kontrolSignals.push("Son muayene kaydı yok");
  } else if (muayeneGun >= RISK.INSPECTION_DAYS_CRITICAL) {
    kontrolSeviye = 1;
    kontrolSignals.push(`${muayeneGun} gün önce`);
  } else if (muayeneGun >= RISK.INSPECTION_DAYS_WARN) {
    kontrolSeviye = 2;
    kontrolSignals.push(`${muayeneGun} gün önce`);
  }
  const kontrolEksikligi = riskItem(
    "kontrol",
    "Kontrol eksikliği",
    muayeneGun != null ? "calisiyor" : "proxy",
    kontrolSeviye,
    kontrolSeviye <= 3
      ? `Yerinde muayene — ${kontrolSignals.join(" · ")}`
      : `Son muayene ${muayeneGun} gün önce`,
    { signals: kontrolSignals, sonMuayeneGun: muayeneGun }
  );

  const yonetimsel = categoryFromItems(
    "yonetimsel",
    "Yönetimsel hatalar ve kovan içi sorunlar",
    [anaAri, petekKullanim, kontrolEksikligi]
  );

  // --- 4. Kimyasal ve dış ---
  let pestisitSeviye = 5;
  const pestisitSignals = [];
  if (
    clearWeather &&
    traffic.samples > 0 &&
    traffic.beeOut < RISK.PESTICIDE_TRAFFIC_MAX &&
    (colony?.healthScore ?? 100) < SCORE.HEALTH_ATTENTION &&
    (reading?.audioRms ?? 1) < SENSOR.QUEENLESS_AUDIO_MIN
  ) {
    pestisitSeviye = 2;
    pestisitSignals.push("Açık havada düşük trafik + düşük sağlık");
  }
  if (meta.pestisitSuphesi) {
    pestisitSeviye = 1;
    pestisitSignals.push("Kayıt: ilaçlama şüphesi");
  }
  const pestisit = riskItem(
    "pestisit",
    "Pestisit ve tarım ilaçları",
    pestisitSeviye <= 3 ? "proxy" : "plan",
    pestisitSeviye,
    pestisitSeviye <= 3
      ? `Ölü arı / yön kaybı kontrolü — ${pestisitSignals.join(" · ")}`
      : "İlaçlama takvimi entegrasyonu plan",
    { signals: pestisitSignals }
  );

  let fizikSeviye = 5;
  const fizikSignals = [];
  if ((reading?.vibration ?? 0) >= SENSOR.VIBRATION_HIGH) {
    fizikSeviye = 2;
    fizikSignals.push(`Yüksek titreşim ${reading.vibration}`);
  }
  const imb = cornerSpread(reading?.cornerKg);
  if (imb >= SENSOR.CORNER_IMBALANCE_KG) {
    fizikSeviye = Math.min(fizikSeviye, 2);
    fizikSignals.push(`Dengesizlik ${imb.toFixed(1)} kg`);
  }
  if (meta.hirsizlikSuphesi) {
    fizikSeviye = 1;
    fizikSignals.push("Kayıt: hırsızlık şüphesi");
  }
  if (meta.fizikselHasar) {
    fizikSeviye = Math.min(fizikSeviye, 1);
    fizikSignals.push("Kayıt: fiziksel hasar");
  }
  const fizikTehdit = riskItem(
    "fiziksel",
    "Hırsızlık ve fiziki tehditler",
    fizikSeviye <= 3 ? "proxy" : "plan",
    fizikSeviye,
    fizikSeviye <= 3
      ? fizikSignals.join(" · ")
      : "Ayı / tilki için kamera veya tuzak kaydı",
    { signals: fizikSignals }
  );

  const kimyasalDis = categoryFromItems(
    "kimyasal_dis",
    "Kimyasal ve dış tehditler",
    [pestisit, fizikTehdit]
  );

  const kategoriler = { biyolojik, cevresel, yonetimsel, kimyasalDis };
  const allItems = Object.values(kategoriler).flatMap((c) => c.maddeler);
  const enKotuSeviye = Math.min(...allItems.map((i) => i.seviye), 5);
  const worst = [...allItems].sort((a, b) => a.seviye - b.seviye)[0];

  const oneCikanRisk = allItems
    .filter((i) => i.seviye <= 2)
    .sort((a, b) => a.seviye - b.seviye)
    .slice(0, 4)
    .map((i) => ({
      kategori: Object.values(kategoriler).find((c) =>
        c.maddeler.some((m) => m.key === i.key)
      )?.key,
      label: i.label,
      ozet: i.ozet,
      seviye: i.seviye,
      mod: i.mod,
    }));

  return {
    ozet: worst?.seviye <= 3 ? `${worst.label}: ${worst.ozet}` : "Riskler düşük",
    enKotuSeviye,
    kategoriler,
    oneCikan: oneCikanRisk,
  };
}

function buildHighlights(slices) {
  const order = [
    "sensor",
    "fusion",
    "ana",
    "anaOgul",
    "ogulDurumu",
    "ogulRiski",
    "hastalikRiski",
    "sicaklik",
    "nem",
    "ir",
    "tarti",
    "ses",
    "titresim",
    "baglanti",
    "saglik",
    "besleme",
    "ariSayisi",
    "koloni",
    "yavru",
    "operasyon",
    "kayit",
  ];
  const highlights = [];
  for (const id of order) {
    const s = slices[id];
    if (s && s.seviye <= 3) {
      highlights.push({ alan: id, label: s.label, ozet: s.ozet, seviye: s.seviye });
    }
  }
  highlights.sort((a, b) => a.seviye - b.seviye);
  return highlights.slice(0, 5);
}

/**
 * @param {object} reading
 * @param {object} colony
 * @param {object} [meta]
 */
function evaluateHiveState(reading, colony, meta = {}) {
  if (!colony) {
    return {
      ozet: "Veri yok",
      enKotuSeviye: 5,
      durumlar: {},
      oneCikan: [],
    };
  }

  const saglik = evaluateSaglik(colony);
  const hastalikRiski = evaluateHastalikRiski(colony);
  const koloni = evaluateKoloni(colony);
  const koloniGucu = evaluateKoloniGucu(colony);
  const ariSayisi = evaluateAriSayisi(colony);
  const ogulRiski = evaluateOgulRiski(colony);
  const ogulDurumu = evaluateOgulDurumu(colony);
  const ana = evaluateAna(reading, colony, meta);
  const anaOgul = evaluateAnaOgul(reading, colony, meta, ana, ogulDurumu, ogulRiski);
  const yavru = evaluateYavru(colony);
  const sicaklik = evaluateSicaklik(reading, colony);
  const nem = evaluateNem(reading, colony);
  const besleme = evaluateBesleme(reading, colony);
  const sensor = evaluateSensor(reading, colony);
  const operasyon = evaluateOperasyon(reading, meta);
  const kayit = evaluateKayit(meta);

  const durumlar = {
    saglik,
    hastalikRiski,
    koloni,
    koloniGucu,
    ariSayisi,
    ogulRiski,
    ogulDurumu,
    ana,
    anaOgul,
    yavru,
    sicaklik,
    nem,
    besleme,
    sensor,
    operasyon,
    kayit,
  };

  const riskKategorileri = evaluateRiskKategorileri(
    reading,
    colony,
    meta,
    durumlar,
    meta.weather
  );

  const oneCikan = buildHighlights(durumlar);
  const enKotuSeviye = Math.min(
    ...Object.values(durumlar).map((d) => d.seviye ?? 5),
    riskKategorileri.enKotuSeviye ?? 5,
    5
  );

  let ozet = "Dengeli";
  if (oneCikan[0]) ozet = oneCikan[0].label;
  else if (riskKategorileri.oneCikan?.[0]) {
    ozet = riskKategorileri.oneCikan[0].label;
  }

  return {
    ozet,
    enKotuSeviye,
    durumlar,
    riskKategorileri,
    oneCikan,
    evaluatedAt: reading?.ts || new Date().toISOString(),
  };
}

/** Süzgeç: evaluation alan key eşleşmesi */
function matchesDurumFilter(evaluation, filterKey) {
  if (!evaluation?.durumlar) return false;
  const d = evaluation.durumlar;
  switch (filterKey) {
    case "durum:saglik_kritik":
      return d.saglik?.seviye <= 1;
    case "durum:hastalik":
      return (d.hastalikRiski?.seviye ?? 5) <= 2;
    case "durum:ogul_acil":
      return d.ogulRiski?.key === "acil" || d.ogulDurumu?.key === "hemen_mudahale";
    case "durum:ogul_oldu":
      return d.ogulDurumu?.occurred === true;
    case "durum:ana_suphe":
      return d.ana?.key !== "var";
    case "durum:zayif":
      return d.koloni?.key === "zayif" || d.koloniGucu?.key === "weak";
    case "durum:besleme":
      return d.besleme?.key === "acil" || d.besleme?.key === "onerilir";
    case "durum:ariza":
      return d.sensor?.key === "ariza" || d.sensor?.key === "offline";
    case "durum:ari_kritik":
      return (d.ariSayisi?.tier ?? 0) >= 4;
    case "durum:sicaklik":
      return (d.sicaklik?.seviye ?? 5) <= 2;
    case "durum:nem":
      return (d.nem?.seviye ?? 5) <= 2;
    case "durum:risk_yuksek":
      return (evaluation.riskKategorileri?.enKotuSeviye ?? 5) <= 2;
    default:
      return false;
  }
}

function patchEvaluationDurumlar(evaluation, colony, sensorFusion) {
  if (!evaluation?.durumlar) return evaluation;
  evaluation.durumlar.ir = evaluateIr(colony);
  evaluation.durumlar.tarti = evaluateTarti(colony);
  evaluation.durumlar.ses = evaluateSes(colony);
  evaluation.durumlar.titresim = evaluateTitresim(colony);
  evaluation.durumlar.baglanti = evaluateBaglanti(colony);
  if (sensorFusion) {
    evaluation.durumlar.fusion = evaluateFusion(sensorFusion);
  }
  evaluation.oneCikan = buildHighlights(evaluation.durumlar);
  if (evaluation.oneCikan[0]) evaluation.ozet = evaluation.oneCikan[0].label;
  evaluation.enKotuSeviye = Math.min(
    ...Object.values(evaluation.durumlar).map((d) => d.seviye ?? 5),
    evaluation.riskKategorileri?.enKotuSeviye ?? 5,
    5
  );
  return evaluation;
}

module.exports = {
  evaluateHiveState,
  isQueenlessSuspect,
  matchesDurumFilter,
  patchEvaluationDurumlar,
  evaluateIr,
  evaluateTarti,
  evaluateSes,
  evaluateTitresim,
  evaluateBaglanti,
  evaluateFusion,
};
