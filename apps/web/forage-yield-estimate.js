/** Yükler sağlam yield motorunu; sisli Karadeniz için Karniyol/Kafkas kuralını yamar. */
(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';

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

  function patch() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__fogPatch) return;
    var rawClass = Y.classifySite;
    var rawBreed = Y.breedFactor;
    var rawMismatch = Y.findMismatchedHives;
    var rawBuild = Y.buildFromAnalysis;

    Y.classifySite = function (site) {
      var c = rawClass ? rawClass(site) : {};
      c.foggyRainy = foggyFromSite(site) || !!(c && c.humidCoast);
      return c;
    };

    Y.breedFactor = function (hive, siteClass) {
      var r = rawBreed ? rawBreed(hive, siteClass) : { factor: 1, known: false, key: '' };
      siteClass = siteClass || {};
      if (!r.key) return r;
      if (siteClass.foggyRainy) {
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
        var Yb = Y;
        if (fog) {
          local.forEach(function (h) {
            var key = Yb.breedFactor(h, { foggyRainy: true }).key;
            if (key !== 'karniyol') return;
            var already = (pack.items || []).some(function (it) { return String(it.hiveId) === String(h.id); });
            if (already) {
              pack.items.forEach(function (it) {
                if (String(it.hiveId) === String(h.id)) {
                  it.reasonTr = 'Karniyol sis/yağışta uçamaz · hedefi kaçırır ve kovan balını yer · Kafkas ile takas';
                  it.reasons = [it.reasonTr];
                }
              });
              return;
            }
            pack.items.push({
              hiveId: h.id,
              hiveName: h.name || ('Kovan ' + h.id),
              reasons: ['Karniyol sis/yağışta uçamaz · stok yer'],
              reasonTr: 'Karniyol sis/yağışta uçamaz · hedefi kaçırır ve kovan balını yer · Palandöken/Tortum Karniyol, buraya Kafkas',
              swap: null
            });
          });
          pack.tipTr =
            'Sisli/yağışlı yerde Karniyol birinci ırk değil. Kafkas ile Palandöken veya Tortum arası takas önerilir.';
        }
        return pack;
      };
    }

    if (rawBuild) {
      Y.buildFromAnalysis = function (analysis, ctx) {
        ctx = ctx || {};
        if (ctx.apiary && !ctx.site) {
          ctx.site = {
            place: ctx.apiary.place || ctx.apiary.name,
            name: ctx.apiary.name
          };
        }
        var out = rawBuild(analysis, ctx);
        return out;
      };
    }
    Y.__fogPatch = true;
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
