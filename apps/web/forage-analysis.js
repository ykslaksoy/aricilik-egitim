/** Loader: asıl forage-analysis önceki sağlam commit + sezon tarih yaması. */
(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-analysis.js';

  function fmtTrDate(iso) {
    if (!iso) return '';
    var s = String(iso).slice(0, 10);
    var p = s.split('-');
    if (p.length !== 3) return s;
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  function patch() {
    var F = global.SuperAriForage;
    if (!F) return;
    var rawAnalyze = F.analyzeSeason;
    var rawRender = F.renderSeasonPanelHtml;
    if (typeof rawAnalyze === 'function') {
      F.analyzeSeason = function (lat, lon) {
        return rawAnalyze(lat, lon).then(function (season) {
          if (!season) return season;
          if (!season.periodStart || !season.periodEnd) {
            var start = new Date();
            var end = new Date();
            end.setDate(end.getDate() + 13);
            function iso(d) {
              return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            }
            season.periodStart = season.periodStart || iso(start);
            season.periodEnd = season.periodEnd || iso(end);
          }
          season.fetchedAt = season.fetchedAt || new Date().toISOString();
          return season;
        });
      };
    }
    if (typeof rawRender === 'function') {
      F.renderSeasonPanelHtml = function (season, escapeHtml) {
        var html = rawRender(season, escapeHtml);
        if (!season) return html;
        var range =
          season.periodStart && season.periodEnd
            ? fmtTrDate(season.periodStart) + ' – ' + fmtTrDate(season.periodEnd)
            : '';
        var rec = season.fetchedAt ? 'kayıt ' + fmtTrDate(season.fetchedAt) : '';
        var line = [range, rec].filter(Boolean).join(' · ');
        if (!line) return html;
        var block =
          '<p class="season-sub">' +
          (escapeHtml ? escapeHtml(line) : line) +
          '</p>';
        if (html.indexOf('class="season-sub"') >= 0) {
          return html.replace(/<p class="season-sub">[\s\S]*?<\/p>/, block);
        }
        return html.replace('</div>', block + '</div>');
      };
    }
  }

  if (global.SuperAriForage && global.SuperAriForage.analyzeSeason) {
    patch();
    return;
  }
  var s = document.createElement('script');
  s.src = SRC;
  s.onload = patch;
  (document.head || document.documentElement).appendChild(s);
})(window);
