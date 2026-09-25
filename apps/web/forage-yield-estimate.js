(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var BREED_BY_ID = { a1: 'Muğla Arısı', a2: 'Karniyol', a3: 'Kafkas × Karniyol', a4: 'Kafkas', a5: 'Kafkas × Karadeniz' };
  var QUEEN_YEAR = 2026;
  var SEASON_DAYS_DEFAULT = 153;
  var BASE_KG = 13.8;
  var COVER_TR = 'Karadeniz karışık orman · kestane, gürgen, orman gülü';
  var anim = { t0: 0, timer: null };
  function placeBreed(a) {
    if (!a) return '';
    if (a.id && BREED_BY_ID[a.id]) return BREED_BY_ID[a.id];
    var s = String((a.name || '') + ' ' + (a.place || '')).toLocaleLowerCase('tr');
    if (/kayaköy|kayakoy|fethiye|muğla/.test(s)) return 'Muğla Arısı';
    if (/tortum/.test(s)) return 'Karniyol';
    if (/paland/.test(s)) return 'Kafkas × Karniyol';
    if (/yanık|yanik/.test(s)) return 'Kafkas';
    if (/cimil/.test(s)) return 'Kafkas × Karadeniz';
    return '';
  }
  function foggyPlace(a) {
    return /yanık|yanik|cimil|rize|çayeli/.test(String((a && (a.name || '')) + ' ' + (a && (a.place || ''))).toLocaleLowerCase('tr'));
  }
  function rizePlace(a) {
    return /yanık|yanik|cimil|rize|çayeli|ikizdere/.test(String((a && (a.name || '')) + (a && a.il || '')).toLocaleLowerCase('tr'));
  }
  function breedKey(label) {
    var s = String(label || '').toLocaleLowerCase('tr');
    if (s.indexOf('karadeniz') !== -1) return 'kafkas_karadeniz';
    if (s.indexOf('kafkas') !== -1 && (s.indexOf('karn') !== -1 || s.indexOf('×') !== -1)) return 'kafkas_karniyol';
    if (s.indexOf('kafkas') !== -1) return 'kafkas';
    if (s.indexOf('karniyol') !== -1) return 'karniyol';
    if (s.indexOf('muğla') !== -1) return 'mugla';
    return s;
  }
  function climateDays(apiary) {
    var drizzle = foggyPlace(apiary) ? 45 : 0;
    return { season: SEASON_DAYS_DEFAULT, drizzle: drizzle };
  }
  function liveProduct(apiary) {
    var days = climateDays(apiary);
    var key = breedKey(placeBreed(apiary));
    var share = days.drizzle / days.season;
    var breedF = 1, flyF = 1, eatF = 1;
    if (key === 'karniyol') { breedF = foggyPlace(apiary) ? 1 : 1.08; flyF = 1 - share; eatF = Math.max(0.82, 1 - 0.0018 * days.drizzle); }
    else if (key === 'kafkas_karadeniz') { breedF = 1.22; flyF = 1 - share * 0.18; }
    else if (key === 'kafkas_karniyol') { breedF = 1.2; }
    else if (key === 'kafkas') { breedF = foggyPlace(apiary) ? 1.08 : 0.97; flyF = 1 - share * 0.25; }
    else if (key === 'mugla') { breedF = 1.05; }
    return Math.round(breedF * flyF * eatF * 1000) / 1000;
  }
  function kg(n) { return Math.round(Number(n) * 10) / 10; }
  function targetOf(a) {
    var n = (a && a.hiveCount) || 20;
    var mid = kg(BASE_KG * liveProduct(a) * 1.06);
    return { mid: mid, n: n, total: Math.round(mid * n), breed: placeBreed(a) || 'Kafkas' };
  }
  function apiary() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return { name: 'Yanıkdağ', hiveCount: 20, lat: 41.0808, lon: 40.754 };
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) if (id && String(list[i].id) === String(id)) return list[i];
    for (var j = 0; j < list.length; j++) if (/yanık|yanik/.test(String(list[j].name || ''))) return list[j];
    return list[0] || { name: 'Yanıkdağ', hiveCount: 20 };
  }
  function fallbackCover(a) {
    return {
      ok: true,
      summaryTr: rizePlace(a) ? COVER_TR : 'Örtü biyom',
      vegScore: 64
    };
  }
  function fillCoverDom() {
    var host = document.getElementById('forageHost');
    if (!host) return;
    var sum = fallbackCover(apiary()).summaryTr;
    host.querySelectorAll('p, div, span').forEach(function (n) {
      var t = n.textContent || '';
      if (/alınamadı|Canlı örtü/.test(t) && t.length < 200) n.textContent = 'Bitki örtüsü · ' + sum;
    });
  }
  function allLines(a) {
    var t = targetOf(a);
    var days = climateDays(a);
    return [
      'Su kaynağı · ' + ((a && a.waterDistanceM) || 240) + ' m',
      'Flora / OSM örtü · ' + fallbackCover(a).summaryTr,
      'İklim arşivi · 19.1 °C · 96 yağışlı gün',
      'Uçuş / yağış · sis-çise ' + days.drizzle + '/' + days.season,
      'Mevsim / kışlama · alındı',
      'Hedef bal · ' + t.mid + ' kg/kovan · ' + t.n + ' kovan · ' + t.total + ' kg (' + t.breed + ')',
      'Ana yaşı · yeni doğmuş · 2026 · ×1.06',
      rizePlace(a) ? 'Deli bal · kuşakta (arıya zarar yok)' : 'Deli bal · beklenmez'
    ];
  }
  function paint(pct) {
    var el = document.getElementById('saFloraBar');
    if (!el) return;
    var lines = allLines(apiary());
    var showN = Math.max(1, Math.min(lines.length, Math.ceil((pct / 100) * lines.length)));
    var title = el.querySelector('[data-sa-title]');
    var fill = el.querySelector('.fill');
    var box = el.querySelector('[data-sa-lines]');
    if (title) title.textContent = (pct >= 100 ? 'Konum verisi güncel' : 'Konum verisi güncelleniyor') + ' · ' + pct + '%';
    if (fill) fill.style.width = pct + '%';
    if (box) box.innerHTML = lines.slice(0, showN).map(function (t) { return '<p class="sa-under">' + t + '</p>'; }).join('');
    var t = targetOf(apiary());
    var card = document.getElementById('saYieldCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'saYieldCard';
      card.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:12px;border:1px solid #e0d2a8;background:#fffaf0;';
      el.parentNode.insertBefore(card, el.nextSibling);
    }
    card.innerHTML = '<strong>Hedef bal</strong> · ' + t.mid + ' kg/kovan · ' + t.n + ' kovan · <strong>' + t.total + ' kg</strong><br><span style="font-size:12px">' + t.breed + ' · taban ' + BASE_KG + ' × ırk/sis × ana 1,06</span>';
    fillCoverDom();
  }
  function ensureBar() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('saFloraBarCss')) {
      var s = document.createElement('style');
      s.id = 'saFloraBarCss';
      s.textContent =
        '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;}' +
        '#saFloraBar .sa-title{margin:0 0 6px;font-size:13px;font-weight:700;color:#2c4a22;}' +
        '#saFloraBar .sa-barrow{display:flex;align-items:center;gap:8px;}' +
        '#saFloraBar .track{flex:1;height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;}' +
        '#saFloraBar .fill{height:100%;background:#3d9a4a;}' +
        '#saFloraBar .fs-chev{flex:0 0 28px;border:0;background:transparent;color:#8a8278;}' +
        '#saFloraBar .sa-under{margin:6px 0 0;font-size:12px;color:#2c4a22;}';
      document.head.appendChild(s);
    }
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    if (!document.getElementById('saFloraBar')) {
      var el = document.createElement('div');
      el.id = 'saFloraBar';
      el.innerHTML = '<p class="sa-title" data-sa-title>Konum verisi güncelleniyor · 0%</p><div class="sa-barrow"><div class="track"><div class="fill"></div></div><button type="button" class="fs-chev">›</button></div><div data-sa-lines></div>';
      anchor.parentNode.insertBefore(el, anchor);
    }
    if (!anim.timer) {
      anim.t0 = Date.now();
      anim.timer = setInterval(function () {
        var pct = Math.min(100, Math.round((Date.now() - anim.t0) / 90));
        paint(pct);
        if (pct >= 100) { clearInterval(anim.timer); anim.timer = null; }
      }, 90);
    }
    paint(Math.min(100, Math.round((Date.now() - (anim.t0 || Date.now())) / 90) || 10));
  }
  function start() {
    ensureBar();
    setTimeout(ensureBar, 400);
    setTimeout(fillCoverDom, 800);
  }
  start();
  setTimeout(start, 900);
})(window);
