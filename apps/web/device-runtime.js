(function (global) {
  'use strict';
  var MODE_KEY = 'superari.workMode';
  var DEVICES_KEY = 'superari.devices';
  var DISCOVERED_KEY = 'superari.discovered';
  var STATUS = { yok: 'yok', bagli: 'bagli', kopuk: 'kopuk', arizali: 'arizali' };
  var TIP_LABELS = { tarti: 'Tartı', isi_nem: 'Sıcaklık/Nem', ir: 'IR', ses_titresim: 'Ses/Titreşim', gateway: 'Gateway (Wi‑Fi / hücresel)', kamera_arilik: 'Arılık kamerası', kamera_merkez: 'Arılık kamerası', kamera_kovan: 'Kovan kamerası', role_hub: 'Wireless röle / hub' };
  var DEMO_SEED = [
    { id: 'demo-gw-a1', tip: 'gateway', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: null, hiveName: null, status: 'bagli', battery: null, lastMins: 1, channels: ['Gateway'] },
    { id: 'demo-cam-a1', tip: 'kamera_arilik', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: null, hiveName: null, status: 'bagli', battery: 88, lastMins: 2, channels: ['Arılık kamerası'] },
    { id: 'demo-tarti-101', tip: 'tarti', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: 101, hiveName: 'Kovan 101', status: 'bagli', battery: 72, lastMins: 4, channels: ['Tartı'] },
    { id: 'demo-isi-101', tip: 'isi_nem', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: 101, hiveName: 'Kovan 101', status: 'bagli', battery: 68, lastMins: 3, channels: ['Sıcaklık/Nem'] },
    { id: 'demo-isi-118-kopuk', tip: 'isi_nem', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: 118, hiveName: 'Kovan 118', status: 'kopuk', battery: 41, lastMins: 210, channels: ['Sıcaklık/Nem'] },
    { id: 'demo-tarti-211-arizali', tip: 'tarti', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', hiveId: 211, hiveName: 'Kovan 211', status: 'arizali', battery: 4, lastMins: 15, channels: ['Tartı'] },
    { id: 'demo-cam-a2-kopuk', tip: 'kamera_arilik', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', hiveId: null, hiveName: null, status: 'kopuk', battery: 52, lastMins: 320, channels: ['Arılık kamerası'] },
    { id: 'demo-cam-kovan-118-arizali', tip: 'kamera_kovan', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: 118, hiveName: 'Kovan 118', status: 'arizali', battery: 2, lastMins: 95, channels: ['Kovan kamerası'] },
    { id: 'demo-ir-102', tip: 'ir', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', hiveId: 102, hiveName: 'Kovan 102', status: 'bagli', battery: 77, lastMins: 6, channels: ['IR'] },
    { id: 'demo-ses-204', tip: 'ses_titresim', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', hiveId: 204, hiveName: 'Kovan 204', status: 'bagli', battery: 61, lastMins: 8, channels: ['Ses/Titreşim'] }
  ];
  function getMode() { try { var m = localStorage.getItem(MODE_KEY); if (m === 'live' || m === 'demo') return m; } catch (e) {} return 'demo'; }
  function setMode(mode) { var next = mode === 'live' ? 'live' : 'demo'; try { localStorage.setItem(MODE_KEY, next); } catch (e) {} try { if (typeof document !== 'undefined') document.documentElement.setAttribute('data-work-mode', next); } catch (e2) {} try { global.dispatchEvent(new CustomEvent('superari:workMode', { detail: { mode: next } })); } catch (e3) {} return next; }
  function isDemo() { return getMode() === 'demo'; }
  function isLive() { return getMode() === 'live'; }
  function statusLabel(s) { return ({ yok: 'Yok', bagli: 'Bağlı', kopuk: 'Kopuk', arizali: 'Arızalı' })[s] || 'Yok'; }
  function statusTone(s) { return s === STATUS.bagli ? 'status-bagli' : s === STATUS.kopuk ? 'status-kopuk' : s === STATUS.arizali ? 'status-arizali' : 'status-yok'; }
  function statusAnaTone(s) { return s === STATUS.bagli ? 'green' : s === STATUS.arizali ? 'red' : s === STATUS.kopuk ? 'tan' : 'tan'; }
  function tipLabel(t) { return TIP_LABELS[t] || t || 'Cihaz'; }
  function isCameraTip(t) { t = String(t || '').toLowerCase(); return t.indexOf('kamera') !== -1 || t === 'merkezi_kamera' || t === 'kovan_kamerasi'; }
  function isApiaryTip(t) { return t === 'kamera_arilik' || t === 'kamera_merkez' || t === 'gateway' || t === 'role_hub'; }
  function readArray(key) { try { var a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function resolveNames(row) { var D = global.SuperAriDemo, hiveId = row.hiveId != null ? row.hiveId : null, apiaryId = row.apiaryId != null ? row.apiaryId : null, hive = null, apiary = null; if (hiveId != null && D && D.hiveById) { hive = D.hiveById(hiveId); if (hive && apiaryId == null) apiaryId = hive.apiaryId; } if (apiaryId != null && D && D.apiaryById) apiary = D.apiaryById(apiaryId); return { hiveId: hiveId, hiveName: hive ? hive.name || 'Kovan ' + hive.id : hiveId != null ? 'Kovan ' + hiveId : null, apiaryId: apiaryId != null ? String(apiaryId) : 'none', apiaryName: apiary ? apiary.name || apiary.place || 'Arılık' : apiaryId ? String(apiaryId) : '—' }; }
  function normalize(raw, source) { if (!raw) return null; var tip = raw.tip || raw.type || '', n = resolveNames(raw), status = raw.status || STATUS.bagli, kind = isCameraTip(tip) ? 'kamera' : 'paket'; if (status !== STATUS.bagli && status !== STATUS.kopuk && status !== STATUS.arizali && status !== STATUS.yok) status = STATUS.bagli; return { id: raw.id || source + '-' + tip + '-' + (n.hiveId || n.apiaryId || 'x'), tip: tip, typeLabel: tipLabel(tip), kind: kind, source: source || 'user', status: status, hiveId: n.hiveId, hiveName: n.hiveName || (kind === 'kamera' ? tipLabel(tip) : 'Cihaz'), apiaryId: n.apiaryId, apiaryName: n.apiaryName, battery: raw.battery != null ? raw.battery : null, lastMins: raw.lastMins != null ? raw.lastMins : null, channels: raw.channels || [tipLabel(tip)], at: raw.at || null }; }
  function normalizeDemo(raw) { var n = normalize(raw, 'demo'); n.apiaryId = String(raw.apiaryId || 'none'); n.apiaryName = raw.apiaryName || 'Arılık'; n.hiveName = raw.hiveName || (n.kind === 'kamera' ? tipLabel(raw.tip) : 'Cihaz'); return n; }
  function demoList() { return DEMO_SEED.map(normalizeDemo); }
  function liveList() { var byId = {}; readArray(DEVICES_KEY).concat(readArray(DISCOVERED_KEY)).forEach(function (raw) { var n = normalize(raw, 'user'); if (n) byId[n.id] = n; }); return Object.keys(byId).map(function (key) { return byId[key]; }); }
  function listDevices() { return isDemo() ? demoList() : liveList(); }
  function cameraDevices() { return listDevices().filter(function (d) { return d && d.kind === 'kamera'; }); }
  function summarize(list) { var c = { yok: 0, bagli: 0, kopuk: 0, arizali: 0, total: list.length }; list.forEach(function (d) { if (c[d.status] != null) c[d.status] += 1; else c.yok += 1; }); return c; }
  function badge(summary) { if (!summary.total) return { text: 'Yok', tone: 'tan' }; return { text: String(isLive() ? summary.bagli > 0 ? summary.bagli : summary.total : summary.total), tone: summary.arizali ? 'red' : summary.kopuk ? 'tan' : 'green' }; }
  function ensureBannerStyles() { if (typeof document === 'undefined' || document.getElementById('superari-demo-banner-style')) return; var s = document.createElement('style'); s.id = 'superari-demo-banner-style'; s.textContent = '.status-pill.status-yok{background:#f1f3f5;color:#868e96;border-color:#ced4da}.status-pill.status-bagli{background:#ebfbee;color:#2b8a3e;border-color:#8ce99a}.status-pill.status-kopuk{background:#fff4e6;color:#e67700;border-color:#ffc078}.status-pill.status-arizali{background:#fff5f5;color:#c92a2a;border-color:#ffa8a8}'; (document.head || document.documentElement).appendChild(s); }
  function syncDemoBanner() { if (typeof document === 'undefined') return; ensureBannerStyles(); try { document.documentElement.setAttribute('data-work-mode', getMode()); } catch (e) {} }
  global.SuperAriDevices = { MODE_KEY: MODE_KEY, DEVICES_KEY: DEVICES_KEY, DISCOVERED_KEY: DISCOVERED_KEY, STATUS: STATUS, TIP_LABELS: TIP_LABELS, DEMO_SEED: DEMO_SEED, getMode: getMode, setMode: setMode, isDemo: isDemo, isLive: isLive, statusLabel: statusLabel, statusTone: statusTone, statusAnaTone: statusAnaTone, tipLabel: tipLabel, isCameraTip: isCameraTip, isApiaryTip: isApiaryTip, listDevices: listDevices, cameraDevices: cameraDevices, summarize: function () { return summarize(listDevices()); }, summarizeCameras: function () { return summarize(cameraDevices()); }, anaCihazBadge: function () { return badge(summarize(listDevices())); }, anaKameraBadge: function () { return badge(summarize(cameraDevices())); }, syncDemoBanner: syncDemoBanner, ensureBannerStyles: ensureBannerStyles };
  syncDemoBanner();
})(typeof window !== 'undefined' ? window : this);
(function injectSafeAnaLayout() {
  try {
    if (typeof document === 'undefined') return;
    function apply() {
      if (!document.getElementById('weatherStrip') || !document.getElementById('grid') || document.getElementById('ana-safe-layout-css')) return;
      var s = document.createElement('style');
      s.id = 'ana-safe-layout-css';
      s.textContent = [
        '#grid{flex:0 0 auto!important;grid-template-rows:repeat(4,122px)!important;gap:5px!important}',
        '#weatherStrip,.weather{flex:1 1 auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:visible!important}',
        '#weatherStrip .forecast{flex:1 1 auto!important;min-height:0!important;position:relative!important;z-index:1!important}',
        '#weatherStrip .weather-top{flex:0 0 auto!important;position:relative!important;z-index:2!important}',
        '#muayeneHint.muayene-hint.is-idle{flex:0 0 auto!important;flex-shrink:0!important;overflow:visible!important;position:relative!important;z-index:5!important}',
        '#muayeneHint .muayene-hint-mid{overflow:visible!important;position:relative!important;z-index:6!important}',
        '.muayene-hint-mid .bee-podium{top:auto!important;bottom:calc(100% + 14px)!important;left:50%!important;transform:translateX(-50%)!important;margin:0!important;z-index:30!important;flex-direction:column-reverse!important;gap:2px!important;pointer-events:none!important}',
        '.bee-podium:not(.is-hidden){display:flex!important}',
        '.bee-podium .podium-name{overflow:visible!important;z-index:30!important;max-width:160px!important}',
        '.bee-podium .podium-name.is-on{opacity:1!important;transform:none!important}'
      ].join('');
      (document.head || document.documentElement).appendChild(s);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  } catch (e) {}
})();
(function fixForecastNightDay() {
  try {
    if (typeof document === 'undefined') return;
    function rewrite(el) { if (!el) return; var parts = String(el.textContent || '').replace(/\s/g, '').replace('°', '').split('/'); if (parts.length !== 2 || !parts[0] || !parts[1]) return; if (el.innerHTML.indexOf('class=') === -1) el.innerHTML = '<span class=\'lo\'>' + parts[1] + '°</span>/' + parts[0] + '°'; }
    function scan() { if (!document.getElementById('weatherStrip')) return; var nodes = document.querySelectorAll('.day-temps'); for (var i = 0; i < nodes.length; i += 1) rewrite(nodes[i]); }
    function start() { scan(); var root = document.getElementById('weatherStrip') || document.body; if (!root || typeof MutationObserver === 'undefined') return; new MutationObserver(scan).observe(root, { childList: true, subtree: true, characterData: true }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  } catch (e) {}
})();