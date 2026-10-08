/* Kapsam kartı (Bakım'daki Kapsam kartının görünümü) + Ana tarzı kovan döşemesi.
 * Muayene (bakim-akis.html) ve Kovanlar (kovanlar.html) kullanır. Kilitli ana.html / bakim.html bu dosyayı yüklemez. */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function live() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  var SCOPE_KEY = 'superari.bakim.scope'; /* Bakım ile ortak kapsam */

  var ICO = {
    kovan: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="4" width="12" height="3.2" rx="1" fill="#f7b731"/><rect x="4.6" y="8" width="10.8" height="3.6" rx=".8" fill="#e8c48e" stroke="#c99755" stroke-width=".8"/><rect x="4.6" y="12.2" width="10.8" height="3.6" rx=".8" fill="#e8c48e" stroke="#c99755" stroke-width=".8"/></svg>',
    muayene: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.6" cy="8.6" r="4.4" fill="#d0ebff" stroke="#5b8def" stroke-width="1.6"/><path d="M12 12l4 4" stroke="#5b8def" stroke-width="2" stroke-linecap="round"/></svg>',
    hafta: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.8" y="5" width="12.4" height="11.2" rx="1.6" fill="#fff" stroke="#9aa8b8" stroke-width="1"/><path d="M3.8 8.4h12.4" stroke="#f7b731" stroke-width="1.6"/><path d="M7 3.6v2.6M13 3.6v2.6" stroke="#9aa8b8" stroke-width="1.2" stroke-linecap="round"/><path d="M7.4 12.2l1.7 1.7 3.4-3.4" fill="none" stroke="#2f9e44" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    uyari: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.4l7 12.4H3z" fill="#ffe3e3" stroke="#e03131" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 8.2v3.6" stroke="#e03131" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="13.9" r=".95" fill="#e03131"/></svg>',
    saat: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.4" fill="#fff8df" stroke="#b8860b" stroke-width="1.3"/><path d="M10 6.4V10l2.6 1.8" fill="none" stroke="#5c3a1f" stroke-width="1.5" stroke-linecap="round"/></svg>',
    sorun: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.6c3 1.2 5.2 1.4 5.2 1.4 0 5.4-2 8.6-5.2 10.4C6.8 13.6 4.8 10.4 4.8 5c0 0 2.2-.2 5.2-1.4z" fill="#fff3bf" stroke="#f08c00" stroke-width="1.2"/><path d="M10 7.4v3.4" stroke="#d9480f" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="12.8" r=".9" fill="#d9480f"/></svg>'
  };
  var BURN = {
    irk: '<path d="M8.6 5.6c0 4.4 6.8 4.4 6.8 8.8 0 2-1.4 3.2-3.4 4"/><path d="M15.4 5.6c0 4.4-6.8 4.4-6.8 8.8 0 2 1.4 3.2 3.4 4"/><path d="M9.7 8.2h4.6M9.7 15.8h4.6"/>',
    tarti: '<path d="M12 6.2v11.4M8.6 17.8h6.8M6.4 8.8h11.2"/><path d="M6.4 8.8 4.6 12.6a1.9 1.9 0 0 0 3.6 0zM17.6 8.8l-1.8 3.8a1.9 1.9 0 0 0 3.6 0z"/>',
    gorev: '<path d="M7.2 8.4l1.3 1.3 2.2-2.4M7.2 13.6l1.3 1.3 2.2-2.4"/><path d="M12.8 8.8h4.2M12.8 14h4.2"/>',
    liste: '<path d="M7.4 8h9.2M7.4 12h9.2M7.4 16h9.2"/>',
    muayene: '<circle cx="10.6" cy="10.6" r="3.9"/><path d="M13.4 13.4 17.2 17.2"/>',
    ses: '<path d="M6.5 10h2.4l3.3-2.8v9.6L8.9 14H6.5z"/><path d="M14.3 9.6a3.2 3.2 0 0 1 0 4.8M15.9 8a5.4 5.4 0 0 1 0 8"/>',
    guc: '<path d="M7.6 16.4v-3.2M10.5 16.4V11M13.4 16.4V8.6M16.3 16.4V6.8"/>',
    plan: '<rect x="6.8" y="7.6" width="10.4" height="9.6" rx="1.2"/><path d="M6.8 10.6h10.4M9.6 6.2v2.6M14.4 6.2v2.6"/><path d="M9.4 13.6l1.6 1.6 3-3"/>',
    ekle: '<path d="M12 7.4v9.2M7.4 12h9.2"/>',
    qr: '<path d="M7 7h3.6v3.6H7zM13.4 7H17v3.6h-3.6zM7 13.4h3.6V17H7z"/><path d="M13.4 13.4h1.4v1.4M16.2 13.4V17h-2.8"/>'
  };
  /** Ana'daki kovan çizimi; ortada yakma damga (burn) veya kovan numarası. */
  function hiveHtml(o) {
    o = o || {};
    /* k96: numaralı kovan = Ana/Muayene ile aynı ahşap kovan + yakma damga (Tartı/Kovanlar döşemeleri) */
    if (o.num != null && !o.svg && !o.burn) return anaHiveHtml(o);
    var ico = o.svg || (o.burn && BURN[o.burn]) || '';
    var mid = ico
      ? '<div class="hi" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.2" stroke-width="1.55"/>' + ico + '</svg></div>'
      : '';
    return '<div class="ks-hive" aria-hidden="true"><div class="hs"><div class="hl"></div><div class="hb"></div><div class="hb b"><div class="he"></div></div>' +
      '<div class="hf"><span></span><span></span></div></div>' + mid + (o.dot ? '<span class="hdot" style="background:' + esc(o.dot) + '"></span>' : '') + '</div>';
  }

  /** Ana'daki döşemenin kovanı (ana.html hiveHTML ile aynı işaretleme; stil Ana CSS'inden gelir). Ortada yakma damga: burn veya numara. */
  function anaHiveHtml(o) {
    o = o || {};
    var inner = '';
    if (o.burn && BURN[o.burn]) inner = BURN[o.burn];
    else if (o.svg) inner = o.svg;
    else if (o.num != null) {
      var t = String(o.num), fs = t.length >= 4 ? 7.2 : t.length === 3 ? 8.6 : 10.5;
      inner = '<text x="12" y="12.2" text-anchor="middle" dominant-baseline="central" font-size="' + fs + '" font-weight="800" fill="#1a0c06" stroke="none" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" letter-spacing="-.3">' + esc(t) + '</text>';
    }
    return '<div class="hive-area"><div class="hive"><div class="hive-stack"><div class="hive-lid"></div><div class="hive-box top"></div>' +
      '<div class="hive-box bottom"><div class="hive-entrance"></div><div class="hive-door" aria-hidden="true"></div></div>' +
      '<div class="hive-feet"><span></span><span></span></div></div><div class="hive-shadow"></div>' +
      '<div class="hive-icon hive-icon-burn" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="burn-ring" cx="12" cy="12" r="10.2"/>' + inner + '</svg></div></div></div>';
  }
  function hiveNum(h) {
    var m = /(\d+)\s*$/.exec(String(h && h.name || ''));
    if (m) return m[1];
    return String(h && h.name || '?').slice(0, 5);
  }

  /* ---- Sağlık durumu (Sağlıklı / İzle / Kontrol / Müdahale) ---- */
  var SEV = { act: 0, check: 1, watch: 2, none: 3, ok: 4 };
  function health(h) {
    var LH = global.SuperAriLiveHealth, b = null, score = null, reasons = [];
    try {
      if (LH && LH.isLive && LH.isLive()) { var ev = LH.evaluate(h); b = ev.band; score = ev.score; reasons = (ev.reasons || []).map(function (r) { return r && (r.text || r.label || r); }); }
      else { score = h && h.healthScore != null ? Number(h.healthScore) : null; b = LH && LH.band ? LH.band(score) : null; }
    } catch (e) { b = null; }
    if (!b) {
      if (score == null) b = { key: 'none', label: 'Veri az', tone: 'gray' };
      else if (score >= 85) b = { key: 'ok', label: 'Sağlıklı', tone: 'green' };
      else if (score >= 70) b = { key: 'watch', label: 'İzle', tone: 'yellow' };
      else if (score >= 50) b = { key: 'check', label: 'Kontrol', tone: 'orange' };
      else b = { key: 'act', label: 'Müdahale', tone: 'red' };
    }
    var tone = b.tone === 'gray' || b.tone === 'green' || b.tone === 'yellow' || b.tone === 'orange' || b.tone === 'red' ? b.tone : 'gray';
    return { key: b.key || 'none', label: b.label || 'Veri az', tone: tone, score: score, reasons: reasons };
  }

  /* ---- Kapsam özeti ---- */
  function fmtAgo(iso, today) {
    if (!iso) return '—';
    var d = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z')) / 86400000);
    if (!isFinite(d)) return '—';
    if (d <= 0) return 'Bugün';
    if (d === 1) return 'Dün';
    return d + ' gün';
  }
  function shortAlert(a, h) {
    var t = String(a.title || '');
    if (h && h.name) t = t.replace(' — ' + h.name + ':', ':').replace(' — ' + h.name, '').replace('(' + h.name + ')', '').replace(h.name + ': ', '');
    return t.replace(/\s+/g, ' ').trim();
  }
  function summary(hs) {
    var R = D && D.records, today = R ? R.todayLocal() : new Date().toISOString().slice(0, 10);
    var all = {}; try { all = R ? R.loadAll() : {}; } catch (e) { all = {}; }
    var inScope = {}; (hs || []).forEach(function (h) { inScope[String(h.id)] = h; });
    var out = { hives: (hs || []).length, overdue: 0, week: 0, critical: 0, last: '', today: today, byHive: {} };
    var d21 = R ? R.addDays(today, -21) : '', d7 = R ? R.addDays(today, -7) : '';
    (hs || []).forEach(function (h) {
      var st = null; try { st = R ? R.status(h.id, all) : null; } catch (e) { st = null; }
      var ld = st && st.strength ? st.strength.date : '';
      var od = !ld || ld < d21;
      if (od) out.overdue++;
      if (ld && ld >= d7) out.week++;
      if (ld && ld > out.last) out.last = ld;
      out.byHive[String(h.id)] = { last: ld, overdue: od, alerts: [], high: 0 };
    });
    var alerts = []; try { alerts = (D && D.alerts) || []; } catch (e) { alerts = []; }
    alerts.forEach(function (a) {
      if (a.hiveId == null || !inScope[String(a.hiveId)]) return;
      var bh = out.byHive[String(a.hiveId)];
      bh.alerts.push(a);
      if (a.severity === 'high') { bh.high++; out.critical++; }
    });
    out.lastTxt = fmtAgo(out.last, today);
    return out;
  }

  function statsHtml(stats, cls) {
    return stats.map(function (x) {
      return '<a class="' + (cls || 'ks-stat') + ' ' + (x.tone || '') + '" data-stat="' + esc(x.k) + '" href="' + esc(x.href || '#') + '" aria-label="' + esc(x.l + ': ' + x.v) + '">' + (x.svg || ICO[x.icon || x.k] || ICO.kovan) +
        '<span class="v">' + esc(x.v) + '</span><span class="l">' + esc(x.l) + '</span></a>';
    }).join('');
  }

  /**
   * Kapsam kartını host içine kurar. opts: { title, icon(svg), page ('bakim-akis.html'), stats(hs, scope, sum) → [], note(hs, scope, sum) → {t,b,href,k}, onChange(scope, hs, sum), initial }
   * Döner: { scope(), hives(), setScope(s), render() }
   */

  /** Kapsam kartı sağ kestirme (Ana'daki °C ile aynı yer/stil): tıklanınca hava raporu. */
  function weatherEndHtml() {
    return '<a class="ks-end weather-temp" data-ks-end href="hava-raporu.html" title="Arılık hava raporu" aria-label="Arılık hava raporunu aç">—°</a>';
  }
  function bindWeatherEnd(host) {
    var el = host && host.querySelector('[data-ks-end].weather-temp');
    if (!el || el.getAttribute('data-bound')) return;
    el.setAttribute('data-bound', '1');
    function go() { try { var ap = null; try { ap = global.localStorage.getItem(SCOPE_KEY); } catch (e) {} var q = ap && ap !== 'all' ? ('?apiary=' + encodeURIComponent(ap)) : ''; global.location.href = 'hava-raporu.html' + q; } catch (e2) { global.location.href = 'hava-raporu.html'; } }
    el.addEventListener('click', function (e) { e.preventDefault(); go(); });
    /* Açık Meteo: seçili arılığın sıcaklığı (Ana ile aynı kaynak) */
    try {
      var aps = [], id = null;
      try { aps = D.loadApiaries() || []; id = global.localStorage.getItem(SCOPE_KEY); } catch (e3) {}
      var ap = (id && id !== 'all') ? aps.filter(function (a) { return String(a.id) === String(id); })[0] : (aps[0] || null);
      var lat = ap && ap.lat != null ? ap.lat : 36.58, lon = ap && ap.lon != null ? ap.lon : 29.09;
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m&timezone=auto')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var t = j && j.current && j.current.temperature_2m;
          if (t == null) return;
          var n = Math.round(Number(t));
          if (isFinite(n)) el.textContent = n + '°';
        }).catch(function () {});
    } catch (e4) {}
  }
  function mount(host, opts) {
    var aps = [], scope = 'all';
    function loadAps() { try { aps = D.loadApiaries() || []; } catch (e) { aps = []; } }
    /* opts.noAll: yalnız arılık başına çalışan sayfalar (Bakım planı) — «Tümü» seçeneği yok */
    function valid(s) { return (s === 'all' && !opts.noAll) || aps.some(function (a) { return String(a.id) === String(s); }) ? String(s) : (opts.noAll && aps[0] ? String(aps[0].id) : 'all'); }
    function list() { return (opts.noAll ? [] : ['all']).concat(aps.map(function (a) { return String(a.id); })); }
    function apOf(id) { return aps.filter(function (a) { return String(a.id) === String(id); })[0] || null; }
    function hives() { var hs = []; try { hs = (D.loadHives() || []).filter(function (h) { return h && h.colonyState !== 'sonuk'; }); } catch (e) { hs = []; } /* k89: sönük kovan etkin sayımlara girmez */ return scope === 'all' ? hs : hs.filter(function (h) { return String(h.apiaryId) === scope; }); }
    loadAps();
    var saved = null; try { saved = global.localStorage.getItem(SCOPE_KEY); } catch (e) { saved = null; }
    scope = valid(opts.initial || saved || 'all');
    host.setAttribute('aria-label', (opts.title || 'Kapsam') + ' kapsamı');
    var SC = opts.bk ? 'bk-stat' : 'ks-stat';
    if (opts.bk) {
      /* Bakım'daki Kapsam kartının birebir işaretlemesi (bakim.html #bkScope sınıfları; stil bakim-akis.html'e senkronlanır) */
      host.classList.add('weather', 'bk-scope');
      var end = opts.topEnd != null ? opts.topEnd : (opts.topExtra || '');
      if (!end) end = weatherEndHtml();
      host.innerHTML =
        '<div class="bk-top">' + (opts.icon || '') +
          '<span class="bk-title">' + esc(opts.title || '') + '</span>' +
          '<span class="bk-mode demo" data-ks-mode hidden>Demo</span>' +
          '<div class="weather-loc bk-sel"><div class="arilik-loc-controls">' +
            '<button type="button" class="arilik-nav" data-ks-prev aria-label="Önceki kapsam" title="Önceki"><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M7.5 2.5L3.5 6l4 3.5"/></svg></button>' +
            '<span class="weather-loc-label" data-ks-label aria-live="polite">Tümü</span>' +
            '<button type="button" class="arilik-nav" data-ks-next aria-label="Sonraki kapsam" title="Sonraki"><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M4.5 2.5L8.5 6l-4 3.5"/></svg></button>' +
          '</div></div>' + end +
        '</div>' +
        '<div class="bk-stats" data-ks-stats aria-label="Kapsam özeti"></div>' +
        (opts.bottom != null ? opts.bottom : '<a class="muayene-hint is-active bk-note" data-ks-note href="#"><span class="muayene-hint-text" data-ks-nt>—</span><span class="muayene-hint-ok" data-ks-nb>Aç</span></a>');
    } else {
    host.classList.add('ks-card');
    var endK = opts.topEnd != null ? opts.topEnd : (opts.topExtra || '');
    if (!endK) endK = weatherEndHtml();
    host.innerHTML =
      '<div class="ks-top">' + (opts.icon || '') +
        '<h2 class="ks-title">' + esc(opts.title || '') + '</h2>' +
        '<span class="ks-mode" data-ks-mode hidden>Demo</span>' +
        '<div class="ks-sel">' +
          '<button type="button" class="ks-nav" data-ks-prev aria-label="Önceki arılık" title="Önceki"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L3.5 6l4 3.5"/></svg></button>' +
          '<span class="ks-label" data-ks-label aria-live="polite">Tümü</span>' +
          '<button type="button" class="ks-nav" data-ks-next aria-label="Sonraki arılık" title="Sonraki"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8.5 6l-4 3.5"/></svg></button>' +
        '</div>' + endK +
      '</div>' +
      '<div class="ks-stats" data-ks-stats aria-label="Kapsam özeti"></div>' +
      '<a class="ks-note" data-ks-note href="#"><span class="ks-note-t" data-ks-nt>—</span><span class="ks-note-b" data-ks-nb>Aç</span></a>';
    }
    function q(sel) { return host.querySelector(sel); }
    function render() {
      loadAps(); scope = valid(scope);
      var hs = hives(), sum = summary(hs), ap = scope === 'all' ? null : apOf(scope);
      q('[data-ks-label]').textContent = ap ? ap.name : 'Tümü';
      q('[data-ks-label]').title = ap ? ap.name : 'Tüm arılıklar (' + aps.length + ')';
      var multi = list().length > 1;
      q('[data-ks-prev]').disabled = !multi; q('[data-ks-next]').disabled = !multi;
      q('[data-ks-mode]').hidden = live(); /* rozet yalnız Demo'da */
      q('[data-ks-stats]').innerHTML = statsHtml(opts.stats ? opts.stats(hs, scope, sum) : [], SC);
      var n = opts.note ? opts.note(hs, scope, sum) : null;
      var ne = q('[data-ks-note]');
      if (ne) ne.hidden = !n;
      if (ne && n) {
        q('[data-ks-nt]').textContent = n.t; q('[data-ks-nb]').textContent = n.b || 'Aç';
        ne.href = n.href || '#'; ne.setAttribute('data-note', n.k || ''); ne.setAttribute('aria-label', n.t + ' — ' + (n.b || 'Aç'));
      }
      if (opts.onChange) opts.onChange(scope, hs, sum);
    }
    function setScope(s) {
      scope = valid(s);
      try { global.localStorage.setItem(SCOPE_KEY, scope); } catch (e) { /* ignore */ }
      var K = global.SuperAriKoloni;
      if (scope !== 'all' && K && K.setLastApiary) { try { K.setLastApiary(scope); } catch (e) { /* ignore */ } }
      try {
        var u = new URLSearchParams(global.location.search);
        if (scope === 'all') { u.delete('apiary'); if (u.get('mode') === 'apiary') u.set('mode', 'all'); }
        else { u.set('apiary', scope); if (u.has('mode')) u.set('mode', 'apiary'); }
        u.delete('id');
        global.history.replaceState(null, '', (opts.page || global.location.pathname.split('/').pop()) + (u.toString() ? '?' + u.toString() : '') + (global.location.hash || '')); /* görünüm (#…) korunur; geri tuşu doğru yere döner */
      } catch (e) { /* ignore */ }
      render();
    }
    function step(d) { var l = list(), i = l.indexOf(scope); setScope(l[((i + d) % l.length + l.length) % l.length]); }
    q('[data-ks-prev]').addEventListener('click', function () { step(-1); });
    q('[data-ks-next]').addEventListener('click', function () { step(1); });
    render();
    bindWeatherEnd(host);
    return { scope: function () { return scope; }, hives: hives, setScope: setScope, render: render, apOf: apOf };
  }

  var ICON_MUAYENE = '<svg class="ks-ico" viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="6" width="18" height="22" rx="3" fill="#cfd8e3" stroke="#9aa8b8" stroke-width="1"/><rect x="11.5" y="3.5" width="9" height="5" rx="1.6" fill="#f7b731"/><circle cx="15" cy="17" r="4.2" fill="#fff" stroke="#5c3a1f" stroke-width="1.8"/><path d="M18 20l3.2 3.2" stroke="#5c3a1f" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_KOVAN = '<svg class="ks-ico" viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="5" width="20" height="5" rx="1.4" fill="#f7b731" stroke="#b8860b" stroke-width=".8"/><rect x="7" y="11" width="18" height="7" rx="1" fill="#e8c48e" stroke="#8a6030" stroke-width="1"/><rect x="7" y="18.6" width="18" height="7" rx="1" fill="#e8c48e" stroke="#8a6030" stroke-width="1"/><rect x="14" y="24" width="4" height="1.4" fill="#2a1a0c"/></svg>';

  /** k107: Ana .grid > .tile ile birebir (bakim-akis muayene listesi ile aynı işaretleme) */
  function anaHiveTileHtml(o) {
    o = o || {};
    var sev = o.sev === 'act' ? ' sev-act' : (o.sev === 'check' ? ' sev-check' : '');
    var extra = o.extraClass ? ' ' + o.extraClass : '';
    var href = o.href ? ' href="' + esc(o.href) + '"' : '';
    var data = '';
    if (o.dataHive) data += ' data-hive="' + esc(o.dataHive) + '"';
    if (o.dataTeHive) data += ' data-te-hive="' + esc(o.dataTeHive) + '"';
    if (o.dataTopic) data += ' data-topic="' + esc(o.dataTopic) + '"';
    if (o.dataKey) data += ' data-key="' + esc(o.dataKey) + '"';
    var aria = o.aria ? ' aria-label="' + esc(o.aria) + '"' : '';
    var tone = o.tone || 'tan';
    if (tone === 'priority-1') tone = 'red';
    if (tone === 'priority-2') tone = 'orange';
    if (tone === 'priority-3') tone = 'green';
    var badge = o.badge != null && o.badge !== '' ? '<div class="badge ' + esc(tone) + '">' + esc(o.badge) + '</div>' : '';
    return '<a class="tile' + sev + extra + '"' + href + data + aria + '>' +
      anaHiveHtml({ num: o.num, burn: o.burn, svg: o.svg }) +
      '<div class="tile-label">' + esc(o.label || '') + '</div>' +
      badge + '</a>';
  }

  function ksBadgeTone(cls) {
    if (cls === 'green') return 'green';
    if (cls === 'red') return 'red';
    if (cls === 'orange') return 'orange';
    if (cls === 'blue') return 'blue';
    if (cls === 'purple') return 'purple';
    if (cls === 'yellow') return 'yellow';
    return 'gray';
  }

  /** Koloni konu / cihaz türü gibi modül seçici döşemeler (Ana .tile ile aynı işaretleme). */
  function anaModuleTile(o) {
    o = o || {};
    var tone = o.tone || ksBadgeTone(o.badgeCls);
    return anaHiveTileHtml({
      href: o.href,
      label: o.label,
      badge: o.badge,
      tone: tone,
      burn: o.burn,
      svg: o.svg,
      sev: o.sev,
      extraClass: o.extraClass,
      dataTopic: o.dataTopic,
      dataKey: o.dataKey,
      aria: o.aria
    });
  }

  global.SuperAriKapsam = { mount: mount, summary: summary, health: health, SEV: SEV, hiveHtml: hiveHtml, anaHiveHtml: anaHiveHtml, anaHiveTileHtml: anaHiveTileHtml, anaModuleTile: anaModuleTile, ksBadgeTone: ksBadgeTone, hiveNum: hiveNum, BURN: BURN, shortAlert: shortAlert, fmtAgo: fmtAgo, esc: esc, live: live, ICON_MUAYENE: ICON_MUAYENE, ICON_KOVAN: ICON_KOVAN, weatherEndHtml: weatherEndHtml };
})(typeof window !== 'undefined' ? window : this);
