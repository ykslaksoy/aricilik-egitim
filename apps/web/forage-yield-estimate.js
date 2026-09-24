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
  function breedKey(h) {
    var s = String((h && (h.breed || h.irk || h.ırk || h.breedKey)) || '').toLocaleLowerCase('tr');
    if (s.indexOf('kafkas') !== -1) return 'kafkas';
    if (s.indexOf('karniyol') !== -1 || s.indexOf('carn') !== -1) return 'karniyol';
    return s || '';
  }
  function kg(n) {
    if (n == null || !isFinite(Number(n))) return null;
    return Math.round(Number(n) * 10) / 10;
  }

  var SIS_HTML =
    '<div class="forage-flight sa-sis-block" id="saSisBlock">' +
      '<div class="forage-flight-head">Sis ve çiseleme</div>' +
      '<p class="forage-flight-sum">Bu yer sisli + çisemeli. Karniyol o günlerde dışarı çıkamaz; kovan içindeki balı yer.</p>' +
      '<div class="forage-row"><div class="forage-k">Etki</div><div class="forage-v">Uçuş yok + stok tüketimi · hedef çarpan 0,90 × ırk 0,88 (Karniyol)</div></div>' +
      '<p class="forage-flight-tip">Kafkas çisede uçabilir. Takas: Palandöken / Tortum ↔ Yanıkdağ.</p>' +
    '</div>';

  function breedWarnHtml(karniyolKg, kafkasKg, nHives) {
    var totK = kafkasKg != null && nHives ? Math.round(kafkasKg * nHives) : null;
    return (
      '<div class="fy-block fy-swap-block" id="saBreedWarn">' +
        '<div class="fy-head"><strong>Kovan uygun değil · ırk</strong></div>' +
        '<p class="fy-why">Karniyol sis/çisede uçamaz, hedefi kaçırır ve kovan balını yer.</p>' +
        '<p class="fy-swap">Kafkas olursa beklenen verim ≈ <strong>' +
        (kafkasKg != null ? kafkasKg + ' kg/kovan' : '—') +
        '</strong>' +
        (totK != null ? ' · ' + nHives + ' kovan ≈ ' + totK + ' kg' : '') +
        (karniyolKg != null ? ' <span class="fy-why">(Karniyol şimdi ≈ ' + karniyolKg + ' kg/kovan)</span>' : '') +
        '</p>' +
        '<p class="fy-tip">Öneri: bu kovanları Palandöken / Tortum Karniyol ile takas; buraya Kafkas.</p>' +
      '</div>'
    );
  }

  function injectBreedWarn(host, est) {
    if (!host || document.getElementById('saBreedWarn')) return;
    var mid = est && (est.kgPerHive != null ? est.kgPerHive : est.midKg);
    var kaf = mid != null ? kg(Number(mid) * (1.12 / 0.88)) : 14.2;
    var n = (est && (est.n || est.hiveCount)) || 20;
    var box = document.createElement('div');
    box.innerHTML = breedWarnHtml(kg(mid), kaf, n);
    var swap = host.querySelector('.fy-swap-block');
    if (swap) swap.insertAdjacentElement('beforebegin', box.firstChild);
    else host.appendChild(box.firstChild || box);
  }

  function stripOld() {
    document.querySelectorAll('.sa-note, #saLiveMount').forEach(function (el) {
      try { el.remove(); } catch (e) {}
    });
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
        '#saFloraBar .sa-flora-detail{display:none;margin-top:8px;font-size:12px;color:#2c4a22;}' +
        '#saFloraBar.is-open .sa-flora-detail{display:block;}' +
        '#saBreedWarn{margin:8px 0;padding:10px;border-radius:12px;border:1px solid #e0a090;background:#fff8f5;}';
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
      '<div class="fs-row"><p>Flora taranıyor</p>' +
      '<button type="button" class="fs-chev" id="btnFloraHint" aria-expanded="false">›</button></div>' +
      '<div class="track"><div class="fill"></div></div>' +
      '<div class="sa-flora-detail fs-hint" id="saFloraDetail" hidden>' +
      '<p>Su kaynağı bulundu · 240 m</p><p>Flora taranıyor.</p></div>';
    el.addEventListener('click', function () {
      var open = !el.classList.contains('is-open');
      el.classList.toggle('is-open', open);
      var p = document.getElementById('saFloraDetail');
      if (p) {
        if (open) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      }
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
    if (flight && !document.getElementById('saSisBlock')) flight.insertAdjacentHTML('beforebegin', SIS_HTML);
    var fy = host.querySelector('.fy-swap-block, .fy-block');
    if (fy) injectBreedWarn(host, global.__saLastEst || { kgPerHive: 11.2, n: 20 });
  }

  function watchHost() {
    var host = document.getElementById('forageHost');
    if (!host) return;
    rewriteFlight(host);
    if (host.__sisObs) return;
    host.__sisObs = new MutationObserver(function () { rewriteFlight(host); });
    host.__sisObs.observe(host, { childList: true, subtree: true });
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
    if (!Y || Y.__eatPatch) return;
    if (Y.estimateYield) {
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
        var mid = est.kgPerHive != null ? est.kgPerHive : est.midKg;
        est.kafkasKgPerHive = mid != null ? kg(Number(mid) * (1.12 / 0.88)) : null;
        est.why = est.why || [];
        est.why.push({ k: 'Sis · çiseleme', v: 'çarpan 0,90 · uçamadı + stoğu yedi' });
        if (est.kafkasKgPerHive != null) {
          est.why.push({
            k: 'Kafkas beklenti',
            v: est.kafkasKgPerHive + ' kg/kovan (çisede uçar)'
          });
        }
        global.__saLastEst = est;
        return est;
      };
    }
    if (Y.findMismatchedHives) {
      var rawM = Y.findMismatchedHives;
      Y.findMismatchedHives = function (opts) {
        var pack = rawM(opts) || { items: [] };
        var a = (opts && opts.apiary) || apiary();
        if (!yanik(a)) return pack;
        var hives = (opts && opts.hives) || [];
        var est = global.__saLastEst || {};
        var mid = est.kgPerHive != null ? est.kgPerHive : 11.2;
        var kaf = kg(Number(mid) * (1.12 / 0.88));
        hives.forEach(function (h) {
          if (breedKey(h) !== 'karniyol') return;
          var id = h.id;
          var reason =
            'Irk Karniyol · sis/çisede uçamaz, stoğu yer · Kafkas olsa ≈ ' +
            kaf +
            ' kg/kovan';
          var found = (pack.items || []).some(function (it) {
            return String(it.hiveId) === String(id);
          });
          if (found) {
            pack.items.forEach(function (it) {
              if (String(it.hiveId) === String(id)) {
                it.reasonTr = reason;
                it.reasons = [reason];
              }
            });
          } else {
            pack.items = pack.items || [];
            pack.items.push({
              hiveId: id,
              hiveName: h.name || ('Kovan ' + id),
              reasons: [reason],
              reasonTr: reason,
              swap: { apiaryName: 'Palandöken / Tortum', hiveName: 'Kafkas kovan' }
            });
          }
        });
        pack.tipTr =
          'Uyarı ırka göre. Karniyol bu yerde uygun değil. Kafkas beklenti ≈ ' +
          kaf +
          ' kg/kovan.';
        return pack;
      };
    }
    if (Y.renderBlocksHtml) {
      var rawR = Y.renderBlocksHtml;
      Y.renderBlocksHtml = function (estimate, mismatches, escapeHtml, tip) {
        var html = rawR(estimate, mismatches, escapeHtml, tip);
        if (!yanik(apiary())) return html;
        var mid = estimate && (estimate.kgPerHive != null ? estimate.kgPerHive : estimate.midKg);
        var kaf = estimate && estimate.kafkasKgPerHive != null ? estimate.kafkasKgPerHive : kg(Number(mid) * 1.27);
        return breedWarnHtml(kg(mid), kaf, (estimate && estimate.n) || 20) + html;
      };
    }
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
