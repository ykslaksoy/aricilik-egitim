/**
 * SüperArı — Oğul riski ayrıntısı + öneriler (alt sayfa).
 * Hesap demo-data.js › colony.swarm(h); arayüzde yalnız düzey, nedenler (sade dil) ve öneriler gösterilir.
 */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function today() { return D.colony.todayLocal(); }
  var css = '' +
    '.og-back{position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center;}' +
    '.og-sheet{background:#fffaf2;width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px 22px;box-sizing:border-box;color:#3d2616;}' +
    '.og-sheet h2{margin:0 0 2px;font-size:18px;display:flex;align-items:center;gap:8px;}' +
    '.og-sheet .og-x{margin-left:auto;border:0;background:#efe4d2;border-radius:999px;width:32px;height:32px;font-size:18px;cursor:pointer;}' +
    '.og-lvl{display:inline-block;color:#fff;font-weight:800;border-radius:999px;padding:3px 10px;font-size:14px;margin:6px 0;}' +
    '.og-sec{margin-top:10px;}.og-sec h3{font-size:14px;margin:0 0 6px;}' +
    '.og-why{list-style:none;margin:0;padding:0;}.og-why li{display:flex;gap:8px;padding:5px 0;border-bottom:1px dashed #eadfcd;font-size:14px;line-height:1.35;}' +
    '.og-why .i{flex:0 0 18px;text-align:center;font-weight:800;}.og-why .up{color:#d9480f;}.og-why .down{color:#1b7a3d;}.og-why .info{color:#8a7560;}' +
    '.og-rec{border:1px solid #eadfcd;background:#fff;border-radius:12px;padding:10px;margin-bottom:8px;}' +
    '.og-rec b{display:block;font-size:14px;}.og-rec p{margin:3px 0 8px;font-size:13px;color:#6b5a48;line-height:1.35;}' +
    '.og-acts{display:flex;flex-wrap:wrap;gap:6px;}.og-acts a,.og-acts button{font:inherit;font-size:13px;font-weight:700;border-radius:10px;padding:7px 10px;border:1px solid #c9b79c;background:#fff;color:#3d2616;text-decoration:none;cursor:pointer;}' +
    '.og-acts .pri{background:#3d2616;color:#fff;border-color:#3d2616;}' +
    '.og-msg{font-size:13px;color:#1b7a3d;margin-top:6px;}.og-foot{font-size:12px;color:#8a7560;margin-top:10px;}';
  function ensureCss() {
    if (document.getElementById('ogulCss')) return;
    var st = document.createElement('style'); st.id = 'ogulCss'; st.textContent = css; document.head.appendChild(st);
  }
  function setSuper(hiveId) {
    if (global.SuperAriPlan && global.SuperAriPlan.setSuper) { global.SuperAriPlan.setSuper(hiveId, true); return; }
    var k = mode() === 'live' ? 'superari.bakimPlan.v1' : 'superari.bakimPlan.demo.v1';
    var s; try { s = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { s = {}; }
    if (!s.supers || typeof s.supers !== 'object') s.supers = {};
    s.supers[String(hiveId)] = today();
    try { localStorage.setItem(k, JSON.stringify(s)); } catch (e2) { /* ignore */ }
  }
  function save(h, r, done) {
    var title = r.title + ' — ' + h.name + (mode() === 'demo' ? ' · Demo' : '');
    var row = D.taskStore.add({ title: title, hiveId: h.id, due: today(), priority: r.id === 'meme' || r.id === 'bolme' ? 1 : 2, note: '[ogul:' + r.id + '] ' + r.detail });
    if (!row) return 'Kaydedilemedi.';
    if (done && r.id === 'kanat') {
      D.colony.setQueenClipped(h.id, true, today());
      return 'Kaydedildi: ana arı kanadı kırpık (bugün). Ana değişince bu bilgi sıfırlanır.';
    }
    if (done) {
      D.taskStore.complete(row.id, { note: r.id === 'izle' ? 'İzlemeye devam' : 'Oğul önerisi uygulandı' });
      if (r.id === 'kat') setSuper(h.id);
      return r.id === 'izle' ? 'Kaydedildi: izlemeye devam.' : 'Yapıldı olarak kaydedildi (Görevler › Tamamlanan).';
    }
    return 'Görev eklendi (Görevler / Bakım planı).';
  }
  function close() { var b = document.getElementById('ogulSheet'); if (b) b.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open(hiveId, opts) {
    opts = opts || {};
    var h = D.hiveById(hiveId);
    if (!h || !D.colony.swarm) return;
    ensureCss(); close();
    var a = D.colony.swarm(h);
    var ap = D.apiaryById ? D.apiaryById(h.apiaryId) : null;
    var icon = { up: '▲', down: '▼', info: '•' };
    function li(list) { return list.map(function (x) { return '<li><span class="i ' + x.dir + '">' + icon[x.dir] + '</span><span>' + esc(x.text) + '</span></li>'; }).join(''); }
    var kar = a.details.filter(function (x) { return x.group === 'karakter'; });
    var html = '<div class="og-sheet" role="dialog" aria-modal="true" aria-label="Oğul riski ayrıntısı">' +
      '<h2>Oğul riski · ' + esc(h.name) + '<button type="button" class="og-x" data-og-close aria-label="Kapat">×</button></h2>' +
      '<div class="muted" style="font-size:13px;color:#6b5a48;">' + esc((ap ? ap.name : '') + (mode() === 'demo' ? ' · Demo' : '')) + '</div>' +
      '<span class="og-lvl" style="background:' + a.color + '">' + esc(a.level) + (a.key === 'orta' ? ' · izlemede' : '') + '</span>' +
      '<div class="og-sec"><h3>Kovan durumu</h3><ul class="og-why">' + li(a.details.filter(function (x) { return x.group !== 'karakter'; })) + '</ul></div>' +
      (kar.length ? '<div class="og-sec"><h3>Ana arı karakteri</h3><ul class="og-why">' + li(kar) + '</ul>' +
        '<div class="og-foot" style="margin-top:4px;">Karakter yalnız eğilimi gösterir; düzeyi kovanın durumu belirler.</div></div>' : '') +
      '<div class="og-sec"><h3>Öneriler</h3>' + a.recs.map(function (r, i) {
        return '<div class="og-rec"><b>' + esc(r.title) + '</b><p>' + esc(r.detail) + '</p><div class="og-acts">' +
          (r.href ? '<a class="pri" href="' + esc(r.href) + '">Bölme ekranını aç</a>' : '') +
          (r.id === 'izle' ? '<button type="button" class="pri" data-og-i="' + i + '" data-og-done="1">İzlemeye devam (kaydet)</button>'
            : '<button type="button"' + (r.href ? '' : ' class="pri"') + ' data-og-i="' + i + '">Görev ekle</button><button type="button" data-og-i="' + i + '" data-og-done="1">Yapıldı kaydet</button>') +
          '</div><div class="og-msg" data-og-msg="' + i + '" hidden></div></div>';
      }).join('') + '</div>' +
      (opts.hideHiveLink ? '' : '<div class="og-acts" style="margin-top:6px;"><a href="kovan.html?id=' + encodeURIComponent(h.id) + '">Kovan detayına git</a></div>') +
      '<div class="og-foot">Oğul riski tahminidir: kovanın durumu (ana memesi, yer darlığı, koloni gücü ve yavru, ana yaşı, tartı), bölgenin oğul mevsimi ve ana arı karakterine göre belirlenir.</div></div>';
    var back = document.createElement('div');
    back.className = 'og-back'; back.id = 'ogulSheet'; back.innerHTML = html;
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.hasAttribute('data-og-close')) { close(); return; }
      var btn = e.target.closest ? e.target.closest('[data-og-i]') : null;
      if (!btn) return;
      var i = Number(btn.getAttribute('data-og-i')), r = a.recs[i];
      var msg = save(h, r, btn.hasAttribute('data-og-done'));
      var m = back.querySelector('[data-og-msg="' + i + '"]');
      if (m) { m.hidden = false; m.textContent = msg; }
      btn.disabled = true;
      if (typeof opts.onSaved === 'function') opts.onSaved(r);
    });
    document.body.appendChild(back);
    document.addEventListener('keydown', onKey);
  }
  global.SuperAriOgul = { open: open, close: close };
})(window);
