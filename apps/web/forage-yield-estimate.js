/** Yield motoru + sis/çiseleme arılık bayrağı. */
(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';

  function placeText(a) {
    if (!a) return '';
    return String(
      (a.name || '') +
        ' ' +
        (a.place || '') +
        ' ' +
        (a.il || '') +
        ' ' +
        (a.ilce || '') +
        ' ' +
        (a.koy || '')
    ).toLocaleLowerCase('tr');
  }

  function foggyFromSite(site) {
    site = site || {};
    var rh = site.meanRhPct != null ? Number(site.meanRhPct) : null;
    var pd = site.precipDays != null ? Number(site.precipDays) : null;
    var ps = site.precipSumMm != null ? Number(site.precipSumMm) : null;
    var place = String(site.place || site.name || site.label || '').toLocaleLowerCase('tr');
    if (/rize|çayeli|cayeli|yanık|yanik|cimil|ikizdere/.test(place)) return true;
    if (rh != null && rh >= 68 && pd != null && pd >= 50) return true;
    if (rh != null && rh >= 72 && ps != null && ps >= 700) return true;
    return false;
  }

  function climateForApiary(a) {
    var fog = foggyFromSite({
      place: placeText(a),
      name: a && a.name,
      meanRhPct: a && a.meanRhPct,
      precipDays: a && a.precipDays,
      precipSumMm: a && a.precipSumMm
    });
    if (a && a.climateFlags) {
      if (a.climateFlags.foggy === true) fog = true;
      if (a.climateFlags.foggy === false) fog = false;
    }
    return {
      foggy: !!fog,
      drizzle: !!fog,
      label: fog ? 'Sisli hava · çiseleme' : ''
    };
  }

  function persistFlags() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries || !D.updateApiary) return;
    var list = D.loadApiaries() || [];
    list.forEach(function (a) {
      if (!a || !a.id) return;
      var c = climateForApiary(a);
      if (!c.foggy) return;
      if (a.climateFlags && a.climateFlags.foggy && a.climateFlags.drizzle) return;
      try {
        D.updateApiary(a.id, {
          climateFlags: { foggy: true, drizzle: true },
          climateNote: 'Sisli hava · çiseleme'
        });
      } catch (e) {}
    });
  }

  function paintListBadges() {
    if (typeof document === 'undefined') return;
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return;
    var list = D.loadApiaries() || [];
    var cards = document.querySelectorAll('.apiary-card, .apiary-body');
    if (!cards.length) return;
    list.forEach(function (a) {
      var c = climateForApiary(a);
      if (!c.foggy) return;
      var name = a.name || a.place || '';
      cards.forEach(function (el) {
        var txt = (el.textContent || '');
        if (txt.indexOf(name) === -1) return;
        if (el.querySelector('[data-climate-flag]')) return;
        var host = el.querySelector('.apiary-body p') || el.querySelector('p') || el;
        var b = document.createElement('span');
        b.setAttribute('data-climate-flag', '1');
        b.style.cssText =
          'display:inline-block;margin-top:4px;margin-right:4px;padding:2px 7px;border-radius:999px;background:#e8eef6;color:#2c3d55;font-size:10px;font-weight:800;';
        b.textContent = 'Sisli · çise';
        host.appendChild(b);
      });
    });
  }

  function patch() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__fogPatch) {
      persistFlags();
      paintListBadges();
      return;
    }
    var rawClass = Y.classifySite;
    var rawBreed = Y.breedFactor;
    var rawMismatch = Y.findMismatchedHives;
    var rawBuild = Y.buildFromAnalysis;
    var rawRender = Y.renderBlocksHtml;

    Y.classifySite = function (site) {
      var c = rawClass ? rawClass(site) : {};
      c.foggyRainy = foggyFromSite(site) || !!(c && c.humidCoast);
      c.drizzle = c.foggyRainy;
      return c;
    };

    Y.breedFactor = function (hive, siteClass) {
      var r = rawBreed ? rawBreed(hive, siteClass) : { factor: 1, known: false, key: '' };
      siteClass = siteClass || {};
      if (!r.key) return r;
      if (siteClass.foggyRainy || siteClass.drizzle) {
        if (r.key === 'karniyol') r.factor = 0.88;
        if (r.key === 'kafkas' || r.key === 'kafkas_karadeniz' || r.key === 'karadeniz') r.factor = 1.12;
      }
      return r;
    };

    if (rawMismatch) {
      Y.findMismatchedHives = function (opts) {
        opts = opts || {};
        var site = opts.site || {};
        var fog = foggyFromSite(site) || (opts.siteClass && opts.siteClass.foggyRainy);
        var pack = rawMismatch(opts) || { items: [] };
        var local = opts.hives || [];
        if (fog) {
          local.forEach(function (h) {
            var key = Y.breedFactor(h, { foggyRainy: true }).key;
            if (key !== 'karniyol') return;
            var already = (pack.items || []).some(function (it) {
              return String(it.hiveId) === String(h.id);
            });
            var reason =
              'Sisli hava · çiseleme: Karniyol uçamaz, stoğu yer · Kafkas ile Palandöken/Tortum takası';
            if (already) {
              pack.items.forEach(function (it) {
                if (String(it.hiveId) === String(h.id)) {
                  it.reasonTr = reason;
                  it.reasons = [reason];
                }
              });
              return;
            }
            pack.items.push({
              hiveId: h.id,
              hiveName: h.name || ('Kovan ' + h.id),
              reasons: [reason],
              reasonTr: reason,
              swap: null
            });
          });
          pack.tipTr =
            'Sis + çiseleme kayıtlı. Karniyol birinci ırk değil; Kafkas önerilir.';
        }
        return pack;
      };
    }

    if (rawBuild) {
      Y.buildFromAnalysis = function (analysis, ctx) {
        ctx = ctx || {};
        if (ctx.apiary) {
          ctx.site = ctx.site || {};
          ctx.site.place = ctx.site.place || ctx.apiary.place || ctx.apiary.name;
          ctx.site.name = ctx.site.name || ctx.apiary.name;
          var flags = climateForApiary(ctx.apiary);
          if (flags.foggy) {
            ctx.site.foggy = true;
            ctx.site.drizzle = true;
          }
        }
        return rawBuild(analysis, ctx);
      };
    }

    if (rawRender) {
      Y.renderBlocksHtml = function (estimate, mismatches, escapeHtml, tip) {
        var html = rawRender(estimate, mismatches, escapeHtml, tip);
        var fog =
          estimate &&
          estimate.siteClass &&
          (estimate.siteClass.foggyRainy || estimate.siteClass.drizzle);
        if (!fog) return html;
        var note =
          '<p class="fy-notes">İklim: sisli hava · çiseleme — Karniyol uçuş kaybı, stok tüketimi. Kafkas önerilir.</p>';
        if (html.indexOf('fy-notes') >= 0) {
          return html.replace('<p class="fy-notes">', note + '<p class="fy-notes">');
        }
        return note + html;
      };
    }

    Y.climateForApiary = climateForApiary;
    Y.__fogPatch = true;
    persistFlags();
    paintListBadges();
    if (typeof document !== 'undefined') {
      setTimeout(paintListBadges, 600);
      setTimeout(paintListBadges, 1600);
    }
  }

  if (global.SuperAriForageYield && global.SuperAriForageYield.breedFactor) {
    patch();
    return;
  }
  var s = document.createElement('script');
  s.src = SRC;
  s.onload = patch;
  (document.head || document.documentElement).appendChild(s);
})(window);
