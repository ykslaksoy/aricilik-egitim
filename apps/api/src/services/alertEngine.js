const {
  BEE_SWARM_TIERS,
  SENSOR,
  SWARM,
  SCORE,
  DISEASE,
} = require("../../../../packages/shared/constants");
const { isQueenlessSuspect } = require("../hiveState");
const { transportRules } = require("./transportMode");

/**
 * @param {number[]|null|undefined} cornerKg
 */
function cornerImbalance(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length < 4) return 0;
  return Math.max(...cornerKg) - Math.min(...cornerKg);
}

/**
 * Taşıma modunda bu alarm türü bastırılır mı?
 * @param {string} type
 * @param {string[]} suppress
 */
function isSuppressed(type, suppress) {
  if (suppress.includes(type)) return true;
  if (type === "bee_swarm_tier" && suppress.includes("bee_estimate")) return true;
  return false;
}

/**
 * Tek kovan için sensör + koloni değerlendirmesi → uyarı listesi.
 * @param {object} reading
 * @param {object} colony
 * @param {object} [meta]
 */
function buildHiveAlerts(reading, colony, meta = {}) {
  if (!reading || !colony) return [];

  const alerts = [];
  const hiveId = reading.hiveId;
  const rawTag = meta.label || "";
  const tagLabel = String(rawTag)
    .replace(/^Canlı\s*ingest$/i, "Canlı veri")
    .replace(/\boffline\b/gi, "çevrimdışı")
    .replace(/\bingest\b/gi, "veri");
  const tag = tagLabel ? ` [${tagLabel}]` : "";
  const transport = Boolean(reading.transportMode || meta.transportMode);
  const { suppressAlerts } = transportRules(transport);
  const bees =
    colony.beeEstimate != null
      ? ` ~${Math.round(colony.beeEstimate / 1000)}k arı`
      : "";

  if (!isSuppressed("swarm_occurred", suppressAlerts) && colony.swarmPhase === "occurred") {
    alerts.push({
      id: `swarm-${hiveId}-occurred`,
      hiveId,
      type: "swarm_occurred",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — oğul gerçekleşmiş olabilir (${colony.weightDrop6hKg} kg / 6 saat)`,
      ts: reading.ts,
      read: false,
    });
  } else if (!isSuppressed("swarm_risk", suppressAlerts)) {
    if (colony.swarmRiskScore >= SWARM.RISK_CRITICAL) {
      alerts.push({
        id: `swarm-${hiveId}-critical`,
        hiveId,
        type: "swarm_risk",
        priority: 1,
        message: `Kovan ${hiveId}${tag} — oğul ACİL${bees} (${colony.swarmRiskScore}/100)`,
        ts: reading.ts,
        read: false,
      });
    } else if (colony.swarmRiskScore >= SWARM.RISK_ELEVATED) {
      alerts.push({
        id: `swarm-${hiveId}-elevated`,
        hiveId,
        type: "swarm_risk",
        priority: 2,
        message: `Kovan ${hiveId}${tag} — oğul riski yüksek${bees} (${colony.swarmRiskScore}/100)`,
        ts: reading.ts,
        read: false,
      });
    }
  }

  if (
    !isSuppressed("bee_swarm_tier", suppressAlerts) &&
    (colony.beeSwarmTier ?? 0) >= 1 &&
    colony.swarmPhase !== "occurred"
  ) {
    alerts.push({
      id: `bee-tier-${hiveId}`,
      hiveId,
      type: "bee_swarm_tier",
      priority: colony.beeSwarmTier >= 4 ? 1 : colony.beeSwarmTier >= 2 ? 2 : 4,
      message: `Kovan ${hiveId}${tag} — ${colony.beeSwarmTierLabel}${bees}`,
      ts: reading.ts,
      read: false,
    });
  }

  if (reading.battery < SENSOR.BATTERY_LOW_PCT) {
    alerts.push({
      id: `bat-${hiveId}`,
      hiveId,
      type: "low_battery",
      priority: 3,
      message: `Kovan ${hiveId}${tag} — düşük pil (%${reading.battery})`,
      ts: reading.ts,
      read: false,
    });
  }

  if (reading.tempC <= SENSOR.TEMP_LOW_C) {
    const t = colony.temperature;
    alerts.push({
      id: `temp-low-${hiveId}`,
      hiveId,
      type: "temp_low",
      priority: t?.uyari?.priority ?? 2,
      title: t?.uyari?.title,
      message: t?.ariciya
        ? `Kovan ${hiveId}${tag} — ${t.ariciya}`
        : `Kovan ${hiveId}${tag} — düşük sıcaklık (${reading.tempC}°C)`,
      ts: reading.ts,
      read: false,
    });
  } else if (reading.tempC >= SENSOR.TEMP_HIGH_C) {
    const t = colony.temperature;
    alerts.push({
      id: `temp-high-${hiveId}`,
      hiveId,
      type: "temp_high",
      priority: t?.uyari?.priority ?? 2,
      title: t?.uyari?.title,
      message: t?.ariciya
        ? `Kovan ${hiveId}${tag} — ${t.ariciya}`
        : `Kovan ${hiveId}${tag} — aşırı sıcak (${reading.tempC}°C)`,
      ts: reading.ts,
      read: false,
    });
  } else {
    const t = colony.temperature?.uyari;
    if (
      t &&
      (t.type === "temp_rise" || t.type === "temp_drop") &&
      !isSuppressed(t.type, suppressAlerts)
    ) {
      alerts.push({
        id: `${t.type}-${hiveId}`,
        hiveId,
        type: t.type,
        priority: t.priority,
        title: t.title,
        message: `Kovan ${hiveId}${tag} — ${t.message}`,
        ts: reading.ts,
        read: false,
      });
    }
  }

  if (reading.humidity <= SENSOR.HUM_LOW_PCT) {
    const h = colony.humidity;
    alerts.push({
      id: `hum-low-${hiveId}`,
      hiveId,
      type: "humidity_low",
      priority: h?.uyari?.priority ?? 3,
      title: h?.uyari?.title,
      message: h?.ariciya
        ? `Kovan ${hiveId}${tag} — ${h.ariciya}`
        : `Kovan ${hiveId}${tag} — düşük nem (%${reading.humidity})`,
      ts: reading.ts,
      read: false,
    });
  } else if (reading.humidity >= SENSOR.HUM_HIGH_PCT) {
    const h = colony.humidity;
    alerts.push({
      id: `hum-high-${hiveId}`,
      hiveId,
      type: "humidity_high",
      priority: h?.uyari?.priority ?? 2,
      title: h?.uyari?.title,
      message: h?.ariciya
        ? `Kovan ${hiveId}${tag} — ${h.ariciya}`
        : `Kovan ${hiveId}${tag} — aşırı nem (%${reading.humidity})`,
      ts: reading.ts,
      read: false,
    });
  } else {
    const h = colony.humidity?.uyari;
    if (h && h.type === "humidity_rise" && !isSuppressed(h.type, suppressAlerts)) {
      alerts.push({
        id: `${h.type}-${hiveId}`,
        hiveId,
        type: h.type,
        priority: h.priority,
        title: h.title,
        message: `Kovan ${hiveId}${tag} — ${h.message}`,
        ts: reading.ts,
        read: false,
      });
    }
  }

  const imb = cornerImbalance(reading.cornerKg);
  if (imb >= SENSOR.CORNER_IMBALANCE_KG) {
    alerts.push({
      id: `imb-${hiveId}`,
      hiveId,
      type: "imbalance",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — dengesizlik (köşe farkı ${imb.toFixed(1)} kg)`,
      ts: reading.ts,
      read: false,
    });
  }

  if (reading.vibration >= SENSOR.VIBRATION_HIGH) {
    alerts.push({
      id: `vib-${hiveId}`,
      hiveId,
      type: "vibration",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — yüksek titreşim (${reading.vibration})`,
      ts: reading.ts,
      read: false,
    });
  }

  if (reading.audioRms != null && reading.audioRms <= SENSOR.AUDIO_LOW) {
    alerts.push({
      id: `aud-low-${hiveId}`,
      hiveId,
      type: "audio_low",
      priority: 4,
      message: `Kovan ${hiveId}${tag} — düşük ses / aktivite (RMS ${reading.audioRms})`,
      ts: reading.ts,
      read: false,
    });
  } else if (reading.audioRms != null && reading.audioRms >= SENSOR.AUDIO_HIGH) {
    alerts.push({
      id: `aud-high-${hiveId}`,
      hiveId,
      type: "audio_high",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — yüksek uğultu (RMS ${reading.audioRms})`,
      ts: reading.ts,
      read: false,
    });
  }

  if (reading.rssi != null && reading.rssi <= SENSOR.RSSI_LOW_DBM) {
    alerts.push({
      id: `rssi-${hiveId}`,
      hiveId,
      type: "rssi_low",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — zayıf LoRa sinyali (${reading.rssi} dBm)`,
      ts: reading.ts,
      read: false,
    });
  }

  if (
    !isSuppressed("traffic_low", suppressAlerts) &&
    colony.middayTraffic &&
    colony.middayTraffic.beeOut < SENSOR.MIDDAY_TRAFFIC_LOW &&
    colony.middayTraffic.samples > 0
  ) {
    alerts.push({
      id: `ir-low-${hiveId}`,
      hiveId,
      type: "traffic_low",
      priority: 3,
      message: `Kovan ${hiveId}${tag} — düşük IR trafik (öğlen out ${colony.middayTraffic.beeOut})`,
      ts: reading.ts,
      read: false,
    });
  }

  if (colony.healthScore < SCORE.HEALTH_CRITICAL) {
    alerts.push({
      id: `health-${hiveId}`,
      hiveId,
      type: "health_critical",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — sağlık kritik (${colony.healthScore}/100)`,
      ts: reading.ts,
      read: false,
    });
  }

  if (
    (colony.diseaseRiskScore ?? 0) >= DISEASE.RISK_HIGH &&
    colony.swarmPhase !== "occurred"
  ) {
    const hint = colony.diseaseSignals?.[0] || colony.diseaseRiskLabel;
    alerts.push({
      id: `disease-${hiveId}`,
      hiveId,
      type: "disease_risk",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — hastalık riski yüksek (${colony.diseaseRiskScore}/100) — ${hint}`,
      ts: reading.ts,
      read: false,
    });
  } else if (
    (colony.diseaseRiskScore ?? 0) >= DISEASE.RISK_ELEVATED &&
    colony.swarmPhase !== "occurred"
  ) {
    alerts.push({
      id: `disease-watch-${hiveId}`,
      hiveId,
      type: "disease_risk",
      priority: 3,
      message: `Kovan ${hiveId}${tag} — hastalık riski artmış (${colony.diseaseRiskScore}/100)`,
      ts: reading.ts,
      read: false,
    });
  }

  const ageMs = Date.now() - new Date(reading.ts).getTime();
  if (ageMs > SENSOR.OFFLINE_MS || reading.fault === "offline") {
    alerts.push({
      id: `offline-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "offline",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — ARIZA: çevrimdışı / veri yok (${Math.round(ageMs / 3600000)} saat)`,
      ts: reading.ts,
      read: false,
    });
  }
  if (
    reading.weightKg <= SENSOR.WEIGHT_FAULT_MIN_KG ||
    reading.weightKg > SENSOR.WEIGHT_FAULT_MAX_KG ||
    reading.fault === "scale"
  ) {
    alerts.push({
      id: `fault-scale-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "scale",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: tartı arızalı — IR/ses/kamera ile devam`,
      ts: reading.ts,
      read: false,
    });
  }
  if (
    reading.tempC < SENSOR.TEMP_FAULT_MIN_C ||
    reading.tempC > SENSOR.TEMP_FAULT_MAX_C ||
    reading.fault === "temp"
  ) {
    alerts.push({
      id: `fault-temp-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "temp",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: sıcaklık sensörü arızalı (${reading.tempC}°C)`,
      ts: reading.ts,
      read: false,
    });
  }
  if (
    reading.humidity < 0 ||
    reading.humidity > 100 ||
    reading.fault === "humidity"
  ) {
    alerts.push({
      id: `fault-hum-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "humidity",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: nem sensörü arızalı — dış hava yedek`,
      ts: reading.ts,
      read: false,
    });
  }
  if (reading.fault === "ir") {
    alerts.push({
      id: `fault-ir-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "ir",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: IR sayaç arızalı — tartı/kamera yedek`,
      ts: reading.ts,
      read: false,
    });
  }
  if (reading.audioRms < 0 || reading.fault === "mic") {
    alerts.push({
      id: `fault-mic-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "mic",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: mikrofon arızalı`,
      ts: reading.ts,
      read: false,
    });
  }
  if (reading.vibration < 0 || reading.fault === "vibration") {
    alerts.push({
      id: `fault-vib-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "vibration",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: titreşim sensörü arızalı`,
      ts: reading.ts,
      read: false,
    });
  }
  if (reading.fault === "camera") {
    alerts.push({
      id: `fault-cam-${hiveId}`,
      hiveId,
      type: "sensor_fault",
      fault: "camera",
      priority: 3,
      degraded: true,
      message: `Kovan ${hiveId}${tag} — kısmi mod: kamera arızalı — IR/tartı yedek`,
      ts: reading.ts,
      read: false,
    });
  }

  const queenlessSuspect = isQueenlessSuspect(reading, colony, meta);

  if (queenlessSuspect && colony.swarmPhase !== "occurred") {
    alerts.push({
      id: `queenless-${hiveId}`,
      hiveId,
      type: "queenless",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — ana kaybı şüphesi (ses/trafik/ana kaydı) — yerinde kontrol`,
      ts: reading.ts,
      read: false,
    });
  }

  const queenlessFusion = colony.queenlessFusion;
  if (
    !queenlessSuspect &&
    queenlessFusion?.queenlessSkoru >= 70 &&
    colony.swarmPhase !== "occurred"
  ) {
    alerts.push({
      id: `queenless-fusion-${hiveId}`,
      hiveId,
      type: "queenless",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — ana kaybı yüksek güven (${queenlessFusion.queenlessSkoru}/100 · ${queenlessFusion.pencere})`,
      ts: reading.ts,
      read: false,
    });
  }

  const robbing = colony.robbing;
  if (robbing?.durum === "aktif" || (robbing?.robbingSkoru ?? 0) >= 65) {
    alerts.push({
      id: `robbing-${hiveId}`,
      hiveId,
      type: "robbing",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — yağma tespiti (${robbing.robbingSkoru}/100) — giriş daralt`,
      ts: reading.ts,
      read: false,
    });
  } else if (robbing?.durum === "suphe") {
    alerts.push({
      id: `robbing-watch-${hiveId}`,
      hiveId,
      type: "robbing",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — yağma şüphesi (${robbing.robbingSkoru}/100)`,
      ts: reading.ts,
      read: false,
    });
  }

  const varroa = colony.varroa;
  if ((varroa?.varroaSkoru ?? 0) >= DISEASE.RISK_HIGH) {
    alerts.push({
      id: `varroa-${hiveId}`,
      hiveId,
      type: "varroa_risk",
      priority: 2,
      message: `Kovan ${hiveId}${tag} — Varroa riski yüksek (${varroa.varroaSkoru}/100) — sayım/ilaç`,
      ts: reading.ts,
      read: false,
    });
  }

  const harvest = colony.harvest;
  if (harvest?.hazirlikSkoru >= 70 && harvest?.durum === "hazir") {
    alerts.push({
      id: `harvest-${hiveId}`,
      hiveId,
      type: "harvest_ready",
      priority: 3,
      message: `Kovan ${hiveId}${tag} — hasat zamanı (${harvest.hazirlikSkoru}/100 · ~${harvest.honeyKgEstimate ?? "?"} kg bal)`,
      ts: reading.ts,
      read: false,
    });
  }

  const winter = colony.winterStore;
  if (winter?.durum === "kritik" && (winter.riskSkoru ?? 0) >= 50) {
    alerts.push({
      id: `winter-${hiveId}`,
      hiveId,
      type: "winter_starvation",
      priority: 1,
      message: `Kovan ${hiveId}${tag} — kış açlık riski (${winter.riskSkoru}/100 · ~${winter.daysLeftEstimate} gün store)`,
      ts: reading.ts,
      read: false,
    });
  }

  return alerts;
}

/**
 * Tüm kovanlar için uyarıları üret ve sırala.
 * @param {Map<number, object>} latestMap
 * @param {(id: number) => object|null} colonyFor
 * @param {Map<number, object>} hiveMetaMap
 */
function syncAlertsFromHives(
  latestMap,
  colonyFor,
  hiveMetaMap,
  weatherFn,
  gateEvalFn,
  gateApplyFn
) {
  const all = [];
  for (const hiveId of [...latestMap.keys()]) {
    const reading = latestMap.get(hiveId);
    const colony = colonyFor(hiveId);
    if (!reading || !colony) continue;
    const meta = hiveMetaMap.get(hiveId) || {};
    all.push(...buildHiveAlerts(reading, colony, meta));
    if (weatherFn && gateEvalFn) {
      const weather = weatherFn(hiveId, reading);
      const gate = gateEvalFn(reading, colony, meta, weather);
      if (gateApplyFn && gate.mod === "otomatik") {
        gateApplyFn(meta, gate);
        hiveMetaMap.set(hiveId, meta);
      }
      if (gate.uyari) {
        all.push({
          id: `gate-${hiveId}-${gate.hedef}`,
          hiveId,
          type: gate.uyari.type,
          priority: gate.uyari.priority,
          message: `Kovan ${hiveId}${meta.label ? ` [${meta.label}]` : ""} — ${gate.uyari.message}`,
          ts: reading.ts,
          read: false,
        });
      }
    }
  }
  all.sort(
    (a, b) => (a.priority ?? 5) - (b.priority ?? 5) || b.hiveId - a.hiveId
  );
  return all;
}

module.exports = {
  buildHiveAlerts,
  syncAlertsFromHives,
  cornerImbalance,
  BEE_SWARM_TIERS,
};
