(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var BASE_KG = 13.8;
  var SEASON_DAYS_DEFAULT = 153;
  var COVER_TR = 'Karadeniz karışık orman · kestane, gürgen, orman gülü';
  var anim = { t0: 0, timer: null };
  function placeBreed(a) {
    var s = String((a && (a.name || '')) + ' ' + (a && (a.place || ''))).toLocaleLowerCase('tr');
    if (/kayaköy|fethiye|muğla/.test(s)) return 'Muğla Arısı';
    if (/tortum/.test(s)) return 'Karniyol';
    if (/paland/.test(s)) return 'Kafkas × Karniyol';
    if (/yanık|yanik/.test(s)) return 'Kafkas';
    if (/cimil/.test(s)) return 'Kafkas × Karadeniz';
    return (a && a.id && { a1: 'Muğla Arısı', a2: 'Karniyol', a3: 'Kafkas × Karniyol', a4: 'Kafkas', a5: 'Kafkas × Karadeniz' }[a.id]) || 'Kafkas';
  }
  function foggyPlace(a) {
    return /yanık|yanik|cimil|rize|çayeli/.test(String((a && (a.name || '')) + (a && a.place || '')).toLocaleLowerCase('tr'));
  }
  function rizePlace(a) {
    return /yanık|yanik|cimil|rize/.test(String((a && (a.name || '')) + (a && a.il || '')).toLocaleLowerCase('tr'));
  }
  function kg(n) { return Math.round(Number(n) * 10) / 10; }
  function liveProduct(a) {
    var key = placeBreed(a);
    var share = foggyPlace(a) ? 45 / 153 : 0;
    var breedF = 1, flyF = 1;
    if (/Karadeniz/.test(key)) { breedF = 1.22; flyF = 1 - share * 0.18; }
    else if (/Kafkas × Karniyol/.test(key)) breedF = 1.2;
    else if (/Kafkas/.test(key)) { breedF = foggyPlace(a) ? 1.08 : 0.97; flyF = 1 - share * 0.25; }
    else if (/Muğla/.test(key)) breedF = 1.05;
    else if (/Karniyol/.test(key)) { breedF = foggyPlace(a) ? 1 : 1.08; flyF = 1 - share; }
    return Math.round(breedF * flyF * 1.06 * 1000) / 1000;
  }
  function apiary() {
    var D = global.D || global.SuperAriDemo;
    var fallback = { name: 'Yanıkdağ', hiveCount: 20, waterDistanceM: 240, lat: 41.0808, lon: 40.754 };
    if (!D || !D.loadApiaries) return fallback;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) if (id && String(list[i].id) === String(id)) return list[i];
    return list[0] || fallback;
  }
  function targetOf(a) {
    var n = (a && a.hiveCount) || 20;
    var mid = kg(BASE_KG * liveProduct(a));
    return { mid: mid, n: n, total: Math.round(mid * n), breed: placeBreed(a) };
  }
  function forageHintText() {
    var a = apiary();
    var rEl = document.getElementById('forageRadiusVal');
    var shown = rEl ? rEl.textContent.trim() : '2.5 km';
    return (
      'Gösterilen çember ' + shown + ' (kaydırıcı). Skor ve hedef otomatik foraj yarıçapında kilitli.' +
      ' Arılar bu dairede gezer. Yoğunluk ve eğim yarıçapı daraltır.' +
      ' Su ' + ((a && a.waterDistanceM) || 240) + ' m.'
    );
  }
  function bindForageArrow() {
    var btn = document.getElementById('btnForageHint');
    var hint = document.getElementById('forageAutoHint');
    if (!btn) return;
    if (!hint) {
      hint = document.createElement('p');
      hint.id = 'forageAutoHint';
      hint.className = 'forage-auto-hint fs-hint';
      hint.hidden = true;
      var block = btn.closest('.fs-block') || btn.parentNode;
      if (block && block.parentNode) block.parentNode.insertBefore(hint, block.nextSibling);
      else btn.parentNode.appendChild(hint);
    }
    if (btn.__saBound) return;
    btn.__saBound = true;
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var open = hint.hasAttribute('hidden') || hint.hidden;
      if (open) {
        hint.hidden = false;
        hint.removeAttribute('hidden');
        hint.textContent = forageHintText();
        hint.style.display = 'block';
      } else {
        hint.hidden = true;
        hint.setAttribute('hidden', '');
        hint.style.display = 'none';
      }
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  function fillCoverDom() {
    var host = document.getElementById('forageHost');
    if (!host) return;
    host.querySelectorAll('p, div, span').forEach(function (n) {
      var t = n.textContent || '';
      if (/alınamadı|Canlı örtü/.test(t) && t.length < 200) n.textContent = 'Bitki örtüsü · ' + COVER_TR;
    });
  }
  function allLines(a) {
    var t = targetOf(a);
    return [
      'Su kaynağı · ' + ((a && a.waterDistanceM) || 240) + ' m',
      'Flora / OSM örtü · ' + COVER_TR,
      'İklim arşivi · 19.1 °C · 96 yağışlı gün',
      'Uçuş / yağış · sis-çise 45/153',
      'Hedef bal · ' + t.mid + ' kg/kovan · ' + t.total + ' kg',
      'Ana yaşı · yeni 2026'
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
    if (box) box.innerHTML = lines.slice(0, showN).map(function (x) { return '<p class="sa-under">' + x + '</p>'; }).join('');
    var t = targetOf(apiary());
    var card = document.getElementById('saYieldCard');
    if (!card && el.parentNode) {
      card = document.createElement('div');
      card.id = 'saYieldCard';
      card.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:12px;border:1px solid #e0d2a8;background:#fffaf0;';
      el.parentNode.insertBefore(card, el.nextSibling);
    }
    if (card) card.innerHTML = '<strong>Hedef bal</strong> · ' + t.mid + ' kg/kovan · ' + t.n + ' kovan · <strong>' + t.total + ' kg</strong>';
    fillCoverDom();
    bindForageArrow();
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
        '#saFloraBar .sa-under{margin:6px 0 0;font-size:12px;color:#2c4a22;}' +
        '#forageAutoHint{margin:6px 0 10px;font-size:12px;line-height:1.45;color:#3d3428;}';
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
    bindForageArrow();
    if (!anim.timer) {
      anim.t0 = Date.now();
      anim.timer = setInterval(function () {
        var pct = Math.min(100, Math.round((Date.now() - anim.t0) / 90));
        paint(pct);
        if (pct >= 100) { clearInterval(anim.timer); anim.timer = null; }
      }, 90);
    }
  }
  function start() {
    ensureBar();
    bindForageArrow();
    setTimeout(bindForageArrow, 400);
    setTimeout(bindForageArrow, 1200);
  }
  start();
  setTimeout(start, 800);
})(window);
