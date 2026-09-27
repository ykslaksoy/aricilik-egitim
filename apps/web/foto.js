/**
 * Fotoğraflar — kayıt (muayene / hızlı kayıt / hastalık …) fotoğrafları.
 * Fotoğraflar tarayıcıda küçültülür (en uzun kenar 1280 px, JPEG) ve yalnız bu cihazın
 * IndexedDB deposunda saklanır (db: superari-foto). Bir fotoğraf birden fazla kayda bağlanabilir
 * (hızlı kayıtta seçili kovanların her biri ayrı kayıttır; fotoğraf bir kez saklanır).
 * Satır: { id, recordIds:[..], mode:'live'|'demo', createdAt, blob, thumb, w, h }
 */
(function (global) {
  var DB_NAME = 'superari-foto', STORE = 'photos', MAX_EDGE = 1280, THUMB_EDGE = 240, QUALITY = 0.72, MAX_PER_RECORD = 6;
  var dbP = null;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function supported() { try { return !!global.indexedDB; } catch (e) { return false; } }
  function open() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      if (!supported()) { rej(new Error('idb')); return; }
      var rq;
      try { rq = global.indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var st = db.createObjectStore(STORE, { keyPath: 'id' });
          st.createIndex('recordIds', 'recordIds', { multiEntry: true });
        }
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error || new Error('idb')); };
    });
    dbP.catch(function () { dbP = null; });
    return dbP;
  }
  function tx(modeRW, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, modeRW), st = t.objectStore(STORE), out;
        out = fn(st);
        t.oncomplete = function () { res(out && out.__val !== undefined ? out.__val : out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('abort')); };
      });
    });
  }
  function reqVal(rq, holder) { rq.onsuccess = function () { holder.__val = rq.result; }; return holder; }

  /* ---- Küçültme ---- */
  function loadImg(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { res({ im: im, u: u }); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('decode')); };
      im.src = u;
    });
  }
  function canvasBlob(cv, q) {
    return new Promise(function (res) {
      if (cv.toBlob) { cv.toBlob(function (b) { res(b); }, 'image/jpeg', q); return; }
      var d = cv.toDataURL('image/jpeg', q), bin = atob(d.split(',')[1]), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      res(new Blob([arr], { type: 'image/jpeg' }));
    });
  }
  function draw(im, edge) {
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    var s = Math.min(1, edge / Math.max(w, h || 1));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(im, 0, 0, cv.width, cv.height);
    return cv;
  }
  /** Dosyayı küçültür → { blob, thumb, w, h } */
  function compress(file) {
    return loadImg(file).then(function (o) {
      var big = draw(o.im, MAX_EDGE), small = draw(o.im, THUMB_EDGE);
      URL.revokeObjectURL(o.u);
      return Promise.all([canvasBlob(big, QUALITY), canvasBlob(small, 0.7)]).then(function (b) {
        if (!b[0]) throw new Error('encode');
        return { blob: b[0], thumb: b[1] || b[0], w: big.width, h: big.height };
      });
    });
  }

  /* ---- Depo ---- */
  function newId() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /** Küçültülmüş fotoğrafları kayıt(lar)a bağlar. items: compress() çıktıları. */
  function attach(recordIds, items) {
    recordIds = (recordIds || []).map(String).filter(Boolean);
    if (!recordIds.length || !items || !items.length) return Promise.resolve([]);
    var m = mode(), now = new Date().toISOString();
    var rows = items.map(function (it) { return { id: newId(), recordIds: recordIds.slice(), mode: m, createdAt: now, blob: it.blob, thumb: it.thumb, w: it.w, h: it.h }; });
    return tx('readwrite', function (st) { rows.forEach(function (r) { st.put(r); }); return rows; });
  }
  function listFor(recordId) {
    if (!recordId) return Promise.resolve([]);
    return tx('readonly', function (st) { return reqVal(st.index('recordIds').getAll(String(recordId)), {}); })
      .then(function (l) { return (l || []).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }); })
      .catch(function () { return []; });
  }
  /** Fotoğrafı bu kayıttan ayırır; başka kayda bağlı değilse siler. */
  function detachOne(photoId, recordId) {
    return tx('readwrite', function (st) {
      var g = st.get(photoId);
      g.onsuccess = function () {
        var r = g.result; if (!r) return;
        r.recordIds = (r.recordIds || []).filter(function (x) { return x !== String(recordId); });
        if (r.recordIds.length) st.put(r); else st.delete(photoId);
      };
    });
  }
  /** Kayıt silinince: o kayda bağlı tüm fotoğrafları ayırır. */
  function detachRecord(recordId) {
    return listFor(recordId).then(function (l) {
      return Promise.all(l.map(function (p) { return detachOne(p.id, recordId); }));
    }).catch(function () { return []; });
  }
  function countAll() {
    return tx('readonly', function (st) { return reqVal(st.count(), {}); }).catch(function () { return 0; });
  }

  /* ---- CSS ---- */
  function ensureCss() {
    if (document.getElementById('superariFotoCss')) return;
    var s = document.createElement('style');
    s.id = 'superariFotoCss';
    s.textContent = '' +
      '.kf-box{display:grid;gap:.4rem;margin-top:.55rem;padding:.55rem .6rem;border:1px dashed var(--border,#ead9b3);border-radius:12px;background:#fffdf6;min-width:0;}' +
      '.kf-head{font-size:.75rem;font-weight:800;color:#5c4813;}' +
      '.kf-btns{display:flex;flex-wrap:wrap;gap:.4rem;}' +
      '.kf-btn{position:relative;display:inline-flex;align-items:center;gap:.3rem;padding:.42rem .7rem;border-radius:999px;border:1px solid var(--border,#ead9b3);background:#fff;font-size:.82rem;font-weight:750;color:#5c4813;cursor:pointer;overflow:hidden;}' +
      '.kf-btn input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0;}' +
      '.kf-thumbs,.bt-thumbs{display:flex;flex-wrap:wrap;gap:.35rem;min-width:0;}' +
      '.bt-thumbs:empty{display:none;}' +
      '.bt-thumbs{margin-top:.3rem;}' +
      '.kf-th{position:relative;width:64px;height:64px;border-radius:9px;overflow:hidden;border:1px solid var(--border,#ead9b3);background:#f1ece0;flex:0 0 auto;padding:0;cursor:zoom-in;}' +
      '.bt-thumbs .kf-th{width:52px;height:52px;}' +
      '.kf-th img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.kf-th .kf-x{position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:.8rem;line-height:22px;padding:0;cursor:pointer;}' +
      '.kf-hint{margin:0;font-size:.74rem;color:var(--muted,#6b7280);}' +
      '.kf-view{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:pan-y;}' +
      '.kf-view img{max-width:100vw;max-height:calc(100vh - 120px);object-fit:contain;display:block;}' +
      '.kf-view .kf-bar{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.6rem .8rem;color:#fff;font-size:.85rem;font-weight:700;}' +
      '.kf-view .kf-top{top:0;}.kf-view .kf-bot{bottom:0;justify-content:center;}' +
      '.kf-view button{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:.45rem .8rem;font:inherit;font-weight:750;cursor:pointer;}' +
      '.kf-view .kf-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;padding:0;font-size:1.4rem;}' +
      '.kf-view .kf-prev{left:.4rem;}.kf-view .kf-next{right:.4rem;}';
    document.head.appendChild(s);
  }

  /* ---- Tam ekran görüntüleyici ---- */
  function viewer(photos, index, opts) {
    ensureCss();
    opts = opts || {};
    if (!photos || !photos.length) return;
    var i = Math.max(0, Math.min(photos.length - 1, index || 0)), url = null;
    var el = document.createElement('div');
    el.className = 'kf-view';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Fotoğraf');
    el.innerHTML = '<div class="kf-bar kf-top"><span class="kf-cap"></span><button type="button" data-kf-close aria-label="Kapat">✕ Kapat</button></div>' +
      '<img alt="Kayıt fotoğrafı">' +
      '<button type="button" class="kf-nav kf-prev" data-kf-prev aria-label="Önceki">‹</button><button type="button" class="kf-nav kf-next" data-kf-next aria-label="Sonraki">›</button>' +
      '<div class="kf-bar kf-bot">' + (opts.recordId ? '<button type="button" data-kf-del>🗑 Bu kayıttan sil</button>' : '') + '</div>';
    document.body.appendChild(el);
    var img = el.querySelector('img');
    function show() {
      if (url) URL.revokeObjectURL(url);
      var p = photos[i];
      url = URL.createObjectURL(p.blob);
      img.src = url;
      var dt = String(p.createdAt || '').slice(0, 10).split('-');
      el.querySelector('.kf-cap').textContent = (i + 1) + ' / ' + photos.length + (dt.length === 3 ? ' · ' + dt[2] + '.' + dt[1] + '.' + dt[0] : '') + (p.mode === 'demo' ? ' · Demo' : '');
      el.querySelector('[data-kf-prev]').hidden = photos.length < 2;
      el.querySelector('[data-kf-next]').hidden = photos.length < 2;
    }
    function close() {
      if (url) URL.revokeObjectURL(url);
      if (el.parentNode) el.parentNode.removeChild(el);
      document.removeEventListener('keydown', onKey, true);
    }
    function step(d) { i = (i + d + photos.length) % photos.length; show(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    }
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t === el || (t.closest && t.closest('[data-kf-close]'))) { close(); return; }
      if (t.closest && t.closest('[data-kf-prev]')) { step(-1); return; }
      if (t.closest && t.closest('[data-kf-next]')) { step(1); return; }
      if (t.closest && t.closest('[data-kf-del]')) {
        if (!confirm('Bu fotoğraf kayıttan silinsin mi?')) return;
        var p = photos[i];
        detachOne(p.id, opts.recordId).then(function () {
          photos.splice(i, 1);
          if (typeof opts.onChange === 'function') opts.onChange(photos.length);
          if (!photos.length) { close(); return; }
          i = Math.min(i, photos.length - 1); show();
        });
      }
    });
    var x0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50 && photos.length > 1) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    show();
  }

  /* ---- Küçük resimler (kayıt listeleri / Bakım geçmişi) ---- */
  /** root içindeki [data-foto-rec] kutularını doldurur. opts.onCount(recordId, hiveId, kind, n) */
  function fillThumbs(root, opts) {
    ensureCss();
    opts = opts || {};
    var els = (root || document).querySelectorAll('[data-foto-rec]:not([data-foto-filled])');
    Array.prototype.forEach.call(els, function (box) {
      box.setAttribute('data-foto-filled', '1');
      renderThumbs(box, opts);
    });
  }
  function renderThumbs(box, opts) {
    var rid = box.getAttribute('data-foto-rec');
    listFor(rid).then(function (l) {
      box.innerHTML = '';
      l.forEach(function (p, idx) {
        var b = document.createElement('span');
        b.className = 'kf-th';
        b.setAttribute('role', 'button');
        b.setAttribute('tabindex', '0');
        b.setAttribute('aria-label', 'Fotoğrafı tam ekran aç (' + (idx + 1) + '/' + l.length + ')');
        var im = document.createElement('img');
        im.alt = '';
        im.loading = 'lazy';
        var u = URL.createObjectURL(p.thumb || p.blob);
        im.onload = function () { URL.revokeObjectURL(u); };
        im.src = u;
        b.appendChild(im);
        function openIt(e) {
          e.preventDefault(); e.stopPropagation();
          viewer(l.slice(), idx, {
            recordId: rid,
            onChange: function (n) {
              renderThumbs(box, opts);
              if (typeof opts.onCount === 'function') opts.onCount(rid, box.getAttribute('data-foto-hive'), box.getAttribute('data-foto-kind'), n);
            }
          });
        }
        b.addEventListener('click', openIt);
        b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') openIt(e); });
        box.appendChild(b);
      });
    });
  }

  /* ---- Seçici (kayıt formlarının altı) ---- */
  /** container'a Kamera / Galeri seçici kurar → { items(), count(), clear(), busy() } */
  function picker(container, opts) {
    ensureCss();
    opts = opts || {};
    var pending = [], working = 0;
    var box = document.createElement('div');
    box.className = 'kf-box';
    if (!supported()) {
      box.innerHTML = '<div class="kf-head">📷 Fotoğraf</div><p class="kf-hint">Bu tarayıcı fotoğrafları cihazda saklayamıyor (gizli pencere olabilir).</p>';
      container.appendChild(box);
      return { items: function () { return []; }, count: function () { return 0; }, clear: function () {}, busy: function () { return false; } };
    }
    box.innerHTML = '<div class="kf-head">📷 Fotoğraf (isteğe bağlı, en fazla ' + MAX_PER_RECORD + ')</div>' +
      (opts.existingRecordId ? '<div class="bt-thumbs" data-foto-rec="' + esc(opts.existingRecordId) + '" data-foto-hive="' + esc(opts.hiveId || '') + '" data-foto-kind="' + esc(opts.kind || '') + '"></div>' : '') +
      '<div class="kf-btns"><label class="kf-btn">📷 Kamera<input type="file" accept="image/*" capture="environment" aria-label="Kamerayla fotoğraf çek"></label>' +
      '<label class="kf-btn">🖼️ Galeri<input type="file" accept="image/*" multiple aria-label="Galeriden fotoğraf seç"></label></div>' +
      '<div class="kf-thumbs"></div><p class="kf-hint">Fotoğraflar küçültülür ve yalnız bu cihazda saklanır.</p>';
    container.appendChild(box);
    if (opts.existingRecordId) fillThumbs(box, { onCount: opts.onCount });
    var thumbs = box.querySelector('.kf-thumbs'), hint = box.querySelector('.kf-hint');
    function render() {
      thumbs.innerHTML = '';
      pending.forEach(function (p, idx) {
        var s = document.createElement('span');
        s.className = 'kf-th';
        var im = document.createElement('img');
        im.alt = 'Eklenecek fotoğraf ' + (idx + 1);
        im.src = p.url;
        s.appendChild(im);
        s.addEventListener('click', function (e) {
          if (e.target.closest('.kf-x')) return;
          viewer(pending.map(function (q) { return { blob: q.blob, createdAt: new Date().toISOString() }; }), idx);
        });
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'kf-x'; x.textContent = '✕';
        x.setAttribute('aria-label', 'Fotoğrafı çıkar');
        x.addEventListener('click', function (e) { e.stopPropagation(); URL.revokeObjectURL(p.url); pending.splice(idx, 1); render(); });
        s.appendChild(x);
        thumbs.appendChild(s);
      });
      hint.textContent = working ? 'Fotoğraf küçültülüyor…' : (pending.length ? pending.length + ' fotoğraf kayıtla birlikte saklanacak.' : 'Fotoğraflar küçültülür ve yalnız bu cihazda saklanır.');
    }
    box.addEventListener('change', function (e) {
      var inp = e.target;
      if (!inp || inp.type !== 'file' || !inp.files) return;
      var files = Array.prototype.slice.call(inp.files);
      inp.value = '';
      var room = MAX_PER_RECORD - pending.length;
      if (room <= 0) { hint.textContent = 'En fazla ' + MAX_PER_RECORD + ' fotoğraf eklenebilir.'; return; }
      files.slice(0, room).forEach(function (file) {
        working++; render();
        compress(file).then(function (c) {
          c.url = URL.createObjectURL(c.thumb);
          pending.push(c);
        }).catch(function () {
          hint.textContent = 'Bu fotoğraf açılamadı (biçim desteklenmiyor olabilir).';
        }).then(function () { working--; render(); });
      });
    });
    return {
      items: function () { return pending.slice(); },
      count: function () { return pending.length; },
      busy: function () { return working > 0; },
      clear: function () { pending.forEach(function (p) { URL.revokeObjectURL(p.url); }); pending = []; render(); }
    };
  }

  global.SuperAriFoto = {
    compress: compress, attach: attach, listFor: listFor, detachOne: detachOne, detachRecord: detachRecord,
    countAll: countAll, viewer: viewer, fillThumbs: fillThumbs, picker: picker, supported: supported, MAX_PER_RECORD: MAX_PER_RECORD
  };
})(typeof window !== 'undefined' ? window : this);
