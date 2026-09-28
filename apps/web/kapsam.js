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
    var mid = o.burn && BURN[o.burn]
      ? '<div class="hi" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.2" stroke-width="1.55"/>' + BURN[o.burn] + '</svg></div>'
      : (o.num != null ? '<span class="hn" aria-hidden="true">' + esc(o.num) + '</span>' : '');
    return '<div class="ks-hive" aria-hidden="true"><div class="hs"><div class="hl"></div><div class="hb"></div><div class="hb b"><div class="he"></div></div>' +
      '<div class="hf"><span></span><span></span></div></div>' + mid + (o.dot ? '<span class="hdot" style="background:' + esc(o.dot) + '"></span>' : '') + '</div>';
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

  function statsHtml(stats) {
    return stats.map(function (x) {
      return '<a class="ks-stat ' + (x.tone || '') + '" data-stat="' + esc(x.k) + '" href="' + esc(x.href || '#') + '" aria-label="' + esc(x.l + ': ' + x.v) + '">' + (ICO[x.icon || x.k] || ICO.kovan) +
        '<span class="v">' + esc(x.v) + '</span><span class="l">' + esc(x.l) + '</span></a>';
    }).join('');
  }

  /**
   * Kapsam kartını host içine kurar. opts: { title, icon(svg), page ('bakim-akis.html'), stats(hs, scope, sum) → [], note(hs, scope, sum) → {t,b,href,k}, onChange(scope, hs, sum), initial }
   * Döner: { scope(), hives(), setScope(s), render() }
   */
  function mount(host, opts) {
    var aps = [], scope = 'all';
    function loadAps() { try { aps = D.loadApiaries() || []; } catch (e) { aps = []; } }
    function valid(s) { return s === 'all' || aps.some(function (a) { return String(a.id) === String(s); }) ? String(s) : 'all'; }
    function list() { return ['all'].concat(aps.map(function (a) { return String(a.id); })); }
    function apOf(id) { return aps.filter(function (a) { return String(a.id) === String(id); })[0] || null; }
    function hives() { var hs = []; try { hs = D.loadHives() || []; } catch (e) { hs = []; } return scope === 'all' ? hs : hs.filter(function (h) { return String(h.apiaryId) === scope; }); }
    loadAps();
    var saved = null; try { saved = global.localStorage.getItem(SCOPE_KEY); } catch (e) { saved = null; }
    scope = valid(opts.initial || saved || 'all');
    host.classList.add('ks-card');
    host.setAttribute('aria-label', (opts.title || 'Kapsam') + ' kapsamı');
    host.innerHTML =
      '<div class="ks-top">' + (opts.icon || '') +
        '<h2 class="ks-title">' + esc(opts.title || '') + '</h2>' +
        '<span class="ks-mode" data-ks-mode hidden>Demo</span>' +
        '<div class="ks-sel">' +
          '<button type="button" class="ks-nav" data-ks-prev aria-label="Önceki arılık" title="Önceki"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L3.5 6l4 3.5"/></svg></button>' +
          '<span class="ks-label" data-ks-label aria-live="polite">Tümü</span>' +
          '<button type="button" class="ks-nav" data-ks-next aria-label="Sonraki arılık" title="Sonraki"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8.5 6l-4 3.5"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class="ks-stats" data-ks-stats aria-label="Kapsam özeti"></div>' +
      '<a class="ks-note" data-ks-note href="#"><span class="ks-note-t" data-ks-nt>—</span><span class="ks-note-b" data-ks-nb>Aç</span></a>';
    function q(sel) { return host.querySelector(sel); }
    function render() {
      loadAps(); scope = valid(scope);
      var hs = hives(), sum = summary(hs), ap = scope === 'all' ? null : apOf(scope);
      q('[data-ks-label]').textContent = ap ? ap.name : 'Tümü';
      q('[data-ks-label]').title = ap ? ap.name : 'Tüm arılıklar (' + aps.length + ')';
      var multi = list().length > 1;
      q('[data-ks-prev]').disabled = !multi; q('[data-ks-next]').disabled = !multi;
      q('[data-ks-mode]').hidden = live(); /* rozet yalnız Demo'da */
      q('[data-ks-stats]').innerHTML = statsHtml(opts.stats ? opts.stats(hs, scope, sum) : []);
      var n = opts.note ? opts.note(hs, scope, sum) : null;
      var ne = q('[data-ks-note]');
      ne.hidden = !n;
      if (n) {
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
        global.history.replaceState(null, '', (opts.page || global.location.pathname.split('/').pop()) + (u.toString() ? '?' + u.toString() : ''));
      } catch (e) { /* ignore */ }
      render();
    }
    function step(d) { var l = list(), i = l.indexOf(scope); setScope(l[((i + d) % l.length + l.length) % l.length]); }
    q('[data-ks-prev]').addEventListener('click', function () { step(-1); });
    q('[data-ks-next]').addEventListener('click', function () { step(1); });
    render();
    return { scope: function () { return scope; }, hives: hives, setScope: setScope, render: render, apOf: apOf };
  }

  var ICON_MUAYENE = '<svg class="ks-ico" viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="6" width="18" height="22" rx="3" fill="#cfd8e3" stroke="#9aa8b8" stroke-width="1"/><rect x="11.5" y="3.5" width="9" height="5" rx="1.6" fill="#f7b731"/><circle cx="15" cy="17" r="4.2" fill="#fff" stroke="#5c3a1f" stroke-width="1.8"/><path d="M18 20l3.2 3.2" stroke="#5c3a1f" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_KOVAN = '<svg class="ks-ico" viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="5" width="20" height="5" rx="1.4" fill="#f7b731" stroke="#b8860b" stroke-width=".8"/><rect x="7" y="11" width="18" height="7" rx="1" fill="#e8c48e" stroke="#8a6030" stroke-width="1"/><rect x="7" y="18.6" width="18" height="7" rx="1" fill="#e8c48e" stroke="#8a6030" stroke-width="1"/><rect x="14" y="24" width="4" height="1.4" fill="#2a1a0c"/></svg>';

  global.SuperAriKapsam = { mount: mount, summary: summary, health: health, SEV: SEV, hiveHtml: hiveHtml, hiveNum: hiveNum, shortAlert: shortAlert, fmtAgo: fmtAgo, esc: esc, live: live, ICON_MUAYENE: ICON_MUAYENE, ICON_KOVAN: ICON_KOVAN };
})(typeof window !== 'undefined' ? window : this);
