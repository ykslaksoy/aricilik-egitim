/**
 * SüperArı — «Oğul verdi» kaydı ve kovan kutusu (gövde / kat / ballık) düzenleme.
 * SuperAriOgulVerdi.open(hiveId, { onSaved })  ·  SuperAriKutu.open(hiveId, { onSaved })
 * Kayıt demo-data.js › colony.recordSwarm / colony.setBoxes; buluta hives + koloni işlemleri üzerinden eşitlenir.
 */
(function (global) {
  'use strict';
  function D() { return global.SuperAriDemo; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function today() { return D().colony.todayLocal(); }
  function addDays(d, n) { var p = d.split('-'), x = new Date(+p[0], p[1] - 1, +p[2] + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function fmt(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  var css = '.ov-back{position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9100;display:flex;align-items:flex-end;justify-content:center;}' +
    '.ov{background:#fffaf2;width:100%;max-width:560px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;color:#3d2616;overflow-wrap:anywhere;}' +
    '.ov h2{margin:0 0 4px;font-size:18px;display:flex;align-items:center;gap:8px;}.ov .ov-x{margin-left:auto;flex:none;border:0;background:#efe4d2;border-radius:999px;width:34px;height:34px;font-size:19px;cursor:pointer;}' +
    '.ov-sub{font-size:13px;color:#6b5a48;margin:0 0 10px;}.ov form{display:grid;gap:10px;}' +
    '.ov label.f{display:grid;gap:4px;font-size:13px;font-weight:700;color:#5c4813;min-width:0;}' +
    '.ov input[type=date],.ov input[type=text],.ov input[type=number],.ov select,.ov textarea{font:inherit;font-size:15px;padding:9px 10px;border-radius:10px;border:1px solid #d8c7aa;background:#fff;width:100%;box-sizing:border-box;min-width:0;}' +
    '.ov-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;}.ov-seg button{font:inherit;font-size:14px;font-weight:700;min-height:46px;border-radius:12px;border:2px solid #e0cfb3;background:#fff;color:#3d2616;cursor:pointer;padding:6px;}' +
    '.ov-seg button.on{border-color:#e56f1c;background:#fff1de;}' +
    '.ov-info{background:#f3f0ff;border:1px solid #d0bfff;border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.4;}' +
    '.ov-hist{background:#fff;border:1px solid #eadfcd;border-radius:10px;padding:8px 10px;font-size:13px;}' +
    '.ov-step{display:flex;align-items:center;justify-content:center;gap:14px;}.ov-step button{font:inherit;font-size:24px;font-weight:800;width:48px;height:48px;border-radius:14px;border:2px solid #e0cfb3;background:#fff;cursor:pointer;color:#3d2616;}' +
    '.ov-step output{font-size:28px;font-weight:900;min-width:44px;text-align:center;}.ov-lbl{text-align:center;font-size:13px;font-weight:700;color:#6b5a48;}' +
    '.ov-chk{display:flex;gap:8px;align-items:center;justify-content:center;font-size:14px;font-weight:700;}.ov-chk input{width:20px;height:20px;}' +
    '.ov-btn{font:inherit;font-size:16px;font-weight:800;min-height:50px;border-radius:14px;border:1px solid #3d2616;background:#3d2616;color:#fff;cursor:pointer;width:100%;}' +
    '.ov-msg{font-size:14px;margin:0;}.ov-msg.ok{color:#1b7a3d;font-weight:700;}.ov-msg.err{color:#c92a2a;font-weight:700;}.ov a{color:#2b6cb0;}';
  function ensureCss() { if (document.getElementById('ovCss')) return; var s = document.createElement('style'); s.id = 'ovCss'; s.textContent = css; document.head.appendChild(s); }
  function close() { var b = document.getElementById('ovSheet'); if (b) b.remove(); }
  function sheet(html) {
    ensureCss(); close();
    var back = document.createElement('div'); back.className = 'ov-back'; back.id = 'ovSheet';
    back.innerHTML = '<div class="ov" role="dialog" aria-modal="true">' + html + '</div>';
    back.addEventListener('click', function (e) { if (e.target === back || (e.target.hasAttribute && e.target.hasAttribute('data-ov-close'))) close(); });
    document.body.appendChild(back);
    return back;
  }

  /* ---------------- Oğul verdi ---------------- */
  function openSwarm(hiveId, opts) {
    opts = opts || {};
    var d = D(), h = d && d.hiveById(hiveId); if (!h) return;
    var q = null; try { q = h.currentQueenId ? d.colony.queenById(h.currentQueenId) : null; } catch (e) { q = null; }
    var aps = d.loadApiaries();
    var others = d.loadHives().filter(function (x) { return String(x.apiaryId) === String(h.apiaryId) && x.id !== h.id && x.colonyState !== 'birlestirildi'; });
    var hist = []; try { hist = d.colonyOps.swarmEvents(h.id); } catch (e) { hist = []; }
    var st = { outcome: 'yakalandi', target: 'yeni' };
    var breed = (q && q.breed) || h.breed || '';
    var html = '<h2>🐝 Oğul verdi · ' + esc(h.name) + '<button type="button" class="ov-x" data-ov-close aria-label="Kapat">×</button></h2>' +
      '<p class="ov-sub">' + esc((d.apiaryById(h.apiaryId) || {}).name || '') + (mode() === 'demo' ? ' · Demo' : '') + '</p>' +
      (hist.length ? '<div class="ov-hist"><b>Önceki oğul kayıtları</b><br>' + hist.slice(0, 3).map(function (e) { return fmt(e.date) + ' · ' + (e.outcome === 'kayip' ? 'kaçtı' : 'yakalandı') + (Number(e.toHiveId) === h.id ? ' (bu kovana kondu)' : ''); }).join('<br>') + '</div>' : '') +
      '<form data-ov-form autocomplete="off" onsubmit="return false">' +
      '<label class="f">Tarih<input type="date" name="date" value="' + today() + '" max="' + today() + '"></label>' +
      '<div><div class="ov-lbl" style="text-align:left;margin-bottom:4px;">Oğul ne oldu?</div><div class="ov-seg" data-ov-seg="outcome"><button type="button" data-v="yakalandi" class="on">Yakalandı, kovanlandı</button><button type="button" data-v="kayip">Kaçtı (kayıp)</button></div></div>' +
      '<div data-ov-where><div class="ov-lbl" style="text-align:left;margin-bottom:4px;">Nereye kondu?</div><div class="ov-seg" data-ov-seg="target"><button type="button" data-v="yeni" class="on">Yeni kovan</button><button type="button" data-v="mevcut"' + (others.length ? '' : ' disabled') + '>Var olan kovan</button></div>' +
      '<div data-ov-new style="display:grid;gap:8px;margin-top:8px;"><label class="f">Arılık<select name="apiary">' + aps.map(function (a) { return '<option value="' + esc(a.id) + '"' + (String(a.id) === String(h.apiaryId) ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Yeni kovanın adı (boş bırakılırsa numara verilir)<input type="text" name="name" maxlength="60" placeholder="ör. Kovan 143"></label></div>' +
      '<div data-ov-old hidden style="margin-top:8px;"><label class="f">Kovan<select name="target">' + others.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f" style="margin-top:8px;">Oğul büyüklüğü (arılı çerçeve, isteğe bağlı)<input type="number" name="bees" min="0" max="20" inputmode="numeric" placeholder="ör. 4"></label></div>' +
      '<label class="f">Not<textarea name="note" maxlength="300" rows="2" placeholder="İsteğe bağlı"></textarea></label>' +
      '<div class="ov-info" data-ov-info></div>' +
      '<button type="button" class="ov-btn" data-ov-save>Oğul kaydını kaydet</button><p class="ov-msg" data-ov-msg role="status"></p></form>';
    var back = sheet(html), f = back.querySelector('[data-ov-form]');
    function info() {
      var qTxt = q ? 'ana ' + q.id + (breed ? ' (' + breed + ')' : '') : 'eski ana';
      back.querySelector('[data-ov-info]').innerHTML = '🧬 <b>Soy:</b> oğulla ' + esc(qTxt) + ' çıkar. ' +
        (st.outcome === 'kayip' ? 'Oğul kayıp olarak kaydedilir; ana kaydı kapanır.' : 'Oğulun konduğu kovanın anası bu ana olur.') +
        ' <b>' + esc(h.name) + '</b> ana memesinden yeni (kız) ana yetiştirir' + (breed ? '; ırkı ' + esc(breed) + ' (tahmini)' : '') + '. Yaklaşık 3 hafta sonra yumurta kontrolü görevi eklenir. Bu mevsim tekrar oğul riski düşük gösterilir.';
    }
    function seg() {
      back.querySelectorAll('[data-ov-seg]').forEach(function (g) { var k = g.getAttribute('data-ov-seg'); g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st[k]); }); });
      back.querySelector('[data-ov-where]').hidden = st.outcome === 'kayip';
      back.querySelector('[data-ov-new]').style.display = st.target === 'yeni' ? 'grid' : 'none';
      back.querySelector('[data-ov-old]').hidden = st.target !== 'mevcut';
      info();
    }
    seg();
    back.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      var g = b.parentElement && b.parentElement.getAttribute('data-ov-seg');
      if (g) { st[g] = b.getAttribute('data-v'); seg(); return; }
      if (!b.hasAttribute('data-ov-save')) return;
      var m = back.querySelector('[data-ov-msg]');
      try {
        var r = d.colony.recordSwarm({ sourceId: h.id, date: f.elements.date.value, outcome: st.outcome, target: st.target, targetHiveId: f.elements.target ? f.elements.target.value : null,
          apiaryId: f.elements.apiary.value, name: f.elements.name.value, beeFrames: f.elements.bees.value, note: f.elements.note.value });
        var dt = f.elements.date.value || today();
        try { d.taskStore.add({ title: 'Oğul sonrası yeni ana: yumurta kontrolü — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id, due: addDays(dt, 21), priority: 2, note: '[ogul-verdi] Ana memesinden çıkan ana çiftleşti mi? Yumurta yoksa ana verin veya birleştirin.' }); } catch (e2) { /* ignore */ }
        m.className = 'ov-msg ok';
        m.innerHTML = '✓ Kaydedildi: oğul ' + (st.outcome === 'kayip' ? 'kayıp' : esc(r.newHiveName) + ' kovanına kondu') + '. ' + esc(h.name) + ' anasız / ana memeli olarak işaretlendi.' +
          (r.newHiveId ? ' <a href="kovan.html?id=' + encodeURIComponent(r.newHiveId) + '">' + esc(r.newHiveName) + ' kovanını aç</a>' : '');
        b.disabled = true;
        if (typeof opts.onSaved === 'function') opts.onSaved(r);
      } catch (err) { m.className = 'ov-msg err'; m.textContent = (err && err.message) || 'Kaydedilemedi'; }
    });
  }

  /* ---------------- Kovan kutusu ---------------- */
  function openBoxes(hiveId, opts) {
    opts = opts || {};
    var d = D(), h = d && d.hiveById(hiveId); if (!h || !d.colony.boxes) return;
    var b0 = d.colony.boxes(h), b = { body: b0.body, kat: b0.kat, ballik: b0.ballik };
    function txt() { return d.colony.boxLabel(b) + ' · ' + (10 * (b.body + b.kat)) + ' çerçeve yer'; }
    var back = sheet('<h2>🏠 Kovan kutusu · ' + esc(h.name) + '<button type="button" class="ov-x" data-ov-close aria-label="Kapat">×</button></h2>' +
      '<p class="ov-sub">Gövde ve kat sayısı oğul riskindeki yer hesabında ve bakım planında kullanılır.' + (b0.known ? '' : ' Henüz kayıtlı değil.') + '</p>' +
      '<div class="ov-lbl">Gövde (kuluçkalık)</div><div class="ov-step"><button type="button" data-k="body" data-d="-1" aria-label="Gövde azalt">−</button><output data-o="body">' + b.body + '</output><button type="button" data-k="body" data-d="1" aria-label="Gövde artır">+</button></div>' +
      '<div class="ov-lbl" style="margin-top:8px;">Kat</div><div class="ov-step"><button type="button" data-k="kat" data-d="-1" aria-label="Kat azalt">−</button><output data-o="kat">' + b.kat + '</output><button type="button" data-k="kat" data-d="1" aria-label="Kat artır">+</button></div>' +
      '<label class="ov-chk" style="margin-top:10px;"><input type="checkbox" data-ballik' + (b.ballik ? ' checked' : '') + '> Ballık takılı (ana ızgaralı bal katı)</label>' +
      '<p class="ov-sub" style="text-align:center;margin:8px 0;" data-lbl>' + esc(txt()) + '</p>' +
      '<button type="button" class="ov-btn" data-save>Kaydet</button><p class="ov-msg" data-msg role="status"></p>');
    function upd() { back.querySelector('[data-o="body"]').textContent = b.body; back.querySelector('[data-o="kat"]').textContent = b.kat; back.querySelector('[data-ballik]').checked = b.ballik; back.querySelector('[data-lbl]').textContent = txt(); }
    back.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
      if (t.hasAttribute('data-k')) { var k = t.getAttribute('data-k'); b[k] = Math.max(k === 'body' ? 1 : 0, Math.min(k === 'body' ? 3 : 4, b[k] + Number(t.getAttribute('data-d')))); if (!b.kat) b.ballik = false; upd(); return; }
      if (t.hasAttribute('data-save')) {
        var r = d.colony.setBoxes(h.id, b), m = back.querySelector('[data-msg]');
        m.className = 'ov-msg ' + (r ? 'ok' : 'err'); m.textContent = r ? '✓ Kaydedildi: ' + txt() : 'Kaydedilemedi';
        if (r && typeof opts.onSaved === 'function') opts.onSaved(r);
      }
    });
    back.addEventListener('change', function (e) { if (e.target.hasAttribute('data-ballik')) { b.ballik = e.target.checked; if (b.ballik && !b.kat) b.kat = 1; upd(); } });
  }
  global.SuperAriOgulVerdi = { open: openSwarm, close: close };
  global.SuperAriKutu = { open: openBoxes, close: close };
})(window);
