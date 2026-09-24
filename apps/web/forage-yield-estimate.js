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

  function stripChrome() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.sa-note, #saLiveMount, [data-sa-notes]').forEach(function (el) {
      try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('h3, .forage-flight-head').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t === 'Notlar' || t === 'NOTLAR' || t === 'Güncelleme' || t === 'GÜNCELLEME') {
        var box = el.closest('.sa-live, .forage-progress, #landcoverSyncBar') || el.parentNode;
        if (box && box.id !== 'saSisBlock') try { box.remove(); } catch (e2) {}
      }
    });
    document.querySelectorAll('p, div').forEach(function (el) {
      var t = el.textContent || '';
      if (
        t.indexOf('800 uydurmas') !== -1 ||
        t.indexOf('Hedef ~11 kg') !== -1 ||
        t.indexOf('Detay: 25.09') !== -1 ||
        t.indexOf('güncelleme devam') !== -1 ||
        t.indexOf('Durdur') !== -1
      ) {
        var box = el.closest('.sa-live, .forage-progress, .fy-notes') || el;
        if (box && box.id !== 'saSisBlock') try { box.remove(); } catch (e3) {}
      }
    });
    var oldBar = document.getElementById('landcoverSyncBar');
    if (oldBar) try { oldBar.remove(); } catch (e4) {}
  }

  function ensureGreenBar() {
    if (document.getElementById('saFloraBar')) return;
    var forage = document.getElementById('forageRadius');
    var anchor =
      (forage && (forage.closest('.fs-block') || forage.parentNode)) ||
      document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    if (!document.getElementById('saFloraBarCss')) {
      var s = document.createElement('style');
      s.id = 'saFloraBarCss';
      s.textContent =
        '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;pointer-events:none;}' +
        '#saFloraBar p{margin:0 0 6px;font-size:12px;font-weight:700;color:#2c4a22;}' +
        '#saFloraBar .track{height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;}' +
        '#saFloraBar .fill{height:100%;width:62%;background:#3d9a4a;}';
      document.head.appendChild(s);
    }
    var el = document.createElement('div');
    el.id = 'saFloraBar';
    el.innerHTML = '<p>Flora taranıyor</p><div class="track"><div class="fill"></div></div>';
    anchor.parentNode.insertBefore(el, anchor);
  }

  function rewriteFlight(host) {
    stripChrome();
    ensureGreenBar();
    var a = apiary();
    if (!yanik(a) || !host) return;
    var blocks = host.querySelectorAll('.forage-flight');
    var flight = null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].id === 'saSisBlock') continue;
      var head = blocks[i].querySelector('.forage-flight-head');
      if (head && /Üuş|Uçuş/.test(head.textContent || '')) flight = blocks[i];
    }
    if (!flight) return;
    if (!document.getElementById('saSisBlock')) flight.insertAdjacentHTML('beforebegin', SIS_HTML);
    var sum = flight.querySelector('.forage-flight-sum');
    if (sum && sum.getAttribute('data-sis') !== '1') {
      sum.setAttribute('data-sis', '1');
      sum.textContent =
        (sum.textContent || '') + ' · Sis/çisede Karniyol uçmadı, o günlerde stoğu yedi.';
    }
  }

  function watchHost() {
    stripChrome();
    ensureGreenBar();
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
    stripChrome();
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
