/**
 * Koloni gücü, tahmini arı sayısı ve bakım önerileri.
 * Öğlen (11–15) çıkış trafiği kalibrasyon için kullanılır.
 * Eşikler: packages/shared/constants.js
 */

const {
  BEE_MASS_KG,
  FORAGER_FRACTION,
  AVG_TRIP_MIN,
  INTERVAL_MIN,
  BEE_SWARM_TIERS,
  SWARM,
  SWARM_DROP_6H_KG,
  SWARM_DROP_24H_KG,
  SCORE,
  SENSOR,
  BROOD,
  DISEASE,
  WEATHER,
  FEEDING,
  TEMP,
  HUM,
} = require("../../../packages/shared/constants");

/** @typedef {{ tareKg?: number, combKg?: number, beeOutMultiplier?: number, referenceBeeCount?: number }} HiveConfig */

/**
 * @param {string} iso
 * @param {number} utcOffsetHours
 */
function localHour(iso, utcOffsetHours = 3) {
  const d = new Date(iso);
  return (d.getUTCHours() + utcOffsetHours + 24) % 24;
}

/**
 * @param {{ ts: string, beeOut: number, beeIn: number }[]} series
 */
function middayTraffic(series, utcOffsetHours = 3) {
  const midday = series.filter((r) => {
    const h = localHour(r.ts, utcOffsetHours);
    return h >= 11 && h < 15;
  });
  if (!midday.length) return { beeOut: 0, beeIn: 0, samples: 0 };

  const beeOut =
    midday.reduce((s, r) => s + (r.beeOut || 0), 0) / midday.length;
  const beeIn =
    midday.reduce((s, r) => s + (r.beeIn || 0), 0) / midday.length;
  return {
    beeOut: Math.round(beeOut),
    beeIn: Math.round(beeIn),
    samples: midday.length,
  };
}

/**
 * Öğlen çıkış hızından gezen + toplam arı tahmini.
 * @param {number} beeOutPerInterval
 * @param {HiveConfig} cfg
 */
function beesFromTraffic(beeOutPerInterval, cfg) {
  if (!beeOutPerInterval || beeOutPerInterval < 10) return null;

  const overlap = AVG_TRIP_MIN / INTERVAL_MIN;
  let foragersOutside = beeOutPerInterval * overlap;
  let total = foragersOutside / FORAGER_FRACTION;

  if (cfg.referenceBeeCount && cfg.middayBeeOutRef) {
    const scale = cfg.referenceBeeCount / (cfg.middayBeeOutRef * overlap / FORAGER_FRACTION);
    total = beeOutPerInterval * overlap * scale / FORAGER_FRACTION;
    foragersOutside = total * FORAGER_FRACTION;
  } else if (cfg.beeOutMultiplier) {
    total = beeOutPerInterval * cfg.beeOutMultiplier;
    foragersOutside = total * FORAGER_FRACTION;
  }

  return {
    foragersOutside: Math.round(foragersOutside),
    total: Math.round(total),
    method: cfg.referenceBeeCount ? "calibrated" : "traffic_model",
  };
}

/**
 * @param {number} weightKg
 * @param {HiveConfig} cfg
 */
function beesFromWeight(weightKg, cfg) {
  const tare = cfg.tareKg ?? 8;
  const comb = cfg.combKg ?? 18;
  const beeKg = weightKg - tare - comb;
  if (beeKg < 0.5) return null;

  const total = Math.round(beeKg / BEE_MASS_KG);
  return { total, beeKg: Math.round(beeKg * 10) / 10, method: "weight_model" };
}

/**
 * @param {{ weightKg: number, tempC: number, humidity: number, beeIn: number, beeOut: number }[]} series
 */
function dailyWeightSwing(series) {
  if (series.length < 4) return 0;
  const recent = series.slice(-16);
  const weights = recent.map((r) => r.weightKg);
  return Math.max(...weights) - Math.min(...weights);
}

/**
 * @param {number} n
 */
function strengthLabel(n) {
  if (n < 20000) return { key: "weak", label: "Zayıf" };
  if (n < 35000) return { key: "medium", label: "Orta" };
  if (n < 55000) return { key: "strong", label: "Güçlü" };
  return { key: "very_strong", label: "Çok güçlü" };
}

/**
 * @param {number} score
 */
function scoreLabel(score) {
  if (score < 40) return "Zayıf";
  if (score < 65) return "Orta";
  if (score < 85) return "İyi";
  return "Mükemmel";
}

/** @param {number} score */
function healthLabel(score) {
  if (score < 45) return "Kritik";
  if (score < 65) return "Dikkat";
  if (score < 85) return "İyi";
  return "Çok iyi";
}

/**
 * Arı sayısına göre oğul öncesi alarm katmanı.
 * Sayı bilinirse oğul gitmeden kademeli maksimum erken uyarı verilir.
 * @param {number|null|undefined} estimateTotal
 */
function beeCountSwarmTier(estimateTotal) {
  if (!estimateTotal || estimateTotal < 35000) {
    return {
      tier: 0,
      tierLabel: "Normal",
      alarmLevel: "none",
      minRisk: 0,
      beeSignal: null,
    };
  }
  for (const t of BEE_SWARM_TIERS) {
    if (estimateTotal >= t.min) {
      return {
        tier: t.tier,
        tierLabel: t.label,
        alarmLevel: t.alarmLevel,
        minRisk: t.minRisk,
        beeSignal: t.beeSignal || null,
      };
    }
  }
  return {
    tier: 0,
    tierLabel: "Normal",
    alarmLevel: "none",
    minRisk: 0,
    beeSignal: null,
  };
}

/** @param {number} risk 0–100, yüksek = oğul riski */
function swarmRiskLabel(risk, phase) {
  if (phase === "occurred") return "Oğul oldu";
  if (risk >= SWARM.RISK_CRITICAL) return "Acil";
  if (risk >= SWARM.RISK_ELEVATED) return "Yüksek";
  if (risk >= SWARM.RISK_WATCH) return "Orta";
  return "Düşük";
}

/**
 * @param {string} iso
 */
function swarmSeasonFactor(iso, utcOffsetHours = 3) {
  const d = new Date(iso);
  const month = new Date(d.getTime() + utcOffsetHours * 3600000).getUTCMonth() + 1;
  if (month >= 5 && month <= 7) return 22;
  if (month === 4 || month === 8) return 14;
  if (month === 9) return 8;
  return 4;
}

/**
 * @param {{ weightKg: number, ts: string }[]} series
 */
function weightDelta(series, hoursBack) {
  if (series.length < 2) return 0;
  const latest = series[series.length - 1];
  const target = new Date(latest.ts).getTime() - hoursBack * 3600000;
  let ref = series[0];
  for (let i = series.length - 2; i >= 0; i--) {
    if (new Date(series[i].ts).getTime() <= target) {
      ref = series[i];
      break;
    }
  }
  return latest.weightKg - ref.weightKg;
}

/**
 * @param {{ tempC: number, ts: string }[]} series
 * @returns {number|null}
 */
function tempDelta(series, hoursBack) {
  if (!series || series.length < 2) return null;
  const latest = series[series.length - 1];
  if (latest.tempC == null) return null;
  const target = new Date(latest.ts).getTime() - hoursBack * 3600000;
  let ref = series[0];
  for (let i = series.length - 2; i >= 0; i--) {
    if (new Date(series[i].ts).getTime() <= target) {
      ref = series[i];
      break;
    }
  }
  if (ref.tempC == null) return null;
  return Math.round((latest.tempC - ref.tempC) * 10) / 10;
}

/**
 * @param {{ humidity: number, ts: string }[]} series
 * @returns {number|null}
 */
function humDelta(series, hoursBack) {
  if (!series || series.length < 2) return null;
  const latest = series[series.length - 1];
  if (latest.humidity == null) return null;
  const target = new Date(latest.ts).getTime() - hoursBack * 3600000;
  let ref = series[0];
  for (let i = series.length - 2; i >= 0; i--) {
    if (new Date(series[i].ts).getTime() <= target) {
      ref = series[i];
      break;
    }
  }
  if (ref.humidity == null) return null;
  return Math.round(latest.humidity - ref.humidity);
}

/**
 * Kovan içi nem skoru, trend, neden ve arıcı mesajı.
 */
function analyzeHumidity(history, latest, colony, weather = {}, meta = {}, health = null, cfg = {}) {
  const { analyzeHumiditySensorQuality } = require("./services/humiditySensorCalibration");
  const h = health || { available: { humidity: true } };
  if (!h.available?.humidity) {
    const outdoorHum = weather?.humidity;
    const fallback = {
      mod: "fallback",
      source: "weather",
      humidity: outdoorHum ?? null,
      zone: "bilinmiyor",
      zoneLabel: "Sensör arızalı",
      humScore: null,
      trend: "stabil",
      trendLabel: "—",
      delta6hPct: null,
      delta24hPct: null,
      condensationRisk: false,
      nedenler: [{ key: "ariza", label: "Nem sensörü arızalı" }],
      oneriler: outdoorHum != null ? ["Dış hava nemine bak — yedek referans"] : ["Sensörü değiştir"],
      ariciya:
        outdoorHum != null
          ? `Nem sensörü arızalı — dış hava ~${outdoorHum}% referans`
          : "Nem sensörü arızalı — skor atlandı",
    };
    fallback.quality = analyzeHumiditySensorQuality(fallback, cfg, latest, weather, colony);
    return fallback;
  }

  const humidity = latest?.humidity ?? 0;
  const tempC = latest?.tempC ?? 0;
  const delta6h = humDelta(history, 6);
  const delta24h = humDelta(history, 24);
  const outdoorHum = weather?.humidity;
  const outdoorTemp = weather?.tempC;
  const traffic = colony?.middayTraffic || { samples: 0, beeOut: 0, beeIn: 0 };

  let trend = "stabil";
  let trendLabel = "Sabit";
  if (delta6h != null) {
    if (delta6h >= HUM.DELTA_RISE_6H_PCT) {
      trend = "yukseliyor";
      trendLabel = "Yükseliyor";
    } else if (delta6h <= HUM.DELTA_DROP_6H_PCT) {
      trend = "dusuyor";
      trendLabel = "Düşüyor";
    }
  }

  let zone = "ideal";
  let zoneLabel = "İdeal";
  if (humidity >= SENSOR.HUM_HIGH_PCT) {
    zone = "kritik_yuksek";
    zoneLabel = "Çok yüksek";
  } else if (humidity > SENSOR.HUM_IDEAL_MAX_PCT) {
    zone = "yuksek";
    zoneLabel = "Yüksek";
  } else if (humidity <= SENSOR.HUM_LOW_PCT) {
    zone = "kritik_dusuk";
    zoneLabel = "Çok düşük";
  } else if (humidity < SENSOR.HUM_IDEAL_MIN_PCT) {
    zone = "dusuk";
    zoneLabel = "Düşük";
  } else if (
    humidity >= SENSOR.HUM_IDEAL_MIN_PCT &&
    humidity <= SENSOR.HUM_IDEAL_MAX_PCT
  ) {
    zone = "ideal";
    zoneLabel = "İdeal";
  } else {
    zone = "kabul";
    zoneLabel = "Kabul edilebilir";
  }

  let score = 70;
  if (zone === "ideal") score = 95;
  else if (zone === "kabul") score = 78;
  else if (zone === "yuksek" || zone === "dusuk") score = 52;
  else score = 25;

  const condensationRisk =
    humidity >= SENSOR.HUM_IDEAL_MAX_PCT &&
    tempC > SENSOR.TEMP_IDEAL_MIN_C &&
    outdoorTemp != null &&
    tempC - outdoorTemp >= HUM.CONDENSATION_GAP_C;

  if (condensationRisk) score -= 12;
  if (trend === "yukseliyor" && humidity > 75) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const nedenler = [];
  const oneriler = [];
  const rising =
    trend === "yukseliyor" ||
    (delta24h != null && delta24h >= HUM.DELTA_RISE_24H_PCT);
  const falling =
    trend === "dusuyor" ||
    (delta24h != null && delta24h <= HUM.DELTA_DROP_24H_PCT);

  if (rising || zone === "yuksek" || zone === "kritik_yuksek") {
    if (weather?.precipMm >= WEATHER.PRECIP_MM || weather?.condition === "yagmur") {
      nedenler.push({
        key: "yagmur",
        label: "Dış yağış — nem girişi artabilir",
        tip: "artis",
      });
    }
    if (tempC > SENSOR.TEMP_IDEAL_MAX_C) {
      nedenler.push({
        key: "sicak_nem",
        label: "Sıcak + nem — havalandırma yetersiz",
        tip: "artis",
      });
      oneriler.push("Üst delikleri aç; gölge ver; petek yaşını kontrol et.");
    }
    if (colony?.broodEmergence?.active) {
      nedenler.push({
        key: "yavru",
        label: "Aktif yavru — koloni nem üretir",
        tip: "artis",
      });
    }
    if (traffic.beeOut >= SCORE.TRAFFIC_STRONG) {
      nedenler.push({
        key: "trafik",
        label: "Yoğun aktivite — buharlaşma / havalandırma dengesi",
        tip: "artis",
      });
    }
    if (condensationRisk) {
      nedenler.push({
        key: "yogusma",
        label: "İç-dış ısı farkı yüksek — yoğuşma / chalkbrood riski",
        tip: "artis",
      });
      oneriler.push("Chalkbrood için petek ve havalandırma kontrolü.");
    }
    if (outdoorHum != null && humidity - outdoorHum >= HUM.OUTDOOR_GAP_HIGH_PCT) {
      nedenler.push({
        key: "ic_fazla",
        label: `İç nem dış havadan ${Math.round(humidity - outdoorHum)} puan yüksek`,
        tip: "artis",
      });
    }
  }

  if (falling || zone === "dusuk" || zone === "kritik_dusuk") {
    if (outdoorTemp != null && outdoorTemp <= WEATHER.FROST_TEMP_C) {
      nedenler.push({
        key: "kis",
        label: "Soğuk dış hava — kış kuruluğu normal olabilir",
        tip: "dusus",
      });
    }
    if (colony?.beeEstimate != null && colony.beeEstimate < SCORE.BEE_WEAK) {
      nedenler.push({
        key: "zayif",
        label: "Zayıf koloni — nem tutma kapasitesi düşük",
        tip: "dusus",
      });
      oneriler.push("Besleme; yavru alanı nemini gözle kontrol et.");
    }
    if (outdoorHum != null && outdoorHum - humidity > 15) {
      nedenler.push({
        key: "dis_yuksek",
        label: "Dış nem yüksek ama iç düşük — sensör veya havalandırma",
        tip: "dusus",
      });
    }
  }

  if (zone === "ideal" && trend === "stabil") {
    nedenler.push({
      key: "normal",
      label: "45–70 % bandında — yavru nem ihtiyacı karşılanıyor",
      tip: "durum",
    });
  }

  if (zone === "kritik_yuksek" && !oneriler.length) {
    oneriler.push("Aşırı nem — havalandır; eski petekleri ayır.");
  }
  if (zone === "kritik_dusuk" && !oneriler.length) {
    oneriler.push("Kuru nem — su kaynağı ve yavru alanı kontrolü.");
  }

  let ariciya = `%${humidity} — ${zoneLabel}`;
  if (trend !== "stabil" && delta6h != null) {
    ariciya += ` · ${trendLabel} (${delta6h > 0 ? "+" : ""}${delta6h} % / 6 saat)`;
  }
  if (outdoorHum != null) {
    ariciya += ` · dış %${outdoorHum}`;
  }
  const mainNeden = nedenler.find((n) => n.tip !== "durum") || nedenler[0];
  if (mainNeden) ariciya += `. ${mainNeden.label}`;
  if (oneriler[0]) ariciya += ` → ${oneriler[0]}`;

  let uyari = null;
  if (zone === "kritik_yuksek" || humidity >= SENSOR.HUM_HIGH_PCT) {
    uyari = {
      type: "humidity_high",
      priority: zone === "kritik_yuksek" ? 1 : 2,
      title: "Aşırı nem — havalandır",
      message: `Aşırı nem (%${humidity})${mainNeden ? ` — ${mainNeden.label}` : ""}`,
    };
  } else if (zone === "kritik_dusuk" || humidity <= SENSOR.HUM_LOW_PCT) {
    uyari = {
      type: "humidity_low",
      priority: zone === "kritik_dusuk" ? 2 : 3,
      title: "Düşük nem — yavru stresi",
      message: `Düşük nem (%${humidity})${mainNeden ? ` — ${mainNeden.label}` : ""}`,
    };
  } else if (rising && humidity > SENSOR.HUM_IDEAL_MAX_PCT) {
    uyari = {
      type: "humidity_rise",
      priority: 3,
      title: "Nem yükseliyor — kontrol",
      message: `Nem yükseliyor (+${delta6h}%) — ${mainNeden?.label || "havalandırma kontrol et"}`,
    };
  }

  const base = {
    humScore: score,
    humLabel: zoneLabel,
    zone,
    trend,
    trendLabel,
    humidity,
    delta6hPct: delta6h,
    delta24hPct: delta24h,
    disHumidityPct: outdoorHum ?? null,
    condensationRisk,
    nedenler: nedenler.slice(0, 5),
    oneriler: [...new Set(oneriler)].slice(0, 3),
    ariciya,
    uyari,
  };
  const quality = analyzeHumiditySensorQuality(base, cfg, latest, weather, colony);
  base.quality = quality;
  base.ariciya = `${ariciya} · kalite ${quality.score}/100`;
  return base;
}

/**
 * Kovan içi sıcaklık skoru, trend, neden ve arıcı mesajı.
 * @param {object} colony analyzeColony çıktısı (trafik, yavru, arı tahmini)
 * @param {object} [weather] weatherForHive
 * @param {object} [meta] hiveMeta
 */
function analyzeTemperature(history, latest, colony, weather = {}, meta = {}) {
  const tempC = latest?.tempC ?? 0;
  const delta6h = tempDelta(history, 6);
  const delta24h = tempDelta(history, 24);
  const traffic = colony?.middayTraffic || { samples: 0, beeOut: 0, beeIn: 0 };
  const outdoor = weather?.tempC;

  let trend = "stabil";
  let trendLabel = "Sabit";
  if (delta6h != null) {
    if (delta6h >= TEMP.DELTA_RISE_6H_C) {
      trend = "yukseliyor";
      trendLabel = "Yükseliyor";
    } else if (delta6h <= TEMP.DELTA_DROP_6H_C) {
      trend = "dusuyor";
      trendLabel = "Düşüyor";
    }
  }

  let zone = "ideal";
  let zoneLabel = "İdeal";
  if (tempC > SENSOR.TEMP_HIGH_C) {
    zone = "kritik_yuksek";
    zoneLabel = "Çok yüksek";
  } else if (tempC > SENSOR.TEMP_IDEAL_MAX_C) {
    zone = "yuksek";
    zoneLabel = "Yüksek";
  } else if (tempC < SENSOR.TEMP_LOW_C) {
    zone = "kritik_dusuk";
    zoneLabel = "Çok düşük";
  } else if (tempC < SENSOR.TEMP_IDEAL_MIN_C) {
    zone = "dusuk";
    zoneLabel = "Düşük";
  } else if (
    tempC >= SENSOR.TEMP_IDEAL_MIN_C &&
    tempC <= SENSOR.TEMP_IDEAL_MAX_C
  ) {
    zone = "ideal";
    zoneLabel = "İdeal";
  } else {
    zone = "kabul";
    zoneLabel = "Kabul edilebilir";
  }

  let score = 70;
  if (zone === "ideal") score = 95;
  else if (zone === "kabul") score = 78;
  else if (zone === "yuksek" || zone === "dusuk") score = 52;
  else score = 25;

  if (trend === "yukseliyor" && tempC > 35) score -= 10;
  if (trend === "dusuyor" && tempC < 30) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const nedenler = [];
  const oneriler = [];
  const rising =
    trend === "yukseliyor" ||
    (delta24h != null && delta24h >= TEMP.DELTA_RISE_24H_C);
  const falling =
    trend === "dusuyor" ||
    (delta24h != null && delta24h <= TEMP.DELTA_DROP_24H_C);

  if (rising) {
    if (outdoor != null && outdoor >= WEATHER.HEAT_OUTDOOR_C) {
      nedenler.push({
        key: "dis_sicak",
        label: `Dış hava sıcak (${outdoor}°C) — kovan ısınıyor`,
        tip: "artis",
      });
      oneriler.push("Gölge ver; üst havalandırmayı aç; öğleden sonra açma.");
    }
    if (colony?.broodEmergence?.active) {
      nedenler.push({
        key: "yavru",
        label: "Yavru çıkışı aktif — koloni ısı üretiyor",
        tip: "artis",
      });
    }
    if (traffic.beeOut >= SCORE.TRAFFIC_STRONG) {
      nedenler.push({
        key: "trafik",
        label: "Yoğun uçuş — işçi aktivitesi iç ısıyı artırır",
        tip: "artis",
      });
    }
    if (colony?.beeEstimate != null && colony.beeEstimate >= 45000) {
      nedenler.push({
        key: "kalabalik",
        label: "Kalabalık koloni — daha fazla metabolik ısı",
        tip: "artis",
      });
    }
    if (
      latest.humidity > SENSOR.HUM_IDEAL_MAX_PCT &&
      tempC > SENSOR.TEMP_IDEAL_MAX_C
    ) {
      nedenler.push({
        key: "havalandirma",
        label: "Nem + sıcaklık — havalandırma yetersiz olabilir",
        tip: "artis",
      });
      oneriler.push("Üst boşluk ve havalandırma deliklerini kontrol et.");
    }
    if (!nedenler.length && delta6h != null) {
      nedenler.push({
        key: "genel_artis",
        label: `Son 6 saatte +${delta6h}°C — güneş veya aktivite`,
        tip: "artis",
      });
    }
  }

  if (falling) {
    if (outdoor != null && outdoor <= WEATHER.FROST_TEMP_C) {
      nedenler.push({
        key: "dis_soguk",
        label: `Dış hava soğuk (${outdoor}°C) — ısı kaybı`,
        tip: "dusus",
      });
      oneriler.push("Yalıtım ve besleme; rüzgâr tarafını kapat.");
    }
    if (colony?.beeEstimate != null && colony.beeEstimate < SCORE.BEE_WEAK) {
      nedenler.push({
        key: "zayif",
        label: "Zayıf koloni — ısıyı tutamıyor",
        tip: "dusus",
      });
      oneriler.push("Besleme ve koloni gücünü kontrol et.");
    }
    if (traffic.samples > 0 && traffic.beeOut < SCORE.TRAFFIC_WEAK) {
      nedenler.push({
        key: "dusuk_trafik",
        label: "Düşük aktivite — az işçi, az ısı",
        tip: "dusus",
      });
    }
    if (
      meta.queenless ||
      meta.anaDurum === "supheli" ||
      meta.anaDurum === "yok"
    ) {
      nedenler.push({
        key: "ana",
        label: "Ana şüpheli — yavru azalınca ısı düşer",
        tip: "dusus",
      });
      oneriler.push("Ana ve açık yavru kontrolü.");
    }
    const hour = new Date(latest.ts).getUTCHours();
    if (hour >= 21 || hour <= 5) {
      nedenler.push({
        key: "gece",
        label: "Gece saatleri — hafif düşüş normal olabilir",
        tip: "dusus",
      });
    }
    if (!nedenler.length && delta6h != null) {
      nedenler.push({
        key: "genel_dusus",
        label: `Son 6 saatte ${delta6h}°C — soğuk veya zayıflama`,
        tip: "dusus",
      });
    }
  }

  if (zone === "kritik_yuksek" || zone === "yuksek") {
    if (!oneriler.some((o) => /Gölge|havalandır/i.test(o))) {
      oneriler.push("Gölge ve havalandırma; sıcakta müdahaleyi akşama bırak.");
    }
  }
  if (zone === "kritik_dusuk" || zone === "dusuk") {
    if (!oneriler.some((o) => /Besleme|yalıtım/i.test(o))) {
      oneriler.push("Düşük iç ısı — besleme, yalıtım; ana / yavru kontrolü.");
    }
  }
  if (zone === "ideal" && trend === "stabil") {
    nedenler.push({
      key: "normal",
      label: "32–36 °C bandında — yavru ısısı normal",
      tip: "durum",
    });
  }

  let ariciya = `${tempC}°C — ${zoneLabel}`;
  if (trend !== "stabil" && delta6h != null) {
    ariciya += ` · ${trendLabel} (${delta6h > 0 ? "+" : ""}${delta6h}°C / 6 saat)`;
  }
  if (outdoor != null) {
    ariciya += ` · dış ${outdoor}°C`;
  }
  const mainNeden = nedenler.find((n) => n.tip !== "durum") || nedenler[0];
  if (mainNeden) ariciya += `. ${mainNeden.label}`;
  if (oneriler[0]) ariciya += ` → ${oneriler[0]}`;

  let uyari = null;
  if (zone === "kritik_yuksek" || tempC >= SENSOR.TEMP_HIGH_C) {
    uyari = {
      type: "temp_high",
      priority: zone === "kritik_yuksek" ? 1 : 2,
      title: "Aşırı sıcak — gölge / havalandır",
      message: `Aşırı sıcak (${tempC}°C)${mainNeden ? ` — ${mainNeden.label}` : ""}`,
    };
  } else if (zone === "kritik_dusuk" || tempC <= SENSOR.TEMP_LOW_C) {
    uyari = {
      type: "temp_low",
      priority: zone === "kritik_dusuk" ? 1 : 2,
      title: "Düşük sıcaklık — yalıtım / besleme",
      message: `Düşük sıcaklık (${tempC}°C)${mainNeden ? ` — ${mainNeden.label}` : ""}`,
    };
  } else if (rising && tempC > SENSOR.TEMP_IDEAL_MAX_C) {
    uyari = {
      type: "temp_rise",
      priority: 3,
      title: "Sıcaklık yükseliyor — kontrol",
      message: `Sıcaklık yükseliyor (+${delta6h}°C) — ${mainNeden?.label || "neden kontrol et"}`,
    };
  } else if (falling && tempC < SENSOR.TEMP_IDEAL_MIN_C) {
    uyari = {
      type: "temp_drop",
      priority: 3,
      title: "Sıcaklık düşüyor — kontrol",
      message: `Sıcaklık düşüyor (${delta6h}°C) — ${mainNeden?.label || "neden kontrol et"}`,
    };
  }

  return {
    tempScore: score,
    tempLabel: zoneLabel,
    zone,
    trend,
    trendLabel,
    tempC,
    delta6hC: delta6h,
    delta24hC: delta24h,
    disTempC: outdoor ?? null,
    nedenler: nedenler.slice(0, 5),
    oneriler: [...new Set(oneriler)].slice(0, 3),
    ariciya,
    uyari,
  };
}

/**
 * @param {{ weightKg: number }[]} series
 */
function weightVariance(series) {
  if (series.length < 3) return 999;
  const w = series.map((r) => r.weightKg);
  const mean = w.reduce((a, b) => a + b, 0) / w.length;
  return w.reduce((s, x) => s + (x - mean) ** 2, 0) / w.length;
}

/** İşçi arı gelişimi: yumurta → larva → pupa → çıkış */
const BROOD_CYCLE_DAYS = BROOD.CYCLE_DAYS;

function analyzeBroodEmergence(history, latest, cfg = {}) {
  const gain7d = weightDelta(history, 24 * 7);
  const gain21d = weightDelta(history, 24 * 21);
  const swing = dailyWeightSwing(history);

  if (cfg.broodEmergencePerDay) {
    const perDay = Math.round(cfg.broodEmergencePerDay);
    return {
      active: true,
      phase: "aktif",
      season: "yaz",
      broodCycleDays: BROOD_CYCLE_DAYS,
      emergePerDay: perDay,
      emergePerDayMin: Math.round(perDay * 0.85),
      emergePerDayMax: Math.round(perDay * 1.15),
      weightGain7dKg: Math.round(gain7d * 10) / 10,
      weightGain21dKg: Math.round(gain21d * 10) / 10,
      estimatedNewBees21d: perDay * BROOD_CYCLE_DAYS,
      beeMassGain21dKg: Math.round(perDay * BROOD_CYCLE_DAYS * BEE_MASS_KG * 10) / 10,
      confidence: "high",
      note: "Kalibrasyonlu yavru çıkış profili — 21 gün önceki kuluçka dalgasından.",
    };
  }

  if (
    gain21d < BROOD.GAIN_MIN_21D_KG ||
    swing > SCORE.SWING_BROOD_MAX_KG ||
    latest.weightKg <= 0
  ) {
    return {
      active: false,
      phase: "yok",
      season: null,
      broodCycleDays: BROOD_CYCLE_DAYS,
      emergePerDay: null,
      emergePerDayMin: null,
      emergePerDayMax: null,
      weightGain7dKg: Math.round(gain7d * 10) / 10,
      weightGain21dKg: Math.round(gain21d * 10) / 10,
      estimatedNewBees21d: null,
      beeMassGain21dKg: null,
      confidence: "low",
      note: "Belirgin yaz büyümesi yok veya tartı çok oynak (bal giriş-çıkış baskın).",
    };
  }

  const beeMassGain = gain21d * BROOD.MASS_FRACTION;
  let emergePerDay = Math.round(beeMassGain / BEE_MASS_KG / BROOD_CYCLE_DAYS);
  emergePerDay = Math.max(BROOD.EMERGE_MIN, Math.min(BROOD.EMERGE_MAX, emergePerDay));

  return {
    active: gain7d >= BROOD.GAIN_ACTIVE_7D_KG,
    phase: gain7d >= 0.2 ? "aktif" : "yavaş",
    season: "yaz",
    broodCycleDays: BROOD_CYCLE_DAYS,
    emergePerDay,
    emergePerDayMin: Math.round(emergePerDay * 0.75),
    emergePerDayMax: Math.round(emergePerDay * 1.25),
    weightGain7dKg: Math.round(gain7d * 10) / 10,
    weightGain21dKg: Math.round(gain21d * 10) / 10,
    estimatedNewBees21d: emergePerDay * BROOD_CYCLE_DAYS,
    beeMassGain21dKg: Math.round(beeMassGain * 10) / 10,
    confidence: gain21d >= 0.8 ? "medium" : "low",
    note: "Tahmini — bal stokları tartıyı maskeler; tam sayım kalibrasyon + muayene ile.",
  };
}

/**
 * Sağlık skoru — koloni fizyolojisi (oğul riski ayrı).
 */
function analyzeHealth(latest, traffic, swing, estimateTotal, drop6h, scaleAvailable = true) {
  let score = 55;

  if (latest.tempC >= SENSOR.TEMP_IDEAL_MIN_C && latest.tempC <= SENSOR.TEMP_IDEAL_MAX_C) score += 18;
  else if (latest.tempC >= 30 && latest.tempC <= 38) score += 8;
  else score -= 15;

  if (latest.humidity >= SENSOR.HUM_IDEAL_MIN_PCT && latest.humidity <= SENSOR.HUM_IDEAL_MAX_PCT) score += 12;
  else if (latest.humidity > 80 || latest.humidity < 35) score -= 12;

  if (scaleAvailable) {
    if (drop6h <= SWARM_DROP_6H_KG) score -= 25;
    else if (drop6h <= -1.5) score -= 10;
    else if (drop6h >= -0.5 && drop6h <= 0.5) score += 5;

    if (swing >= SCORE.SWING_IDEAL_MIN_KG && swing <= SCORE.SWING_IDEAL_MAX_KG) score += 10;
    else if (swing > SCORE.SWING_HIGH_KG) score -= 8;
  }

  if (traffic.beeOut >= SCORE.TRAFFIC_HEALTH_MIN) score += 8;
  else if (traffic.beeOut > 0 && traffic.beeOut < SCORE.TRAFFIC_HEALTH_WEAK) score -= 10;

  if (estimateTotal && estimateTotal < SCORE.BEE_WEAK) score -= 15;
  else if (estimateTotal && estimateTotal >= SCORE.BEE_STRONG) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Hastalık riski — sensör proxy (Varroa, chalkbrood, zayıflık, trafik).
 * Yağmurda düşük IR hastalık sayılmaz (hava maskesi).
 * @param {object} ctx { precipMm?, condition?, queenlessSuspect? }
 */
function analyzeDiseaseRisk(history, latest, traffic, healthScore, estimateTotal, ctx = {}) {
  const signals = [];
  let risk = 0;

  if (healthScore < SCORE.HEALTH_CRITICAL) {
    risk += 28;
    signals.push("Sağlık kritik — hastalık veya ciddi stres olabilir.");
  } else if (healthScore < SCORE.HEALTH_ATTENTION) {
    risk += 12;
    signals.push("Sağlık düşük — yerinde muayene önerilir.");
  }

  if (latest.humidity >= SENSOR.HUM_HIGH_PCT) {
    risk += 18;
    signals.push("Aşırı nem — chalkbrood / küf riski.");
  } else if (latest.humidity <= SENSOR.HUM_LOW_PCT) {
    risk += 10;
    signals.push("Çok kuru ortam — yavru stresi.");
  }

  if (latest.tempC < SENSOR.TEMP_LOW_C) {
    risk += 14;
    signals.push("Düşük kovan ısısı — zayıf koloni / hastalık?");
  } else if (latest.tempC > SENSOR.TEMP_HIGH_C) {
    risk += 12;
    signals.push("Aşırı sıcak — yavru ve hijyen stresi.");
  }

  const raining =
    (ctx.precipMm ?? 0) >= WEATHER.PRECIP_MM ||
    ctx.condition === "yagmur";
  const lowTraffic =
    traffic.samples > 0 && traffic.beeOut < DISEASE.TRAFFIC_LOW;

  if (lowTraffic && !raining) {
    risk += 22;
    signals.push("Düşük IR (hava açık) — hastalık / zayıflık şüphesi.");
  } else if (lowTraffic && raining) {
    risk += 3;
    signals.push("Yağmurda düşük trafik — hastalık sanma (normal).");
  }

  if (estimateTotal && estimateTotal < SCORE.BEE_WEAK) {
    risk += 15;
    signals.push("Zayıf koloni — Varroa / beslenme kontrolü.");
  }

  if (latest.weightKg > 0 && latest.weightKg < FEEDING.WEIGHT_KG) {
    risk += 18;
    signals.push("Düşük tartı — zayıflık / hastalık riski.");
  }

  const panicAudio = latest.audioRms >= SENSOR.QUEENLESS_AUDIO_MIN;
  if (latest.audioRms != null && latest.audioRms <= SENSOR.AUDIO_LOW && !panicAudio) {
    risk += 12;
    signals.push("Sessiz kovan — aktivite düşük.");
  }

  const drop7d = weightDelta(history, 24 * 7);
  const drop6h = weightDelta(history, 6);
  if (
    drop7d <= DISEASE.GRADUAL_DROP_7D_KG &&
    drop7d > -2.5 &&
    drop6h > SWARM_DROP_6H_KG
  ) {
    risk += 14;
    signals.push("Yavaş ağırlık kaybı — kronik zayıflama.");
  }

  if (ctx.queenlessSuspect) {
    risk += 18;
    signals.push("Ana şüpheli — koloni savunması zayıf.");
  }

  const weakColony = estimateTotal && estimateTotal < SCORE.BEE_WEAK;
  if (
    weakColony &&
    healthScore < SCORE.HEALTH_ATTENTION &&
    (latest.tempC < SENSOR.TEMP_LOW_C || latest.humidity >= SENSOR.HUM_HIGH_PCT)
  ) {
    risk += 10;
    signals.push("Zayıf koloni + stres — AFB/EFB muayenesi önerilir.");
  }

  if (weakColony && lowTraffic && !raining && healthScore < SCORE.HEALTH_ATTENTION) {
    risk += 8;
    signals.push("Zayıf + düşük trafik — Nosema kontrolü düşünün.");
  }

  risk = Math.max(0, Math.min(100, Math.round(risk)));

  let phase = "none";
  let label = "Hastalık riski düşük";
  if (risk >= DISEASE.RISK_HIGH) {
    phase = "high";
    label = "Hastalık riski yüksek";
  } else if (risk >= DISEASE.RISK_ELEVATED) {
    phase = "elevated";
    label = "Hastalık riski artmış";
  } else if (risk >= DISEASE.RISK_WATCH) {
    phase = "watch";
    label = "Hastalık izle";
  }

  return {
    diseaseRiskScore: risk,
    diseaseRiskLabel: label,
    diseasePhase: phase,
    diseaseSignals: signals.slice(0, 4),
  };
}

/**
 * Oğul riski — gitmeden önce (yoğunluk + mevsim + trafik + ağırlık platosu).
 */
function analyzeSwarmRisk(history, latest, traffic, estimateTotal, swing, scaleAvailable = true) {
  const recent = history.slice(-32);
  const drop6h = scaleAvailable ? weightDelta(history, 6) : null;
  const drop24h = scaleAvailable ? weightDelta(history, 24) : null;
  const gain7d = scaleAvailable ? weightDelta(history, 24 * 7) : null;

  if (
    scaleAvailable &&
    drop6h != null &&
    drop24h != null &&
    (drop6h <= SWARM_DROP_6H_KG || drop24h <= SWARM_DROP_24H_KG)
  ) {
    return {
      swarmRiskScore: 100,
      phase: "occurred",
      signals: ["Ani ağırlık düşüşü — oğul gerçekleşmiş olabilir."],
      drop6h: Math.round(drop6h * 10) / 10,
      drop24h: Math.round(drop24h * 10) / 10,
    };
  }

  let risk = swarmSeasonFactor(latest.ts);

  if (estimateTotal >= 58000) risk += 28;
  else if (estimateTotal >= 48000) risk += 20;
  else if (estimateTotal >= 40000) risk += 12;
  else if (estimateTotal && estimateTotal < 22000) risk -= 8;

  if (traffic.beeOut >= 1700) risk += 18;
  else if (traffic.beeOut >= 1300) risk += 12;
  else if (traffic.beeOut >= 900) risk += 6;

  const inOut = traffic.beeIn + traffic.beeOut;
  if (inOut > 0) {
    const ratio = traffic.beeOut / Math.max(traffic.beeIn, 1);
    if (ratio > 1.15) risk += 8;
  }

  if (scaleAvailable && latest.weightKg >= 29 && weightVariance(recent) < 0.08) risk += 14;

  if (scaleAvailable && gain7d != null && gain7d >= 1.2) risk += 10;
  else if (scaleAvailable && gain7d != null && gain7d >= 0.6) risk += 5;

  if (scaleAvailable && swing > 3.2 && drop24h != null && drop24h > -2) risk += 6;

  if (latest.tempC >= 33 && latest.tempC <= 36) risk += 4;

  const beeTier = beeCountSwarmTier(estimateTotal);
  if (beeTier.minRisk > risk) risk = beeTier.minRisk;

  risk = Math.max(0, Math.min(100, Math.round(risk)));

  const signals = [];
  if (beeTier.beeSignal) signals.push(beeTier.beeSignal);
  if (estimateTotal >= 48000) signals.push("Kovan çok kalabalık (tahmini yüksek arı sayısı).");
  if (traffic.beeOut >= 1400 && estimateTotal >= 40000) {
    signals.push("Yoğun öğlen trafiği — keşif/oğul öncesi davranış olabilir.");
  }
  if (scaleAvailable && latest.weightKg >= 29 && weightVariance(recent) < 0.08) {
    signals.push("Ağırlık yüksek ve plato — yer darlığı işareti.");
  }
  if (scaleAvailable && gain7d != null && gain7d >= 1) signals.push("Son günlerde hızlı ağırlık artışı.");
  if (swarmSeasonFactor(latest.ts) >= 20) signals.push("Oğul mevsimi (Nisan–Ağustos).");

  let phase = "normal";
  if (risk >= SWARM.RISK_CRITICAL || beeTier.alarmLevel === "critical") phase = "critical";
  else if (risk >= SWARM.RISK_ELEVATED || beeTier.alarmLevel === "elevated") phase = "elevated";
  else if (risk >= SWARM.RISK_WATCH || beeTier.alarmLevel === "watch") phase = "watch";

  return {
    swarmRiskScore: risk,
    phase,
    beeSwarmTier: beeTier.tier,
    beeSwarmTierLabel: beeTier.tierLabel,
    beeSwarmAlarmLevel: beeTier.alarmLevel,
    signals: signals.slice(0, 5),
    drop6h: drop6h != null ? Math.round(drop6h * 10) / 10 : null,
    drop24h: drop24h != null ? Math.round(drop24h * 10) / 10 : null,
  };
}

/**
 * Oğul öncesi müdahale önerileri.
 */
function preventionTips(swarm, health, estimateTotal) {
  const tips = [];
  const { swarmRiskScore, phase } = swarm;

  if (phase === "occurred") {
    tips.push("Oğul olmuş olabilir — kovanı yerinde kontrol et, ana var mı bak.");
    return tips;
  }

  if (estimateTotal >= 55000) {
    tips.unshift("MAKSIMUM: ~55k+ arı — oğul kaçınılmaz olabilir; hemen kat böl veya süper.");
  } else if (estimateTotal >= 48000 && swarmRiskScore >= 50) {
    tips.unshift(`~${Math.round(estimateTotal / 1000)}k arı — kritik kalabalık; 48 saat içinde müdahale.`);
  }

  if (swarmRiskScore >= 75) {
    tips.push("ACİL: 48 saat içinde süper ekle veya kat böl.");
    tips.push("İşleme peteği varsa yavru alanı aç; kovanı genişlet.");
  } else if (swarmRiskScore >= 50) {
    tips.push("Oğul riski yüksek — bu hafta süper veya kat planla.");
    tips.push("Giriş daraltma ve gölge ile acil baskıyı hafiflet.");
  } else if (swarmRiskScore >= 28) {
    tips.push("Takipte kal — trafik ve ağırlığı günlük izle.");
  }

  if (health < 50) {
    tips.push("Sağlık düşük — ana, yavru ve Varroa kontrolü öncelikli.");
  }
  if (estimateTotal >= 55000 && swarmRiskScore >= 40) {
    tips.push("Güçlü ve dolu kovan — yer açmazsan oğul kaçınılmaz olabilir.");
  }

  // Mevsimsel ve operasyonel önleme (v2)
  const month = new Date().getMonth() + 1;
  if (month >= 8 && month <= 10) {
    tips.push("Sonbahar — Varroa tedavisi penceresi; kış store yeterliliğini kontrol et.");
  }
  if (month >= 11 || month <= 2) {
    tips.push("Kış — nem ve açlık riski; tartı düşüşünü haftalık izle.");
  }
  if (month >= 4 && month <= 6) {
    tips.push("İlkbahar — kovan genişletme ve ana kontrolü; oğul sezonuna hazırlan.");
  }
  if (swarmRiskScore < 28 && estimateTotal >= 35000 && estimateTotal < 45000) {
    tips.push("Orta güç — hasat veya besleme planını güncelle.");
  }

  if (tips.length === 0) {
    tips.push("Oğul riski düşük — rutin kontrol yeterli.");
  }

  return tips.slice(0, 3);
}

/**
 * @param {{ weightKg: number, tempC: number, humidity: number, beeIn: number, beeOut: number, ts: string }[]} history
 * @param {{ weightKg: number, tempC: number, humidity: number, beeIn: number, beeOut: number, ts: string }} latest
 * @param {HiveConfig} cfg
 */
function analyzeColony(history, latest, cfg = {}, health = null) {
  const h = health || { available: { ir: true, humidity: true, scale: true } };
  const scaleAvailable = h.available?.scale !== false;
  const traffic =
    h.available?.ir !== false ? middayTraffic(history) : { samples: 0, beeOut: 0, beeIn: 0 };
  const fromTraffic = h.available?.ir
    ? beesFromTraffic(traffic.beeOut, {
        ...cfg,
        middayBeeOutRef: cfg.middayBeeOutRef ?? traffic.beeOut,
      })
    : null;
  const fromWeight = scaleAvailable
    ? latest.weightKg > 0
      ? beesFromWeight(latest.weightKg, cfg)
      : beesFromWeight(latest.weightKg, cfg)
    : null;

  let estimateTotal = null;
  let estimateMin = null;
  let estimateMax = null;
  let confidence = "low";

  if (fromTraffic && fromWeight) {
    const w = 0.55;
    estimateTotal = Math.round(
      fromTraffic.total * w + fromWeight.total * (1 - w)
    );
    estimateMin = Math.round(estimateTotal * 0.85);
    estimateMax = Math.round(estimateTotal * 1.15);
    confidence = cfg.referenceBeeCount ? "high" : "medium";
  } else if (fromTraffic) {
    estimateTotal = fromTraffic.total;
    estimateMin = Math.round(estimateTotal * 0.75);
    estimateMax = Math.round(estimateTotal * 1.25);
    confidence = "medium";
  } else if (fromWeight) {
    estimateTotal = fromWeight.total;
    estimateMin = Math.round(estimateTotal * 0.7);
    estimateMax = Math.round(estimateTotal * 1.3);
    confidence = "low";
  }

  const swing = scaleAvailable ? dailyWeightSwing(history) : 0;
  let score = 50;

  if (estimateTotal) {
    if (estimateTotal >= SCORE.BEE_MEGA) score += 18;
    else if (estimateTotal >= 30000) score += 10;
    else if (estimateTotal < SCORE.BEE_WEAK) score -= 15;
  }

  if (h.available?.ir) {
    if (traffic.beeOut >= SCORE.TRAFFIC_STRONG) score += 12;
    else if (traffic.beeOut >= SCORE.TRAFFIC_GOOD) score += 6;
    else if (traffic.beeOut > 0 && traffic.beeOut < SCORE.TRAFFIC_WEAK) score -= 10;
  }

  if (scaleAvailable) {
    if (swing >= SCORE.SWING_IDEAL_MIN_KG && swing <= SCORE.SWING_IDEAL_MAX_KG) score += 10;
    else if (swing > SCORE.SWING_HIGH_KG) score -= 12;
  }

  if (latest.tempC >= SENSOR.TEMP_IDEAL_MIN_C && latest.tempC <= SENSOR.TEMP_IDEAL_MAX_C) score += 8;
  else if (latest.tempC > SENSOR.TEMP_HIGH_C || latest.tempC < SENSOR.TEMP_LOW_C) score -= 8;

  if (h.available?.humidity && latest.humidity >= 45 && latest.humidity <= 75) score += 5;

  const trafficBalance = traffic.beeIn + traffic.beeOut;
  if (h.available?.ir && trafficBalance > 0) {
    const ratio = Math.min(traffic.beeIn, traffic.beeOut) / Math.max(traffic.beeIn, traffic.beeOut, 1);
    if (ratio > 0.65) score += 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const strength = strengthLabel(estimateTotal || 0);
  const drop6h = scaleAvailable ? weightDelta(history, 6) : null;
  const healthScore = analyzeHealth(
    latest,
    traffic,
    swing,
    estimateTotal,
    drop6h,
    scaleAvailable
  );
  const swarm = analyzeSwarmRisk(
    history,
    latest,
    traffic,
    estimateTotal,
    swing,
    scaleAvailable
  );
  const prevention = preventionTips(swarm, healthScore, estimateTotal);
  const broodEmergence = analyzeBroodEmergence(history, latest, cfg);
  const care = careTips({
    score,
    healthScore,
    swarm,
    estimateTotal,
    swing,
    traffic,
    latest,
    strength: strength.key,
    prevention,
    broodEmergence,
  });

  return {
    score,
    scoreLabel: scoreLabel(score),
    healthScore,
    healthLabel: healthLabel(healthScore),
    swarmRiskScore: swarm.swarmRiskScore,
    swarmRiskLabel: swarmRiskLabel(swarm.swarmRiskScore, swarm.phase),
    swarmPhase: swarm.phase,
    beeSwarmTier: swarm.beeSwarmTier,
    beeSwarmTierLabel: swarm.beeSwarmTierLabel,
    beeSwarmAlarmLevel: swarm.beeSwarmAlarmLevel,
    swarmSignals: swarm.signals,
    prevention,
    strength: strength.key,
    strengthLabel: strength.label,
    beeEstimate: estimateTotal,
    beeEstimateMin: estimateMin,
    beeEstimateMax: estimateMax,
    foragersMidday: fromTraffic?.foragersOutside ?? null,
    confidence,
    beeEstimateSource: h.available?.ir
      ? fromWeight
        ? "traffic_weight"
        : "traffic_only"
      : fromWeight
        ? "weight_only"
        : h.available?.camera
          ? "camera_only"
          : "limited",
    sensorHealth: h,
    middayTraffic: traffic,
    dailyWeightSwingKg: Math.round(swing * 10) / 10,
    weightDrop6hKg: swarm.drop6h,
    weightDrop24hKg: swarm.drop24h,
    calibrated: Boolean(cfg.referenceBeeCount || cfg.beeOutMultiplier),
    broodEmergence,
    care,
    note: "Tahmini değerler; oğul riski gitmeden önce tahmindir, yerinde doğrulayın.",
  };
}

/**
 * @param {object} ctx
 */
function careTips(ctx) {
  const tips = [...(ctx.prevention || [])];
  const { healthScore, swarm, traffic, latest } = ctx;

  if (swarm.phase !== "occurred" && swarm.swarmRiskScore >= SWARM.RISK_ELEVATED) {
    return tips.slice(0, 3);
  }

  if (healthScore < SCORE.HEALTH_CRITICAL) {
    tips.push("Sağlık kritik — sıcaklık/nem ve koloni gücünü acil kontrol et.");
  }
  if (ctx.broodEmergence?.active && ctx.broodEmergence.emergePerDay >= 1200) {
    tips.push(
      `Yaz büyümesi — günde ~${Math.round(ctx.broodEmergence.emergePerDay / 100) / 10}k yavru çıkışı; kat / süper planla.`
    );
  }
  if (traffic.samples > 0 && traffic.beeOut < 300) {
    tips.push("Öğlen çıkış düşük — hava veya zayıf koloni olabilir.");
  }
  if (latest.tempC > 37) {
    tips.push("Sıcaklık yüksek — gölge ve havalandırma.");
  }
  if (!traffic.samples) {
    tips.push("Öğlen verisi yok — kalibrasyon için birkaç gün veri topla.");
  }
  if (tips.length === 0) {
    tips.push("Kovan dengeli — rutin kontrol yeterli.");
  }

  return tips.slice(0, 3);
}

module.exports = {
  analyzeColony,
  analyzeBroodEmergence,
  analyzeDiseaseRisk,
  analyzeTemperature,
  analyzeHumidity,
  humDelta,
  middayTraffic,
  beeCountSwarmTier,
  BEE_MASS_KG,
  FORAGER_FRACTION,
  BROOD_CYCLE_DAYS,
};
