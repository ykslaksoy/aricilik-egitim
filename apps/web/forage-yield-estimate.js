(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';

  function yanik(a) {
    if (!a) return false;
    var s = String((a.name || '') + ' ' + (a.place || '') + ' ' + (a.il || '')).toLocaleLowerCase('tr');
    if (/yanık|yanik|cimil|rize|çayeli|ikizdere/.test(s)) return true;
    var lat = Number(a.lat), lon = Number(a.lon);
    return isFinite(lat) && Math.abs(lat - 41.0808) < 0.03 && Math.abs(lon - 40.754) < 0.03;
  }
  function apiary() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return null;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) {
      if (id && String(list[i].id) === String(id)) return list[i];
      if (yanik(list[i])) return list[i];
    }
    return list[0] || null;
  }

  var SIS_HTML =
    '<div class="forage-flight sa-sis-block" id="saSisBlock">' +
      '<div class="forage-flight-head">Sis ve çiseleme</div>' +
      '<p class="forage-flight-sum">Bu yer sisli + çisemeli. Karniyol o günlerde dışarı çıkamaz; kovan içindeki balı yer.</p>' +
      '<div class="forage-row"><div class="forage-k">Etki</div><div class="forage-v">Uçuş yok + stok tüketimi · hedef çarpan 0,90 × ırk 0,88 (Karniyol)</div></div>' +
      '<p class="forage-flight-tip">Kafkas çisede uçabilir. Takas: Palandöken / Tortum ↔ Yanıkdağ.</p>' +
    '</div>';

  function stripOld() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.sa-note, #saLiveMount').forEach(function (el) {
      try { el.remove(); } catch (e) {}
    });
    var old = document.getElementById('landcoverSyncBar');
    if (old) try { old.remove(); } catch (e2) {}
  }

  function ensureBar() {
    if (!document.getElementById('saFloraBarCss')) {
      var s = document.createElement('style');
      s.id = 'saFloraBarCss';
      s.textContent =
        '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;}' +
        '#saFloraBar .fs-row{display:flex;align-items:center;gap:8px;}' +
        '#saFloraBar .fs-row p{margin:0;flex:1;font-size:12px;font-weight:700;color:#2c4a22;}' +
        '#saFloraBar .track{height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;margin-top:6px;}' +
        '#saFloraBar .fill{height:100%;width:62%;background:#3d9a4a;}' +
        '#saFloraBar .fs-chev{border:0;background:transparent;padding:4px;color:#4a6b3a;}' +
        '#saFloraBar.is-open .fs-chev{transform:rotate(90deg);}' +
        '#saFloraBar .sa-flora-detail{display:none;margin-top:8px;font-size:12px;line-height:1.45;color:#2c4a22;}' +
        '#saFloraBar.is-open .sa-flora-detail{display:block;}';
      document.head.appendChild(s);
    }
    if (document.getElementById('saFloraBar')) return;
    var forage = document.getElementById('forageRadius');
    var anchor =
      (forage && (forage.closest('.fs-block') || forage.parentNode)) ||
      document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    var el = document.createElement('div');
    el.id = 'saFloraBar';
    el.className = 'fs-block';
    el.innerHTML =
      '<div class="fs-row">' +
        '<p>Flora taranıyor</p>' +
        '<button type="button" class="fs-chev" id="btnFloraHint" aria-expanded="false" aria-controls="saFloraDetail" aria-label="Flora notu">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.58a1 1 0 0 0 0-1.42L10.7 6.7a1 1 0 0 0-1.41.01z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="track"><div class="fill"></div></div>' +
      '<div class="sa-flora-detail fs-hint" id="saFloraDetail" hidden>' +
        '<p>Su kaynağı bulundu · 240 m</p>' +
        '<p>Flora taranıyor — örtü OSM üzerinden alınıyor.</p>' +
        '<p>Sis/çiseleme hedef çarpanı 0,90 (uçuş yok + stok tüketimi).</p>' +
      '</div>';
    el.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest('input, a')) return;
      var open = !el.classList.contains('is-open');
      el.classList.toggle('is-open', open);
      var panel = document.getElementById('saFloraDetail');
      var btn = document.getElementById('btnFloraHint');
      if (panel) {
        if (open) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      }
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    anchor.parentNode.insertBefore(el, anchor);
  }

  function rewriteFlight(host) {
    stripOld();
    ensureBar();
    var a = apiary();
    if (!yanik(a) || !host) return;
    var blocks = host.querySelectorAll('.forage-flight');
    var flight = null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].id === 'saSisBlock') continue;
      var head = blocks[i].querySelector('.forage-flight-head');
      if (head && /Uçuş/.test(head.textContent || '')) flight = blocks[i];
    }
    if (!flight) return;
    if (!document.getElementById('saSisBlock')) flight.insertAdjacentHTML('beforebegin', SIS_HTML);
    var sum = flight.querySelector('.forage-flight-sum');
    if (sum && sum.getAttribute('data-sis') !== '1') {
      sum.setAttribute('data-sis', '1');
      sum.textContent = (sum.textContent || '') + ' · Sis/çisede Karniyol uçmadı, stoğu yedi.';
    }
  }

  function watchHost() {
    stripOld();
    ensureBar();
    var host = document.getElementById('forageHost');
    if (!host) return;
    rewriteFlight(host);
    if (host.__sisObs) return;
    var obs = new MutationObserver(function () { rewriteFlight(host); });
    obs.observe(host, { childList: true, subtree: true });
    host.__sisObs = obs;
  }

  function patchForage() {
    var F = global.SuperAriForage;
    if (!F || !F.renderPanelHtml || F.__sisRender) return;
    var raw = F.renderPanelHtml;
    F.renderPanelHtml = function (analysis, escapeHtml) {
      var html = raw(analysis, escapeHtml);
      if (!yanik(apiary())) return html;
      if (html.indexOf('forage-flight') === -1) return html;
      return html.replace('<div class="forage-flight">', SIS_HTML + '<div class="forage-flight">');
    };
    F.__sisRender = true;
  }

  function patchYield() {
    var Y = global.SuperAriForageYield;
    if (!Y || !Y.estimateYield || Y.__eatPatch) return;
    var raw = Y.estimateYield;
    Y.estimateYield = function (opts) {
      var est = raw(opts);
      if (!est || !yanik((opts && opts.apiary) || apiary())) return est;
      function sc(n) {
        return n == null || !isFinite(Number(n)) ? n : Math.round(Number(n) * 0.9 * 10) / 10;
      }
      ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
        if (est[k] != null) est[k] = sc(est[k]);
      });
      est.why = est.why || [];
      est.why.push({ k: 'Sis · çiseleme', v: 'çarpan 0,90 · uçamadı + stoğu yedi' });
      return est;
    };
    Y.__eatPatch = true;
  }

  function start() {
    stripOld();
    patchForage();
    patchYield();
    watchHost();
    setTimeout(watchHost, 400);
    setTimeout(watchHost, 1400);
  }

  if (global.SuperAriForageYield && global.SuperAriForageYield.estimateYield) start();
  else {
    var s = document.createElement('script');
    s.src = SRC_Y;
    s.onload = start;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(start, 900);
  }
})(window);
