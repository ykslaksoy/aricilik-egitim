/* koloni-188: Arılık konumu yalnız açık «Konumu düzenle» modunda değişir; kayıttan önce onay. */
(function (global) {
  'use strict';
  function fmt(p) {
    if (!p || !isFinite(Number(p.lat)) || !isFinite(Number(p.lon))) return 'yok';
    return Number(p.lat).toFixed(6) + ', ' + Number(p.lon).toFixed(6);
  }
  function samePoint(a, b) {
    if (!a || !b) return false;
    return Math.abs(Number(a.lat) - Number(b.lat)) < 1e-7 && Math.abs(Number(a.lon) - Number(b.lon)) < 1e-7;
  }
  function message(oldP, newP) {
    return 'Konum değişsin mi?\n\nEski: ' + fmt(oldP) + '\nYeni: ' + fmt(newP);
  }
  /** true → kaydet; false → iptal (çağıran eski konuma döner). */
  function confirmChange(oldP, newP, confirmFn) {
    var fn = confirmFn || (global.confirm ? global.confirm.bind(global) : null);
    if (!fn) return false;
    return !!fn(message(oldP, newP));
  }
  /** Harita dokunuşu pini taşır mı? Yalnız düzenleme modunda (veya konumsuz yeni arılıkta). */
  function tapMovesPin(state) {
    state = state || {};
    return !!state.editMode;
  }
  var api = { fmt: fmt, samePoint: samePoint, message: message, confirmChange: confirmChange, tapMovesPin: tapMovesPin };
  global.SuperAriKonumOnay = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
