/* Yönetici paneli ağaç görünümü: bölüm → 📁 klasör (fieldset / grup) → 📄 dosya (alan / liste öğesi). Varsayılan kapalı; açık olanlar yeniden çizimde korunur. */
(function () {
  'use strict';
  var OPEN = {};
  var css = document.createElement('style');
  css.textContent = [
    '.tr-d{border-left:2px solid #ead9b3;margin:.15rem 0 .15rem .35rem;padding-left:.45rem}',
    '.tr-d>summary{list-style:none;cursor:pointer;padding:.5rem .3rem;min-height:44px;box-sizing:border-box;display:flex;align-items:center;gap:.4rem;font-weight:700;border-radius:10px;-webkit-tap-highlight-color:transparent}',
    '.tr-d>summary::-webkit-details-marker{display:none}',
    '.tr-d>summary:before{content:"▸";display:inline-block;width:1em;color:#9a7b45;transition:transform .15s}',
    '.tr-d[open]>summary:before{transform:rotate(90deg)}',
    '.tr-d>summary:active{background:#fff5d6}',
    '.tr-d>summary small{font-weight:600;color:var(--muted,#8a7358);margin-left:auto;white-space:nowrap}',
    '.tr-f>summary{font-weight:600}',
    '.tr-sec>summary{font-size:1.08rem;padding-left:0}',
    '.tr-sec{border-left:0;margin-left:0;padding-left:0}',
    '.tr-body{padding:.2rem 0 .4rem}',
    '.tr-f .tr-body label{border-bottom:0!important}',
    '.tr-f .tr-body label>span:first-child{display:none}',
    '.tr-f .tr-body label{flex-wrap:wrap}',
    'fieldset.tr-done{border:0!important;padding:0!important;margin:0!important}',
    'fieldset.tr-done>legend{display:none}',
    'ol.fe-list.tr-done,ul.tr-done{list-style:none;padding:0;margin:0;display:block}',
    'li.tr-li{border:0!important;padding:0!important;background:none!important}'
  ].join('');
  document.head.appendChild(css);
  function key(el, t) { var s = el.closest('section'); return (s && (s.id || (s.querySelector('h2') || {}).id) || '') + '|' + t; }
  function mk(cls, label, k, count) {
    var d = document.createElement('details'); d.className = 'tr-d ' + cls; d.setAttribute('data-k', k);
    var s = document.createElement('summary'); s.innerHTML = label + (count != null ? ' <small>' + count + '</small>' : ''); d.appendChild(s);
    var b = document.createElement('div'); b.className = 'tr-body'; d.appendChild(b);
    if (OPEN[k]) d.open = true;
    d.addEventListener('toggle', function () { if (d.open) OPEN[k] = 1; else delete OPEN[k]; });
    return d;
  }
  function txt(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function files(container, sel, nameOf, prefix) {
    [].slice.call(container.querySelectorAll(sel)).forEach(function (it) {
      var pp = it.parentNode; if ((pp && pp.classList.contains('tr-body') && pp.parentNode.classList.contains('tr-f')) || it.classList.contains('tr-skip')) return;
      var n = nameOf(it); if (!n) return;
      var d = mk('tr-f', '📄 ' + esc(n), key(it, prefix + n));
      it.parentNode.insertBefore(d, it); d.querySelector('.tr-body').appendChild(it);
    });
  }
  function treeify(root) {
    /* 1) fieldset → 📁, içindeki label / satır → 📄 */
    [].slice.call(root.querySelectorAll('fieldset:not(.tr-done)')).forEach(function (fs) {
      fs.classList.add('tr-done');
      var lg = fs.querySelector('legend'), name = txt(lg) || 'Grup';
      var items = fs.querySelectorAll('label, .os-dn');
      var d = mk('tr-k', '📁 ' + esc(name), key(fs, 'fs:' + name), items.length || null), body = d.querySelector('.tr-body');
      [].slice.call(fs.childNodes).forEach(function (c) { if (c !== lg) body.appendChild(c); });
      fs.appendChild(d);
      files(body, ':scope > label', function (l) { return txt(l.querySelector('span')) || txt(l).slice(0, 40); }, 'f:' + name + ':');
      files(body, ':scope > .os-dn', function (r) { return txt(r.querySelector('b')); }, 'd:' + name + ':');
    });
    /* 2) liste öğeleri → 📄 */
    [].slice.call(root.querySelectorAll('ol.fe-list:not(.tr-done), .bd ul:not(.tr-done)')).forEach(function (ol) {
      ol.classList.add('tr-done');
      [].slice.call(ol.children).forEach(function (li) {
        if (li.classList.contains('fe-empty') || li.tagName !== 'LI') return;
        li.classList.add('tr-li');
        var b = li.querySelector('.fe-top b, b'), n = b ? txt(b.firstChild && b.firstChild.nodeType === 3 ? { textContent: b.firstChild.textContent } : b) : txt(li).slice(0, 50);
        var meta = li.querySelector('.fe-top span'), d = mk('tr-f', (li.querySelector('.ud') ? '📁 ' : '📄 ') + esc(n || 'Kayıt'), key(ol, 'li:' + n), meta ? txt(meta) : null);
        while (li.firstChild) d.querySelector('.tr-body').appendChild(li.firstChild);
        li.appendChild(d);
      });
    });
    /* 3) bölüm kartı → 📁 (başlık özet olur) */
    [].slice.call(root.querySelectorAll('section.card:not(.tr-sec-done), section.fe:not(.tr-sec-done)')).forEach(function (s) {
      if (s.id === 'gate' || s.classList.contains('grid-3') || s.classList.contains('yon-home')) return;
      var h = s.querySelector(':scope > h2'); if (!h) return;
      s.classList.add('tr-sec-done');
      var d = mk('tr-sec', '📁 ' + esc(txt(h)), (s.id || h.id || txt(h)) + '|sec'), body = d.querySelector('.tr-body');
      [].slice.call(s.childNodes).forEach(function (c) { if (c !== h) body.appendChild(c); });
      h.remove(); s.appendChild(d);
    });
  }
  var t = null;
  function run() { clearTimeout(t); t = setTimeout(function () { mo.disconnect(); try { treeify(document.querySelector('main') || document.body); } finally { mo.observe(document.body, { childList: true, subtree: true }); } }, 30); }
  var mo = new MutationObserver(run);
  mo.observe(document.body, { childList: true, subtree: true });
  /* #hash bağlantısı: hedef bölümü aç */
  function openHash() { var el = location.hash && document.getElementById(location.hash.slice(1)); if (!el) return; var d = el.querySelector('details.tr-sec') || el.closest('details'); if (d) d.open = true; }
  window.addEventListener('hashchange', function () { setTimeout(openHash, 60); });
  run();
  window.SuperAriAgac = { treeify: treeify };
})();
