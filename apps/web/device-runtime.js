/**
 * SuperAriDevices — Demo | Canlı çalışma modu + cihaz durumları.
 *
 * Ayrım (sıkı):
 *  - demo  → yalnızca sabit DEMO_SEED (asla superari.devices / discovered / user apiary-hive LS)
 *  - live  → yalnızca superari.devices + superari.discovered
 *
 * Durumlar: Yok · Bağlı · Kopuk · Arızalı
 * Tak–çalıştır: varsa çalışır; yoksa Yok.
 */
(function (global) {
  'use strict';

  var MODE_KEY = 'superari.workMode';
  var DEVICES_KEY = 'superari.devices';
  var DISCOVERED_KEY = 'superari.discovered';

  var STATUS = {
    yok: 'yok',
    bagli: 'bagli',
    kopuk: 'kopuk',
    arizali: 'arizali'
  };

  var TIP_LABELS = {
    tarti: 'Tartı',
    isi_nem: 'Sıcaklık/Nem',
    ir: 'IR',
    ses_titresim: 'Ses/Titreşim',
    gateway: 'Gateway (Wi‑Fi / hücresel)',
    kamera_arilik: 'Arılık kamerası',
    kamera_merkez: 'Arılık kamerası',
    kamera_kovan: 'Kovan kamerası',
    role_hub: 'Wireless röle / hub'
  };

  /**
   * Sabit demo cihaz paketi — kullanıcı localStorage ile karışmaz.
   * En az bir Bağlı, bir Kopuk, bir Arızalı; Yok yoklukla ima edilir.
   */
  var DEMO_SEED = [
    {
      id: 'demo-gw-a1',
      tip: 'gateway',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: null,
      hiveName: null,
      status: 'bagli',
      battery: null,
      lastMins: 1,
      channels: ['Gateway']
    },
    {
      id: 'demo-cam-a1',
      tip: 'kamera_arilik',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: null,
      hiveName: null,
      status: 'bagli',
      battery: 88,
      lastMins: 2,
      channels: ['Arılık kamerası']
    },
    {
      id: 'demo-tarti-101',
      tip: 'tarti',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 101,
      hiveName: 'Kovan 101',
      status: 'bagli',
      battery: 72,
      lastMins: 4,
      channels: ['Tartı']
    },
    {
      id: 'demo-isi-101',
      tip: 'isi_nem',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 101,
      hiveName: 'Kovan 101',
      status: 'bagli',
      battery: 68,
      lastMins: 3,
      channels: ['Sıcaklık/Nem']
    },
    {
      id: 'demo-isi-118-kopuk',
      tip: 'isi_nem',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 118,
      hiveName: 'Kovan 118',
      status: 'kopuk',
      battery: 41,
      lastMins: 210,
      channels: ['Sıcaklık/Nem']
    },
    {
      id: 'demo-tarti-211-arizali',
      tip: 'tarti',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      hiveId: 211,
      hiveName: 'Kovan 211',
      status: 'arizali',
      battery: 4,
      lastMins: 15,
      channels: ['Tartı']
    },
    {
      id: 'demo-cam-a2-kopuk',
      tip: 'kamera_arilik',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      hiveId: null,
      hiveName: null,
      status: 'kopuk',
      battery: 52,
      lastMins: 320,
      channels: ['Arılık kamerası']
    },
    {
      id: 'demo-cam-kovan-118-arizali',
      tip: 'kamera_kovan',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 118,
      hiveName: 'Kovan 118',
      status: 'arizali',
      battery: 2,
      lastMins: 95,
      channels: ['Kovan kamerası']
    },
    {
      id: 'demo-ir-102',
      tip: 'ir',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 102,
      hiveName: 'Kovan 102',
      status: 'bagli',
      battery: 77,
      lastMins: 6,
      channels: ['IR']
    },
    {
      id: 'demo-ses-204',
      tip: 'ses_titresim',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      hiveId: 204,
      hiveName: 'Kovan 204',
      status: 'bagli',
      battery: 61,
      lastMins: 8,
      channels: ['Ses/Titreşim']
    }
  ];

  function getMode() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      if (m === 'live' || m === 'demo') return m;
    } catch (e) { /* ignore */ }
    return 'demo';
  }

  function setMode(mode) {
    var next = mode === 'live' ? 'live' : 'demo';
    try { localStorage.setItem(MODE_KEY, next); } catch (e) { /* ignore */ }
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-work-mode', next);
        syncDemoBanner();
      }
    } catch (e2) { /* ignore */ }
    try {
      window.dispatchEvent(new CustomEvent('superari:workMode', { detail: { mode: next } }));
    } catch (e3) { /* ignore */ }
    return next;
  }

  function isDemo() { return getMode() === 'demo'; }
  function isLive() { return getMode() === 'live'; }

  function statusLabel(s) {
    var map = { yok: 'Yok', bagli: 'Bağlı', kopuk: 'Kopuk', arizali: 'Arızalı' };
    return map[s] || map.yok;
  }

  function statusTone(s) {
    if (s === STATUS.bagli) return 'status-bagli';
    if (s === STATUS.kopuk) return 'status-kopuk';
    if (s === STATUS.arizali) return 'status-arizali';
    return 'status-yok';
  }

  /** Ana tile tone: green/tan/red */
  function statusAnaTone(s) {
    if (s === STATUS.bagli) return 'green';
    if (s === STATUS.kopuk) return 'tan';
    if (s === STATUS.arizali) return 'red';
    return 'tan';
  }

  function tipLabel(tip) {
    return TIP_LABELS[tip] || tip || 'Cihaz';
  }

  function isCameraTip(tip) {
    var t = String(tip || '').toLowerCase();
    return t === 'kamera_arilik' || t === 'kamera_merkez' || t === 'kamera_kovan' ||
      t === 'merkezi_kamera' || t === 'kovan_kamerasi' ||
      t.indexOf('kamera') !== -1;
  }

  function isApiaryTip(tip) {
    return tip === 'kamera_arilik' || tip === 'kamera_merkez' ||
      tip === 'gateway' || tip === 'role_hub';
  }

  function readJsonArray(key) {
    try {
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function resolveLiveNames(row) {
    var D = global.SuperAriDemo;
    var hiveId = row.hiveId != null ? row.hiveId : null;
    var apiaryId = row.apiaryId != null ? row.apiaryId : null;
    var hive = null;
    var ap = null;
    if (hiveId != null && D && D.hiveById) {
      hive = D.hiveById(hiveId);
      if (hive && apiaryId == null) apiaryId = hive.apiaryId;
    }
    if (apiaryId != null && D && D.apiaryById) {
      ap = D.apiaryById(apiaryId);
    }
    return {
      hiveId: hiveId,
      hiveName: hive
        ? (hive.name || ('Kovan ' + hive.id))
        : (hiveId != null ? ('Kovan ' + hiveId) : null),
      apiaryId: apiaryId != null ? String(apiaryId) : 'none',
      apiaryName: ap ? (ap.name || ap.place || 'Arılık') : (apiaryId ? String(apiaryId) : '—')
    };
  }

  function normalizeLive(raw, source) {
    if (!raw) return null;
    var tip = raw.tip || raw.type || '';
    var names = resolveLiveNames(raw);
    var status = raw.status || STATUS.bagli;
    if (status !== STATUS.bagli && status !== STATUS.kopuk &&
        status !== STATUS.arizali && status !== STATUS.yok) {
      status = STATUS.bagli;
    }
    var kind = isCameraTip(tip) ? 'kamera' : 'paket';
    return {
      id: raw.id || (source + '-' + tip + '-' + (names.hiveId || names.apiaryId || 'x')),
      tip: tip,
      typeLabel: tipLabel(tip),
      kind: kind,
      source: source || 'user',
      status: status,
      hiveId: names.hiveId,
      hiveName: names.hiveName || (kind === 'kamera' ? tipLabel(tip) : 'Cihaz'),
      apiaryId: names.apiaryId,
      apiaryName: names.apiaryName,
      battery: raw.battery != null ? raw.battery : null,
      lastMins: raw.lastMins != null ? raw.lastMins : null,
      channels: raw.channels || [tipLabel(tip)],
      at: raw.at || null
    };
  }

  function normalizeDemo(raw) {
    var tip = raw.tip || '';
    var kind = isCameraTip(tip) ? 'kamera' : 'paket';
    return {
      id: raw.id,
      tip: tip,
      typeLabel: tipLabel(tip),
      kind: kind,
      source: 'demo',
      status: raw.status,
      hiveId: raw.hiveId,
      hiveName: raw.hiveName || (kind === 'kamera' ? tipLabel(tip) : 'Cihaz'),
      apiaryId: String(raw.apiaryId || 'none'),
      apiaryName: raw.apiaryName || 'Arılık',
      battery: raw.battery != null ? raw.battery : null,
      lastMins: raw.lastMins != null ? raw.lastMins : null,
      channels: raw.channels || [tipLabel(tip)],
      at: null
    };
  }

  /** Demo: yalnızca DEMO_SEED — kullanıcı kaydı okunmaz. */
  function demoList() {
    return DEMO_SEED.map(normalizeDemo);
  }

  /** Live: yalnızca registry + discovered — demo seed karışmaz. */
  function liveList() {
    var byId = {};
    readJsonArray(DEVICES_KEY).forEach(function (d) {
      var n = normalizeLive(d, 'user');
      if (n) {
        if (!d.status) n.status = STATUS.bagli;
        byId[n.id] = n;
      }
    });
    readJsonArray(DISCOVERED_KEY).forEach(function (d) {
      var n = normalizeLive(d, 'discovered');
      if (n) {
        if (!d.status) n.status = STATUS.bagli;
        byId[n.id] = n;
      }
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  function listDevices() {
    return isDemo() ? demoList() : liveList();
  }

  function cameraDevices() {
    return listDevices().filter(function (d) { return d && d.kind === 'kamera'; });
  }

  function summarizeList(list) {
    var counts = { yok: 0, bagli: 0, kopuk: 0, arizali: 0, total: list.length };
    list.forEach(function (d) {
      var s = d.status || STATUS.yok;
      if (counts[s] != null) counts[s] += 1;
      else counts.yok += 1;
    });
    return counts;
  }

  function summarize() { return summarizeList(listDevices()); }
  function summarizeCameras() { return summarizeList(cameraDevices()); }

  function badgeFromSummary(s) {
    if (!s.total) return { text: 'Yok', tone: 'tan' };
    var text = isLive()
      ? String(s.bagli > 0 ? s.bagli : s.total)
      : String(s.total);
    var tone = 'green';
    if (s.arizali > 0) tone = 'red';
    else if (s.kopuk > 0) tone = 'tan';
    return { text: text, tone: tone };
  }

  function anaCihazBadge() { return badgeFromSummary(summarize()); }
  function anaKameraBadge() { return badgeFromSummary(summarizeCameras()); }

  /* —— Demo mod banner (Ana + anahtar sayfalar) —— */
  var BANNER_STYLE_ID = 'superari-demo-banner-style';
  var BANNER_ID = 'superari-demo-banner';

  function ensureBannerStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BANNER_STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = BANNER_STYLE_ID;
    st.textContent =
      '#' + BANNER_ID + '{' +
      'display:none;align-items:center;justify-content:center;' +
      'gap:6px;padding:6px 12px;margin:0;font-size:12px;font-weight:800;' +
      'letter-spacing:.02em;color:#5c4a2a;' +
      'background:linear-gradient(180deg,#fff6df 0%,#f5e6b8 100%);' +
      'border-bottom:1.5px solid #e0c56a;font-family:inherit;' +
      '}' +
      '#' + BANNER_ID + '{display:none!important}' +
      '#' + BANNER_ID + ' .demo-chip{' +
      'display:inline-block;padding:2px 10px;border-radius:999px;' +
      'border:1.5px solid #c9a84a;background:#fffaf0;color:#3d2e12;' +
      'font-size:11px;font-weight:800;' +
      '}' +
      '.status-pill.status-yok{background:#f1f3f5;color:#868e96;border-color:#ced4da}' +
      '.status-pill.status-bagli{background:#ebfbee;color:#2b8a3e;border-color:#8ce99a}' +
      '.status-pill.status-kopuk{background:#fff4e6;color:#e67700;border-color:#ffc078}' +
      '.status-pill.status-arizali{background:#fff5f5;color:#c92a2a;border-color:#ffa8a8}' +
      '.mode-banner{' +
      'display:flex;align-items:center;gap:8px;flex-wrap:wrap;' +
      'padding:10px 12px;border-radius:12px;margin-bottom:12px;' +
      'border:1.5px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#f5e6b8);' +
      'font-size:12px;font-weight:700;color:#5c4a2a;' +
      '}' +
      '.mode-banner.live{' +
      'border-color:#cfd8e3;background:#f7f8fa;color:#6b635a;' +
      '}';
    document.head.appendChild(st);
  }

  function syncDemoBanner() {
    if (typeof document === 'undefined') return;
    ensureBannerStyles();
    var mode = getMode();
    try { document.documentElement.setAttribute('data-work-mode', mode); } catch (e) {}
    /* Üst Demo şeridi yok — Ana’da Konumu sabitle butonu «Demo Modu» yazar */
    var el = document.getElementById(BANNER_ID);
    if (el && el.parentNode) {
      try { el.parentNode.removeChild(el); } catch (e2) {}
    }
  }

  function mount() {
    if (typeof document === 'undefined') return;
    function go() {
      try { document.documentElement.setAttribute('data-work-mode', getMode()); } catch (e) {}
      syncDemoBanner();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', go);
    } else {
      go();
    }
  }

  global.SuperAriDevices = {
    MODE_KEY: MODE_KEY,
    DEVICES_KEY: DEVICES_KEY,
    DISCOVERED_KEY: DISCOVERED_KEY,
    STATUS: STATUS,
    TIP_LABELS: TIP_LABELS,
    DEMO_SEED: DEMO_SEED,
    getMode: getMode,
    setMode: setMode,
    isDemo: isDemo,
    isLive: isLive,
    statusLabel: statusLabel,
    statusTone: statusTone,
    statusAnaTone: statusAnaTone,
    tipLabel: tipLabel,
    isCameraTip: isCameraTip,
    isApiaryTip: isApiaryTip,
    listDevices: listDevices,
    cameraDevices: cameraDevices,
    summarize: summarize,
    summarizeCameras: summarizeCameras,
    anaCihazBadge: anaCihazBadge,
    anaKameraBadge: anaKameraBadge,
    syncDemoBanner: syncDemoBanner,
    ensureBannerStyles: ensureBannerStyles
  };

  mount();
})(typeof window !== 'undefined' ? window : this);

/* Ana home layout: relax weather card, shrink tiles ~5%, keep gaps (injected) */
(function injectAnaHomeLayout() {
  try {
    if (typeof document === 'undefined') return;
    var apply = function () {
      if (!document.getElementById('weatherStrip') || !document.getElementById('grid')) return;
      if (document.getElementById('ana-home-layout-css')) return;
      var s = document.createElement('style');
      s.id = 'ana-home-layout-css';
      s.textContent = `/* ana-home-layout.css — relax existing weather card; shrink tiles ~5%; keep grid gap */
/* Loaded only from ana.html */

.weather {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding: 10px 12px 8px !important;
  margin-bottom: 6px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-evenly !important;
  gap: 4px !important;
}
.weather-top {
  gap: 6px !important;
  min-height: 34px !important;
  padding: 2px 0 !important;
  flex: 0 0 auto !important;
}
.weather-icon { width: 28px !important; height: 28px !important; }
.weather-loc { font-size: 15px !important; }
.weather-temp { font-size: 30px !important; }
.forecast {
  margin-top: 4px !important;
  flex: 0 0 auto !important;
  padding: 2px 0 !important;
}
.day { gap: 1px !important; padding: 2px 0 !important; }
.day-date { font-size: 13px !important; line-height: 1.1 !important; }
.day-ico { width: 19px !important; height: 19px !important; margin: 1px 0 !important; }
.day-temps { font-size: 12px !important; line-height: 1.15 !important; }
.muayene-hint {
  margin-top: 6px !important;
  flex: 0 0 auto !important;
}

/* Buttons ~5% smaller; gap stays 5px; grid no longer eats leftover space */
.grid {
  flex: 0 0 auto !important;
  grid-template-rows: repeat(4, 128px) !important;
  gap: 5px !important;
}
.tile {
  border-radius: 13px !important;
  padding: 3px 2px !important;
}
.hive { width: 55px !important; height: 51px !important; }
.hive-stack { width: 42px !important; }
.hive-lid { width: 48px !important; }
.hive-box { height: 17px !important; }
.hive-icon {
  top: 24px !important;
  width: 25px !important;
  height: 25px !important;
}
.hive-icon.hive-icon-burn {
  width: 27px !important;
  height: 27px !important;
}
.tile-label { font-size: 9.5px !important; }
.badge {
  padding: 1px 6px !important;
  font-size: 8.5px !important;
}
`;
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply);
    } else {
      apply();
    }
  } catch (e) { /* ignore */ }
})();
