/**
 * Sensör kullanılabilirliği — tam donanım veya kısmi arıza (graceful degradation).
 * Kamera / IR / nem arızalıyken tartı + ses + kalan sensörlerle devam.
 */

const { SENSOR } = require("../../../../packages/shared/constants");

const SENSOR_LABELS = {
  scale: "Tartı",
  temp: "Sıcaklık",
  humidity: "Nem",
  ir: "IR sayaç",
  mic: "Mikrofon",
  vibration: "Titreşim",
  camera: "Kamera (kovan)",
  mainCamera: "Ana kamera (arılık)",
  offline: "Çevrimdışı",
};

/** Kritik arıza — yalnızca bağlantı kesintisi izlemeyi durdurur */
const CRITICAL_FAULTS = new Set(["offline"]);

function collectFaults(reading) {
  const faults = new Set();
  if (reading?.fault) faults.add(String(reading.fault));
  if (Array.isArray(reading?.faults)) {
    for (const f of reading.faults) if (f) faults.add(String(f));
  }
  if (reading?.cameraPresent === false) faults.add("camera");
  if ((reading?.humidity ?? 0) > 100) faults.add("humidity");
  if (
    reading?.fault === "scale" ||
    (reading?.weightKg != null &&
      reading.weightKg <= SENSOR.WEIGHT_FAULT_MIN_KG &&
      !faults.has("offline"))
  ) {
    faults.add("scale");
  }
  if (reading?.fault === "camera" || faults.has("camera")) {
    faults.add("camera");
  }
  if (reading?.fault === "mainCamera" || faults.has("mainCamera")) {
    faults.add("mainCamera");
  }
  return faults;
}

/**
 * @param {object} reading
 * @param {object} [meta]
 */
function assessSensorHealth(reading, meta = {}) {
  const faults = collectFaults(reading);
  const cameraHardware = true;
  const mainCameraConfigured = Boolean(
    reading?.mainCameraPresent || meta.mainCameraAtLocation
  );

  const available = {
    scale:
      !faults.has("scale") &&
      !faults.has("offline") &&
      (reading?.weightKg == null || reading.weightKg > SENSOR.WEIGHT_FAULT_MIN_KG),
    temp:
      !faults.has("temp") &&
      (reading?.tempC == null || reading.tempC >= SENSOR.TEMP_FAULT_MIN_C),
    humidity: !faults.has("humidity") && (reading?.humidity ?? 0) <= 100,
    ir: !faults.has("ir"),
    mic: !faults.has("mic") && (reading?.audioRms ?? 0) >= 0,
    vibration: !faults.has("vibration"),
    camera: cameraHardware && !faults.has("camera"),
    mainCamera:
      mainCameraConfigured &&
      !faults.has("mainCamera") &&
      reading?.mainCameraPresent !== false,
    connectivity: !faults.has("offline"),
  };

  const fallbacks = [];
  if (!available.ir && available.camera) fallbacks.push("ir→kamera_cv");
  if (!available.ir && available.scale) fallbacks.push("ir→tartı");
  if (!available.scale && available.ir) fallbacks.push("tartı→ir");
  if (!available.scale && available.camera) fallbacks.push("tartı→kamera_cv");
  if (!available.scale && available.mic) fallbacks.push("tartı→ses");
  if (!available.humidity) fallbacks.push("nem→dış_hava");
  if (!available.mic && available.ir) fallbacks.push("ses→trafik");
  if (!available.camera && available.ir) fallbacks.push("kamera_yok→ir");
  if (mainCameraConfigured && !available.mainCamera) {
    if (available.camera) fallbacks.push("ana_kamera→kovan_kameraları");
    fallbacks.push("ana_kamera→titreşim");
  }

  const down = [];
  if (!available.scale) down.push({ id: "scale", label: SENSOR_LABELS.scale });
  if (!available.temp) down.push({ id: "temp", label: SENSOR_LABELS.temp });
  if (!available.humidity) down.push({ id: "humidity", label: SENSOR_LABELS.humidity });
  if (!available.ir) down.push({ id: "ir", label: SENSOR_LABELS.ir });
  if (!available.mic) down.push({ id: "mic", label: SENSOR_LABELS.mic });
  if (!available.vibration) down.push({ id: "vibration", label: SENSOR_LABELS.vibration });
  if (cameraHardware && !available.camera) {
    down.push({ id: "camera", label: SENSOR_LABELS.camera });
  }
  // Ana kamera arılık seviyesinde — kovan kısmi moduna dahil edilmez (opsiyonel)
  if (!available.connectivity) down.push({ id: "offline", label: SENSOR_LABELS.offline });

  const hasMonitoringPath =
    available.ir ||
    available.camera ||
    available.mic ||
    available.temp ||
    available.humidity ||
    available.vibration;
  const critical =
    faults.has("offline") ||
    !available.connectivity ||
    !hasMonitoringPath;

  let mode = "full";
  if (critical) mode = "critical";
  else if (down.length > 0) mode = "degraded";

  let ariciya = "Tüm sensörler aktif";
  if (mode === "degraded") {
    ariciya = `Kısmi mod — ${down.map((d) => d.label).join(", ")} devre dışı`;
    if (fallbacks.length) ariciya += ` · yedek: ${fallbacks.join(", ")}`;
  } else if (mode === "critical") {
    ariciya = "Kritik sensör arızası — sınırlı izleme";
  }

  return {
    mode,
    available,
    faults: [...faults],
    fallbacks,
    down,
    ariciya,
    mainCamera: {
      configured: mainCameraConfigured,
      available: available.mainCamera,
      optional: !mainCameraConfigured,
    },
  };
}

function isAvailable(health, sensorId) {
  return Boolean(health?.available?.[sensorId]);
}

function hasCriticalFault(health) {
  return health?.mode === "critical" || [...(health?.faults || [])].some((f) => CRITICAL_FAULTS.has(f));
}

module.exports = {
  assessSensorHealth,
  collectFaults,
  isAvailable,
  hasCriticalFault,
  SENSOR_LABELS,
  CRITICAL_FAULTS,
};
