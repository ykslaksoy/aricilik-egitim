(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var SRC_F =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-analysis.js';

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

  function rewriteFlight(host) {
    var a = apiary();
    if (!yanik(a) || !host) return;
    var flight = host.querySelector('.forage-flight');
    if (!flight) return;
    if (!host.querySelector('#saSisBlock')) {
      flight.insertAdjacentHTML('beforebegin', SIS_HTML);
    }
    var sum = flight.querySelector('.forage-flight-sum');
    if (sum && sum.getAttribute('data-sis') !== '1') {
      sum.setAttribute('data-sis', '1');
      var old = sum.textContent || '';
      sum.textContent =
        old +
        ' · Sis/çisede Karniyol uçmadı, o günlerde stoğu yedi. Kafkas aynı günlerde tarlayabilir.';
    }
    var tip = flight.querySelector('.forage-flight-tip');
    if (tip && tip.getAttribute('data-sis') !== '1') {
      tip.setAttribute('data-sis', '1');
      tip.textContent =
        'Elverişsiz gün = yağış + sis/çise. Karniyol için bu günler hem hasat yok hem tüketim var.';
    }
    var rows = flight.querySelectorAll('.forage-v');
    rows.forEach(function (v) {
      if (v.textContent.indexOf('elverişsiz') !== -1 && v.getAttribute('data-sis') !== '1') {
        v.setAttribute('data-sis', '1');
        v.textContent = v.textContent + ' · çisede stoğu yer';
      }
    });
  }

  function watchHost() {
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
      html = html.replace(
        '<div class="forage-flight">',
        SIS_HTML + '<div class="forage-flight">'
      );
      html = html.replace(
        /(<p class="forage-flight-sum">)([^<]*)(<\/p>)/,
        '$1$2 · Sis/çisede Karniyol uçmadı, stoğu yedi.$3'
      );
      return html;
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
      ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg', 'totalLowKg', 'totalHighKg'].forEach(function (k) {
        if (est[k] != null) est[k] = sc(est[k]);
      });
      est.why = est.why || [];
      est.why.push({
        k: 'Sis · çiseleme',
        v: 'çarpan 0,90 · uçamadı + o günlerde kovan balını yedi'
      });
      return est;
    };
    if (Y.renderBlocksHtml) {
      var rr = Y.renderBlocksHtml;
      Y.renderBlocksHtml = function (estimate, mismatches, escapeHtml, tip) {
        var html = rr(estimate, mismatches, escapeHtml, tip);
        if (!yanik(apiary())) return html;
        return (
          '<p class="fy-notes">Sis/çise: hem uçuş yok hem stok erir. Hedef buna göre düştü.</p>' +
          html
        );
      };
    }
    Y.__eatPatch = true;
  }

  function start() {
    patchForage();
    patchYield();
    watchHost();
    setTimeout(watchHost, 500);
    setTimeout(watchHost, 1500);
  }

  function load(src, done) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = done;
    (document.head || document.documentElement).appendChild(s);
  }

  function boot() {
    if (!global.SuperAriForageYield) {
      load(SRC_Y, function () {
        if (!global.SuperAriForage) load(SRC_F, start);
        else start();
      });
    } else start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
