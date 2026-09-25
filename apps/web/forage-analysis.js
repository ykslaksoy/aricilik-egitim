/** Loader: asıl forage-analysis + sezon yaması + foraj/yer ayrımı. */
(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-analysis.js';

  var FORAGE_KEYS = {
    'Foraj yarıçapı': 1,
    'Bitki örtüsü': 1,
    'Örtü özeti': 1,
    'Uygunluk skoru': 1
  };

  function fmtTrDate(iso) {
    if (!iso) return '';
    var s = String(iso).slice(0, 10);
    var p = s.split('-');
    if (p.length !== 3) return s;
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  function escFn(escapeHtml) {
    return (
      escapeHtml ||
      function (s) {
        return String(s)
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"');
      }
    );
  }

  function rowHtml(ins, escapeHtml) {
    if (!ins || !ins.k) return '';
    return (
      '<div class="forage-row">' +
        '<div class="forage-k">' +
          escapeHtml(ins.k) +
          (ins.note ? ' <span class="forage-tag">' + escapeHtml(ins.note) + '</span>' : '') +
        '</div>' +
        '<div class="forage-v">' +
          escapeHtml(ins.v == null ? '' : String(ins.v)) +
        '</div>' +
      '</div>'
    );
  }

  function splitRender(analysis, escapeHtml) {
    escapeHtml = escFn(escapeHtml);
    if (!analysis) {
      return (
        '<div class="forage-panel is-empty">' +
          '<p>Pin koyunca foraj çemberi ve yer analizi burada görünür.</p>' +
        '</div>'
      );
    }
    var forageRows = '';
    var placeRows = '';
    (analysis.insights || []).forEach(function (ins) {
      if (!ins || !ins.k) return;
      if (FORAGE_KEYS[ins.k]) forageRows += rowHtml(ins, escapeHtml);
      else placeRows += rowHtml(ins, escapeHtml);
    });
    var tone = analysis.grade && analysis.grade.tone ? analysis.grade.tone : 'mid';
    var grade = analysis.grade && analysis.grade.tr ? analysis.grade.tr : '';
    var forage =
      '<div class="forage-panel" id="forageOnlyPanel" data-score="' +
      analysis.score +
      '">' +
        '<div class="forage-head">' +
          '<strong>Foraj</strong>' +
          '<span class="forage-score tone-' +
          escapeHtml(tone) +
          '">' +
          analysis.score +
          ' · ' +
          escapeHtml(grade) +
          '</span>' +
        '</div>' +
        '<p class="forage-sub">Arılar ~' +
        analysis.radiusKm +
        ' km yarıçapta geziyor (foraj çemberi).' +
        (analysis.demo ? ' <span class="forage-tag">iklim yok · rakım/eğim</span>' : '') +
        '</p>' +
        '<div class="forage-grid">' +
        forageRows +
        '</div>' +
      '</div>';

    var extra = '';
    if (analysis.water) {
      var w = analysis.water;
      extra +=
        '<div class="forage-water">' +
          '<div class="forage-water-head">Su / nem (ölçüm)</div>' +
          '<p class="forage-water-sum">' +
          escapeHtml(w.summary || w.droughtLabel || '') +
          '</p>' +
          (w.meanRhPct != null
            ? '<div class="forage-row"><div class="forage-k">Bağıl nem <span class="forage-tag">Open-Meteo</span></div><div class="forage-v">' +
              escapeHtml(String(w.meanRhPct) + ' %') +
              '</div></div>'
            : '') +
        '</div>';
    }
    if (analysis.flight) {
      var f = analysis.flight;
      extra +=
        '<div class="forage-flight">' +
          '<div class="forage-flight-head">Uçuş / yağış</div>' +
          '<p class="forage-flight-sum">' +
          escapeHtml(f.summary || '') +
          '</p>' +
        '</div>';
    }

    var tip = '';
    if (analysis.tip && analysis.tip.text) {
      var hasTarget =
        analysis.tip.targetLat != null &&
        analysis.tip.targetLon != null &&
        isFinite(Number(analysis.tip.targetLat)) &&
        isFinite(Number(analysis.tip.targetLon));
      if (hasTarget) {
        tip =
          '<button type="button" class="forage-tip is-action" data-lat="' +
          Number(analysis.tip.targetLat) +
          '" data-lon="' +
          Number(analysis.tip.targetLon) +
          '">' +
          '<span class="forage-tip-text">' +
          escapeHtml(analysis.tip.text) +
          '</span>' +
          '<span class="forage-tip-cta">Haritada göster ›</span>' +
          '</button>';
      } else {
        tip =
          '<div class="forage-tip"><span class="forage-tip-text">' +
          escapeHtml(analysis.tip.text) +
          '</span></div>';
      }
    }

    var place =
      '<div class="forage-panel" id="placeOnlyPanel">' +
        '<div class="forage-head"><strong>Yer analizi</strong></div>' +
        '<p class="forage-sub">Rakım, iklim ve uçuş — bu konum.</p>' +
        '<div class="forage-grid">' +
        placeRows +
        '</div>' +
        extra +
        tip +
      '</div>';

    return forage + place;
  }

  function patch() {
    var F = global.SuperAriForage;
    if (!F) return;
    var rawAnalyze = F.analyzeSeason;
    var rawSeasonRender = F.renderSeasonPanelHtml;
    F.renderPanelHtml = function (analysis, escapeHtml) {
      return splitRender(analysis, escapeHtml);
    };
    if (typeof rawAnalyze === 'function') {
      F.analyzeSeason = function (lat, lon) {
        return rawAnalyze(lat, lon).then(function (season) {
          if (!season) return season;
          if (!season.periodStart || !season.periodEnd) {
            var start = new Date();
            var end = new Date();
            end.setDate(end.getDate() + 13);
            function iso(d) {
              return (
                d.getFullYear() +
                '-' +
                String(d.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(d.getDate()).padStart(2, '0')
              );
            }
            season.periodStart = season.periodStart || iso(start);
            season.periodEnd = season.periodEnd || iso(end);
          }
          season.fetchedAt = season.fetchedAt || new Date().toISOString();
          return season;
        });
      };
    }
    if (typeof rawSeasonRender === 'function') {
      F.renderSeasonPanelHtml = function (season, escapeHtml) {
        var html = rawSeasonRender(season, escapeHtml);
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

  if (global.SuperAriForage && global.SuperAriForage.analyze) {
    patch();
    return;
  }
  var s = document.createElement('script');
  s.src = SRC;
  s.onload = patch;
  (document.head || document.documentElement).appendChild(s);
})(window);
