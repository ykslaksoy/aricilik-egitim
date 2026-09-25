/** Loader: foraj / yer / uçuş / bal hedefi ayrı kart. */
(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-analysis.js';
  var BASE_KG = 13.8;

  var FORAGE_KEYS = {
    'Foraj yarıçapı': 1,
    'Bitki örtüsü': 1,
    'Örtü özeti': 1,
    'Uygunluk skoru': 1
  };
  var FLIGHT_KEYS = {
    'Uçuş penceresi': 1
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

  function card(id, title, sub, body, badge) {
    return (
      '<div class="forage-panel sa-split-card" id="' +
      id +
      '">' +
        '<div class="forage-head">' +
          '<strong>' +
          title +
          '</strong>' +
          (badge || '') +
        '</div>' +
        (sub ? '<p class="forage-sub">' + sub + '</p>' : '') +
        body +
      '</div>'
    );
  }

  function activeApiary() {
    var D = global.D || global.SuperAriDemo;
    var fallback = { name: 'Yanıkdağ', hiveCount: 20, lat: 41.0808, lon: 40.754, id: 'a4', breed: 'Kafkas' };
    if (!D || !D.loadApiaries) return fallback;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) if (id && String(list[i].id) === String(id)) return list[i];
    return list[0] || fallback;
  }

  function placeBreed(a) {
    if (a && a.breed) {
      var b = String(a.breed);
      if (/muğla|mugla/i.test(b)) return 'Muğla Arısı';
      if (/karadeniz/i.test(b)) return 'Kafkas × Karadeniz';
      if (/kafkas/i.test(b) && /karn/i.test(b)) return 'Kafkas × Karniyol';
      if (/kafkas/i.test(b)) return 'Kafkas';
      if (/karniyol|carn/i.test(b)) return 'Karniyol';
    }
    var s = String((a && (a.name || '')) + ' ' + (a && (a.place || ''))).toLocaleLowerCase('tr');
    if (/kayaköy|fethiye|muğla/.test(s)) return 'Muğla Arısı';
    if (/tortum/.test(s)) return 'Karniyol';
    if (/paland/.test(s)) return 'Kafkas × Karniyol';
    if (/yanık|yanik/.test(s)) return 'Kafkas';
    if (/cimil/.test(s)) return 'Kafkas × Karadeniz';
    return 'Kafkas';
  }

  function foggyPlace(a) {
    return /yanık|yanik|cimil|rize/.test(
      String((a && (a.name || '')) + (a && a.place || '')).toLocaleLowerCase('tr')
    );
  }

  function liveProduct(a) {
    var key = placeBreed(a);
    var share = foggyPlace(a) ? 45 / 153 : 0;
    var breedF = 1, flyF = 1, eatF = 1;
    if (/Karadeniz/.test(key)) { breedF = 1.22; flyF = 1 - share * 0.18; }
    else if (/Kafkas × Karniyol/.test(key)) { breedF = 1.2; flyF = 1 - share * 0.3; }
    else if (/Kafkas/.test(key)) { breedF = foggyPlace(a) ? 1.08 : 0.97; flyF = 1 - share * 0.25; }
    else if (/Muğla/.test(key)) { breedF = foggyPlace(a) ? 0.95 : 1.05; flyF = 1 - share; }
    else if (/Karniyol/.test(key)) {
      breedF = foggyPlace(a) ? 1 : 1.08;
      flyF = 1 - share;
      eatF = Math.max(0.82, 1 - 0.0018 * (foggyPlace(a) ? 45 : 0));
    }
    return Math.round(breedF * flyF * eatF * 1.06 * 1000) / 1000;
  }

  function yieldCard(escapeHtml) {
    var a = activeApiary();
    var n = (a && a.hiveCount) || 20;
    var mid = Math.round(BASE_KG * liveProduct(a) * 10) / 10;
    var total = Math.round(mid * n);
    var breed = placeBreed(a);
    var body =
      '<div class="forage-grid">' +
        rowHtml({ k: 'Kovan başı', v: mid + ' kg', note: 'hedef' }, escapeHtml) +
        rowHtml({ k: 'Arılık toplam', v: total + ' kg · ' + n + ' kovan', note: 'hedef' }, escapeHtml) +
        rowHtml({ k: 'İrk', v: breed, note: 'koloni' }, escapeHtml) +
      '</div>';
    return card('saYieldCard', 'Bal hedefi', 'Foraj + yer + ırk + kovan sayısından türetilir.', body, '');
  }

  function splitRender(analysis, escapeHtml) {
    escapeHtml = escFn(escapeHtml);
    if (!analysis) {
      return (
        '<div class="forage-panel is-empty">' +
          '<p>Pin koyunca foraj ve yer kartları burada görünür.</p>' +
        '</div>'
      );
    }
    var forageRows = '';
    var placeRows = '';
    var flightRows = '';
    (analysis.insights || []).forEach(function (ins) {
      if (!ins || !ins.k) return;
      if (FORAGE_KEYS[ins.k]) forageRows += rowHtml(ins, escapeHtml);
      else if (FLIGHT_KEYS[ins.k]) flightRows += rowHtml(ins, escapeHtml);
      else placeRows += rowHtml(ins, escapeHtml);
    });

    var tone = analysis.grade && analysis.grade.tone ? analysis.grade.tone : 'mid';
    var grade = analysis.grade && analysis.grade.tr ? analysis.grade.tr : '';
    var badge =
      '<span class="forage-score tone-' +
      escapeHtml(tone) +
      '">' +
      analysis.score +
      ' · ' +
      escapeHtml(grade) +
      '</span>';

    var forage = card(
      'forageOnlyPanel',
      'Foraj',
      'Arılar ~' + analysis.radiusKm + ' km yarıçapta geziyor.',
      '<div class="forage-grid">' + forageRows + '</div>',
      badge
    );

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

    var place = card(
      'placeOnlyPanel',
      'Yer analizi',
      'Rakım, sıcaklık, nem ve yağış — bu konum.',
      '<div class="forage-grid">' + placeRows + '</div>' + tip,
      ''
    );

    var flightBody = '<div class="forage-grid">' + flightRows + '</div>';
    if (analysis.flight) {
      var f = analysis.flight;
      flightBody +=
        '<p class="forage-sub">' + escapeHtml(f.summary || '') + '</p>';
      if (f.precipDays != null) {
        flightBody += rowHtml({ k: 'Yağışlı gün', v: f.precipDays + ' gün', note: 'sezon' }, escapeHtml);
      }
      if (f.flightOkDays != null) {
        flightBody += rowHtml(
          {
            k: 'Uçuşa uygun',
            v:
              '≈ ' +
              f.flightOkDays +
              ' gün' +
              (f.poorFlightDays != null ? ' · elverişsiz ' + f.poorFlightDays : ''),
            note: 'özet'
          },
          escapeHtml
        );
      }
    }
    var flight = card(
      'flightOnlyPanel',
      'Uçuş / yağış',
      'Kaç gün uçulur — skora dahil değil.',
      flightBody,
      ''
    );

    return forage + place + flight + yieldCard(escapeHtml);
  }

  function ensureSplitCss() {
    if (document.getElementById('saSplitCardCss')) return;
    var s = document.createElement('style');
    s.id = 'saSplitCardCss';
    s.textContent =
      '.sa-split-card{margin:10px 0 0;}' +
      '#saYieldCard{border-color:#e6d7a8;background:#fffaf0;}' +
      '#flightOnlyPanel{border-color:#d7e3f0;background:#f7fafc;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function patch() {
    var F = global.SuperAriForage;
    if (!F) return;
    ensureSplitCss();
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
