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

/* Safe ana layout: shorter tile rows only; do NOT touch muayeneHint / hive / labels */
(function injectSafeAnaLayout() {
  try {
    if (typeof document === 'undefined') return;
    var apply = function () {
      if (!document.getElementById('weatherStrip') || !document.getElementById('grid')) return;
      if (document.getElementById('ana-safe-layout-css')) return;
      var s = document.createElement('style');
      s.id = 'ana-safe-layout-css';
      s.textContent = [
        '#grid{flex:0 0 auto!important;grid-template-rows:repeat(4,122px)!important;gap:5px!important}',
        '#weatherStrip{flex:1 1 auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:visible!important}',
        '#weatherStrip .forecast{flex:1 1 auto!important;min-height:0!important}',
        '#weatherStrip .weather-top{flex:0 0 auto!important}',
        /* idle dock: allow podium into white forecast; active notes keep clip via base CSS */
        '#muayeneHint.muayene-hint.is-idle{flex:0 0 auto!important;flex-shrink:0!important;overflow:visible!important}',
        '#muayeneHint .muayene-hint-mid{overflow:visible!important}',
        /* podium+name sit ABOVE dock mid, inside white weather card */
        '.muayene-hint-mid .bee-podium{top:auto!important;bottom:calc(100% + 4px)!important;left:50%!important;transform:translateX(-50%)!important;margin:0!important;z-index:8!important;flex-direction:column-reverse!important;gap:2px!important}',
        '.bee-podium .podium-name{overflow:visible!important;z-index:8!important}'
      ].join('');
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
    else apply();
  } catch (e) { /* ignore */ }
})();

/* Forecast temps: night (lo) then day (hi) — do not touch muayeneHint controls */
(function fixForecastNightDay() {
  try {
    if (typeof document === 'undefined') return;
    function rewrite(el) {
      if (!el) return;
      var html = el.innerHTML || '';
      var mHiFirst = html.match(/^(\d+)°\s*<span class="lo">\/\s*(\d+)°<\/span>\s*$/);
      if (mHiFirst) {
        el.innerHTML = '<span class="lo">' + mHiFirst[2] + '°</span>/' + mHiFirst[1] + '°';
        return;
      }
      var mPlain = (el.textContent || '').match(/^\s*(\d+)\s*°\s*\/\s*(\d+)\s*°\s*$/);
      if (mPlain && html.indexOf('class="lo"') === -1) {
        /* assume first was day, second night when plain — swap to night/day */
        el.innerHTML = '<span class="lo">' + mPlain[2] + '°</span>/' + mPlain[1] + '°';
      }
    }
    function scan() {
      if (!document.getElementById('weatherStrip')) return;
      var nodes = document.querySelectorAll('.day-temps');
      for (var i = 0; i < nodes.length; i++) rewrite(nodes[i]);
    }
    function start() {
      scan();
      var root = document.getElementById('weatherStrip') || document.body;
      if (!root || typeof MutationObserver === 'undefined') return;
      var obs = new MutationObserver(function () { scan(); });
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  } catch (e) { /* ignore */ }
})();
