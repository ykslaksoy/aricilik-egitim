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
  function openScanner(hives) {
    ensureCss();
    var back = document.createElement('div');
    back.className = 'ka-qr-back';
    document.body.appendChild(back);
    var stream = null, timer = null, done = false;
    function close() {
      done = true;
      if (timer) clearTimeout(timer);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (back.parentNode) back.parentNode.removeChild(back);
    }
    back.addEventListener('click', function (e) { if (e.target === back || (e.target.closest && e.target.closest('[data-close]'))) close(); });
    var fallback = '<p style="margin:0;">Telefonunuzun kamera uygulamasıyla etiketteki QR kodu okutun; bağlantı doğrudan kovan sayfasını açar. Ya da kovan numarasını arama kutusuna yazıp Enter’a basın.</p>';
    if (!('BarcodeDetector' in global) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      card(back, 'QR okuma bu tarayıcıda desteklenmiyor', fallback);
      return;
    }
    var detector;
    try { detector = new global.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { card(back, 'QR okuma bu tarayıcıda desteklenmiyor', fallback); return; }
    back.innerHTML = '<video playsinline muted></video><div class="ka-qr-msg" id="kaQrMsg">Kamera açılıyor… QR kodu çerçeveye getirin.</div>' +
      '<button type="button" class="ka-btn" data-close>Kapat</button>';
    var video = back.querySelector('video');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (s) {
      if (done) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      video.srcObject = s;
      return video.play().then(function () {
        back.querySelector('#kaQrMsg').textContent = 'QR kodu çerçeveye getirin.';
        (function tick() {
          if (done) return;
          detector.detect(video).then(function (codes) {
            if (done) return;
            if (codes && codes.length) {
              var raw = codes[0].rawValue;
              var h = parseHiveFromText(raw, hives);
              if (h) { close(); location.href = 'kovan.html?id=' + encodeURIComponent(h.id); return; }
              back.querySelector('#kaQrMsg').textContent = 'Bu QR bir SüperArı kovanına ait değil: ' + String(raw).slice(0, 80);
            }
            timer = setTimeout(tick, 350);
          }).catch(function () { timer = setTimeout(tick, 600); });
        })();
      });
    }).catch(function (err) {
      if (done) return;
      var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      card(back, denied ? 'Kamera izni verilmedi' : 'Kamera açılamadı',
        '<p style="margin:0 0 .5rem;">' + (denied ? 'Tarayıcı ayarlarından bu site için kamera iznini açabilirsiniz.' : 'Cihazda kullanılabilir kamera bulunamadı.') + '</p>' + fallback);
    });
  }

  global.SuperAriKovanAra = { create: create, openScanner: openScanner, parseHiveFromText: parseHiveFromText, facts: facts };
})(window);
