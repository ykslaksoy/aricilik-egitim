/* SüperArı · Hava sayfası (Bakım düzeni): özet kart + kare ızgara; her kare kendi detayını açar (#10gun, #saatlik …). */
(function () {
  var D = window.SuperAriDemo;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function live() { try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  (function () { var el = $('statusClock'); if (!el) return; function t() { var n = new Date(); el.textContent = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes(); } t(); setInterval(t, 1000); })();

  var LOCK_KEY = 'superari.ana.arilikLock', SEL_KEY = 'superari.ana.selectedApiary', CACHE = 'superari.hava.tahmin.v1.';
  var GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  var YON = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  var aps = [];
  try { aps = (D && D.loadApiaries ? D.loadApiaries() : []).filter(function (a) { return a && a.lat != null && a.lon != null; }); } catch (e) { aps = []; }
  function pinned() { try { var p = JSON.parse(localStorage.getItem(LOCK_KEY) || 'null'); return p && p.locked && p.id ? String(p.id) : null; } catch (e) { return null; } }
  function selected() { try { var s = JSON.parse(localStorage.getItem(SEL_KEY) || 'null'); return s && s.id ? String(s.id) : null; } catch (e) { return null; } }
  var q = new URLSearchParams(location.search);
  var cur = q.get('apiary') || pinned() || selected() || (aps[0] && aps[0].id);
  function idxOf(id) { for (var i = 0; i < aps.length; i++) if (String(aps[i].id) === String(id)) return i; return 0; }
  var idx = idxOf(cur);
  var data = null;

  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function r0(v) { var n = num(v); return n == null ? '—' : Math.round(n); }
  function dayLab(iso, i) { var d = new Date(iso + 'T12:00:00'); return i === 0 ? 'Bugün' : GUN[d.getDay()]; }
  function rainy(d) { return (d.mm || 0) >= 1 || (d.pr || 0) >= 60; }
  /* Arı uçuşu: ≥15° max, rüzgar ≤20 km/s, yağış yok/az → uygun; ≥12°, ≤30 km/s, olasılık <70 → kısmen */
  function flight(d) {
    if (d.hi == null || rainy(d)) return 'no'; /* yağmurlu gün asla uygun/kısmen değil */
    if (d.hi >= 15 && (d.wind || 0) <= 20 && (d.mm || 0) < 1 && (d.pr || 0) < 50) return 'ok';
    if (d.hi >= 12 && (d.wind || 0) <= 30 && (d.mm || 0) < 1 && (d.pr || 0) < 70) return 'part';
    return 'no';
  }
  var FL = { ok: 'Uçuş uygun', part: 'Kısmen', no: 'Uygun değil' };
  function ico(code, mm) {
    var c = Number(code) || 0;
    if (c >= 95) return '⛈️'; if ((c >= 71 && c <= 77) || c === 85 || c === 86) return '🌨️'; if (c >= 51 || (mm || 0) >= 1) return '🌧️';
    if (c >= 45) return '🌫️'; if (c >= 3) return '☁️'; if (c >= 1) return '⛅'; return '☀️';
  }

  function parse(j) {
    var dl = j.daily || {}, out = { days: [], hours: [] };
    (dl.time || []).forEach(function (t, i) {
      out.days.push({ date: t, hi: num(dl.temperature_2m_max[i]), lo: num(dl.temperature_2m_min[i]), mm: num((dl.precipitation_sum || [])[i]) || 0,
        pr: num((dl.precipitation_probability_max || [])[i]) || 0, wind: num((dl.wind_speed_10m_max || [])[i]), gust: num((dl.wind_gusts_10m_max || [])[i]),
        dir: num((dl.wind_direction_10m_dominant || [])[i]), rh: num((dl.relative_humidity_2m_mean || [])[i]), rhMin: num((dl.relative_humidity_2m_min || [])[i]), rhMax: num((dl.relative_humidity_2m_max || [])[i]), code: (dl.weather_code || [])[i] });
    });
    var h = j.hourly || {}, now = Date.now();
    (h.time || []).forEach(function (t, i) {
      var ms = new Date(t).getTime(); if (ms < now - 3600e3 || out.hours.length >= 36) return;
      out.hours.push({ t: t, temp: num(h.temperature_2m[i]), pr: num((h.precipitation_probability || [])[i]) || 0, mm: num((h.precipitation || [])[i]) || 0,
        wind: num((h.wind_speed_10m || [])[i]), rh: num((h.relative_humidity_2m || [])[i]), code: (h.weather_code || [])[i] });
    });
    return out;
  }
  function fetchFc(a) {
    var key = CACHE + a.id;
    try { var c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.at < 30 * 60e3) return Promise.resolve(c.d); } catch (e) { /* ignore */ }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + a.lat + '&longitude=' + a.lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean,relative_humidity_2m_min,relative_humidity_2m_max,weather_code' +
      '&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,relative_humidity_2m,weather_code' +
      '&timezone=auto&forecast_days=10';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('hava_' + r.status); return r.json(); }).then(function (j) {
      var d = parse(j); try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), d: d })); } catch (e) { /* ignore */ }
      return d;
    }).catch(function () {
      try { var c = JSON.parse(localStorage.getItem(key) || 'null'); if (c) return c.d; } catch (e) { /* ignore */ }
      return null;
    });
  }

  /* Bakım ızgarası ile aynı kovan kutusu + yakma damga simgesi */
  var BURN = {
    gun10: '<rect x="6.8" y="7.6" width="10.4" height="9.6" rx="1.2"/><path d="M6.8 10.6h10.4M9.6 6.2v2.6M14.4 6.2v2.6"/><path d="M9.2 14h5.6"/>',
    saatlik: '<circle cx="12" cy="12" r="5.6"/><path d="M12 8.8V12l2.4 1.6"/>',
    yagis: '<path d="M8 11.6a3.6 3.6 0 0 1 7-1.2 2.6 2.6 0 0 1 .6 5.1H8.6A2 2 0 0 1 8 11.6z"/><path d="M9.6 17.4l-.6 1.4M12.6 17.4l-.6 1.4"/>',
    ruzgar: '<path d="M5.8 10h8.4a2 2 0 1 0-2-2M5.8 13.4h10.6a2 2 0 1 1-2 2"/>',
    nem: '<path d="M12 5.8c2.4 3 3.8 5.2 3.8 7.1a3.8 3.8 0 0 1-7.6 0c0-1.9 1.4-4.1 3.8-7.1z"/><path d="M10.2 13.8l3.6-2.4"/>',
    karsi: '<path d="M6.4 16.6V11M10 16.6V7.6M14 16.6v-4M17.6 16.6V9.4"/><path d="M5.6 17.4h12.8"/>',
    nektar: '<circle cx="12" cy="10.4" r="1.6"/><path d="M12 8.8c-.8-2.2.8-3.2 0-3.2s.8 1 0 3.2M13.6 10.4c2.2-.8 3.2.8 3.2 0s-1 .8-3.2 0M12 12c.8 2.2-.8 3.2 0 3.2s-.8-1 0-3.2M10.4 10.4c-2.2.8-3.2-.8-3.2 0s1-.8 3.2 0"/><path d="M12 15.2v3"/>',
    don: '<path d="M12 6v12M6.8 9l10.4 6M6.8 15l10.4-6"/>',
    isgunu: '<rect x="6.8" y="7.6" width="10.4" height="9.6" rx="1.2"/><path d="M6.8 10.6h10.4M9.6 6.2v2.6M14.4 6.2v2.6"/><path d="M9.4 13.6l1.6 1.6 3-3"/>',
    bal: '<path d="M12 6.2l4.4 2.5v5L12 16.2l-4.4-2.5v-5z"/><path d="M12 16.2v2.6M10 11.2h4"/>',
    ucus: '<ellipse cx="12" cy="13" rx="2.4" ry="3.4"/><path d="M9.8 11.4c-2.2-1.6-4-1-4 .4s2 1.8 4 .8M14.2 11.4c2.2-1.6 4-1 4 .4s-2 1.8-4 .8M12 9.6V8"/>',
    ariliklar: '<path d="M12 6.2c-2.4 0-4.2 1.8-4.2 4.1 0 3 4.2 7.3 4.2 7.3s4.2-4.3 4.2-7.3c0-2.3-1.8-4.1-4.2-4.1z"/><circle cx="12" cy="10.4" r="1.5"/>',
    gecmis: '<path d="M6.6 12a5.4 5.4 0 1 0 1.6-3.8"/><path d="M6.4 6.8v2.6H9"/><path d="M12 9.4V12l1.8 1.2"/>',
    rapor: '<rect x="7" y="6" width="10" height="12" rx="1.4"/><path d="M9.4 15v-2.4M12 15v-4.4M14.6 15v-3.2"/>'
  };
  function hiveHTML(key) {
    return '<div class="hive-area"><div class="hive"><div class="hive-stack"><div class="hive-lid"></div><div class="hive-box top"></div>' +
      '<div class="hive-box bottom"><div class="hive-entrance"></div><div class="hive-door" aria-hidden="true"></div></div>' +
      '<div class="hive-feet"><span></span><span></span></div></div><div class="hive-shadow"></div>' +
      '<div class="hive-icon hive-icon-burn" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="burn-ring" cx="12" cy="12" r="10.2"/>' + BURN[key] + '</svg></div></div></div>';
  }
  function ap() { return aps[idx] || null; }
  function apQ() { var a = ap(); return a ? '?apiary=' + encodeURIComponent(a.id) : ''; }

  function frostDays(d) { return d.filter(function (x) { return (x.lo != null && x.lo <= 2) || (x.gust || 0) >= 50 || Number(x.code) >= 95; }); }
  function workDays(d) { return d.filter(function (x) { return (x.mm || 0) < 0.5 && (x.pr || 0) < 30 && (x.wind || 0) <= 15 && (x.hi || 0) >= 15; }); }
  function harvestDays(d) { return d.filter(function (x) { return (x.mm || 0) < 0.5 && (x.pr || 0) < 30 && x.wind != null && x.wind <= 15 && (x.hi || 0) >= 18; }); }
  function seasonStage() {
    var m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return { t: 'İlkbahar gelişmesi', n: 'Koloniler büyüyor; erken akım bölgeye göre başlar.' };
    if (m >= 6 && m <= 8) return { t: 'Ana bal akımı', n: 'Çoğu bölgede ana akım dönemi; ballık ve hasat takibi.' };
    if (m >= 9 && m <= 10) return { t: 'Sezon sonu / kışlığa hazırlık', n: 'Akım azalır; son hasat ve kışlık stok kontrolü.' };
    return { t: 'Kış dönemi', n: 'Akım yok; kovanı açmayın, stoğu dıştan izleyin.' };
  }
  function feedAlert(d) {
    var run = 0, best = 0, cold = 0, cbest = 0;
    d.forEach(function (x) { run = rainy(x) ? run + 1 : 0; best = Math.max(best, run); cold = (x.hi != null && x.hi < 12) ? cold + 1 : 0; cbest = Math.max(cbest, cold); });
    if (best >= 3) return best + ' gün üst üste yağmur bekleniyor — öncesinde besleme stoklarını kontrol edin';
    if (cbest >= 3) return cbest + ' gün soğuk (en yüksek <12°) — arı uçamaz, besleme stoklarını kontrol edin';
    return '';
  }
  function tiles() {
    var d = data && data.days || [], has = !!d.length, h0 = data && data.hours && data.hours[0];
    var okN = d.filter(function (x) { return flight(x) === 'ok'; }).length, fr = frostDays(d).length, wk = workDays(d);
    return [
      { key: 'saatlik', label: 'Saatlik', href: '#saatlik', badge: h0 ? r0(h0.temp) + '° şimdi' : '—', tone: 'tan' },
      { key: 'ucus', label: 'Uçuş uygunluğu', href: '#ucus', badge: has ? okN + ' uygun gün' : '—', tone: okN ? 'green' : 'red' },
      { key: 'gecmis', label: 'Geçmiş hava', href: 'hava-gecmis.html' + apQ(), badge: '', tone: 'tan' },
      { key: 'rapor', label: 'Sezon raporu', href: 'hava-raporu.html' + apQ(), badge: '', tone: 'tan' },
      { key: 'karsi', label: 'Geçen yılla karşılaştırma', href: '#karsi', badge: '', tone: 'tan' },
      { key: 'nektar', label: 'Nektar akımı', href: '#nektar', badge: has ? 'tahmini' : '—', tone: 'tan' },
      { key: 'don', label: 'Don / fırtına', href: '#don', badge: has ? (fr ? fr + ' gün uyarı' : 'Uyarı yok') : '—', tone: fr ? 'red' : 'green' },
      { key: 'bal', label: 'Bal sezonu', href: '#bal', badge: has ? (harvestDays(d).length ? harvestDays(d).length + ' hasat günü' : 'Hasat günü yok') : '—', tone: harvestDays(d).length ? 'green' : 'tan' },
      { key: 'isgunu', label: 'Uygun iş günü', href: '#isgunu', badge: has ? (wk.length ? dayLab(wk[0].date, d.indexOf(wk[0])) : 'Yok') : '—', tone: wk.length ? 'green' : 'tan' }
    ];
  }
  function renderGrid() {
    $('grid').innerHTML = tiles().map(function (t) {
      var show = t.badge && t.badge !== '—';
      return '<a class="tile" data-key="' + t.key + '" href="' + esc(t.href) + '" aria-label="' + esc(t.label + (show ? ', ' + t.badge : '')) + '">' + hiveHTML(t.key) +
        '<div class="tile-label">' + esc(t.label) + '</div>' + (show ? '<div class="badge ' + t.tone + '">' + esc(t.badge) + '</div>' : '<div class="badge tan" aria-hidden="true" style="visibility:hidden">—</div>') + '</a>';
    }).join('');
  }
  var ICO = {
    t: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="8.4" y="3" width="3.2" height="10" rx="1.6" fill="#fff" stroke="#e03131" stroke-width="1"/><circle cx="10" cy="14.6" r="2.6" fill="#e03131"/></svg>',
    r: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5c2.6 3.3 4.1 5.6 4.1 7.7a4.1 4.1 0 0 1-8.2 0c0-2.1 1.5-4.4 4.1-7.7z" fill="#d0ebff" stroke="#5b8def" stroke-width="1"/></svg>',
    f: '<svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="11" rx="3" ry="4" fill="#f7b731" stroke="#5c3a1f" stroke-width=".9"/><path d="M7.4 9c-2.4-1.8-4.2-.8-3.8.6.4 1.2 2.2 1.2 3.8.4M12.6 9c2.4-1.8 4.2-.8 3.8.6-.4 1.2-2.2 1.2-3.8.4" fill="#e7f5ff" stroke="#9aa8b8" stroke-width=".8"/></svg>',
    h: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2c2.6 3.3 4.6 6 4.6 8.4A4.6 4.6 0 0 1 5.4 11.6c0-2.4 2-5.1 4.6-8.4z" fill="none" stroke="#3aa0c8" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    w: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8h9a2 2 0 1 0-2-2M3.5 12h11a2 2 0 1 1-2 2" fill="none" stroke="#5b8def" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  function renderScope() {
    var a = ap();
    $('bkLabel').textContent = a ? (a.place || a.name) : '—';
    $('bkLabel').title = a ? a.name : '';
    var multi = aps.length > 1; $('bkPrev').disabled = !multi; $('bkNext').disabled = !multi;
    $('bkMode').hidden = live();
    var d = data && data.days || [], t0 = d[0] || {}, h0 = data && data.hours && data.hours[0];
    var rainD = d.slice(0, 7).filter(rainy), okD = d.filter(function (x) { return flight(x) === 'ok'; });
    var stats = [
      { k: 't', v: h0 ? r0(h0.temp) + '°' : (t0.hi != null ? r0(t0.hi) + '°' : '—'), l: t0.hi != null ? 'Bugün ' + r0(t0.lo) + '°/' + r0(t0.hi) + '°' : 'Sıcaklık', href: '#saatlik' },
      { k: 'r', v: d.length ? String(rainD.length) : '—', l: 'Yağmurlu gün', href: '#isgunu' },
      { k: 'f', v: d.length ? String(okD.length) : '—', l: 'Uçuşa uygun gün', href: '#ucus' },
      { k: 'w', v: t0.wind != null ? Math.round(t0.wind) : '—', l: 'Rüzgar km/s', href: '#don' },
      /* k211: 10 günlük tahmin dış nem aralığı — yalnız bilgi (Open-Meteo günlük en düşük/en yüksek, yoksa ortalama); uyarı yok, kovan nem kurallarına bağlı değil */
      (function () { var lo = null, hi = null;
        d.slice(0, 10).forEach(function (x) { var a = isFinite(x.rhMin) && x.rhMin != null ? x.rhMin : x.rh, b = isFinite(x.rhMax) && x.rhMax != null ? x.rhMax : x.rh;
          if (a != null && isFinite(a)) lo = lo == null ? a : Math.min(lo, a); if (b != null && isFinite(b)) hi = hi == null ? b : Math.max(hi, b); });
        var ok = lo != null && hi != null;
        return { k: 'h', v: ok ? Math.round(lo) + '–' + Math.round(hi) + '%' : 'Veri yok', l: '10 gün nem', info: true, none: !ok, rng: ok }; })()
    ];
    $('bkStats').innerHTML = stats.map(function (x) {
      if (x.info) return '<span class="bk-stat bk-stat-info' + (x.none ? ' none' : '') + (x.rng ? ' rng' : '') + '" data-stat="' + x.k + '" title="Dış ortam bağıl nemi (bilgi)">' + ICO[x.k] + '<span class="v">' + esc(x.v) + '</span><span class="l">' + esc(x.l) + '</span></span>';
      return '<a class="bk-stat" data-stat="' + x.k + '" href="' + x.href + '">' + ICO[x.k] + '<span class="v">' + esc(x.v) + '</span><span class="l">' + esc(x.l) + '</span></a>';
    }).join('');
    var note;
    if (!data) note = { t: 'Tahmin alınamadı — bağlantıyı kontrol edin', b: 'Yenile', h: '#' };
    else if (okD.length) note = { t: '🐝 Uçuş uygun: ' + okD.slice(0, 4).map(function (x) { return dayLab(x.date, d.indexOf(x)); }).join(', '), b: 'Uçuş', h: '#ucus' };
    else if (rainD.length) note = { t: '🌧️ ' + rainD.map(function (x) { return dayLab(x.date, d.indexOf(x)); }).join(', ') + ' yağmur', b: 'İş günü', h: '#isgunu' };
    else note = { t: 'Önümüzdeki günlerde uçuşa uygun gün yok', b: '10 gün', h: '#10gun' };
    $('bkNoteText').textContent = note.t; $('bkNoteBtn').textContent = note.b; $('bkNote').setAttribute('href', note.h);
  }

  function backBtn() { return '<button type="button" class="sa-back hv-back" data-hv-back>‹ Geri</button>'; }
  function head(t, s) { return '<div class="hv-h">' + esc(t) + '</div>' + (s ? '<div class="hv-sub">' + esc(s) + '</div>' : ''); }
  function dirTxt(deg) { return deg == null ? '' : YON[Math.round(deg / 45) % 8]; }
  function dayCard(x, i) {
    var f = flight(x);
    return '<div class="hv-card ' + (f === 'no' ? '' : f) + '"><div class="hv-d"><b>' + esc(dayLab(x.date, i)) + '</b><span>' + ico(x.code, x.mm) + '</span></div>' +
      '<div class="hv-t">' + r0(x.hi) + '°<span class="lo"> / ' + r0(x.lo) + '°</span></div>' +
      '<div class="hv-fl ' + f + '">' + (f === 'ok' ? '🐝 ' : '') + FL[f] + '</div>' +
      '<div class="hv-m"><span>💧 ' + (Math.round((x.mm || 0) * 10) / 10) + ' mm · %' + Math.round(x.pr || 0) + '</span><span>💨 ' + r0(x.wind) + ' km/s ' + dirTxt(x.dir) + '</span><span>Nem %' + r0(x.rh) + '</span></div></div>';
  }
  function hrLab(t) { return t.slice(11, 16); }
  function view(name) {
    var a = ap(), d = data && data.days || [], hs = data && data.hours || [], sub = a ? a.name : '';
    if (!data) return head('Hava', sub) + '<div class="hv-empty">Tahmin alınamadı. İnternet bağlantısını kontrol edip tekrar deneyin.</div>';
    if (name === '10gun') return head('10 günlük tahmin', sub + ' · 🐝 uçuş uygun günler yeşil') + d.map(dayCard).join('');
    if (name === 'ucus') {
      return head('Arı uçuşu uygunluğu', 'Uygun: en yüksek ≥15°, rüzgar ≤20 km/s, yağış yok') + d.map(dayCard).join('');
    }
    if (name === 'yagis') return head('Yağış', sub + ' · yağmurlu gün: ≥1 mm veya ≥%60') + d.map(function (x, i) {
      return '<div class="hv-row"><span class="k">' + esc(dayLab(x.date, i)) + '</span><span class="hv-bar"><i style="width:' + Math.min(100, Math.round(x.pr || 0)) + '%"></i></span><span class="v" style="flex:0 0 96px;text-align:right">' + (rainy(x) ? '🌧️ ' : '') + (Math.round((x.mm || 0) * 10) / 10) + ' mm · %' + Math.round(x.pr || 0) + '</span></div>';
    }).join('');
    if (name === 'ruzgar') return head('Rüzgar', sub + ' · günlük en yüksek / hamle') + d.map(function (x, i) {
      return '<div class="hv-row"><span class="k">' + esc(dayLab(x.date, i)) + '</span><span class="v">💨 ' + r0(x.wind) + ' km/s · hamle ' + r0(x.gust) + ' km/s · ' + dirTxt(x.dir) + '</span>' + ((x.wind || 0) > 30 ? '<span class="hv-fl no">Kuvvetli</span>' : '') + '</div>';
    }).join('');
    if (name === 'nem') return head('Nem', sub + ' · günlük ortalama bağıl nem') + d.map(function (x, i) {
      return '<div class="hv-row"><span class="k">' + esc(dayLab(x.date, i)) + '</span><span class="hv-bar"><i style="width:' + Math.min(100, Math.round(x.rh || 0)) + '%;background:#74c0fc"></i></span><span class="v" style="flex:0 0 48px;text-align:right">%' + r0(x.rh) + '</span></div>';
    }).join('');
    if (name === 'don') {
      var fr = frostDays(d);
      return head('Don / fırtına uyarıları', sub + ' · don: en düşük ≤2° · fırtına: hamle ≥50 km/s veya gök gürültülü') +
        (fr.length ? fr.map(function (x) { var i = d.indexOf(x), w = [];
          if (x.lo != null && x.lo <= 2) w.push('❄️ Don riski: en düşük ' + r0(x.lo) + '°');
          if ((x.gust || 0) >= 50) w.push('💨 Fırtına: hamle ' + r0(x.gust) + ' km/s');
          if (Number(x.code) >= 95) w.push('⛈️ Gök gürültülü sağanak');
          return '<div class="hv-warn"><b>' + esc(dayLab(x.date, i)) + '</b> · ' + w.join(' · ') + '</div>'; }).join('') +
          '<div class="hv-sub">Öneri: kovan kapaklarını sabitleyin, girişleri daraltın.</div>'
        : '<div class="hv-good">Önümüzdeki ' + d.length + ' günde don veya fırtına beklenmiyor.</div>');
    }
    if (name === 'isgunu') {
      var wk = workDays(d), fa = feedAlert(d);
      return head('Uygun iş günü', 'İlaçlama / muayene için: yağışsız, rüzgar ≤15 km/s, en yüksek ≥15°') +
        (fa ? '<div class="hv-warn">🍯 ' + esc(fa) + '</div>' : '') +
        (wk.length ? wk.map(function (x) { return dayCard(x, d.indexOf(x)); }).join('')
          : '<div class="hv-empty">Önümüzdeki ' + d.length + ' günde ilaçlama/muayene için uygun (yağışsız ve rüzgarsız) gün görünmüyor.</div>');
    }
    if (name === 'bal') {
      var st = seasonStage(), hv = harvestDays(d), okB = d.filter(function (x) { return flight(x) === 'ok'; }).length;
      var lvl = okB >= 6 ? 'iyi' : (okB >= 3 ? 'orta' : 'zayıf');
      return head('Bal sezonu', sub) +
        '<div class="hv-row"><span class="k">Aşama</span><span class="v"><b>' + esc(st.t) + '</b><br>' + esc(st.n) + ' <i>(aya göre genel)</i></span></div>' +
        '<div class="' + (lvl === 'zayıf' ? 'hv-warn' : 'hv-good') + '">🍯 Bal akımı tahmini (tahmini, yalnız hava): <b>' + lvl + '</b> — ' + d.length + ' günde ' + okB + ' gün uçuş/toplama havası.</div>' +
        '<div class="hv-h" style="font-size:14px">Hasada uygun günler</div><div class="hv-sub">Yağmursuz, rüzgar ≤15 km/s, en yüksek ≥18°</div>' +
        (hv.length ? hv.map(function (x) { return dayCard(x, d.indexOf(x)); }).join('') : '<div class="hv-empty">Önümüzdeki ' + d.length + ' günde hasada uygun gün görünmüyor.</div>');
    }
    if (name === 'nektar') {
      var okD = d.filter(function (x) { return flight(x) === 'ok'; });
      return head('Nektar akımı / çiçeklenme', sub) +
        '<div class="hv-empty">Bu arılık için çiçeklenme takvimi verisi yok. Aşağıdaki değerlendirme yalnız hava tahminine dayanır (tahmini).</div>' +
        '<div class="' + (okD.length >= 4 ? 'hv-good' : 'hv-warn') + '">' + (okD.length >= 4 ? '🌼 ' + okD.length + ' gün uçuşa ve toplamaya uygun hava — nektar akımı olan bölgede iyi toplama beklenebilir.' : '🌧️ Yalnız ' + okD.length + ' gün toplamaya uygun hava — nektar akımı sınırlı kalabilir.') + '</div>';
    }
    if (name === 'karsi') return head('Geçen yılla karşılaştırma', sub + ' · aynı 10 gün, geçen yıl') + '<div id="hvKarsi"><div class="hv-empty">Geçen yılın kayıtları yükleniyor…</div></div>';
    if (name === 'saatlik') return head('Saatlik', sub + ' · önümüzdeki 36 saat') + hs.map(function (h) {
      var hr = Number(h.t.slice(11, 13)), okH = hr >= 8 && hr <= 19 && (h.temp || 0) >= 12 && (h.wind || 0) <= 20 && (h.pr || 0) < 40;
      return '<div class="hv-row"><span class="k">' + hrLab(h.t) + '</span><span class="v">' + ico(h.code, h.mm) + ' ' + r0(h.temp) + '° · 💧%' + Math.round(h.pr) + ' · 💨' + r0(h.wind) + ' · Nem %' + r0(h.rh) + '</span>' + (okH ? '<span title="Uçuş uygun">🐝</span>' : '') + '</div>';
    }).join('');
    return '';
  }
  var hvLoading = !!ap();
  function renderTen() {
    var d = data && data.days || [];
    if (!data && hvLoading) { var sk = ''; for (var si = 0; si < 10; si++) sk += '<div class="hv-card hv-skel" aria-hidden="true" style="height:72px;box-sizing:border-box"></div>'; return '<div class="hv-h">10 günlük tahmin</div>' + sk; }
    if (!data) return '<div class="hv-empty">' + (ap() ? 'Tahmin alınamadı. İnternet bağlantısını kontrol edip tekrar deneyin.' : 'Konumu kayıtlı arılık yok — arılık ekleyince tahmin burada görünür.') + '</div>';
    var fa = feedAlert(d);
    return '<div class="hv-h">10 günlük tahmin</div>' + (fa ? '<div class="hv-warn">🍯 ' + esc(fa) + '</div>' : '') + d.map(dayCard).join('');
  }
  function loadKarsi() {
    var a = ap(), d = data && data.days || [], el = $('hvKarsi');
    if (!a || !d.length || !el) return;
    function ly(iso) { return (Number(iso.slice(0, 4)) - 1) + iso.slice(4); }
    var url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + a.lat + '&longitude=' + a.lon + '&start_date=' + ly(d[0].date) + '&end_date=' + ly(d[d.length - 1].date) +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto';
    fetch(url).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      var t = (j.daily && j.daily.time) || []; if (!t.length) throw 0;
      var x = $('hvKarsi'); if (!x) return;
      var sumNow = 0, sumLy = 0;
      x.innerHTML = d.map(function (k, i) {
        var hi = j.daily.temperature_2m_max[i], lo = j.daily.temperature_2m_min[i], mm = j.daily.precipitation_sum[i] || 0;
        sumNow += k.mm || 0; sumLy += mm;
        var df = (k.hi != null && hi != null) ? Math.round(k.hi - hi) : null;
        return '<div class="hv-row"><span class="k">' + esc(dayLab(k.date, i)) + '</span><span class="v">Bu yıl ' + r0(k.hi) + '°/' + r0(k.lo) + '° · geçen yıl ' + r0(hi) + '°/' + r0(lo) + '°' +
          (df != null ? ' <b style="color:' + (df >= 0 ? '#e8590c' : '#1c7ed6') + '">(' + (df > 0 ? '+' : '') + df + '°)</b>' : '') + '<br>💧 ' + (Math.round((k.mm || 0) * 10) / 10) + ' mm · geçen yıl ' + (Math.round(mm * 10) / 10) + ' mm</span></div>';
      }).join('') + '<div class="hv-sub">Toplam yağış: bu yıl ' + Math.round(sumNow) + ' mm · geçen yıl ' + Math.round(sumLy) + ' mm</div>';
    }).catch(function () { var x = $('hvKarsi'); if (x) x.innerHTML = '<div class="hv-empty">Geçen yılın bu günlere ait kaydı alınamadı.</div>'; });
  }
  function route() {
    var h = (location.hash || '').replace('#', '');
    var ok = { '10gun': 1, saatlik: 1, ucus: 1, don: 1, isgunu: 1, nektar: 1, karsi: 1, bal: 1 }[h];
    document.body.classList.toggle('hv-in-detail', !!ok);
    $('hvDetail').innerHTML = ok ? view(h) : '';
    $('hvTen').innerHTML = renderTen();
    if (h === 'karsi') loadKarsi();
    var sc = document.querySelector('.phone>.screen'), dv = $('hvDetail');
    void dv; if (sc) sc.scrollTop = 0;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-hv-back]');
    if (b) { e.preventDefault(); if (history.length > 1 && document.referrer.indexOf('hava.html') >= 0) history.back(); else location.hash = ''; return; }
    var n = e.target.closest && e.target.closest('#bkNote');
    if (n && n.getAttribute('href') === '#') { e.preventDefault(); load(true); }
  });
  window.addEventListener('hashchange', route);

  function load(force) {
    var a = ap();
    if (!a) { data = null; renderAll(); return; }
    try { localStorage.setItem(SEL_KEY, JSON.stringify({ id: a.id, label: a.place || a.name, at: Date.now() })); } catch (e) { /* ignore */ }
    if (force) { try { localStorage.removeItem(CACHE + a.id); } catch (e) { /* ignore */ } }
    hvLoading = true;
    var done = function (d) { if (ap() !== a) return; hvLoading = false; data = d || null; renderAll(); };
    fetchFc(a).then(done, function () { done(null); });
  }
  function renderAll() { renderGrid(); renderScope(); route(); }
  function step(k) {
    if (!aps.length) return; idx = ((idx + k) % aps.length + aps.length) % aps.length; data = null; hvLoading = true;
    var p = pinned(); if (p) { try { localStorage.setItem(LOCK_KEY, JSON.stringify({ locked: true, id: String(ap().id) })); } catch (e) { /* ignore */ } }
    try { var u = new URLSearchParams(location.search); u.set('apiary', ap().id); history.replaceState(null, '', 'hava.html?' + u.toString() + location.hash); } catch (e) { /* ignore */ }
    renderAll(); load();
  }
  $('bkPrev').addEventListener('click', function () { step(-1); });
  $('bkNext').addEventListener('click', function () { step(1); });
  renderAll(); load();
})();
