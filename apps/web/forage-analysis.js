/** Loader: ucus/bal/kislama cubuk + ok detay. */
(function (global) {
  var SRC = 'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-analysis.js';
  var BASE_KG = 13.8;
  var FORAGE_KEYS = {'Foraj yaricap':1,'Foraj yarıçapı':1,'Bitki örtüsü':1,'Örtü özeti':1,'Uygunluk skoru':1};
  var FLIGHT_KEYS = {'Uçuş penceresi':1};

  function fmtTrDate(iso) {
    if (!iso) return '';
    var s = String(iso).slice(0, 10).split('-');
    if (s.length !== 3) return String(iso).slice(0, 10);
    return s[2] + '.' + s[1] + '.' + s[0];
  }
  function escFn(escapeHtml) {
    return escapeHtml || function (s) {
      return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
    };
  }
  function rowHtml(ins, escapeHtml) {
    if (!ins || !ins.k) return '';
    return '<div class="forage-row"><div class="forage-k">' + escapeHtml(ins.k) +
      (ins.note ? ' <span class="forage-tag">' + escapeHtml(ins.note) + '</span>' : '') +
      '</div><div class="forage-v">' + escapeHtml(ins.v == null ? '' : String(ins.v)) + '</div></div>';
  }
  function card(id, title, sub, body, badge) {
    return '<div class="forage-panel sa-split-card" id="' + id + '">' +
      '<div class="forage-head"><strong>' + title + '</strong>' + (badge || '') + '</div>' +
      (sub ? '<p class="forage-sub">' + sub + '</p>' : '') + body + '</div>';
  }
  function infoBar(id, label, val, pct, btnId) {
    pct = isFinite(Number(pct)) ? Math.max(0, Math.min(100, Number(pct))) : 0;
    return '<div class="fs-block sa-info-bar" id="' + id + '"><div class="fs-row">' +
      '<label>' + label + '</label>' +
      '<div class="sa-mini-track" aria-hidden="true"><div class="sa-mini-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="val">' + val + '</span>' +
      '<button type="button" class="fs-chev" id="' + btnId + '" aria-expanded="false" aria-label="' + label + ' detay">›</button>' +
      '</div></div>';
  }
  function activeApiary() {
    var D = global.D || global.SuperAriDemo;
    var fallback = { name: 'Yanikdag', hiveCount: 20, lat: 41.0808, lon: 40.754, id: 'a4', breed: 'Kafkas' };
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
      if (/mugla|muğla/i.test(b)) return 'Muğla Arısı';
      if (/karadeniz/i.test(b)) return 'Kafkas × Karadeniz';
      if (/kafkas/i.test(b) && /karn/i.test(b)) return 'Kafkas × Karniyol';
      if (/kafkas/i.test(b)) return 'Kafkas';
      if (/karniyol|carn/i.test(b)) return 'Karniyol';
    }
    var s = String((a && (a.name || '')) + ' ' + (a && (a.place || ''))).toLocaleLowerCase('tr');
    if (/kayakoy|kayaköy|fethiye|muğla/.test(s)) return 'Muğla Arısı';
    if (/tortum/.test(s)) return 'Karniyol';
    if (/paland/.test(s)) return 'Kafkas × Karniyol';
    if (/yanik|yanık/.test(s)) return 'Kafkas';
    if (/cimil/.test(s)) return 'Kafkas × Karadeniz';
    return 'Kafkas';
  }
  function foggyPlace(a) {
    return /yanik|yanık|cimil|rize/.test(String((a && (a.name || '')) + (a && a.place || '')).toLocaleLowerCase('tr'));
  }
  function liveProduct(a) {
    var key = placeBreed(a);
    var share = foggyPlace(a) ? 45 / 153 : 0;
    var breedF = 1, flyF = 1, eatF = 1;
    if (/Karadeniz/.test(key)) { breedF = 1.22; flyF = 1 - share * 0.18; }
    else if (/Kafkas × Karniyol/.test(key)) { breedF = 1.2; flyF = 1 - share * 0.3; }
    else if (/Kafkas/.test(key)) { breedF = foggyPlace(a) ? 1.08 : 0.97; flyF = 1 - share * 0.25; }
    else if (/Muğla/.test(key)) { breedF = foggyPlace(a) ? 0.95 : 1.05; flyF = 1 - share; }
    else if (/Karniyol/.test(key)) { breedF = foggyPlace(a) ? 1 : 1.08; flyF = 1 - share; eatF = Math.max(0.82, 1 - 0.0018 * (foggyPlace(a) ? 45 : 0)); }
    return Math.round(breedF * flyF * eatF * 1.06 * 1000) / 1000;
  }
  function yieldCard(escapeHtml) {
    var a = activeApiary();
    var n = (a && a.hiveCount) || 20;
    var mid = Math.round(BASE_KG * liveProduct(a) * 10) / 10;
    var total = Math.round(mid * n);
    var breed = placeBreed(a);
    var body = '<div class="forage-grid">' +
      rowHtml({ k: 'Kovan bası', v: mid + ' kg', note: 'hedef' }, escapeHtml) +
      rowHtml({ k: 'Arilik toplam', v: total + ' kg · ' + n + ' kovan', note: 'hedef' }, escapeHtml) +
      rowHtml({ k: 'Irk', v: breed, note: 'koloni' }, escapeHtml) + '</div>';
    var inner = card('saYieldCard', 'Bal hedefi', 'Foraj + yer + irk + kovan.', '<div class="sa-yield-detail">' + body + '</div>', '');
    return infoBar('yieldBar', 'Bal', mid + ' kg/kovan', Math.max(8, Math.min(100, Math.round((mid / 25) * 100))), 'btnYieldHint') + inner;
  }
  function splitRender(analysis, escapeHtml) {
    escapeHtml = escFn(escapeHtml);
    if (!analysis) return '<div class="forage-panel is-empty"><p>Pin koyunca kartlar burada gorunur.</p></div>';
    var forageRows = '', placeRows = '', flightRows = '';
    (analysis.insights || []).forEach(function (ins) {
      if (!ins || !ins.k) return;
      if (FORAGE_KEYS[ins.k]) forageRows += rowHtml(ins, escapeHtml);
      else if (FLIGHT_KEYS[ins.k]) flightRows += rowHtml(ins, escapeHtml);
      else placeRows += rowHtml(ins, escapeHtml);
    });
    var tone = analysis.grade && analysis.grade.tone ? analysis.grade.tone : 'mid';
    var grade = analysis.grade && analysis.grade.tr ? analysis.grade.tr : '';
    var badge = '<span class="forage-score tone-' + escapeHtml(tone) + '">' + analysis.score + ' · ' + escapeHtml(grade) + '</span>';
    var forage = card('forageOnlyPanel', 'Foraj', 'Arilar ~' + analysis.radiusKm + ' km.', '<div class="sa-forage-detail"><div class="forage-grid">' + forageRows + '</div></div>', badge);
    var tip = '';
    if (analysis.tip && analysis.tip.text) {
      var hasTarget = analysis.tip.targetLat != null && analysis.tip.targetLon != null;
      tip = hasTarget
        ? '<button type="button" class="forage-tip is-action" data-lat="' + Number(analysis.tip.targetLat) + '" data-lon="' + Number(analysis.tip.targetLon) + '"><span class="forage-tip-text">' + escapeHtml(analysis.tip.text) + '</span><span class="forage-tip-cta">Haritada goster ›</span></button>'
        : '<div class="forage-tip"><span class="forage-tip-text">' + escapeHtml(analysis.tip.text) + '</span></div>';
    }
    var place = card('placeOnlyPanel', 'Yer analizi', 'Rakim, sicaklik, nem.', '<div class="sa-place-detail"><div class="forage-grid">' + placeRows + '</div>' + tip + '</div>', '');
    var flightBody = '<div class="forage-grid">' + flightRows + '</div>';
    if (analysis.flight) {
      var f = analysis.flight;
      flightBody += '<p class="forage-sub">' + escapeHtml(f.summary || '') + '</p>';
      if (f.precipDays != null) flightBody += rowHtml({ k: 'Yagisli gun', v: f.precipDays + ' gun', note: 'sezon' }, escapeHtml);
      if (f.flightOkDays != null) flightBody += rowHtml({ k: 'Ucusa uygun', v: '≈ ' + f.flightOkDays + ' gun', note: 'ozet' }, escapeHtml);
    }
    var flightDays = analysis.flight && analysis.flight.flightOkDays != null ? analysis.flight.flightOkDays : null;
    var flight = infoBar('flightBar', 'Ucus', flightDays != null ? ('≈ ' + flightDays + ' gun') : '—', flightDays != null ? Math.min(100, Math.round(flightDays / 1.53)) : 0, 'btnFlightHint') +
      card('flightOnlyPanel', 'Ucus / yagis', 'Kac gun uculur.', '<div class="sa-flight-detail">' + flightBody + '</div>', '');
    return forage + place + flight + yieldCard(escapeHtml);
  }
  function toggleCard(id, btnId, ev) {
    var card = document.getElementById(id);
    if (!card) return;
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    var open = card.classList.toggle('is-open');
    var btn = document.getElementById(btnId);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function toggleForageCard(ev) { toggleCard('forageOnlyPanel', 'btnForageHint', ev); }
  function togglePlaceCard(ev) { toggleCard('placeOnlyPanel', 'btnWaterHint', ev); }
  function toggleFlightCard(ev) { toggleCard('flightOnlyPanel', 'btnFlightHint', ev); }
  function toggleYieldCard(ev) { toggleCard('saYieldCard', 'btnYieldHint', ev); }
  function toggleSeasonCard(ev) { toggleCard('seasonOnlyPanel', 'btnSeasonHint', ev); }
  function wireToggle(card, onToggle) {
    if (!card || card.__saToggle) return;
    card.__saToggle = true;
    var head = card.querySelector('.forage-head, .season-head');
    if (head) { head.style.cursor = 'pointer'; head.addEventListener('click', onToggle); }
  }
  function mountForageUnderSlider() {
    var card = document.getElementById('forageOnlyPanel');
    var block = document.getElementById('forageCollapse');
    if (!card || !block || !block.parentNode) return;
    if (card.previousElementSibling !== block) block.parentNode.insertBefore(card, block.nextSibling);
    wireToggle(card, toggleForageCard);
    var btn = document.getElementById('btnForageHint');
    if (btn && !btn.__saForageCard) { btn.__saForageCard = true; btn.addEventListener('click', toggleForageCard, true); }
    var hint = document.getElementById('forageAutoHint');
    if (hint) { hint.hidden = true; hint.style.display = 'none'; }
  }
  function mountPlaceUnderWater() {
    var card = document.getElementById('placeOnlyPanel');
    var block = document.getElementById('waterSourceBlock');
    if (!card || !block || !block.parentNode) return;
    if (card.previousElementSibling !== block) block.parentNode.insertBefore(card, block.nextSibling);
    wireToggle(card, togglePlaceCard);
    var btn = document.getElementById('btnWaterHint');
    if (btn && !btn.__saPlaceCard) { btn.__saPlaceCard = true; btn.addEventListener('click', togglePlaceCard, true); }
    var hint = document.getElementById('waterDetailPanel');
    if (hint) { hint.hidden = true; hint.style.display = 'none'; }
  }
  function mountAfter(barId, cardId, btnId, toggleFn) {
    var bar = document.getElementById(barId);
    var card = document.getElementById(cardId);
    if (!card) return;
    if (bar && bar.parentNode && card.previousElementSibling !== bar) bar.parentNode.insertBefore(card, bar.nextSibling);
    wireToggle(card, toggleFn);
    var btn = document.getElementById(btnId);
    if (btn && !btn.__saBound) { btn.__saBound = true; btn.addEventListener('click', toggleFn, true); }
  }
  function mountSplitCards() {
    mountForageUnderSlider();
    mountPlaceUnderWater();
    mountAfter('flightBar', 'flightOnlyPanel', 'btnFlightHint', toggleFlightCard);
    mountAfter('yieldBar', 'saYieldCard', 'btnYieldHint', toggleYieldCard);
    mountAfter('seasonBar', 'seasonOnlyPanel', 'btnSeasonHint', toggleSeasonCard);
  }
  function ensureSplitCss() {
    if (document.getElementById('saSplitCardCss')) return;
    var s = document.createElement('style');
    s.id = 'saSplitCardCss';
    s.textContent =
      '.sa-split-card{margin:10px 0 0;}' +
      '.sa-info-bar{margin:8px 0 0;}' +
      '.sa-mini-track{flex:1;height:8px;border-radius:99px;background:#ece7df;overflow:hidden;min-width:48px;}' +
      '.sa-mini-fill{height:100%;background:#3d9a4a;}' +
      '#flightBar .sa-mini-fill{background:#4a7ab5;}' +
      '#yieldBar .sa-mini-fill{background:#c9a227;}' +
      '#seasonBar .sa-mini-fill{background:#6b5ce7;}' +
      '#forageOnlyPanel .sa-forage-detail,#forageOnlyPanel .forage-sub,#placeOnlyPanel .sa-place-detail,#placeOnlyPanel .forage-sub,#flightOnlyPanel .sa-flight-detail,#flightOnlyPanel .forage-sub,#saYieldCard .sa-yield-detail,#saYieldCard .forage-sub{display:none;}' +
      '#forageOnlyPanel.is-open .sa-forage-detail,#forageOnlyPanel.is-open .forage-sub,#placeOnlyPanel.is-open .sa-place-detail,#placeOnlyPanel.is-open .forage-sub,#flightOnlyPanel.is-open .sa-flight-detail,#flightOnlyPanel.is-open .forage-sub,#saYieldCard.is-open .sa-yield-detail,#saYieldCard.is-open .forage-sub{display:block;}' +
      '#seasonOnlyPanel .season-row,#seasonOnlyPanel .season-sub,#seasonOnlyPanel .season-disc{display:none;}' +
      '#seasonOnlyPanel.is-open .season-row,#seasonOnlyPanel.is-open .season-sub,#seasonOnlyPanel.is-open .season-disc{display:block;}' +
      '#forageOnlyPanel .forage-head,#placeOnlyPanel .forage-head,#flightOnlyPanel .forage-head,#saYieldCard .forage-head,#seasonOnlyPanel .season-head{cursor:pointer;}';
    (document.head || document.documentElement).appendChild(s);
  }
  function patch() {
    var F = global.SuperAriForage;
    if (!F) return;
    ensureSplitCss();
    var rawAnalyze = F.analyzeSeason;
    var rawSeasonRender = F.renderSeasonPanelHtml;
    F.renderPanelHtml = function (analysis, escapeHtml) {
      var html = splitRender(analysis, escapeHtml);
      setTimeout(mountSplitCards, 0);
      setTimeout(mountSplitCards, 80);
      return html;
    };
    if (typeof rawAnalyze === 'function') {
      F.analyzeSeason = function (lat, lon) {
        return rawAnalyze(lat, lon).then(function (season) {
          if (!season) return season;
          if (!season.periodStart || !season.periodEnd) {
            var start = new Date(), end = new Date();
            end.setDate(end.getDate() + 13);
            function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
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
        var range = season.periodStart && season.periodEnd ? fmtTrDate(season.periodStart) + ' – ' + fmtTrDate(season.periodEnd) : '';
        var rec = season.fetchedAt ? 'kayit ' + fmtTrDate(season.fetchedAt) : '';
        var line = [range, rec].filter(Boolean).join(' · ');
        if (line) {
          var block = '<p class="season-sub">' + (escapeHtml ? escapeHtml(line) : line) + '</p>';
          if (html.indexOf('class="season-sub"') >= 0) html = html.replace(/<p class="season-sub">[\s\S]*?<\/p>/, block);
          else html = html.replace('</div>', block + '</div>');
        }
        var score = season.wintering && season.wintering.score != null ? season.wintering.score : null;
        return infoBar('seasonBar', 'Kislama', score != null ? (score + ' · Karniyol') : '—', score != null ? score : 0, 'btnSeasonHint') +
          '<div id="seasonOnlyPanel" class="sa-split-card">' + html + '</div>';
      };
    }
    if (document.readyState === 'complete') mountSplitCards();
    else document.addEventListener('DOMContentLoaded', mountSplitCards);
  }
  if (global.SuperAriForage && global.SuperAriForage.analyze) { patch(); return; }
  var s = document.createElement('script');
  s.src = SRC;
  s.onload = patch;
  (document.head || document.documentElement).appendChild(s);
})(window);
