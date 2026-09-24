/** Yield motoru + sis/çiseleme hem bayrak hem hedef-bal kriteri. */
(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var FOG_YIELD_FACTOR = 0.9;

  function placeText(a) {
    if (!a) return '';
    return String((a.name || '') + ' ' + (a.place || '') + ' ' + (a.il || '') + ' ' + (a.ilce || '') + ' ' + (a.koy || '')).toLocaleLowerCase('tr');
  }
  function foggyFromSite(site) {
    site = site || {};
    var rh = site.meanRhPct != null ? Number(site.meanRhPct) : null;
    var pd = site.precipDays != null ? Number(site.precipDays) : null;
    var ps = site.precipSumMm != null ? Number(site.precipSumMm) : null;
    var place = String(site.place || site.name || site.label || '').toLocaleLowerCase('tr');
    if (/rize|çayeli|cayeli|yanık|yanik|cimil|ikizdere/.test(place)) return true;
    if (site.foggy || site.drizzle || (site.climateFlags && site.climateFlags.foggy)) return true;
    if (rh != null && rh >= 68 && pd != null && pd >= 50) return true;
    if (rh != null && rh >= 72 && ps != null && ps >= 700) return true;
    return false;
  }
  function climateForApiary(a) {
    var fog = foggyFromSite({ place: placeText(a), name: a && a.name });
    if (a && a.climateFlags && a.climateFlags.foggy === true) fog = true;
    return { foggy: !!fog, drizzle: !!fog, label: fog ? 'Sisli hava · çiseleme' : '' };
  }
  function applyFogToEstimate(est, fog) {
    if (!est || !fog) return est;
    function scale(n) {
      if (n == null || !isFinite(Number(n))) return n;
      return Math.round(Number(n) * FOG_YIELD_FACTOR * 10) / 10;
    }
    ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg', 'totalLowKg', 'totalHighKg'].forEach(function (k) {
      if (est[k] != null) est[k] = scale(est[k]);
    });
    if (est.perHive) {
      ['mid', 'low', 'high', 'kg'].forEach(function (k) {
        if (est.perHive[k] != null) est.perHive[k] = scale(est.perHive[k]);
      });
    }
    est.fogDrizzleFactor = FOG_YIELD_FACTOR;
    est.why = est.why || [];
    var row = {
      k: 'Sis · çiseleme',
      v: 'çarpan ' + FOG_YIELD_FACTOR + ' · uçuş günü kaybı + stok tüketimi'
    };
    var has = est.why.some(function (r) { return r && r.k && String(r.k).indexOf('Sis') === 0; });
    if (!has) est.why.push(row);
    return est;
  }

  function persistFlags() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries || !D.updateApiary) return;
    (D.loadApiaries() || []).forEach(function (a) {
      if (!a || !a.id) return;
      var c = climateForApiary(a);
      if (!c.foggy) return;
      if (a.climateFlags && a.climateFlags.foggy && a.climateFlags.drizzle) return;
      try {
        D.updateApiary(a.id, { climateFlags: { foggy: true, drizzle: true }, climateNote: 'Sisli hava · çiseleme' });
      } catch (e) {}
    });
  }
  function paintListBadges() {
    if (typeof document === 'undefined') return;
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return;
    var list = D.loadApiaries() || [];
    var cards = document.querySelectorAll('.apiary-card, .apiary-body');
    list.forEach(function (a) {
      if (!climateForApiary(a).foggy) return;
      var name = a.name || a.place || '';
      cards.forEach(function (el) {
        if ((el.textContent || '').indexOf(name) === -1) return;
        if (el.querySelector('[data-climate-flag]')) return;
        var host = el.querySelector('.apiary-body p') || el.querySelector('p') || el;
        var b = document.createElement('span');
        b.setAttribute('data-climate-flag', '1');
        b.style.cssText = 'display:inline-block;margin-top:4px;padding:2px 7px;border-radius:999px;background:#e8eef6;color:#2c3d55;font-size:10px;font-weight:800;';
        b.textContent = 'Sisli · çise';
        host.appendChild(b);
      });
    });
  }

  function patch() {
    var Y = global.SuperAriForageYield;
    if (!Y) return;
    if (!Y.__fogPatch) {
      var rawClass = Y.classifySite;
      var rawBreed = Y.breedFactor;
      var rawMismatch = Y.findMismatchedHives;
      var rawBuild = Y.buildFromAnalysis;
      var rawRender = Y.renderBlocksHtml;
      var rawEst = Y.estimateYield;

      Y.classifySite = function (site) {
        var c = rawClass ? rawClass(site) : {};
        c.foggyRainy = foggyFromSite(site) || !!(c && c.humidCoast);
        c.drizzle = c.foggyRainy;
        return c;
      };
      Y.breedFactor = function (hive, siteClass) {
        var r = rawBreed ? rawBreed(hive, siteClass) : { factor: 1, known: false, key: '' };
        if (!r.key) return r;
        if (siteClass && (siteClass.foggyRainy || siteClass.drizzle)) {
          if (r.key === 'karniyol') r.factor = 0.88;
          if (r.key === 'kafkas' || r.key === 'karadeniz' || r.key === 'kafkas_karadeniz') r.factor = 1.12;
        }
        return r;
      };
      if (rawEst) {
        Y.estimateYield = function (opts) {
          opts = opts || {};
          var fog = foggyFromSite(opts.site) || (opts.apiary && climateForApiary(opts.apiary).foggy);
          var est = rawEst(opts);
          return applyFogToEstimate(est, fog);
        };
      }
      if (rawBuild) {
        Y.buildFromAnalysis = function (analysis, ctx) {
          ctx = ctx || {};
          if (ctx.apiary) {
            ctx.site = ctx.site || {};
            ctx.site.place = ctx.site.place || ctx.apiary.place || ctx.apiary.name;
            ctx.site.name = ctx.apiary.name;
            var flags = climateForApiary(ctx.apiary);
            if (flags.foggy) { ctx.site.foggy = true; ctx.site.drizzle = true; }
          }
          var out = rawBuild(analysis, ctx);
          var fog = ctx.site && foggyFromSite(ctx.site);
          if (out && out.estimate) applyFogToEstimate(out.estimate, fog);
          else applyFogToEstimate(out, fog);
          return out;
        };
      }
      if (rawMismatch) {
        Y.findMismatchedHives = function (opts) {
          var pack = rawMismatch(opts || {}) || { items: [] };
          var fog = foggyFromSite((opts || {}).site);
          if (!fog) return pack;
          pack.tipTr = 'Sis + çiseleme hedef çarpanı ' + FOG_YIELD_FACTOR + '. Karniyol uçamaz, stoğu yer.';
          return pack;
        };
      }
      if (rawRender) {
        Y.renderBlocksHtml = function (estimate, mismatches, escapeHtml, tip) {
          var html = rawRender(estimate, mismatches, escapeHtml, tip);
          if (!(estimate && estimate.fogDrizzleFactor)) return html;
          var note =
            '<p class="fy-notes">Sis · çiseleme kriteri: çarpan ' +
            estimate.fogDrizzleFactor +
            ' (uçuş günü kaybı + stok tüketimi).</p>';
          return note + html;
        };
      }
      Y.climateForApiary = climateForApiary;
      Y.__fogPatch = true;
    }
    persistFlags();
    paintListBadges();
    if (typeof document !== 'undefined') {
      setTimeout(paintListBadges, 700);
    }
  }

  if (global.SuperAriForageYield && global.SuperAriForageYield.estimateYield) {
    patch();
    return;
  }
  var s = document.createElement('script');
  s.src = SRC;
  s.onload = patch;
  (document.head || document.documentElement).appendChild(s);
})(window);
