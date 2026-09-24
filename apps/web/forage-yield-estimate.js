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

  function stripNotes() {
    if (typeof document === 'undefined') return;
    var kill = [];
    document.querySelectorAll('.sa-note, #saLiveMount, [data-sa-notes]').forEach(function (el) {
      kill.push(el);
    });
    document.querySelectorAll('h3, .forage-flight-head, .sa-live h3').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t === 'Notlar' || t === 'NOTLAR') {
        var box = el.closest('.sa-live, .sa-note, .fy-block') || el.parentNode;
        if (box) kill.push(box);
      }
    });
    document.querySelectorAll('p, div').forEach(function (el) {
      var t = el.textContent || '';
      if (t.indexOf('800 uydurmas') !== -1 || t.indexOf('Hedef ~11 kg') !== -1) {
        var box = el.closest('.sa-live, .sa-note') || el;
        kill.push(box);
      }
    });
    kill.forEach(function (el) {
      try { el.parentNode && el.parentNode.removeChild(el); } catch (e) {}
    });
  }

  function rewriteFlight(host) {
    stripNotes();
    var a = apiary();
    if (!yanik(a) || !host) return;
    var blocks = host.querySelectorAll('.forage-flight');
    var flight = null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].id === 'saSisBlock') continue;
      var head = blocks[i].querySelector('.forage-flight-head');
      if (head && /Uçuş/.test(head.textContent || '')) flight = blocks[i];
    }
    if (!flight) flight = blocks[blocks.length - 1];
    if (!flight) return;
    if (!document.getElementById('saSisBlock')) {
      flight.insertAdjacentHTML('beforebegin', SIS_HTML);
    }
    var sum = flight.querySelector('.forage-flight-sum');
    if (sum && sum.getAttribute('data-sis') !== '1') {
      sum.setAttribute('data-sis', '1');
      sum.textContent =
        (sum.textContent || '') +
        ' · Sis/çisede Karniyol uçmadı, o günlerde stoğu yedi.';
    }
  }

  function watchHost() {
    stripNotes();
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
      est.why = (est.why || []).filter(function (r) {
        return !(r && r.k === 'Notlar');
      });
      est.why.push({ k: 'Sis · çiseleme', v: 'çarpan 0,90 · uçamadı + stoğu yedi' });
      return est;
    };
    Y.__eatPatch = true;
  }

  function start() {
    stripNotes();
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
