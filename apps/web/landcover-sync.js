/**
 * SüperArı — tüm arılıklar için canlı bitki örtüsü / yer analizi senkronu.
 * Yeni arılık kaydında otomatik çeker; yüzde çubuğu gösterir.
 */
(function (global) {
  var BAR_ID = 'landcoverSyncBar';

  function apiaries() {
    var D = global.D || global.SuperAriDemo;
    if (!D) return [];
    try {
      if (typeof D.loadApiaries === 'function') return D.loadApiaries() || [];
      if (D.apiaries) return D.apiaries || [];
      return [];
    } catch (e) {
      return [];
    }
  }

  function ensureBar() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById(BAR_ID);
    if (el) return el;
    var host =
      document.getElementById('forageHost') ||
      document.getElementById('apiaryList') ||
      document.querySelector('.screen');
    if (!host) return null;
    el = document.createElement('div');
    el.id = BAR_ID;
    el.className = 'forage-progress';
    el.hidden = true;
    el.innerHTML =
      '<div class="forage-progress-label"><span data-lc-msg>Örtü güncelleniyor</span><span data-lc-pct>0%</span></div>' +
      '<div class="forage-progress-track"><div class="forage-progress-bar" data-lc-bar></div></div>';
    host.parentNode.insertBefore(el, host);
    return el;
  }

  function setBar(visible, pct, msg) {
    var el = ensureBar();
    if (!el) return;
    el.hidden = !visible;
    var p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    var bar = el.querySelector('[data-lc-bar]');
    var lab = el.querySelector('[data-lc-pct]');
    var m = el.querySelector('[data-lc-msg]');
    if (bar) bar.style.width = p + '%';
    if (lab) lab.textContent = p + '%';
    if (m && msg) m.textContent = msg;
  }

  function saveCache(apiary, lat, lon, analysis) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.updateApiary || !D.makeLiveCache || !apiary || !analysis) return;
    try {
      D.updateApiary(apiary.id, {
        forageCache: D.makeLiveCache(lat, lon, analysis)
      });
    } catch (e) {}
  }

  function refreshOne(apiary, onStep) {
    var F = global.SuperAriForage;
    if (!F || !F.analyze || !apiary) return Promise.resolve(null);
    var lat = Number(apiary.lat);
    var lon = Number(apiary.lon);
    if (!isFinite(lat) || !isFinite(lon)) return Promise.resolve(null);
    var radius = F.clampRadius
      ? F.clampRadius(apiary.forageRadiusKm || apiary.forageKm || 3)
      : 3;
    return F.analyze(lat, lon, radius, {
      onProgress: function (ev) {
        if (onStep) onStep(ev);
      }
    }).then(function (analysis) {
      if (analysis) saveCache(apiary, lat, lon, analysis);
      return analysis;
    });
  }

  function refreshAll(opts) {
    opts = opts || {};
    var list = apiaries().filter(function (a) {
      return a && isFinite(Number(a.lat)) && isFinite(Number(a.lon));
    });
    if (!list.length) {
      setBar(false, 0, '');
      return Promise.resolve({ total: 0, ok: 0 });
    }
    setBar(true, 2, 'Tüm arılıklar için örtü çekiliyor…');
    var i = 0;
    var ok = 0;
    function next() {
      if (i >= list.length) {
        setBar(true, 100, 'Örtü güncellemesi tamam (' + ok + '/' + list.length + ')');
        setTimeout(function () {
          setBar(false, 100, '');
        }, 1800);
        return { total: list.length, ok: ok };
      }
      var a = list[i];
      var base = Math.round((i / list.length) * 100);
      setBar(
        true,
        base,
        (a.etiket || a.name || 'Arılık') + ' örtüsü (' + (i + 1) + '/' + list.length + ')'
      );
      return refreshOne(a, function (ev) {
        var slice = Math.round(((ev && ev.pct) || 0) / list.length);
        setBar(
          true,
          Math.min(99, base + slice),
          ev && ev.message
            ? (a.etiket || a.name || 'Arılık') + ' · ' + ev.message
            : null
        );
      })
        .then(function (res) {
          if (res) ok += 1;
        })
        .catch(function () {})
        .then(function () {
          i += 1;
          return next();
        });
    }
    return Promise.resolve().then(next);
  }

  function refreshNew(apiary) {
    if (!apiary) return Promise.resolve(null);
    setBar(true, 8, (apiary.etiket || apiary.name || 'Yeni arılık') + ' örtüsü çekiliyor…');
    return refreshOne(apiary, function (ev) {
      setBar(true, ev && ev.pct != null ? ev.pct : 30, ev && ev.message);
    }).then(function (res) {
      setBar(true, 100, 'Yeni arılık örtüsü alındı');
      setTimeout(function () {
        setBar(false, 100, '');
      }, 1400);
      return res;
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureBar();
      var page = (location.pathname || '').split('/').pop();
      if (page === 'ariliklar.html' || page === 'arilik.html') {
        setTimeout(function () {
          refreshAll();
        }, 600);
      }
    });
    document.addEventListener('superari:apiary-saved', function (ev) {
      var a = ev && ev.detail;
      refreshNew(a);
    });
  }

  global.SuperAriLandcoverSync = {
    refreshAll: refreshAll,
    refreshOne: refreshOne,
    refreshNew: refreshNew,
    setBar: setBar
  };
})(window);
