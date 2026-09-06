/** Panel etiketleri — i18n hazır (varsayılan tr; sonra en / …) */
const PanelLabels = (() => {
  const catalogs = {
    tr: {
      alertType: {
        swarm_occurred: "Oğul gerçekleşti",
        swarm_risk: "Oğul riski",
        bee_swarm_tier: "Arı yoğunluğu",
        queenless: "Ana kaybı",
        robbing: "Yağma",
        varroa_risk: "Varroa riski",
        harvest_ready: "Hasat",
        winter_starvation: "Kış açlığı",
        sensor_fault: "Sensör arızası",
        low_battery: "Düşük pil",
        health_critical: "Sağlık kritik",
        disease_risk: "Hastalık riski",
        gate_auto: "Giriş kapısı",
        vibration: "Titreşim",
        imbalance: "Dengesizlik",
        temp_high: "Yüksek sıcaklık",
        temp_low: "Düşük sıcaklık",
        temp_rise: "Sıcaklık yükseliyor",
        temp_drop: "Sıcaklık düşüyor",
        humidity_high: "Yüksek nem",
        humidity_low: "Düşük nem",
        humidity_rise: "Nem yükseliyor",
        traffic_low: "Düşük trafik",
        security: "Güvenlik",
      },
      hiveStatus: {
        ok: "Normal",
        normal: "Normal",
        watch: "İzle",
        alert: "Uyarı",
        fault: "Arıza",
        offline: "Çevrimdışı",
        weak: "Zayıf",
        degraded: "Kısmi mod",
        low_battery: "Düşük pil",
      },
      fault: {
        offline: "çevrimdışı",
        scale: "tartı",
        temp: "sıcaklık",
        humidity: "nem",
        ir: "IR sensör",
        vibration: "titreşim",
        camera: "kamera",
        audio: "mikrofon",
        battery: "pil",
        gps: "GPS",
        _unknown: "bilinmiyor",
      },
      role: { yonetici: "Yönetici", arici: "Patron", isci: "Çalışan" },
      ui: { alert_fallback: "Uyarı" },
    },
    en: {
      alertType: {
        swarm_occurred: "Swarm occurred",
        swarm_risk: "Swarm risk",
        bee_swarm_tier: "Bee density",
        queenless: "Queenless",
        robbing: "Robbing",
        varroa_risk: "Varroa risk",
        harvest_ready: "Harvest ready",
        winter_starvation: "Winter starvation",
        sensor_fault: "Sensor fault",
        low_battery: "Low battery",
        health_critical: "Health critical",
        disease_risk: "Disease risk",
        gate_auto: "Entrance gate",
        vibration: "Vibration",
        imbalance: "Imbalance",
        temp_high: "High temperature",
        temp_low: "Low temperature",
        temp_rise: "Temperature rising",
        temp_drop: "Temperature dropping",
        humidity_high: "High humidity",
        humidity_low: "Low humidity",
        humidity_rise: "Humidity rising",
        traffic_low: "Low traffic",
        security: "Security",
      },
      hiveStatus: {
        ok: "Normal",
        normal: "Normal",
        watch: "Watch",
        alert: "Alert",
        fault: "Fault",
        offline: "Offline",
        weak: "Weak",
        degraded: "Degraded",
        low_battery: "Low battery",
      },
      fault: {
        offline: "offline",
        scale: "scale",
        temp: "temperature",
        humidity: "humidity",
        ir: "IR sensor",
        vibration: "vibration",
        camera: "camera",
        audio: "microphone",
        battery: "battery",
        gps: "GPS",
        _unknown: "unknown",
      },
      role: { yonetici: "Admin", arici: "Beekeeper", isci: "Worker" },
      ui: { alert_fallback: "Alert" },
    },
  };

  let locale =
    new URLSearchParams(location.search).get("lang") ||
    localStorage.getItem("koloni.lang") ||
    "tr";
  if (!catalogs[locale]) locale = "tr";

  function pack() {
    return catalogs[locale] || catalogs.tr;
  }
  function setLocale(code) {
    if (!catalogs[code]) return locale;
    locale = code;
    localStorage.setItem("koloni.lang", code);
    return locale;
  }
  function getLocale() {
    return locale;
  }
  function listLocales() {
    return Object.keys(catalogs);
  }
  function alertType(type) {
    if (!type) return pack().ui.alert_fallback;
    return pack().alertType[type] || catalogs.tr.alertType[type] || String(type).replace(/_/g, " ");
  }
  function hiveStatus(status) {
    if (!status) return "—";
    return pack().hiveStatus[status] || catalogs.tr.hiveStatus[status] || String(status);
  }
  function fault(code) {
    if (!code) return pack().fault._unknown;
    return pack().fault[code] || catalogs.tr.fault[code] || String(code);
  }
  function role(rol) {
    if (!rol) return "—";
    return pack().role[rol] || catalogs.tr.role[rol] || String(rol);
  }
  function cleanMessage(msg) {
    if (!msg) return "—";
    let s = String(msg);
    if (locale === "tr") {
      s = s
        .replace(/\boffline\b/gi, "çevrimdışı")
        .replace(/\[Canlı ingest\]/gi, "[Canlı veri]")
        .replace(/\bingest\b/gi, "canlı veri");
    }
    return s;
  }

  return {
    alertType,
    hiveStatus,
    fault,
    role,
    cleanMessage,
    setLocale,
    getLocale,
    listLocales,
  };
})();

/** Ortak panel oturumu — yönetici / arıcı / işçi */
const PanelAuth = (() => {
  const ROLE = document.body.dataset.role;
  const params = new URLSearchParams(location.search);
  const orgFromUrl = params.get("org") || "koloni-demo";

  function storageKey() {
    return `koloni.panel.${ROLE}.${orgFromUrl}`;
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(storageKey()) || "null");
    } catch {
      return null;
    }
  }

  function setSession(sess) {
    localStorage.setItem(storageKey(), JSON.stringify(sess));
  }

  function clearSession() {
    localStorage.removeItem(storageKey());
  }

  async function loadOrgs() {
    const res = await fetch("/api/orgs");
    return res.json();
  }

  async function login({ orgId, ad, pin, uyeId }) {
    const res = await fetch("/api/orgs/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, rol: ROLE, ad, pin, uyeId }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "login_failed");
    setSession(data.session);
    return data;
  }

  function logout() {
    clearSession();
    location.reload();
  }

  function requireSession() {
    return getSession();
  }

  return {
    ROLE,
    orgFromUrl,
    getSession,
    setSession,
    clearSession,
    loadOrgs,
    login,
    logout,
    requireSession,
  };
})();
