/* koloni-299: Bakire ana çiftleşme uçuşu — gün içi saat penceresi (Hava › uçuş havasından ayrı; tek kaynak ogul_skor_ayar.sensor + colony.ciftlesmeEsik). */
(function (global) {
  'use strict';
  var CACHE = 'superari.ciftlesme.tahmin.v1.';
  var GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  var FL = { ok: 'Çiftleşme uygun', part: 'Kısmen', no: 'Uygun değil' };

  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function wetH(h) { return (h.mm || 0) > 0 || (h.pr || 0) >= 60; }
  function hourN(h) { return Number(String(h.t || '').slice(11, 13)); }
  function inWin(h, bas, son) { var hr = hourN(h); return hr >= bas && hr <= son; }
  function isoToday() { var n = new Date(); return n.getFullYear() + '-' + (n.getMonth() < 9 ? '0' : '') + (n.getMonth() + 1) + '-' + (n.getDate() < 10 ? '0' : '') + n.getDate(); }
  function dayLab(iso, i) { var d = new Date(iso + 'T12:00:00'); return i === 0 ? 'Bugün' : GUN[d.getDay()]; }

  function cfg() {
    var C = global.SuperAriDemo && global.SuperAriDemo.colony;
    try { return C.ciftlesmeEsik(); } catch (e) { /* ignore */ }
    return { uygunC: 18, kismenC: 16, uygunRuzgar: 15, kismenRuzgar: 22, yagisMm: 1, isinimW: 350, saatBas: 11, saatSon: 16, saatMin: 2 };
  }

  function hourMate(h, E) {
    if (!inWin(h, E.saatBas, E.saatSon) || wetH(h) || h.temp == null) return 'no';
    if (h.temp >= E.uygunC && (h.wind || 0) <= E.uygunRuzgar && (h.rad == null || h.rad >= E.isinimW)) return 'ok';
    if (h.temp >= E.kismenC && (h.wind || 0) <= E.kismenRuzgar) return 'part';
    return 'no';
  }

  function dayMate(d, E) {
    E = E || cfg();
    if (d.hi == null || (d.mm || 0) >= E.yagisMm) return 'no';
    var hs = d.hs && d.hs.length ? d.hs : null;
    if (!hs) {
      if ((d.pr || 0) >= 60) return 'no';
      if (d.hi >= E.uygunC && (d.wind || 0) <= E.uygunRuzgar) return 'ok';
      if (d.hi >= E.kismenC && (d.wind || 0) <= E.kismenRuzgar) return 'part';
      return 'no';
    }
    var win = hs.filter(function (h) { return inWin(h, E.saatBas, E.saatSon); });
    if (!win.length) return 'no';
    var ok = 0, part = 0;
    win.forEach(function (h) { var f = hourMate(h, E); if (f === 'ok') ok++; if (f !== 'no') part++; });
    return ok >= E.saatMin ? 'ok' : (part ? 'part' : 'no');
  }

  function parse(j) {
    var dl = j.daily || {}, out = { days: [] };
    (dl.time || []).forEach(function (t, i) {
      out.days.push({ date: t, hi: num(dl.temperature_2m_max[i]), lo: num(dl.temperature_2m_min[i]), mm: num((dl.precipitation_sum || [])[i]) || 0,
        pr: num((dl.precipitation_probability_max || [])[i]) || 0, wind: num((dl.wind_speed_10m_max || [])[i]), code: (dl.weather_code || [])[i] });
    });
    var h = j.hourly || {}, byD = {};
    out.days.forEach(function (x) { byD[x.date] = x; });
    (h.time || []).forEach(function (t, i) {
      var dy = (h.is_day || [])[i], o = { t: t, temp: num(h.temperature_2m[i]), pr: num((h.precipitation_probability || [])[i]) || 0, mm: num((h.precipitation || [])[i]) || 0,
        wind: num((h.wind_speed_10m || [])[i]), rad: num((h.shortwave_radiation || [])[i]), day: dy == null ? null : Number(dy) };
      var dd = byD[t.slice(0, 10)];
      if (dd && (function (h) { if (h.day != null) return h.day === 1; var hr = hourN(h); return hr >= 8 && hr <= 19; })(o)) (dd.hs = dd.hs || []).push(o);
    });
    return out;
  }

  function fresh(d) {
    if (!d || !d.days) return null;
    var t0 = isoToday();
    var days = d.days.filter(function (x) { return x.date >= t0; });
    return days.length ? { days: days } : null;
  }

  function fetchFc(a) {
    var key = CACHE + a.id;
    try { var c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.at < 30 * 60e3) return Promise.resolve(fresh(c.d)); } catch (e) { /* ignore */ }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + a.lat + '&longitude=' + a.lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code' +
      '&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,is_day,shortwave_radiation' +
      '&timezone=auto&forecast_days=10';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('hava_' + r.status); return r.json(); }).then(function (j) {
      var d = parse(j); try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), d: d })); } catch (e) { /* ignore */ }
      return fresh(d);
    }).catch(function () {
      try { var c = JSON.parse(localStorage.getItem(key) || 'null'); if (c) return fresh(c.d); } catch (e) { /* ignore */ }
      return null;
    });
  }

  function resolveApiary(ap, D) {
    var aps = [];
    try { aps = (D.loadApiaries ? D.loadApiaries() : []).filter(function (a) { return a && a.lat != null && a.lon != null; }); } catch (e) { aps = []; }
    if (ap && ap !== 'all') {
      for (var i = 0; i < aps.length; i++) if (String(aps[i].id) === String(ap)) return aps[i];
    }
    return aps[0] || null;
  }

  function hourChips(d, E) {
    var hs = (d.hs || []).filter(function (h) { return inWin(h, E.saatBas, E.saatSon); });
    if (!hs.length) return '';
    return '<div class="ke-cu-hours">' + hs.map(function (h) {
      var f = hourMate(h, E), lab = String(h.t).slice(11, 16);
      return '<span class="ke-cu-h ' + f + '" title="' + esc(lab + ' · ' + Math.round(h.temp) + '° · rüzgar ' + Math.round(h.wind || 0)) + '">' + esc(lab) + '</span>';
    }).join('') + '</div>';
  }

  function renderDays(data, E) {
    if (!data || !data.days.length) return '<p class="ke-empty">Tahmin alınamadı. İnternet bağlantısını kontrol edin.</p>';
    var okN = data.days.filter(function (x) { return dayMate(x, E) === 'ok'; }).length;
    var sub = 'Pencere ' + E.saatBas + ':00–' + E.saatSon + ':00 · ≥' + E.uygunC + '° · rüzgar ≤' + E.uygunRuzgar + ' km/sa · ışınım ≥' + E.isinimW + ' W/m² · «uygun gün»: en az ' + E.saatMin + ' uygun saat';
    var head = '<p class="ke-mut">' + esc(sub) + ' · <i>Tahmini, yalnız hava; gerçek çiftleşme kaydı doğrulanmadı.</i></p>' +
      '<p class="ke-mut"><b>' + okN + '</b> / ' + data.days.length + ' gün çiftleşme için uygun görünüyor.</p>';
    var cards = data.days.map(function (x, i) {
      var f = dayMate(x, E);
      return '<div class="ke-cu-day ' + f + '"><div class="ke-cu-top"><b>' + esc(dayLab(x.date, i)) + '</b><span class="ke-cu-fl">' + esc(FL[f]) + '</span></div>' +
        '<div class="ke-cu-meta">En yüksek ' + (x.hi == null ? '—' : Math.round(x.hi)) + '° · ' + (Math.round((x.mm || 0) * 10) / 10) + ' mm yağış</div>' +
        hourChips(x, E) + '</div>';
    }).join('');
    return head + '<div class="ke-cu-grid">' + cards + '</div>';
  }

  function mountLarva(root, ap) {
    var box = root.querySelector('.ke-cu-body');
    if (!box) return;
    var D = global.SuperAriDemo;
    var a = resolveApiary(ap, D);
    if (!a) { box.innerHTML = '<p class="ke-empty">Konumu kayıtlı arılık yok — tahmin için arılığa konum ekleyin.</p>'; return; }
    box.innerHTML = '<p class="ke-mut">Tahmin yükleniyor… (' + esc(a.place || a.name) + ')</p>';
    fetchFc(a).then(function (data) {
      if (!root.querySelector('.ke-cu-body')) return;
      root.querySelector('.ke-cu-body').innerHTML = renderDays(data, cfg());
    });
  }

  global.SuperAriCiftlesmeUcus = { cfg: cfg, hourMate: hourMate, dayMate: dayMate, parse: parse, FL: FL, fetchFc: fetchFc, renderDays: renderDays, mountLarva: mountLarva, resolveApiary: resolveApiary };
})(typeof window !== 'undefined' ? window : global);
