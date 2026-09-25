(function (global) {
  var BASE_KG = 13.8;
  var COVER_TR = 'Karadeniz karışık orman · kestane, gürgen, orman gülü';
  if (global.__saBreedLive) return;
  global.__saBreedLive = true;
  var running = false, finished = false, open = false, lastBreed = '';

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
    else if (/Muğla/.test(key)) { breedF = foggyPlace(a) ? 0.95 : 1.05; flyF = 1 - share; eatF = Math.max(0.86, 1 - 0.0015 * 45 * (foggyPlace(a) ? 1 : 0)); }
    else if (/Karniyol/.test(key)) { breedF = foggyPlace(a) ? 1 : 1.08; flyF = 1 - share; eatF = Math.max(0.82, 1 - 0.0018 * (foggyPlace(a) ? 45 : 0)); }
    return Math.round(breedF * flyF * eatF * 1.06 * 1000) / 1000;
  }
  function winterScore(a) {
    var key = placeBreed(a);
    var fog = foggyPlace(a);
    var base = fog ? 72 : 80;
    if (/Karniyol/.test(key) && !/Kafkas/.test(key)) base = fog ? 70 : 88;
    if (/Kafkas × Karniyol/.test(key)) base = fog ? 74 : 84;
    if (/Karadeniz/.test(key)) base = fog ? 82 : 78;
    if (/^Kafkas$/.test(key)) base = fog ? 80 : 76;
    if (/Muğla/.test(key)) base = fog ? 58 : 74;
    return base;
  }
  function winterNote(a) {
    var key = placeBreed(a);
    if (foggyPlace(a)) {
      if (/Karniyol/.test(key) && !/Kafkas/.test(key)) return 'Karniyol kışa dayanır ama çisede uçmaz, stoğu yer.';
      if (/Muğla/.test(key)) return 'Muğla nemli kıyı kışında zayıf; yalıtım ve stok şart.';
      return key + ' bu nemli kıyıda kışlar; çisede uçabilir.';
    }
    if (/Karniyol/.test(key)) return 'Karniyol soğuk yayla kışına uygun.';
    return key + ' bu yerde kışlama kabul.';
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
  function fullLines(a) {
    var t = targetOf(a);
    return [
      'İrk · ' + t.breed,
      'Hedef bal · ' + t.mid + ' kg/kovan · ' + t.total + ' kg',
      'Kışlama · ' + t.winter + ' · ' + winterNote(a),
      'Sis / çise · ' + (foggyPlace(a) ? '45/153' : 'yok'),
      'Su · ' + ((a && a.waterDistanceM) || 240) + ' m',
      'Flora · ' + COVER_TR
    ];
  }
  function hideSources() {
    document.querySelectorAll('p, div, span, small').forEach(function (n) {
      if (n.closest && n.closest('#saFloraBar, #saYieldCard')) return;
      var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (/Kaynaklar:|Kaynak:|Open-Meteo|canlı OSM|Uydu NDVI|sahte NDVI|precipitation_hours/i.test(t) && t.length < 420) {
        n.style.display = 'none';
      }
    });
  }
  function applyBreedUi() {
    var a = apiary();
    var t = targetOf(a);
    document.querySelectorAll('#forageHost span, #forageHost p, #forageHost div').forEach(function (n) {
      var txt = n.textContent || '';
      if (/^\s*\d+\s*·\s*(Karniyol|Kafkas|Muğla)/.test(txt) && txt.length < 40) {
        n.textContent = t.winter + ' · ' + t.breed;
      }
      if (/için kışlama/.test(txt) && txt.length < 80) {
        n.textContent = t.breed + ' için kışlama';
      }
      if (/soğuğa dayan|kışlama uygun/.test(txt) && txt.length < 220) {
        n.textContent = winterNote(a);
      }
    });
    var card = document.getElementById('saYieldCard');
    if (card) card.innerHTML = '<strong>Hedef bal</strong> · ' + t.mid + ' kg/kovan · ' + t.n + ' kovan · <strong>' + t.total + ' kg</strong><div style="font-size:12px;margin-top:4px">' + t.breed + '</div>';
    var box = document.querySelector('#saFloraBar [data-sa-lines]');
    if (box && open) {
      box.innerHTML = fullLines(a).map(function (x) { return '<p class="sa-under">' + x + '</p>'; }).join('');
    }
    hideSources();
  }
  function bindBarToggle(el) {
    if (!el || el.__tog) return;
    el.__tog = true;
    el.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('input, a')) return;
      open = !open;
      var box = el.querySelector('[data-sa-lines]');
      if (box) {
        box.hidden = !open;
        if (open) box.innerHTML = fullLines(apiary()).map(function (x) { return '<p class="sa-under">' + x + '</p>'; }).join('');
      }
      el.classList.toggle('is-open', open);
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
    applyBreedUi();
    var t = targetOf(apiary());
    var card = document.getElementById('saYieldCard');
    if (!card && el.parentNode) {
      card = document.createElement('div');
      card.id = 'saYieldCard';
      card.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:12px;border:1px solid #e0d2a8;background:#fffaf0;';
      el.parentNode.insertBefore(card, el.nextSibling);
    }
    if (card) card.innerHTML = '<strong>Hedef bal</strong> · ' + t.mid + ' kg/kovan · ' + t.n + ' kovan · <strong>' + t.total + ' kg</strong><div style="font-size:12px;margin-top:4px">' + t.breed + '</div>';
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
      bindBarToggle(el);
    }
    return true;
  }
  function watchBreed() {
    setInterval(function () {
      var b = placeBreed(apiary());
      if (b !== lastBreed) {
        lastBreed = b;
        applyBreedUi();
        paint(100);
      }
    }, 1500);
    document.addEventListener('change', function (ev) {
      var el = ev.target;
      if (!el) return;
      var name = (el.name || el.id || '') + ' ' + (el.getAttribute('aria-label') || '');
      if (/breed|ırk|irk|cins/i.test(name) || /breed|ırk|cins/i.test(el.className || '')) {
        setTimeout(function () { lastBreed = ''; applyBreedUi(); }, 200);
      }
    });
  }
  function boot() {
    if (!ensureBar()) { setTimeout(boot, 400); return; }
    lastBreed = placeBreed(apiary());
    var done = '';
    try { done = sessionStorage.getItem('saLocDone') || ''; } catch (e) {}
    if (done === locKey() || finished) { finished = true; paint(100); }
    else startAnim();
    watchBreed();
  }
  boot();
})(window);
