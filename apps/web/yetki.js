/* koloni-165: rol + üye yetkileri (mali / görev / düzen). Kaynak: bulut ekip (sa_apiary_team) → önbellek; önizleme ?rol=bakici&mali=0 */
(function (global) {
  'use strict';
  var KEY = 'superari.yetki.v1';
  var MALI_SAYFA = ['satis.html', 'rapor-kar-zarar.html', 'rapor-bal.html', 'giderler.html', 'rapor-donem.html', 'rapor-export.html'];
  var VARS = { owner: { mali: true, gorev: true, duzen: true }, arici: { mali: true, gorev: true, duzen: true }, bakici: { mali: false, gorev: false, duzen: true } };
  var ROL_AD = { owner: 'Sahip', arici: 'Arıcı', bakici: 'Bakıcı' };
  function oku() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function yaz(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  try { var q = new URLSearchParams(location.search), r0 = q.get('rol'); if (r0 && VARS[r0]) { var o0 = { rol: r0, onizleme: true }; ['mali', 'gorev', 'duzen'].forEach(function (k) { if (q.has(k)) o0[k] = q.get(k) === '1'; }); yaz(o0); } } catch (e) {}
  function rol() { var r = oku().rol; return VARS[r] ? r : 'owner'; /* hesabı kuran Sahip */ }
  function izin(ad) { var o = oku(), r = rol(); if (r === 'owner') return true; return typeof o[ad] === 'boolean' ? o[ad] : VARS[r][ad]; }
  function sayfa() { return (location.pathname.split('/').pop() || 'ana.html').toLowerCase(); }
  var MASKE = /(\d[\d.,]*\s*₺|₺\s*\d[\d.,]*|\d[\d.,]*\s*TL\b)/g;
  function maskele(kok) {
    var w = document.createTreeWalker(kok || document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { MASKE.lastIndex = 0; if (MASKE.test(n.nodeValue)) { MASKE.lastIndex = 0; n.nodeValue = n.nodeValue.replace(MASKE, '•••'); } }
  }
  function gizle() {
    MALI_SAYFA.forEach(function (p) {
      [].forEach.call(document.querySelectorAll('a[href^="' + p + '"]'), function (a) { var k = a.closest('.report-card,.tile,li') || a; if (k.style.display !== 'none') { k.hidden = true; k.style.display = 'none'; } });
    });
    [].forEach.call(document.querySelectorAll('[data-mali]'), function (e) { if (e.style.display !== 'none') { e.hidden = true; e.style.display = 'none'; } });
    maskele();
  }
  var gozcu = null;
  function engel() {
    var m = document.querySelector('main') || document.body;
    m.innerHTML = '<div class="card" id="saYetkiYok" style="margin:24px 16px;padding:22px;text-align:center;"><div style="font-size:2rem">🔒</div><h2 style="margin:.4rem 0;">Bu bölümü görme yetkin yok</h2><p class="muted">Mali verileri görmek için arılık sahibinden izin iste.</p><a class="btn" href="ana.html">Ana sayfaya dön</a></div>';
  }
  function uygula() {
    if (izin('mali')) return;
    document.documentElement.classList.add('sa-mali-yok');
    if (MALI_SAYFA.indexOf(sayfa()) >= 0) { engel(); return; }
    gizle();
    if (!gozcu && global.MutationObserver) {
      var bek = 0; gozcu = new MutationObserver(function () { if (bek) return; bek = 1; requestAnimationFrame(function () { bek = 0; gozcu.disconnect(); gizle(); gozcu.observe(document.body, { childList: true, subtree: true, characterData: true }); }); });
      gozcu.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  function tazele() {
    var B = global.SuperAriBulut, D = global.SuperAriDemo; if (!B || !B.team || oku().onizleme) return Promise.resolve();
    var aps = []; try { aps = D.loadApiaries(); } catch (e) {}
    if (!aps[0]) return Promise.resolve();
    return B.client().then(function (c) { return c.auth.getUser(); }).then(function (u) {
      var us = u && u.data && u.data.user; if (!us) return;
      return B.team(aps[0].id).then(function (t) {
        var m = (t.members || []).filter(function (x) { return x.user_id === us.id; })[0]; if (!m) return;
        var r = m.role === 'owner' ? 'owner' : (m.role === 'bakici' || m.role === 'izleyici' ? 'bakici' : 'arici');
        var f = function (k) { return typeof m[k] === 'boolean' ? m[k] : VARS[r][k]; };
        var yeni = { rol: r, mali: f('mali'), gorev: f('gorev'), duzen: f('duzen') }, eski = JSON.stringify(oku());
        yaz(yeni); if (eski !== JSON.stringify(yeni)) { uygula(); try { document.dispatchEvent(new CustomEvent('superari-yetki')); } catch (e) {} }
      });
    }).catch(function () {});
  }
  global.SuperAriYetki = { rol: rol, rolAd: function () { return ROL_AD[rol()]; }, ROL_AD: ROL_AD, izin: izin, VARS: VARS, MALI_SAYFA: MALI_SAYFA, uygula: uygula, tazele: tazele, maskele: maskele };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { uygula(); setTimeout(tazele, 800); }); else { uygula(); setTimeout(tazele, 800); }
})(window);
