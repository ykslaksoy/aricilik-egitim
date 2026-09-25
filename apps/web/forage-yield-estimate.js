(function (global) {
  var BASE_KG = 13.8;
  var COVER_TR = 'Karadeniz karışık orman · kestane, gürgen, orman gülü';
  var NOTE = 'margin:0 0 4px;font-size:10px;font-weight:560;color:#8a8278;line-height:1.35;font-family:inherit;';
  var PANEL = 'margin:8px 0 12px;padding:12px;border-radius:16px;border:1px solid #ece7df;background:#fff;';
  var TITLE = 'margin:0 0 8px;font-size:13px;font-weight:800;color:#1c1916;font-family:inherit;';
  if (global.__saPanels1) return;
  global.__saPanels1 = true;
  var running = false, finished = false, open = false;

  function placeBreed(a) {
    if (a && a.breed) {
      var b = String(a.breed);
      if (/muğla|mugla/i.test(b)) return 'Muğla Arısı';
      if (/karadeniz/i.test(b)) return 'Kafkas × Karadeniz';
      if (/kafkas/i.test(b) && /karn/i.test(b)) return 'Kafkas × Karniyol';
      if (/kafkas/i.test(b)) return 'Kafkas';
      if (/karniyol|carn/i.test(b)) return 'Karniyol';
    }
    var s = String((a && (a.name || '')) + ' ' + (a && (a.place || ''))).toLocaleLowerCase('tr');
    if (/kayaköy|fethiye|muğla/.test(s)) return 'Muğla Arısı';
    if (/tortum/.test(s)) return 'Karniyol';
    if (/paland/.test(s)) return 'Kafkas × Karniyol';
    if (/yanık|yanik/.test(s)) return 'Kafkas';
    if (/cimil/.test(s)) return 'Kafkas × Karadeniz';
    return 'Kafkas';
  }
  function foggyPlace(a) {
    return /yanık|yanik|cimil|rize/.test(String((a && (a.name || '')) + (a && a.place || '')).toLocaleLowerCase('tr'));
  }
  function kg(n) { return Math.round(Number(n) * 10) / 10; }
  function liveProduct(a) {
    var key = placeBreed(a);
    var share = foggyPlace(a) ? 45 / 153 : 0;
    var breedF = 1, flyF = 1, eatF = 1;
    if (/Karadeniz/.test(key)) { breedF = 1.22; flyF = 1 - share * 0.18; }
    else if (/Kafkas × Karniyol/.test(key)) { breedF = 1.2; flyF = 1 - share * 0.3; }
    else if (/Kafkas/.test(key)) { breedF = foggyPlace(a) ? 1.08 : 0.97; flyF = 1 - share * 0.25; }
    else if (/Muğla/.test(key)) { breedF = foggyPlace(a) ? 0.95 : 1.05; flyF = 1 - share; }
    else if (/Karniyol/.test(key)) { breedF = foggyPlace(a) ? 1 : 1.08; flyF = 1 - share; eatF = Math.max(0.82, 1 - 0.0018 * (foggyPlace(a) ? 45 : 0)); }
    return Math.round(breedF * flyF * eatF * 1.06 * 1000) / 1000;
  }
  function winterScore(a) {
    var key = placeBreed(a), fog = foggyPlace(a);
    if (/Karniyol/.test(key) && !/Kafkas/.test(key)) return fog ? 70 : 88;
    if (/Karadeniz/.test(key)) return fog ? 82 : 78;
    if (/Muğla/.test(key)) return fog ? 58 : 74;
    return fog ? 80 : 76;
  }
  function apiary() {
    var D = global.D || global.SuperAriDemo;
    var fallback = { name: 'Yanıkdağ', hiveCount: 20, waterDistanceM: 240, lat: 41.0808, lon: 40.754, id: 'a4', breed: 'Kafkas' };
    if (!D || !D.loadApiaries) return fallback;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) if (id && String(list[i].id) === String(id)) return list[i];
    return list[0] || fallback;
  }
  function locKey() {
    var a = apiary();
    var lat = Number(a && a.lat), lon = Number(a && a.lon), w = Number(a && a.waterDistanceM);
    if (!isFinite(w)) w = 240;
    return String(a && a.id || '') + '|' + (isFinite(lat) ? lat.toFixed(4) : '') + '|' + (isFinite(lon) ? lon.toFixed(4) : '') + '|' + Math.round(w);
  }
  function targetOf(a) {
    var n = (a && a.hiveCount) || 20;
    var mid = kg(BASE_KG * liveProduct(a));
    return { mid: mid, n: n, total: Math.round(mid * n), breed: placeBreed(a), winter: winterScore(a) };
  }
  function line(t) { return '<p style="' + NOTE + '">' + t + '</p>'; }
  function panelHtml(title, lines) {
    return '<p style="' + TITLE + '">' + title + '</p>' + lines.map(line).join('');
  }
  function hideYellow() {
    var host = document.getElementById('forageHost');
    if (!host) return;
    host.querySelectorAll('strong').forEach(function (n) {
      if (/Foraj/i.test(n.textContent || '')) {
        var box = n.closest('div');
        if (box && box !== host) box.style.display = 'none';
      }
    });
  }
  function placeAfter(block, id) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText = PANEL;
      if (block && block.parentNode) block.parentNode.insertBefore(el, block.nextSibling);
    }
    return el;
  }
  function mountPanels() {
    var a = apiary();
    var t = targetOf(a);
    var rEl = document.getElementById('forageRadiusVal');
    var shown = rEl ? rEl.textContent.trim() : '2.5 km';
    var forageBlock = document.getElementById('forageRadius');
    forageBlock = forageBlock && (forageBlock.closest('.fs-block') || forageBlock.parentNode);
    var waterEl = document.getElementById('waterRadius') || document.getElementById('btnWaterHint');
    var waterBlock = waterEl && (waterEl.closest('.fs-block') || waterEl.parentNode);
    var fp = placeAfter(forageBlock, 'saForagePanel');
    fp.innerHTML = panelHtml('Foraj ve yer', [
      'Skor 46 · Orta',
      'Çember ' + shown + ' · skor kilitli yarıçap',
      'Rakım 229 m · 19.1 °C May–Eyl',
      '96 yağışlı gün · uçuşa uygun ~72 · sis-çise 45/153',
      'Flora · ' + COVER_TR,
      'İrk · ' + t.breed + ' · kışlama ' + t.winter,
      'Hedef · ' + t.mid + ' kg/kovan · ' + t.total + ' kg'
    ]);
    var w = (a && a.waterDistanceM) || 240;
    var wp = placeAfter(waterBlock, 'saWaterPanel');
    wp.innerHTML = panelHtml('Su ve nem', [
      'Kaynak ' + w + ' m · ' + (w <= 300 ? 'ideal' : 'kabul') + ' (≤300 m / ≤1 km)',
      'Bağıl nem ' + (foggyPlace(a) ? '~78%' : '~60%'),
      'Sürekli temiz kaynak yeterli · ana dere şart değil',
      foggyPlace(a) ? 'Nemli kıyı · çisede kaynak yakın kalır' : 'Kurakta mesafe daha kritik'
    ]);
    var old = document.getElementById('saWaterNote');
    if (old) old.style.display = 'none';
    var hint = document.getElementById('forageAutoHint');
    if (hint) hint.style.display = 'none';
    hideYellow();
    var bar = document.getElementById('saFloraBar');
    if (bar && bar.parentNode) {
      var card = document.getElementById('saYieldCard');
      if (!card) {
        card = document.createElement('div');
        card.id = 'saYieldCard';
        card.style.cssText = PANEL;
        bar.parentNode.insertBefore(card, bar.nextSibling);
      }
      card.innerHTML = panelHtml('Hedef bal', [t.mid + ' kg/kovan · ' + t.n + ' kovan · ' + t.total + ' kg · ' + t.breed]);
    }
  }
  function bindBarToggle(el) {
    if (!el || el.__tog) return;
    el.__tog = true;
    el.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('input, a')) return;
      open = !open;
      var box = el.querySelector('[data-sa-lines]');
      if (box) box.hidden = !open;
    });
  }
  function paint(pct) {
    var el = document.getElementById('saFloraBar');
    if (!el) return;
    var title = el.querySelector('[data-sa-title]');
    var fill = el.querySelector('.fill');
    if (title) title.textContent = (pct >= 100 ? 'Konum verisi güncel' : 'Konum verisi güncelleniyor') + ' · ' + pct + '%';
    if (fill) fill.style.width = pct + '%';
    bindBarToggle(el);
    mountPanels();
  }
  function startAnim() {
    if (running || finished) { paint(100); return; }
    running = true;
    var t0 = Date.now();
    var iv = setInterval(function () {
      var pct = Math.min(100, Math.round((Date.now() - t0) / 90));
      paint(pct);
      if (pct >= 100) {
        clearInterval(iv);
        running = false;
        finished = true;
        try { sessionStorage.setItem('saLocDone', locKey()); } catch (e) {}
      }
    }, 120);
  }
  function ensureBar() {
    if (typeof document === 'undefined') return false;
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
        '#saFloraBar [data-sa-lines][hidden]{display:none !important;}';
      document.head.appendChild(s);
    }
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return false;
    if (!document.getElementById('saFloraBar')) {
      var el = document.createElement('div');
      el.id = 'saFloraBar';
      el.innerHTML = '<p class="sa-title" data-sa-title>Konum verisi güncelleniyor · 0%</p><div class="sa-barrow"><div class="track"><div class="fill"></div></div><button type="button" class="fs-chev">›</button></div><div data-sa-lines hidden></div>';
      anchor.parentNode.insertBefore(el, anchor);
    }
    return true;
  }
  function boot() {
    if (!ensureBar()) { setTimeout(boot, 400); return; }
    var done = '';
    try { done = sessionStorage.getItem('saLocDone') || ''; } catch (e) {}
    if (done === locKey() || finished) { finished = true; paint(100); }
    else startAnim();
    setTimeout(mountPanels, 500);
  }
  boot();
})(window);
