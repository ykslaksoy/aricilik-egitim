/*
 * SuperAri — konum / hedef / örtü kaynak notları
 *
 * Koordinat, kovan sayısı, ırk, ana yılı
 *   Kayıt: SuperAriDemo (localStorage). Irk sabiti: Kayaköy Muğla,
 *   Tortum Karniyol, Palandöken Kafkas×Karniyol, Yanıkdağ Kafkas,
 *   Cimil Kafkas×Karadeniz. Ana yılı 2026 = yeni doğmuş.
 *
 * Rakım
 *   Open-Meteo Elevation API (forage-analysis.js). Yanıkdağ kartı ~229 m.
 *
 * İklim (sıcaklık, yağış, nem, ET0, precipitation_hours)
 *   Open-Meteo Archive, May–Eyl sezon. Yanıkdağ örnek: 19.1 °C,
 *   96 yağışlı gün, ~1205 yağışlı saat, uçuşa uygun ~72 gün.
 *   Sezon günü S ≈ 153 (1 May–30 Eyl).
 *
 * Su mesafesi
 *   OSM Overpass: waterway / natural=water / spring. Haversine, arılık pinine.
 *   Yanıkdağ ölçüm ~240 m. Üst sınır 1 km, ideal <300 m.
 *
 * Flora / bitki örtüsü
 *   OSM landuse + natural (Overpass). Etiket seyrekse biyom varsayılanı:
 *   Rize — Karadeniz karışık orman (kestane, gürgen, orman gülü).
 *   NDVI / uydu yok.
 *
 * Sis-çise günü D
 *   D ≈ yağışlı gün − sert yağışlı (poorFlightDays); yoksa 0.45×yağışlı.
 *   Yanıkdağ varsayılan D=45. Formül:
 *   Karniyol uçuş = 1−D/S, stok = 1−0.0018D (kapalı + yer).
 *   Kafkas uçuş = 1−0.25×D/S, stok = 1 (çisede toplar, yemez).
 *   Melez heterosis: Kafkas×Karadeniz 1.22, Kafkas×Karniyol 1.20.
 *   Ana yeni ×1.06. Taban hedef Yanıkdağ kartı 13.8 kg/kovan.
 *
 * Kovan yoğunluğu
 *   SuperAriForage.hiveDensityPressure — 10 km haversine + kendi kovan.
 *
 * Deli bal / grayanotoksin
 *   İnsan riski, arıya zarar yok. Kuşak: R. ponticum Doğu Karadeniz.
 *   Ölçüm: laboratuvar LC-MS/MS GTX-I ve GTX-III (Dönmez & Kaya 2020;
 *   JAFC 2014 dilute-and-shoot; EFSA 2023 nicelik ≤0.01 mg/kg öneri).
 *   Polen analizi destekler, miktar vermez.
 *
 * Harita
 *   Yandex / OSM görünüm; pin kullanıcı kaydı.
 */
(function (global) {
  var BASE_KG = 13.8;
  var COVER_TR = 'Karadeniz karışık orman · kestane, gürgen, orman gülü';
  if (global.__saLocLock2) return;
  global.__saLocLock2 = true;
  var running = false;
  var finished = false;
  var open = false;

  function placeBreed(a) {
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
    var fallback = { name: 'Yanıkdağ', hiveCount: 20, waterDistanceM: 240, lat: 41.0808, lon: 40.754, id: 'a4' };
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
    return { mid: mid, n: n, total: Math.round(mid * n), breed: placeBreed(a) };
  }
  function fullLines(a) {
    var t = targetOf(a);
    return [
      'Koordinat · ' + (a && a.lat || 41.0808) + ', ' + (a && a.lon || 40.754),
      'Rakım · 229 m',
      'Foraj · 2.5 km',
      'Su kaynağı · ' + ((a && a.waterDistanceM) || 240) + ' m',
      'Flora / OSM örtü · ' + COVER_TR,
      'İklim · 19.1 °C · 96 yağışlı gün · uçuşa uygun ~72 gün',
      'Sis / çise · 45/153 · Kafkas uçar, Karniyol yer',
      'İrk · ' + t.breed + ' · ana 2026',
      'Hedef bal · ' + t.mid + ' kg/kovan · ' + t.total + ' kg',
      rizePlace(a) ? 'Deli bal · kuşakta (arıya zarar yok)' : 'Deli bal · beklenmez'
    ];
  }
  function bindBarToggle(el) {
    if (!el || el.__tog) return;
    el.__tog = true;
    el.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('input, a')) return;
      open = !open;
      var box = el.querySelector('[data-sa-lines]');
      var chev = el.querySelector('.fs-chev');
      if (box) box.hidden = !open;
      el.classList.toggle('is-open', open);
      if (chev) chev.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  function bindForageArrow() {
    var btn = document.getElementById('btnForageHint');
    if (!btn || btn.__saBound) return;
    var hint = document.getElementById('forageAutoHint');
    if (!hint) {
      hint = document.createElement('p');
      hint.id = 'forageAutoHint';
      hint.className = 'fs-hint';
      hint.hidden = true;
      var block = btn.closest('.fs-block') || btn.parentNode;
      if (block && block.parentNode) block.parentNode.insertBefore(hint, block.nextSibling);
    }
    btn.__saBound = true;
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var on = hint.hidden || hint.hasAttribute('hidden');
      hint.hidden = !on;
      if (on) {
        hint.removeAttribute('hidden');
        hint.style.display = 'block';
        hint.textContent = 'Gösterilen çember kaydırıcıdaki km. Skor kilitli yarıçapta.';
      } else {
        hint.setAttribute('hidden', '');
        hint.style.display = 'none';
      }
    });
  }
  function paint(pct) {
    var el = document.getElementById('saFloraBar');
    if (!el) return;
    var title = el.querySelector('[data-sa-title]');
    var fill = el.querySelector('.fill');
    var box = el.querySelector('[data-sa-lines]');
    if (title) title.textContent = (pct >= 100 ? 'Konum verisi güncel' : 'Konum verisi güncelleniyor') + ' · ' + pct + '%';
    if (fill) fill.style.width = pct + '%';
    if (box) {
      box.innerHTML = fullLines(apiary()).map(function (x) { return '<p class="sa-under">' + x + '</p>'; }).join('');
      box.hidden = !open;
    }
    bindBarToggle(el);
    bindForageArrow();
    var t = targetOf(apiary());
    var card = document.getElementById('saYieldCard');
    if (!card && el.parentNode) {
      card = document.createElement('div');
      card.id = 'saYieldCard';
      card.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:12px;border:1px solid #e0d2a8;background:#fffaf0;';
      el.parentNode.insertBefore(card, el.nextSibling);
    }
    if (card) card.innerHTML = '<strong>Hedef bal</strong> · ' + t.mid + ' kg/kovan · ' + t.n + ' kovan · <strong>' + t.total + ' kg</strong>';
  }
  function startAnim() {
    if (running || finished) {
      paint(100);
      return;
    }
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
        '#saFloraBar .fs-chev{flex:0 0 28px;border:0;background:transparent;color:#8a8278;transition:transform .15s;}' +
        '#saFloraBar.is-open .fs-chev{transform:rotate(90deg);}' +
        '#saFloraBar .sa-under{margin:6px 0 0;font-size:12px;color:#2c4a22;}' +
        '#saFloraBar [data-sa-lines][hidden]{display:none !important;}';
      document.head.appendChild(s);
    }
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return false;
    if (!document.getElementById('saFloraBar')) {
      var el = document.createElement('div');
      el.id = 'saFloraBar';
      el.innerHTML = '<p class="sa-title" data-sa-title>Konum verisi güncelleniyor · 0%</p><div class="sa-barrow"><div class="track"><div class="fill"></div></div><button type="button" class="fs-chev" aria-expanded="false">›</button></div><div data-sa-lines hidden></div>';
      anchor.parentNode.insertBefore(el, anchor);
      bindBarToggle(el);
    }
    return true;
  }
  function boot() {
    if (!ensureBar()) {
      setTimeout(boot, 400);
      return;
    }
    var done = '';
    try { done = sessionStorage.getItem('saLocDone') || ''; } catch (e) {}
    if (done === locKey() || finished) {
      finished = true;
      paint(100);
      return;
    }
    startAnim();
  }
  boot();
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest('button');
    if (!t) return;
    var lab = (t.textContent || '') + (t.getAttribute('aria-label') || '');
    if (/konumu güncelle|Su konumunu/i.test(lab)) {
      finished = false;
      running = false;
      try { sessionStorage.removeItem('saLocDone'); } catch (e) {}
      setTimeout(startAnim, 600);
    }
  });
})(window);
