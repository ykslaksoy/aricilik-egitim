/**
 * koloni-299: Cihaz geçmişi — kovan / arılık atama, taşıma, söküm (sensör ham arşivinden ayrı).
 * Yerel: superari.cihazGecmis.v1 (Canlı) / superari.cihazGecmis.demo.v1 (Demo).
 * Bulut (isteğe bağlı): public.cihaz_gecmis — sa_cihaz_gecmis_yaz.
 */
(function (global) {
  'use strict';

  var KEY_LIVE = 'superari.cihazGecmis.v1';
  var KEY_DEMO = 'superari.cihazGecmis.demo.v1';
  var SEED_FLAG = 'superari.cihazGecmis.seeded.v1';
  var MAX = 800;

  var TUR = { atama: 'Atama', tasima: 'Taşıma', sokum: 'Söküm' };
  var TUR_ICON = { atama: '📌', tasima: '🚚', sokum: '⏏️' };

  function mode() {
    try {
      var D = global.SuperAriDevices;
      if (D && D.getMode) return D.getMode();
      return global.localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo';
    } catch (e) { return 'demo'; }
  }
  function storeKey() { return mode() === 'live' ? KEY_LIVE : KEY_DEMO; }

  function read() {
    try { var a = JSON.parse(global.localStorage.getItem(storeKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function write(a) {
    try { global.localStorage.setItem(storeKey(), JSON.stringify(a.slice(-MAX))); return true; } catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function tipLabel(tip) {
    var D = global.SuperAriDevices;
    return (D && D.tipLabel ? D.tipLabel(tip) : null) || tip || 'Cihaz';
  }
  function fmtAt(at) {
    if (!at) return '—';
    try {
      return new Date(at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' TSİ';
    } catch (e) { return String(at); }
  }
  function fmtDate(at) {
    if (!at) return '—';
    try { return new Date(at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { return String(at).slice(0, 10); }
  }
  function idNew() { return 'cg' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36); }

  function yerOzeti(e) {
    var ap = e.arilikAd || e.apiaryId || '—';
    if (e.kovanId != null || e.kovanAd) return (e.kovanAd || ('Kovan ' + e.kovanId)) + ' · ' + ap;
    return ap + ' (arılık geneli)';
  }
  function onceOzeti(e) {
    if (!e.once) return '';
    var o = e.once;
    var ap = o.arilikAd || o.apiaryId || '—';
    if (o.kovanId != null || o.kovanAd) return (o.kovanAd || ('Kovan ' + o.kovanId)) + ' · ' + ap;
    return ap;
  }
  function ozetSatir(e) {
    if (e.tur === 'atama') return yerOzeti(e) + (e.kaynak === 'elle' ? ' · elle eklendi' : '');
    if (e.tur === 'sokum') return (e.cihazAd || e.deviceId) + ' listeden çıkarıldı · son: ' + yerOzeti(e);
    var once = onceOzeti(e);
    return (once ? once + ' → ' : '') + yerOzeti(e) + (e.gocId ? ' · göç' : '');
  }

  function normalizeRow(o) {
    o = o || {};
    return {
      id: o.id || idNew(),
      at: o.at || new Date().toISOString(),
      tur: TUR[o.tur] ? o.tur : 'atama',
      deviceId: o.deviceId != null ? String(o.deviceId) : '',
      tip: o.tip || null,
      cihazAd: o.cihazAd || null,
      apiaryId: o.apiaryId != null ? String(o.apiaryId) : null,
      arilikAd: o.arilikAd || null,
      kovanId: o.kovanId != null && o.kovanId !== '' ? Number(o.kovanId) : null,
      kovanAd: o.kovanAd || null,
      once: o.once ? {
        apiaryId: o.once.apiaryId != null ? String(o.once.apiaryId) : null,
        arilikAd: o.once.arilikAd || null,
        kovanId: o.once.kovanId != null && o.once.kovanId !== '' ? Number(o.once.kovanId) : null,
        kovanAd: o.once.kovanAd || null
      } : null,
      not: o.not ? String(o.not).slice(0, 240) : null,
      kaynak: o.kaynak || 'uygulama',
      gocId: o.gocId || null,
      demo: !!o.demo
    };
  }

  function kaydet(o) {
    var row = normalizeRow(o);
    if (mode() === 'demo') row.demo = true;
    var all = read();
    all.push(row);
    write(all);
    bulutYaz(row);
    try { global.dispatchEvent(new CustomEvent('superari-cihaz-gecmis', { detail: row })); } catch (e) { /* ignore */ }
    return row;
  }

  var UUIDRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function bulutYaz(row) {
    if (row.demo) return Promise.resolve(false);
    var B = global.SuperAriBulut;
    if (!B || !B.client) return Promise.resolve(false);
    var ap = row.apiaryId && UUIDRE.test(String(row.apiaryId)) ? row.apiaryId : null;
    return B.client().then(function (c) {
      return c.rpc('sa_cihaz_gecmis_yaz', {
        p_device: row.deviceId,
        p_tur: row.tur,
        p_at: row.at,
        p_tip: row.tip,
        p_cihaz_ad: row.cihazAd,
        p_apiary: ap,
        p_arilik_ad: row.arilikAd,
        p_kovan_id: row.kovanId,
        p_kovan_ad: row.kovanAd,
        p_once: row.once || null,
        p_not: row.not,
        p_kaynak: row.kaynak,
        p_goc_id: row.gocId
      });
    }).then(function (r) { return !(r && r.error); }).catch(function () { return false; });
  }

  function liste(filtre) {
    filtre = filtre || {};
    var L = read().slice().sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
    if (filtre.deviceId != null) L = L.filter(function (x) { return String(x.deviceId) === String(filtre.deviceId); });
    if (filtre.hiveId != null) {
      var h = Number(filtre.hiveId);
      L = L.filter(function (x) {
        return x.kovanId === h || (x.once && x.once.kovanId === h);
      });
    }
    if (filtre.apiaryId != null) {
      var a = String(filtre.apiaryId);
      L = L.filter(function (x) {
        return String(x.apiaryId) === a || (x.once && String(x.once.apiaryId) === a);
      });
    }
    if (filtre.tur) L = L.filter(function (x) { return x.tur === filtre.tur; });
    if (filtre.limit) L = L.slice(0, filtre.limit);
    return L;
  }

  function deviceMeta(d) {
    if (!d) return {};
    return {
      deviceId: d.id,
      tip: d.tip,
      cihazAd: d.name || tipLabel(d.tip),
      apiaryId: d.apiaryId,
      arilikAd: d.apiaryName || null,
      kovanId: d.hiveId,
      kovanAd: d.hiveName || (d.hiveId != null ? ('Kovan ' + d.hiveId) : null)
    };
  }

  function onDeviceAdded(row) {
    var m = deviceMeta(row);
    if (!m.deviceId) return;
    kaydet(Object.assign({}, m, { tur: 'atama', at: row.addedAt || new Date().toISOString(), kaynak: row.manual ? 'elle' : 'uygulama' }));
  }

  function onDeviceRemoved(id) {
    var D = global.SuperAriDevices;
    var d = null;
    try {
      (D && D.listDevices ? D.listDevices() : []).forEach(function (x) { if (String(x.id) === String(id)) d = x; });
    } catch (e) { /* ignore */ }
    if (!d) return;
    kaydet(Object.assign(deviceMeta(d), { tur: 'sokum', kaynak: 'elle' }));
  }

  function onDeviceMoved(deviceRow, fromApiaryId, toApiaryId, meta) {
    meta = meta || {};
    if (!deviceRow || !deviceRow.id) return;
    var once = {
      apiaryId: fromApiaryId,
      arilikAd: meta.fromName || null,
      kovanId: deviceRow.hiveId,
      kovanAd: deviceRow.hiveName || (deviceRow.hiveId != null ? ('Kovan ' + deviceRow.hiveId) : null)
    };
    kaydet({
      tur: 'tasima',
      deviceId: deviceRow.id,
      tip: deviceRow.tip,
      cihazAd: deviceRow.name || tipLabel(deviceRow.tip),
      apiaryId: toApiaryId,
      arilikAd: meta.toName || deviceRow.apiaryName,
      kovanId: deviceRow.hiveId,
      kovanAd: deviceRow.hiveName || (deviceRow.hiveId != null ? ('Kovan ' + deviceRow.hiveId) : null),
      once: once,
      kaynak: meta.gocId ? 'goc' : 'uygulama',
      gocId: meta.gocId || null,
      not: meta.not || null
    });
  }

  /** Demo: örnek zaman çizelgesi (salt okunur önizleme). */
  var DEMO_SEED_ROWS = [
    { id: 'cg-demo-1', at: '2025-04-12T10:30:00+03:00', tur: 'atama', deviceId: 'demo-tarti-101', tip: 'tarti', cihazAd: 'Tartı', apiaryId: 'a1', arilikAd: 'Kayaköy Ana Arılık', kovanId: 101, kovanAd: 'Kovan 101', kaynak: 'elle', demo: true },
    { id: 'cg-demo-2', at: '2025-04-12T10:32:00+03:00', tur: 'atama', deviceId: 'demo-isi-101', tip: 'isi_nem', cihazAd: 'Sıcaklık/Nem', apiaryId: 'a1', arilikAd: 'Kayaköy Ana Arılık', kovanId: 101, kovanAd: 'Kovan 101', kaynak: 'uygulama', demo: true },
    { id: 'cg-demo-3', at: '2026-02-18T09:00:00+03:00', tur: 'tasima', deviceId: 'demo-isi-118-kopuk', tip: 'isi_nem', cihazAd: 'Sıcaklık/Nem', apiaryId: 'a1', arilikAd: 'Kayaköy Ana Arılık', kovanId: 118, kovanAd: 'Kovan 118',
      once: { apiaryId: 'a1', arilikAd: 'Kayaköy Ana Arılık', kovanId: 102, kovanAd: 'Kovan 102' }, kaynak: 'goc', gocId: 'gc-ornek', demo: true },
    { id: 'cg-demo-4', at: '2026-06-01T14:20:00+03:00', tur: 'tasima', deviceId: 'demo-tarti-211-arizali', tip: 'tarti', cihazAd: 'Tartı', apiaryId: 'a2', arilikAd: 'Tortum Yayla Arılığı', kovanId: 211, kovanAd: 'Kovan 211',
      once: { apiaryId: 'a1', arilikAd: 'Kayaköy Ana Arılık', kovanId: 211, kovanAd: 'Kovan 211' }, kaynak: 'goc', demo: true },
    { id: 'cg-demo-5', at: '2026-08-10T11:05:00+03:00', tur: 'sokum', deviceId: 'demo-cam-eski', tip: 'kamera_kovan', cihazAd: 'Kovan kamerası', apiaryId: 'a1', arilikAd: 'Kayaköy Ana Arılık', kovanId: 118, kovanAd: 'Kovan 118', kaynak: 'elle', demo: true }
  ];

  function ensureDemoSeed() {
    if (mode() !== 'demo') return;
    try { if (global.localStorage.getItem(SEED_FLAG)) return; } catch (e) { return; }
    if (read().length) { try { global.localStorage.setItem(SEED_FLAG, '1'); } catch (e2) { /* */ } return; }
    write(DEMO_SEED_ROWS.map(normalizeRow));
    try { global.localStorage.setItem(SEED_FLAG, '1'); } catch (e3) { /* */ }
  }

  function mergeDemoSeed(L) {
    if (mode() !== 'demo') return L;
    ensureDemoSeed();
    var ids = {};
    L.forEach(function (x) { ids[x.id] = 1; });
    DEMO_SEED_ROWS.forEach(function (r) { if (!ids[r.id]) L.push(normalizeRow(r)); });
    return L.sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
  }

  function timelineListe(filtre) {
    return mergeDemoSeed(liste(filtre));
  }

  var CSS = '.cg-list{display:grid;gap:8px;margin:10px 0 0;}' +
    '.cg-item{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--card-border,#ead9b3);border-radius:14px;background:#fff;}' +
    '.cg-ico{width:34px;height:34px;border-radius:50%;background:#fff6df;display:flex;align-items:center;justify-content:center;font-size:17px;}' +
    '.cg-top{display:flex;justify-content:space-between;gap:8px;font-size:.86rem;font-weight:800;}' +
    '.cg-top .dt{color:var(--muted,#6b7280);font-weight:700;font-size:.78rem;white-space:nowrap;}' +
    '.cg-sum{font-size:.8rem;color:var(--muted,#6b7280);margin-top:3px;line-height:1.35;overflow-wrap:anywhere;}' +
    '.cg-pill{display:inline-block;margin-left:4px;padding:1px 6px;border-radius:999px;font-size:.68rem;font-weight:800;border:1px solid #e0c56a;background:#fff6df;color:#5c4813;}' +
    '.cg-empty{padding:12px;border-radius:12px;border:1.5px dashed #cfd8e3;background:#f7f8fa;color:#4a5562;font-size:.88rem;line-height:1.4;margin:0;}';

  function ensureCss() {
    if (typeof document === 'undefined' || document.getElementById('cgCss')) return;
    var st = document.createElement('style'); st.id = 'cgCss'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function timelineHtml(opts) {
    opts = opts || {};
    ensureCss();
    var L = timelineListe({ apiaryId: opts.apiaryId, hiveId: opts.hiveId, deviceId: opts.deviceId, limit: opts.limit || 80 });
    if (!L.length) {
      return '<p class="cg-empty">Henüz cihaz atama, taşıma veya söküm kaydı yok. Cihaz eklediğinizde veya kovan/arılık değiştirdiğinizde burada görünür. <span class="cg-pill">Sensör okuma arşivi değil</span></p>';
    }
    return '<div class="cg-list" data-cg-list>' + L.map(function (e) {
      var tur = TUR[e.tur] || e.tur;
      return '<article class="cg-item" data-cg-id="' + esc(e.id) + '">' +
        '<span class="cg-ico" aria-hidden="true">' + (TUR_ICON[e.tur] || '•') + '</span>' +
        '<div><div class="cg-top"><span>' + esc(tur) + ' · ' + esc(e.cihazAd || tipLabel(e.tip)) +
        (e.demo ? ' <span class="cg-pill">Demo</span>' : '') + '</span><span class="dt">' + esc(fmtDate(e.at)) + '</span></div>' +
        '<p class="cg-sum">' + esc(ozetSatir(e)) + '</p>' +
        '<p class="cg-sum" style="font-size:.72rem;margin-top:2px;">' + esc(fmtAt(e.at)) + (e.deviceId ? ' · ' + esc(e.deviceId) : '') + '</p></div></article>';
    }).join('') + '</div>';
  }

  ensureDemoSeed();

  global.SuperAriCihazGecmis = {
    KEY_LIVE: KEY_LIVE,
    KEY_DEMO: KEY_DEMO,
    TUR: TUR,
    kaydet: kaydet,
    liste: liste,
    timelineListe: timelineListe,
    timelineHtml: timelineHtml,
    onDeviceAdded: onDeviceAdded,
    onDeviceRemoved: onDeviceRemoved,
    onDeviceMoved: onDeviceMoved,
    ozetSatir: ozetSatir,
    fmtAt: fmtAt,
    ensureDemoSeed: ensureDemoSeed
  };
})(typeof window !== 'undefined' ? window : this);
