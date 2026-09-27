/* Kovanlar: arama (no / ad / ana yılı), filtre çipleri, QR okut. */
(function (global) {
  'use strict';
  function D() { return global.SuperAriDemo || null; }
  function K() { return global.SuperAriKoloni || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lower(s) { return String(s || '').toLocaleLowerCase('tr'); }
  function hiveNo(h) { var m = /(\d+)\s*$/.exec(String(h.name || '')); return m ? m[1] : String(h.id); }

  var CSS = '' +
    '.ka-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;}' +
    '.ka-row input{width:100%;min-width:0;font:inherit;font-size:1rem;padding:.7rem .8rem;border-radius:12px;border:1px solid var(--border,#ead9b3);background:#fff;}' +
    '.ka-btn{font:inherit;font-weight:800;font-size:.85rem;padding:.6rem .75rem;border-radius:12px;border:1.5px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#fff3bf);color:#5c4813;cursor:pointer;white-space:nowrap;}' +
    '.ka-sub{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;justify-content:space-between;font-size:.8rem;color:var(--muted,#6b7280);}' +
    '.ka-sub a,.ka-sub button.ka-link{font:inherit;font-weight:800;color:#2b6cb0;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer;}' +
    '.ka-open{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.55rem .7rem;border-radius:12px;background:#e7f5ff;color:#1864ab;font-weight:800;font-size:.88rem;}' +
    '.ka-groups{display:grid;gap:.45rem;}' +
    '.ka-g{display:grid;gap:.25rem;}' +
    '.ka-g > span{font-size:.7rem;font-weight:800;color:#5c4813;text-transform:uppercase;letter-spacing:.03em;}' +
    '.ka-chips{display:flex;flex-wrap:wrap;gap:.3rem;}' +
    '.ka-chip{display:inline-flex;align-items:center;gap:.25rem;font:inherit;font-size:.76rem;font-weight:750;padding:.3rem .6rem;border-radius:999px;border:1px solid var(--border,#ead9b3);background:#fff;color:#3d3217;cursor:pointer;max-width:100%;}' +
    '.ka-chip b{font-weight:800;color:var(--muted,#6b7280);}' +
    '.ka-chip.on{background:#fff3bf;border-color:#d9a520;}' +
    '.ka-chip.on b{color:#7a5a12;}' +
    '.ka-chip[disabled]{opacity:.45;cursor:default;}' +
    '.ka-dot{display:inline-block;width:.75em;height:.75em;border-radius:50%;border:1px solid rgba(0,0,0,.3);flex:0 0 auto;}' +
    'details.ka-f > summary{cursor:pointer;font-size:.85rem;font-weight:800;color:#5c4813;list-style:none;padding:.2rem 0;}' +
    'details.ka-f > summary::-webkit-details-marker{display:none;}' +
    '.ka-qr-back{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:950;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;padding:1rem;}' +
    '.ka-qr-back video{width:min(92vw,420px);aspect-ratio:1;object-fit:cover;border-radius:16px;background:#111;}' +
    '.ka-qr-msg{color:#fff;font-size:.9rem;text-align:center;max-width:420px;line-height:1.4;}' +
    '.ka-qr-card{background:#fffdf8;border-radius:16px;padding:1rem;max-width:420px;width:100%;color:#1f2933;font-size:.9rem;line-height:1.45;}' +
    '.ka-qr-card h3{margin:0 0 .4rem;font-size:1.02rem;}';
  function ensureCss() {
    if (document.getElementById('kaCss')) return;
    var s = document.createElement('style'); s.id = 'kaCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* Kovan özellikleri (filtre için). */
  function facts(h, all) {
    var d = D(), c = d && d.colony, r = d && d.records;
    var cy = c ? c.currentYear() : new Date().getFullYear();
    var y = h.queenYear != null && h.queenYear !== '' ? Number(h.queenYear) : null;
    var age = y != null && isFinite(y) ? cy - y : null;
    var st = r ? r.status(h.id, all) : null;
    return {
      breed: String(h.breed || '').trim() || 'Bilinmiyor',
      year: y,
      ageKey: age == null ? 'unk' : (age <= 0 ? 'a0' : (age === 1 ? 'a1' : (age === 2 ? 'a2' : 'a3'))),
      renew: c && c.queenStatus ? c.queenStatus(h) === 'Yenile' : false,
      strength: st && st.strengthClass ? st.strengthClass : '',
      disease: !!(st && st.diseases.length),
      queenless: !!(st && st.queenless)
    };
  }
  function matchQuery(h, f, q) {
    if (!q) return true;
    var ql = lower(q).trim();
    if (!ql) return true;
    if (/^(19|20)\d{2}$/.test(ql)) {
      if (f.year === Number(ql)) return true;
    }
    if (/^\d+$/.test(ql)) return hiveNo(h).indexOf(ql) === 0 || String(h.id).indexOf(ql) === 0;
    return lower(h.name).indexOf(ql) >= 0 || lower(h.breed).indexOf(ql) >= 0;
  }
  function exactHive(q, hives) {
    var ql = String(q || '').trim();
    if (!/^\d+$/.test(ql)) return null;
    var hit = null;
    (hives || []).forEach(function (h) { if (!hit && (hiveNo(h) === ql || String(h.id) === ql)) hit = h; });
    return hit;
  }

  var AGE_CHIPS = [['a0', 'Bu yıl', 0], ['a1', '1 yaş', 1], ['a2', '2 yaş', 2], ['a3', '3+ yaş', 3], ['unk', 'Yılı bilinmiyor', null]];

  /**
   * opts: { host, hives(): liste, allHives(): tüm kovanlar (tam eşleşme), onChange(result, active), apiaryId() }
   */
  function create(opts) {
    ensureCss();
    var state = { q: '', breed: {}, age: {}, renew: false, strength: {}, disease: false, queenless: false };
    var host = opts.host;
    host.innerHTML =
      '<div class="ka-row"><input type="search" id="kaQ" placeholder="Kovan no, ad veya ana yılı (ör. 2024)" aria-label="Kovan ara" enterkeyhint="search" autocomplete="off">' +
      '<button type="button" class="ka-btn" id="kaQr">📷 QR okut</button></div>' +
      '<div id="kaOpen"></div>' +
      '<details class="ka-f" id="kaDet"><summary id="kaSum">Filtreler ▾</summary><div class="ka-groups" id="kaGroups"></div></details>' +
      '<div class="ka-sub"><span id="kaCount"></span><span style="display:flex;gap:.8rem;flex-wrap:wrap;"><button type="button" class="ka-link" id="kaClear" hidden>Filtreleri temizle</button>' +
      '<a id="kaLabels" href="qr-etiket.html">🏷️ QR etiketleri</a></span></div>';
    var qEl = host.querySelector('#kaQ');
    function nActive() {
      return Object.keys(state.breed).length + Object.keys(state.age).length + Object.keys(state.strength).length +
        (state.renew ? 1 : 0) + (state.disease ? 1 : 0) + (state.queenless ? 1 : 0);
    }
    function active() { return !!state.q.trim() || nActive() > 0; }
    function passes(h, f, skip) {
      if (!matchQuery(h, f, state.q)) return false;
      if (skip !== 'breed' && Object.keys(state.breed).length && !state.breed[f.breed]) return false;
      if (skip !== 'age' && Object.keys(state.age).length && !state.age[f.ageKey]) return false;
      if (skip !== 'strength' && Object.keys(state.strength).length && !state.strength[f.strength]) return false;
      if (skip !== 'renew' && state.renew && !f.renew) return false;
      if (skip !== 'disease' && state.disease && !f.disease) return false;
      if (skip !== 'queenless' && state.queenless && !f.queenless) return false;
      return true;
    }
    function chip(group, key, label, count, on, dot) {
      return '<button type="button" class="ka-chip' + (on ? ' on' : '') + '" data-g="' + group + '" data-k="' + esc(key) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
        (!count && !on ? ' disabled' : '') + '>' + (dot || '') + esc(label) + ' <b>' + count + '</b></button>';
    }
    function render() {
      var d = D(); var c = d && d.colony;
      var hs = opts.hives();
      var all = d && d.records ? d.records.loadAll() : {};
      var list = hs.map(function (h) { return { h: h, f: facts(h, all) }; });
      function cnt(skip, test) { return list.filter(function (x) { return passes(x.h, x.f, skip) && test(x.f); }).length; }
      var breeds = {};
      list.forEach(function (x) { breeds[x.f.breed] = (breeds[x.f.breed] || 0) + 1; });
      var cy = c ? c.currentYear() : new Date().getFullYear();
      var html = '<div class="ka-g"><span>Ana cinsi</span><div class="ka-chips">' + Object.keys(breeds).sort(function (a, b) { return breeds[b] - breeds[a]; }).map(function (b) {
        return chip('breed', b, b, cnt('breed', function (f) { return f.breed === b; }), !!state.breed[b]);
      }).join('') + '</div></div>';
      html += '<div class="ka-g"><span>Ana yaşı</span><div class="ka-chips">' + AGE_CHIPS.map(function (a) {
        var col = a[2] != null && c && c.queenColor ? c.queenColor(cy - a[2]) : null;
        var dot = '<span class="ka-dot" style="background:' + (col ? col.hex : '#adb5bd') + '"' + (col ? ' title="' + esc(col.name) + '"' : '') + '></span>';
        return chip('age', a[0], a[1], cnt('age', function (f) { return f.ageKey === a[0]; }), !!state.age[a[0]], dot);
      }).join('') + chip('renew', '1', 'Yenile', cnt('renew', function (f) { return f.renew; }), state.renew) + '</div></div>';
      html += '<div class="ka-g"><span>Koloni gücü</span><div class="ka-chips">' + ['Zayıf', 'Orta', 'Güçlü'].map(function (s) {
        return chip('strength', s, s, cnt('strength', function (f) { return f.strength === s; }), !!state.strength[s]);
      }).join('') + '</div></div>';
      html += '<div class="ka-g"><span>Durum</span><div class="ka-chips">' +
        chip('disease', '1', 'Hastalık var', cnt('disease', function (f) { return f.disease; }), state.disease) +
        chip('queenless', '1', 'Anasız', cnt('queenless', function (f) { return f.queenless; }), state.queenless) + '</div></div>';
      host.querySelector('#kaGroups').innerHTML = html;
      var res = list.filter(function (x) { return passes(x.h, x.f); }).map(function (x) { return x.h; });
      var n = nActive();
      host.querySelector('#kaSum').textContent = 'Filtreler' + (n ? ' (' + n + ')' : '') + ' ▾';
      host.querySelector('#kaClear').hidden = !active();
      host.querySelector('#kaCount').textContent = active() ? res.length + ' / ' + hs.length + ' kovan bulundu' : hs.length + ' kovan';
      var ex = exactHive(state.q, hs) || exactHive(state.q, opts.allHives ? opts.allHives() : hs);
      host.querySelector('#kaOpen').innerHTML = ex ? '<a class="ka-open" href="kovan.html?id=' + encodeURIComponent(ex.id) + '"><span>↵ ' + esc(ex.name) + ' kovanını aç</span><span>›</span></a>' : '';
      var ap = opts.apiaryId ? opts.apiaryId() : '';
      host.querySelector('#kaLabels').href = 'qr-etiket.html' + (ap ? '?apiary=' + encodeURIComponent(ap) : '');
      opts.onChange(res, active());
    }
    qEl.addEventListener('input', function () { state.q = qEl.value; render(); });
    qEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var ex = exactHive(qEl.value, opts.hives()) || exactHive(qEl.value, opts.allHives ? opts.allHives() : []);
      if (ex) { e.preventDefault(); location.href = 'kovan.html?id=' + encodeURIComponent(ex.id); }
    });
    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.ka-chip') : null;
      if (b && !b.disabled) {
        var g = b.getAttribute('data-g'), k = b.getAttribute('data-k');
        if (g === 'breed' || g === 'age' || g === 'strength') { if (state[g][k]) delete state[g][k]; else state[g][k] = true; }
        else state[g] = !state[g];
        render();
        return;
      }
      if (e.target.closest && e.target.closest('#kaClear')) {
        state = { q: '', breed: {}, age: {}, renew: false, strength: {}, disease: false, queenless: false };
        qEl.value = '';
        render();
        return;
      }
      if (e.target.closest && e.target.closest('#kaQr')) openScanner(opts.allHives ? opts.allHives() : opts.hives());
    });
    render();
    return { render: render, state: function () { return state; } };
  }

  /* ---- QR okut ---- */
  function parseHiveFromText(text, hives) {
    var t = String(text || '').trim();
    var id = null;
    try {
      var u = new URL(t, location.href);
      id = u.searchParams.get('id') || u.searchParams.get('hiveId');
    } catch (e) { id = null; }
    if (!id) { var m = /(?:[?&](?:id|hiveId)=)(\d+)/.exec(t); if (m) id = m[1]; }
    if (!id && /^\d+$/.test(t)) id = t;
    if (!id) return null;
    var d = D();
    return (d && d.hiveById(id)) || exactHive(id, hives);
  }
  function card(back, title, html) {
    back.innerHTML = '<div class="ka-qr-card" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3>' + html +
      '<div style="margin-top:.8rem;"><button type="button" class="ka-btn" data-close style="width:100%;">Kapat</button></div></div>';
  }
  /* QR çözücü: BarcodeDetector (Chrome / Android) yoksa yerel jsQR (vendor/jsqr.js) — iPhone Safari için. */
  var JSQR_SRC = (function () {
    var s = document.currentScript, m = s && /[?&]v=([^&]+)/.exec(s.src || '');
    return 'vendor/jsqr.js' + (m ? '?v=' + m[1] : '');
  })();
  var jsqrP = null;
  function loadJsQR() {
    if (global.jsQR) return Promise.resolve(global.jsQR);
    if (jsqrP) return jsqrP;
    jsqrP = new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = JSQR_SRC;
      sc.onload = function () { global.jsQR ? res(global.jsQR) : rej(new Error('jsqr')); };
      sc.onerror = function () { jsqrP = null; rej(new Error('jsqr')); };
      document.head.appendChild(sc);
    });
    return jsqrP;
  }
  function nativeDetector() {
    if (!('BarcodeDetector' in global)) return Promise.resolve(null);
    var BD = global.BarcodeDetector;
    var fm = typeof BD.getSupportedFormats === 'function' ? BD.getSupportedFormats() : Promise.resolve(['qr_code']);
    return fm.then(function (list) {
      if (list && list.indexOf('qr_code') === -1) return null;
      try { return new BD({ formats: ['qr_code'] }); } catch (e) { return null; }
    }).catch(function () { return null; });
  }
  /** decode(source) → Promise<string|null>. source: video veya img. */
  function makeDecoder() {
    return nativeDetector().then(function (det) {
      if (det) return { kind: 'native', decode: function (src) { return det.detect(src).then(function (c) { return c && c.length ? c[0].rawValue : null; }); } };
      return loadJsQR().then(function (jsQR) {
        var cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
        return {
          kind: 'jsqr',
          decode: function (src, big) {
            var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
            if (!w || !h) return Promise.resolve(null);
            var max = big ? 1200 : 640, sc = Math.min(1, max / Math.max(w, h));
            cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
            ctx.drawImage(src, 0, 0, cv.width, cv.height);
            var img = ctx.getImageData(0, 0, cv.width, cv.height);
            var r = jsQR(img.data, cv.width, cv.height, { inversionAttempts: big ? 'attemptBoth' : 'dontInvert' });
            return Promise.resolve(r && r.data ? r.data : null);
          }
        };
      });
    });
  }
  function openScanner(hives) {
    ensureCss();
    var back = document.createElement('div');
    back.className = 'ka-qr-back';
    document.body.appendChild(back);
    var stream = null, timer = null, done = false, decoder = null;
    function close() {
      done = true;
      if (timer) clearTimeout(timer);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (back.parentNode) back.parentNode.removeChild(back);
    }
    function msg(t) { var el = back.querySelector('#kaQrMsg'); if (el) el.textContent = t; }
    function handle(raw) {
      if (raw == null) return false;
      var h = parseHiveFromText(raw, hives);
      if (h) { close(); location.href = 'kovan.html?id=' + encodeURIComponent(h.id); return true; }
      msg('Bu QR bir SüperArı kovanına ait değil: ' + String(raw).slice(0, 80));
      return false;
    }
    var photoBtn = '<label class="ka-btn" style="position:relative;overflow:hidden;cursor:pointer;">📷 Fotoğrafla okut<input type="file" accept="image/*" capture="environment" data-qr-photo style="position:absolute;inset:0;opacity:0;width:100%;height:100%;font-size:0;cursor:pointer;" aria-label="QR kodunun fotoğrafını çek"></label>';
    var fallback = '<p style="margin:0;">Telefonunuzun kamera uygulamasıyla etiketteki QR kodu okutun; bağlantı doğrudan kovan sayfasını açar. Ya da kovan numarasını arama kutusuna yazıp Enter’a basın.</p>';
    back.addEventListener('click', function (e) { if (e.target === back || (e.target.closest && e.target.closest('[data-close]'))) close(); });
    /* Canlı kamera yoksa / izin yoksa: QR'ın fotoğrafını çekip çözme. */
    back.addEventListener('change', function (e) {
      var inp = e.target;
      if (!inp || !inp.hasAttribute || !inp.hasAttribute('data-qr-photo') || !inp.files || !inp.files[0]) return;
      var f = inp.files[0]; inp.value = '';
      msg('Fotoğraf okunuyor…');
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        (decoder ? Promise.resolve(decoder) : makeDecoder()).then(function (dc) {
          decoder = dc;
          return dc.decode(im, true);
        }).then(function (raw) {
          URL.revokeObjectURL(u);
          if (raw == null) { msg('Fotoğrafta QR kodu bulunamadı. Kodu yakından, net ve düz çekin.'); return; }
          handle(raw);
        }).catch(function () { URL.revokeObjectURL(u); msg('QR çözücü yüklenemedi. İnternet bağlantısını kontrol edin.'); });
      };
      im.onerror = function () { URL.revokeObjectURL(u); msg('Fotoğraf açılamadı.'); };
      im.src = u;
    });
    function photoOnly(title, text) {
      back.innerHTML = '<div class="ka-qr-card" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><p style="margin:0 0 .6rem;">' + esc(text) + '</p>' +
        '<div style="display:grid;gap:.5rem;">' + photoBtn + '</div><p class="ka-qr-note" id="kaQrMsg" style="margin:.5rem 0 0;font-size:.84rem;color:#5c4813;"></p>' +
        '<div style="margin-top:.6rem;font-size:.84rem;">' + fallback + '</div>' +
        '<div style="margin-top:.8rem;"><button type="button" class="ka-btn" data-close style="width:100%;">Kapat</button></div></div>';
    }
    var hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && global.isSecureContext !== false;
    if (!hasCam) {
      photoOnly('Canlı kamera kullanılamıyor', 'Bu tarayıcıda canlı kamera açılamıyor; QR kodunun fotoğrafını çekerek okutabilirsiniz.');
      return;
    }
    back.innerHTML = '<video playsinline muted autoplay></video><div class="ka-qr-msg" id="kaQrMsg">Kamera açılıyor… QR kodu çerçeveye getirin.</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;">' + photoBtn + '<button type="button" class="ka-btn" data-close>Kapat</button></div>';
    var video = back.querySelector('video');
    video.setAttribute('playsinline', ''); video.muted = true; video.playsInline = true;
    Promise.all([
      makeDecoder().catch(function () { return null; }),
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
    ]).then(function (res) {
      var s = res[1];
      if (done) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      decoder = res[0];
      if (!decoder) { msg('QR çözücü yüklenemedi. İnternet bağlantısını kontrol edin ya da fotoğrafla okutun.'); }
      video.srcObject = s;
      var pl = video.play();
      return Promise.resolve(pl).then(function () {
        if (!decoder) return;
        msg('QR kodu çerçeveye getirin.');
        (function tick() {
          if (done) return;
          if (video.readyState < 2) { timer = setTimeout(tick, 250); return; }
          decoder.decode(video).then(function (raw) {
            if (done) return;
            if (raw != null && handle(raw)) return;
            timer = setTimeout(tick, decoder.kind === 'native' ? 350 : 220);
          }).catch(function () { timer = setTimeout(tick, 600); });
        })();
      });
    }).catch(function (err) {
      if (done) return;
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      photoOnly(denied ? 'Kamera izni verilmedi' : 'Kamera açılamadı',
        denied ? 'Tarayıcı ayarlarından bu site için kamera iznini açabilir ya da QR kodunun fotoğrafını çekebilirsiniz. iPhone: Ayarlar › Safari › Kamera.' : 'Canlı kamera açılamadı; QR kodunun fotoğrafını çekerek okutabilirsiniz.');
    });
  }

  global.SuperAriKovanAra = { create: create, openScanner: openScanner, parseHiveFromText: parseHiveFromText, facts: facts };
})(window);
