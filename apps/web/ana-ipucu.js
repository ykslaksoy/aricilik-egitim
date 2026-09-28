/* SüperArı · Ana ekran akıllı not şeridi (Arılar ile Ses arasındaki «Tamam»lı satır).
 * Öncelik: 1) kritik/önemli durumlar (Müdahale/Kontrol, kritik kışlık stok, anasız, kritik uyarılar, geciken ilaç kontrolü)
 *          2) muayene sezonu: havaya uygun ilk gün + 21 günü geçen muayeneler  3) yalnız hava ipucu  4) sezon dışı kısa not.
 * Kapsam: Ana'nın o an gösterdiği arılık. Canlı modda yalnız gerçek kayıtlar (demo verisi yok). Sağlık puanı hesaplanmaz; yalnız durum sayılır. */
(function (global) {
  'use strict';
  var OVERDUE_DAYS = 21;
  function D() { return global.SuperAriDemo; }
  function live() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function today() { var d = D(); return d && d.records ? d.records.todayLocal() : new Date().toISOString().slice(0, 10); }

  function scopeOf(apiaryId) {
    var d = D(), aps = [], hs = [];
    try { aps = d.loadApiaries() || []; hs = d.loadHives() || []; } catch (e) { return { ap: null, hives: [] }; }
    var ap = aps.filter(function (a) { return String(a.id) === String(apiaryId); })[0] || null;
    if (live()) hs = hs.filter(function (h) { return h && !h.demo; });
    return { ap: ap, hives: ap ? hs.filter(function (h) { return String(h.apiaryId) === String(ap.id); }) : hs };
  }
  function kol(topic, ap, extra) {
    return 'kovanlar.html?view=koloni&topic=' + topic + (extra || '') + (ap ? '&mode=apiary&apiary=' + encodeURIComponent(ap.id) : '&mode=all');
  }
  /** Muayene sezonu: Kasım–Şubat hiç; Mart–Ekim arasında bölge profili hâlâ «kış» diyorsa (yüksek yayla, erken ilkbahar) değil. */
  function inspectionSeason(ap) {
    var m = Number(today().slice(5, 7));
    if (m < 3 || m > 10) return false;
    var P = global.SuperAriPlan;
    if (ap && P && typeof P.seasonKind === 'function') { try { return P.seasonKind(ap.id) !== 'kis'; } catch (e) { /* ignore */ } }
    return true;
  }
  function winterSeason() { var m = Number(today().slice(5, 7)); return m >= 9 || m <= 2; }

  function critical(sc) {
    var d = D(), R = d && d.records, hs = sc.hives, t = today();
    var out = { act: 0, check: 0, queenless: 0, stock: 0, alerts: 0, checks: 0 };
    if (!hs.length || !R) return out;
    var ids = {}; hs.forEach(function (h) { ids[String(h.id)] = true; });
    /* Sağlık durumu (yalnız Müdahale / Kontrol bandı; skor gösterilmez) */
    try {
      var SH = global.SuperAriSensorHealth;
      if (SH) { var ev = SH.evaluateAll(hs); if (!live() || ev.live) { out.act = ev.counts.act || 0; out.check = ev.counts.check || 0; } }
    } catch (e) { /* ignore */ }
    var all = null; try { all = R.loadAll(); } catch (e) { all = null; }
    hs.forEach(function (h) {
      try {
        var st = R.status(h.id, all || undefined);
        if (st.queenless) out.queenless++;
        /* Geciken ilaç / hastalık kontrolü (etkin hastalık, kontrol tarihi geçti) */
        if ((st.dueChecks || []).some(function (c) { return c.date < t; })) out.checks++;
      } catch (e) { /* ignore */ }
    });
    try {
      var P = global.SuperAriPlan;
      if (winterSeason() && P && P.winterStockAll) out.stock = P.winterStockAll(hs).counts.kritik || 0;
    } catch (e) { /* ignore */ }
    /* Uyarılar: yüksek önemli (sensör / hastalık / oğul …); anasız ayrıca sayıldığı için hariç */
    try {
      (d.alerts || []).forEach(function (a) {
        if (!a || a.severity !== 'high') return;
        if (live() && a.demo) return;
        if (/^kra-anasiz-/.test(String(a.id))) return;
        if (a.hiveId != null && !ids[String(a.hiveId)]) return;
        if (a.hiveId == null && sc.ap && a.apiaryId != null && String(a.apiaryId) !== String(sc.ap.id)) return;
        out.alerts++;
      });
    } catch (e) { /* ignore */ }
    return out;
  }
  function overdueCount(sc) {
    var R = D() && D().records, lim, n = 0; if (!R) return 0;
    lim = R.addDays(today(), -OVERDUE_DAYS);
    var all = null; try { all = R.loadAll(); } catch (e) { all = null; }
    sc.hives.forEach(function (h) {
      try { var st = R.status(h.id, all || undefined); if (!st.strength || st.strength.date < lim) n++; } catch (e) { /* ignore */ }
    });
    return n;
  }
  /* Not şeridi dar (375px'te ~20 harf): sığdığı kadar parça, kalanı «+N» */
  function shortJoin(parts) {
    var out = '⚠️ ' + parts[0], i = 1;
    while (i < parts.length && (out + ' · ' + parts[i]).length <= 19) { out += ' · ' + parts[i]; i++; }
    return out + (i < parts.length ? ' +' + (parts.length - i) : '');
  }
  function dayText(best) { return best.date === today() ? 'Bugün' : best.dayLabel; }

  /** Aday notlar (öncelik sırasıyla). opts: { apiaryId, best } — best = SuperAriHava.bestInspectionDay(daily) */
  function candidates(opts) {
    opts = opts || {};
    var sc = scopeOf(opts.apiaryId), ap = sc.ap, best = opts.best || null, list = [], t = today();
    var c = critical(sc);
    var parts = [], href = null, sig = [];
    function add(n, txt, h, k) { if (!n) return; parts.push(txt); sig.push(k + n); if (!href) href = h; }
    add(c.alerts, c.alerts + ' kritik uyarı', 'uyarilar.html', 'al');
    add(c.act, c.act + ' Müdahale', 'saglik.html', 'act');
    add(c.queenless, c.queenless + ' anasız', kol('ana', ap), 'q');
    add(c.stock, c.stock + ' kritik stok', global.SuperAriPlan && global.SuperAriPlan.besHref ? global.SuperAriPlan.besHref(ap ? ap.id : '') : kol('besleme', ap, '&sub=stok'), 'stk');
    add(c.check, c.check + ' Kontrol', 'saglik.html', 'chk');
    add(c.checks, c.checks + ' ilaç gecikti', kol('hastalik', ap), 'ilc');
    if (parts.length) {
      list.push({ level: 'critical', key: 'crit|' + (ap ? ap.id : 'all') + '|' + sig.join(',') + '|' + t, text: shortJoin(parts), full: '⚠️ ' + parts.join(' · '), href: href });
    }
    if (inspectionSeason(ap)) {
      var od = overdueCount(sc);
      if (best && od) list.push({ level: 'muayene', key: 'muayene|' + (ap ? ap.id : 'all') + '|' + best.date + '|' + od, text: '🔍 ' + dayText(best) + ' · ' + od + ' gecikti', full: 'Muayene: ' + dayText(best) + ' uygun · ' + od + ' kovan gecikti', href: kol('guc', ap) });
      else if (od && !best) list.push({ level: 'muayene', key: 'muayene-nowx|' + (ap ? ap.id : 'all') + '|' + t + '|' + od, text: '🔍 ' + od + ' muayene gecikti', full: od + ' kovanın muayenesi gecikti', href: kol('guc', ap) });
      else if (best) list.push({ level: 'hava', key: 'hava|' + best.date, date: best.date, text: 'Muayene: ' + dayText(best) + ' · ' + best.reason, href: null });
    } else {
      var m = Number(t.slice(5, 7));
      list.push({ level: 'mevsim', key: 'mevsim|' + t.slice(0, 7), text: m >= 11 || m <= 2 ? 'Kış: kovanı açmayın, dıştan kontrol edin' : 'Bölgede sezon başlamadı, kovanı açmayın', href: 'bakim-plan.html' + (ap ? '?apiary=' + encodeURIComponent(ap.id) : '') });
    }
    return list;
  }
  global.SuperAriAnaIpucu = { candidates: candidates, inspectionSeason: inspectionSeason, OVERDUE_DAYS: OVERDUE_DAYS };
})(window);
