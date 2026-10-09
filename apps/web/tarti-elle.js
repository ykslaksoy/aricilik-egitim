/**
 * SüperArı — Elle tartım (manuel ağırlık kaydı). Cihaz/tartı bağlı olsa da her zaman kullanılabilir.
 * Depo: superari.tartiElle.v1 (Canlı, buluta eşitlenir) / superari.tartiElle.demo.v1 (Demo, «Demo» etiketli, eşitlenmez).
 * Kayıt: { id:'tw…', hiveId, at:'YYYY-MM-DDTHH:MM', date, kg, addKg?, kat?, besleme?, note?, demo?, syncFrom? }
 * addKg: tartımdan önce eklenen kat / besleme ağırlığı; grafikte sonraki okumalardan düşülür (düzeltilmiş eğri).
 */
(function (global) {
  'use strict';
  var KEY_LIVE = 'superari.tartiElle.v1', KEY_DEMO = 'superari.tartiElle.demo.v1';
  function isLive() { try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function key() { return isLive() ? KEY_LIVE : KEY_DEMO; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLocal() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function fmtAt(at) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(at || ''); return m ? Number(m[3]) + ' ' + AY[Number(m[2]) - 1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
  function read() { try { var v = JSON.parse(localStorage.getItem(key()) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(l) { try { localStorage.setItem(key(), JSON.stringify(l)); } catch (e) { /* ignore */ } try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e2) { /* ignore */ } }
  function parseKg(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; }

  /* ---------------- Kovandaki malzeme darası (TEK YER) ----------------
   * Kovana konan kayıtlı kalemler tartıdan dara olarak düşülür (elle ve sensör tartısı); çıkarılınca / tükenince dara kalkar.
   *  - Varroa şeridi: tedavi kaydı (birim «serit») tarihinden «Şeritleri çıkar» görevi tamamlanana kadar.
   *  - Yapışkan altlık: «Yapışkan altlık koy» görevi tamamlanınca → «Altlığı çıkar» görevi tamamlanana / altlık sayımı girilene kadar.
   *  - Şurup / kek / polen pastası (besleme kaydı): besleyicideki yem henüz koloni stoğu değildir → konan ağırlık dara; arılar aldıkça
   *    doğrusal azalır ve consumeDays sonunda sıfırlanır (alınan yem stoğa dönüşür, net tartıya geçer). Ballı çerçeve doğrudan stoktur → dara değil.
   * Birim ağırlıklar: şurup yoğunluğu sakaroz çözeltisi tablolarından (1:1 ≈ %50 şeker → 1,23 kg/L; 2:1 ≈ %67 → 1,33 kg/L).
   * VARSAYIM (üretici ağırlığı yayımlanmamış): şerit 10 g/adet, yapışkan altlık 150 g; tüketim süresi şurup 1:1 3 gün, 2:1 4 gün, kek 14 gün, polen 14 gün. */
  var MATERIAL = {
    seritKg: 0.01, altlikKg: 0.15, feederKg: 0.6, /* besleyici: kovana göre girilir; 0,6 kg yalnız başlangıç önerisi (VARSAYIM: plastik çerçeve besleyici) */
    feedKg: { surup11: 1.23, surup21: 1.33, kek: 1, polen: 1 }, /* kg / birim (L ya da kg) */
    consumeDays: { surup11: 3, surup21: 4, kek: 14, polen: 14 }
  };
  /* Besleyici (kovan ayarı): { kg, periods:[{ from, to|null }] } — takılı olduğu günlerde dara. Canlı / Demo ayrı depo. */
  var FEED_KEY_LIVE = 'superari.besleyici.v1', FEED_KEY_DEMO = 'superari.besleyici.demo.v1';
  function fkey() { return isLive() ? FEED_KEY_LIVE : FEED_KEY_DEMO; }
  function fread() { try { var v = JSON.parse(localStorage.getItem(fkey()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function fwrite(v) { try { localStorage.setItem(fkey(), JSON.stringify(v)); } catch (e) { /* ignore */ } try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e2) { /* ignore */ } }
  var feeder = {
    get: function (hiveId) { var f = fread()[String(hiveId)] || {}; var ps = Array.isArray(f.periods) ? f.periods : []; var last = ps[ps.length - 1];
      return { kg: Number(f.kg) > 0 ? Number(f.kg) : null, on: !!(last && !last.to), since: last && !last.to ? last.from : null, periods: ps }; },
    setKg: function (hiveId, kg) { var all = fread(), k = String(hiveId), n = Math.round(Number(String(kg).replace(',', '.')) * 100) / 100; if (!(n > 0 && n < 20)) return false;
      all[k] = all[k] || { periods: [] }; all[k].kg = n; fwrite(all); return true; },
    setOn: function (hiveId, on, date) { var all = fread(), k = String(hiveId), d = dOf(date) || dOf(nowLocal()); all[k] = all[k] || { periods: [] }; var ps = all[k].periods = all[k].periods || [];
      var last = ps[ps.length - 1]; if (on && !(last && !last.to)) ps.push({ from: d, to: null }); if (!on && last && !last.to) last.to = d; fwrite(all); return true; }
  };
  function dOf(v) { return String(v || '').slice(0, 10); }
  function dayDiff(a, b) { var pa = a.split('-'), pb = b.split('-'); return Math.round((new Date(+pb[0], pb[1] - 1, +pb[2]) - new Date(+pa[0], pa[1] - 1, +pa[2])) / 86400000); }
  /** at (YYYY-MM-DD[THH:MM]) anında kovandaki malzeme darası: { kg, items:[{ label, kg }] }. opts.noFeed: besleme kalemleri hariç. */
  function tare(hiveId, at, opts) {
    var D = global.SuperAriDemo, day = dOf(at) || dOf(nowLocal()), items = [], o = opts || {};
    if (!D || !D.records) return { kg: 0, items: items };
    var rec = null; try { rec = D.records.recordsFor(hiveId); } catch (e) { rec = null; }
    var tasks = []; try { tasks = D.taskStore.all().filter(function (t) { return String(t.hiveId) === String(hiveId); }); } catch (e) { tasks = []; }
    function doneAfter(re, from) {
      return tasks.filter(function (t) { return t.done && t.doneAt && re.test(String(t.title || '') + ' ' + String(t.note || '')) && dOf(t.doneAt) >= from; })
        .map(function (t) { return dOf(t.doneAt); }).sort()[0] || null;
    }
    if (rec) {
      (rec.disease || []).forEach(function (r) {
        if (r.disease !== 'varroa' || !r.treatment || r.doseUnit !== 'serit' || !(Number(r.dose) > 0) || r.date > day) return;
        var out = doneAfter(/^Şeritleri çıkar|\[varroa-serit\]/i, r.date);
        if (out && out <= day) return;
        items.push({ label: String(r.treatment).split(' (')[0] + ' ' + num(r.dose) + ' şerit', kg: Math.round(Number(r.dose) * MATERIAL.seritKg * 1000) / 1000 });
      });
      if (!o.noFeed) (rec.feed || []).forEach(function (r) {
        var per = MATERIAL.feedKg[r.type], cd = MATERIAL.consumeDays[r.type];
        if (!per || !cd || !(Number(r.amount) > 0) || r.date > day) return;
        var left = 1 - dayDiff(r.date, day) / cd; if (left <= 0) return;
        var kg = Math.round(Number(r.amount) * per * left * 100) / 100;
        if (kg > 0) items.push({ label: (r.type === 'kek' ? 'Kek' : r.type === 'polen' ? 'Polen pastası' : r.type === 'surup11' ? 'Şurup 1:1' : 'Şurup 2:1') + ' · kalan (tahmin)', kg: kg });
      });
    }
    var fd = feeder.get(hiveId);
    if (fd.kg && fd.periods.some(function (p) { return p.from <= day && (!p.to || p.to > day); })) items.push({ label: 'Besleyici', kg: fd.kg });
    var put = tasks.filter(function (t) { return t.done && t.doneAt && /\[varroa-altlik:koy\]/.test(String(t.note || '')) && dOf(t.doneAt) <= day; }).map(function (t) { return dOf(t.doneAt); }).sort().pop();
    if (put) {
      var took = doneAfter(/\[varroa-altlik:say\]|^Altlığı çıkar/i, put);
      var cnt = rec ? (rec.disease || []).filter(function (r) { return r.disease === 'varroa' && r.method === 'tabla' && r.date >= put && r.date <= day; })[0] : null;
      if (!(took && took <= day) && !cnt) items.push({ label: 'Yapışkan altlık', kg: MATERIAL.altlikKg });
    }
    var kg = Math.round(items.reduce(function (a, x) { return a + x.kg; }, 0) * 100) / 100;
    return { kg: kg, items: items };
  }
  function num2(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }
  function tareNote(t) { return t && t.kg > 0 ? 'kovandaki malzeme düşüldü: ' + num2(t.kg) + ' kg' : ''; }
  function netOf(x) { return Math.round((Number(x.kg) - (Number(x.tareKg) || 0)) * 100) / 100; }

  function all() { return read().slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }); }
  function list(hiveId) { var n = Number(hiveId); return all().filter(function (x) { return Number(x.hiveId) === n; }); }
  function latest(hiveId) { return list(hiveId)[0] || null; }
  function add(o) {
    o = o || {};
    var kg = parseKg(o.kg);
    if (!(kg > 0 && kg < 400)) throw new Error('Geçerli bir ağırlık girin (kg)');
    var at = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(o.at || '')) ? String(o.at).slice(0, 16) : nowLocal();
    var src = o.source === 'otomatik' ? 'otomatik' : (o.source === 'talep' ? 'talep' : (o.source === 'bakim-revize' ? 'bakim-revize' : 'elle'));
    var r = { id: 'tw' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), hiveId: Number(o.hiveId), at: at, date: at.slice(0, 10), kg: kg, source: src };
    if (r.source === 'otomatik' || r.source === 'talep') {
      if (o.deviceId) r.deviceId = String(o.deviceId).slice(0, 60);
      if (o.requestedAt) r.requestedAt = String(o.requestedAt).slice(0, 16);
      if (read().some(function (x) { return (x.source === 'otomatik' || x.source === 'talep') && Number(x.hiveId) === r.hiveId && x.at === at; })) throw new Error('Bu okuma zaten kaydedildi');
    }
    if (r.source === 'bakim-revize') {
      var lk = String(o.linkedEventId || '').slice(0, 48);
      if (!lk) throw new Error('Bakım revizesi için olay bağlantısı gerekli');
      if (read().some(function (x) { return x.source === 'bakim-revize' && Number(x.hiveId) === r.hiveId && (x.linkedEventId === lk || (x.syncFrom && x.syncFrom.indexOf(lk) >= 0)); })) throw new Error('Bu bakım kaydı için revize zaten yapıldı');
      r.linkedEventId = lk;
      var rd = parseKg(o.revizeDeltaKg); if (isFinite(rd) && rd !== 0) r.revizeDeltaKg = rd;
    }
    if (!isFinite(r.hiveId)) throw new Error('Kovan seçin');
    if (o.kat) r.kat = true;
    if (o.besleme) r.besleme = true;
    if (Array.isArray(o.syncFrom) && o.syncFrom.length) r.syncFrom = o.syncFrom.map(function (s) { return String(s).slice(0, 48); }).slice(0, 12);
    var ad = parseKg(o.addKg); if (ad > 0 && ad < 100 && (r.kat || r.besleme)) r.addKg = ad;
    var note = String(o.note || '').trim(); if (note) r.note = note.slice(0, 200);
    /* dara: kayıt anındaki kovandaki malzeme (sonraki kayıt değişikliklerinden etkilenmesin diye saklanır). Elle eklenen besleme ağırlığı varsa besleme kalemleri düşülmez (çift sayım yok). */
    try { var tw = tare(r.hiveId, at, { noFeed: !!(r.besleme && r.addKg) }); if (tw.kg > 0) { r.tareKg = tw.kg; r.tareItems = tw.items.map(function (x) { return x.label; }).slice(0, 6); } } catch (eT) { /* ignore */ }
    if (!isLive()) r.demo = true;
    var l = read(); l.push(r); write(l);
    return r;
  }
  function revertRevizeRow(x) {
    if (!x || x.source !== 'bakim-revize' || !Number(x.revizeDeltaKg)) return;
    var rev = Number(x.revizeDeltaKg), n = Number(x.hiveId);
    var BD = global.SuperAriTartiBakim;
    var cur = BD && BD.currentWeightKg ? BD.currentWeightKg(n) : Number(x.kg);
    try {
      var D = global.SuperAriDemo;
      if (D && D.loadHives && D.saveHives) {
        var w = Math.round((cur - rev) * 100) / 100;
        D.saveHives(D.loadHives().map(function (h) { return h.id === n ? Object.assign({}, h, { weightKg: w > 0 ? w : h.weightKg }) : h; }));
      }
    } catch (eW) { /* ignore */ }
  }
  function removeRaw(id) { write(read().filter(function (r) { return r.id !== id; })); }
  function remove(id) {
    var l = read(), x = l.filter(function (r) { return r.id === id; })[0];
    if (x) revertRevizeRow(x);
    removeRaw(id);
  }
  /** Grafik için: eskiden yeniye, eklenen kat/besleme ağırlığı sonraki okumalardan düşülmüş. */
  function series(hiveId, days) {
    var from = new Date(Date.now() - (days || 30) * 86400000).toISOString().slice(0, 10);
    var l = list(hiveId).slice().reverse(), off = 0;
    return l.map(function (x) {
      off += Number(x.addKg) || 0;
      return { at: x.at, date: x.date, kg: x.kg, net: Math.round((x.kg - off - (Number(x.tareKg) || 0)) * 100) / 100, x: x };
    }).filter(function (p) { return p.date >= from; });
  }
  function flagText(x) {
    var f = []; if (x.kat) f.push('kat eklendi'); if (x.besleme) f.push('besleme yapıldı');
    var a = f.length ? f.join(', ') + (x.addKg ? ' (−' + num(x.addKg) + ' kg düşüldü)' : '') : '';
    var b = x.tareKg ? 'net ' + num2(netOf(x)) + ' kg · ' + tareNote({ kg: x.tareKg }) : '';
    return [a, b].filter(Boolean).join(' · ');
  }
  function rowHtml(x, opts) {
    var D = global.SuperAriDemo, h = opts && opts.showHive && D ? D.hiveById(x.hiveId) : null;
    var tag = x.source === 'otomatik' ? 'Cihaz' : (x.source === 'talep' ? 'Talep' : (x.source === 'bakim-revize' ? 'Bakım' : 'Elle'));
    var tagCls = x.source === 'otomatik' || x.source === 'talep' ? ' oto' : (x.source === 'bakim-revize' ? ' rev' : '');
    return '<div class="te-row"><span class="te-tag' + tagCls + '">' + tag + '</span><span class="te-main"><b>' + num(x.kg) + ' kg</b>' + (x.revizeDeltaKg ? ' <small>(' + (x.revizeDeltaKg > 0 ? '+' : '−') + num(Math.abs(x.revizeDeltaKg)) + ')</small>' : '') + (h ? ' · ' + esc(h.name) : '') + ' <small>' + esc(fmtAt(x.at)) + (x.demo ? ' · Demo' : '') + (x.source === 'bakim-revize' ? ' · Otomatik revize' : '') + '</small>' +
      (flagText(x) || x.note ? '<small class="te-sub">' + esc([flagText(x), x.note || ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</span>' +
      (opts && opts.del ? '<button type="button" class="te-del" data-te-del="' + esc(x.id) + '" aria-label="Sil">🗑</button>' : '') + '</div>';
  }
  /* ---- Otomatik tartı (sensör) ----
   * Kovana bağlı «tarti» cihazı: SuperAriDevices (device-runtime.js). Canlı okumalar 'superari.sensor.tarti.v1' = [{ hiveId, at, kg }] (cihaz entegrasyonu yazar);
   * canlıda okuma yoksa uydurma değer GÖSTERİLMEZ («henüz veri gelmedi»). Demo: örnek cihazda kovanın örnek ağırlığından 8 günlük örnek seri (Örnek etiketi). */
  var SENSOR_KEY = 'superari.sensor.tarti.v1';
  function scaleDevice(hiveId) {
    var Dv = global.SuperAriDevices; if (!Dv || !Dv.listDevices) return null;
    var l = []; try { l = Dv.listDevices(); } catch (e) { l = []; }
    return l.filter(function (d) { return d && d.tip === 'tarti' && d.hiveId != null && Number(d.hiveId) === Number(hiveId); })[0] || null;
  }
  function minsAgoAt(mins) { var d = new Date(Date.now() - (Number(mins) || 0) * 60000); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  /** { device, status, at, kg, pts: [{ date, kg }] (eski→yeni, ≤ 8 gün), d7 (7 günlük değişim, kg), demo } · cihaz yoksa null · cihaz var veri yoksa kg null. */
  function autoReading(hiveId) {
    var dv = scaleDevice(hiveId); if (!dv) return null;
    var o = { device: dv, status: dv.status || 'yok', at: null, kg: null, pts: [], d7: null, demo: dv.source === 'demo' };
    if (o.demo) {
      var D = global.SuperAriDemo, h = D && D.hiveById ? D.hiveById(hiveId) : null; if (!h || !(Number(h.weightKg) > 0)) return o;
      var w = Number(h.weightKg), dl = Number(h.deltaKg) || 0;
      for (var i = 7; i >= 0; i--) { var t = (7 - i) / 7, wob = Math.sin((Number(hiveId) || 1) * 1.7 + i) * 0.25; o.pts.push({ date: minsAgoAt(i * 1440 + (dv.lastMins || 0)).slice(0, 10), kg: Math.round((w - dl * (1 - t) + (i ? wob : 0)) * 10) / 10 }); }
      o.at = minsAgoAt(dv.lastMins || 0); o.kg = Math.round(w * 10) / 10;
    } else {
      var all = []; try { all = JSON.parse(localStorage.getItem(SENSOR_KEY) || '[]'); } catch (e) { all = []; }
      var mine = (Array.isArray(all) ? all : []).filter(function (x) { return x && Number(x.hiveId) === Number(hiveId) && Number(x.kg) > 0 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(x.at || '')); })
        .sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      if (!mine.length) return o;
      var last = mine[mine.length - 1], from = dOf(minsAgoAt(8 * 1440)), byDay = {};
      mine.forEach(function (x) { if (dOf(x.at) >= from) byDay[dOf(x.at)] = Number(x.kg); });
      o.pts = Object.keys(byDay).sort().map(function (d) { return { date: d, kg: byDay[d] }; });
      o.at = String(last.at).slice(0, 16); o.kg = Math.round(Number(last.kg) * 10) / 10;
    }
    if (o.pts.length >= 2) o.d7 = Math.round((o.pts[o.pts.length - 1].kg - o.pts[0].kg) * 10) / 10;
    return o;
  }
  function agoTxt(at) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(at || ''); if (!m) return '';
    var mins = Math.max(0, Math.round((Date.now() - new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).getTime()) / 60000));
    return mins < 60 ? mins + ' dk önce' : (mins < 1440 ? Math.floor(mins / 60) + ' sa önce' : Math.floor(mins / 1440) + ' gün önce');
  }
  function sparkSvg(pts) {
    if (!pts || pts.length < 2) return '';
    var ks = pts.map(function (p) { return p.kg; }), mn = Math.min.apply(null, ks), mx = Math.max.apply(null, ks), rg = mx - mn || 1, W = 200, H = 44;
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + Math.round(i / (pts.length - 1) * W) + ' ' + Math.round(H - 4 - (p.kg - mn) / rg * (H - 8)); }).join(' ');
    return '<svg class="te-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="none" stroke="#2f9e44" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  var ST_TXT = { bagli: 'Bağlı', kopuk: 'Bağlı değil (kopuk)', arizali: 'Arızalı', yok: 'Bağlı değil' };
  function autoHtml(a) {
    var D = global.SuperAriDemo, ok = a.status === 'bagli', has = a.kg != null;
    var head = '<div class="te-auto-h"><span class="te-tag oto">Otomatik tartı</span><b>' + esc(ST_TXT[a.status] || 'Bağlı değil') + '</b>' + (a.demo ? ' <small>· Örnek veri</small>' : '') + '</div>';
    if (!has) {
      var pilHint = '';
      try {
        var SH = global.SuperAriSensorHealth;
        if (SH && SH.deviceBatteryOfflineHint && a.device && a.device.hiveId != null) {
          pilHint = SH.deviceBatteryOfflineHint(a.device.hiveId, 'tarti');
        }
      } catch (eP) { pilHint = ''; }
      return '<section class="te-auto" data-te-auto>' + head + '<p class="te-auto-n">Cihaz kayıtlı ama henüz ağırlık verisi gelmedi. Elle tartım girin.'
        + (pilHint ? ' ' + esc(pilHint) : '') + '</p></section>';
    }
    var tr = a.d7 == null ? '7 gün: veri az' : '7 gün: ' + (a.d7 > 0 ? '+' : (a.d7 < 0 ? '−' : '')) + num(Math.abs(a.d7)) + ' kg';
    return '<section class="te-auto' + (ok ? '' : ' warn') + '" data-te-auto>' + head +
      '<div class="te-auto-v"><span class="te-auto-kg">' + num(a.kg) + ' kg</span><span class="te-auto-at">' + esc(fmtAt(a.at)) + ' · ' + esc(agoTxt(a.at)) + '</span></div>' +
      '<div class="te-auto-tr"><span>' + esc(tr) + '</span>' + sparkSvg(a.pts) + '</div>' +
      (a.status === 'arizali' ? '<p class="te-auto-n">Cihaz arızalı: bu değer güvenilir değil. Elle tartım girin.</p>'
        : '<button type="button" class="te-btn ok" data-te-auto-save>✓ Bu değeri kaydet' + (ok ? '' : ' (son okuma)') + '</button>' + (ok ? '' : (function () {
          var pilHint = '';
          try {
            var SH = global.SuperAriSensorHealth;
            if (SH && SH.deviceBatteryOfflineHint && a.device && a.device.hiveId != null) {
              pilHint = SH.deviceBatteryOfflineHint(a.device.hiveId, 'tarti');
            }
          } catch (eP) { pilHint = ''; }
          return '<p class="te-auto-n">Cihaz şu an bağlı değil; gösterilen son okumadır.'
            + (pilHint ? ' ' + esc(pilHint) : '') + '</p>';
        })())) +
      '</section>';
  }
  var css = '.te-back{position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9100;display:flex;align-items:flex-end;justify-content:center;}' +
    '.te{background:#fffaf2;width:100%;max-width:560px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;color:#3d2616;overflow-wrap:anywhere;}' +
    '.te h2{margin:0 0 4px;font-size:18px;display:flex;align-items:center;gap:8px;}.te .te-x{margin-left:auto;flex:none;border:0;background:#efe4d2;border-radius:999px;width:64px;height:64px;font-size:26px;cursor:pointer;}' +
    '.te form{display:grid;gap:10px;}.te label.f{display:grid;gap:4px;font-size:13px;font-weight:700;color:#5c4813;min-width:0;}' +
    '.te input[type=datetime-local],.te input[type=text],.te input[type=number],.te select{font:inherit;font-size:18px;min-height:64px;padding:9px 12px;border-radius:12px;border:1px solid #d8c7aa;background:#fff;width:100%;box-sizing:border-box;min-width:0;}' +
    '.te .te-kg{font-size:26px;font-weight:800;text-align:center;}.te .te-chk{display:flex;gap:12px;align-items:center;font-size:16px;font-weight:700;min-height:64px;padding:0 12px;border:1px solid #e8dcc6;border-radius:12px;background:#fff;box-sizing:border-box;}.te .te-chk input{width:30px;height:30px;}' +
    '.te-btn{font:inherit;font-size:18px;font-weight:800;min-height:64px;border-radius:14px;border:1px solid #3d2616;background:#3d2616;color:#fff;cursor:pointer;width:100%;}' +
    '.te-btn.ok{background:#1b5e20;border-color:#1b5e20;}.te-btn:disabled{opacity:.5;}' +
    '.te-auto{border:2px solid #b2dfb5;background:#f1faf2;border-radius:14px;padding:12px;margin:0 0 12px;display:grid;gap:8px;}.te-auto.warn{border-color:#ffd8a8;background:#fff8ef;}.te-auto.warn .te-auto-kg{color:#8a5a00;}.te-auto.warn .te-spark path{stroke:#c08a2b;}' +
    '.te-auto-h{display:flex;gap:8px;align-items:center;font-size:15px;flex-wrap:wrap;}.te-auto-v{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}.te-auto-kg{font-size:34px;font-weight:900;color:#1b5e20;}.te-auto-at{font-size:14px;color:#5c4813;font-weight:700;}' +
    '.te-auto-tr{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:800;color:#2d4a1e;}.te-spark{flex:1;height:44px;min-width:0;}.te-auto-n{margin:0;font-size:14px;color:#6b4a12;font-weight:650;}' +
    '.te-sec{margin:12px 0 6px;font-size:16px;font-weight:800;}.te-tag.oto{background:#d3f9d8;color:#1b5e20;border-color:#8ce99a;}' +
    '.te-noscale{display:flex;gap:10px;align-items:center;margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#f4f6f8;border:1px solid #cfd8e3;font-size:14px;color:#3d4a5a;font-weight:650;}' +
    '.te-link{display:flex;align-items:center;justify-content:center;min-height:64px;padding:0 14px;border-radius:12px;border:1px solid #d8c7aa;background:#fff;color:#3d2616;font-weight:800;text-decoration:none;box-sizing:border-box;}.te-noscale .te-link{flex:none;}' +
    '.te-msg{margin:0;font-size:14px;}.te-msg.ok{color:#1b7a3d;font-weight:700;}.te-msg.err{color:#c92a2a;font-weight:700;}' +
    '.te-row{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid #f1e8da;font-size:14px;}.te-row:first-child{border-top:0;}' +
    '.te-tag{flex:none;background:#fff3bf;color:#7a5b00;border:1px solid #ffe066;border-radius:999px;font-size:11px;font-weight:800;padding:1px 7px;margin-top:1px;}.te-tag.rev{background:#e7f5ff;color:#1864ab;border-color:#a5d8ff;}' +
    '.te-rev{margin:-2px 0 8px;padding:10px 12px;border-radius:12px;background:#f1f8ff;border:1px solid #a5d8ff;font-size:13px;font-weight:700;color:#1864ab;}.te-rev button{font:inherit;font-size:13px;font-weight:800;border-radius:10px;border:1px solid #74c0fc;background:#fff;color:#1864ab;padding:6px 10px;margin-top:8px;cursor:pointer;}' +
    '.te [hidden]{display:none!important;}.te-sync{display:flex;flex-wrap:wrap;gap:6px;margin:-2px 0 6px;}.te-sync span{font-size:12px;font-weight:800;padding:5px 10px;border-radius:999px;background:#e7f5ff;color:#1864ab;border:1px solid #a5d8ff;}' +
    '.te-tare{margin:-4px 0 0;font-size:13px;font-weight:700;color:#5c4813;background:#fff3bf;border:1px solid #ffe066;border-radius:10px;padding:6px 8px;}' +
    '.te-main{flex:1;min-width:0;}.te-main small{color:#6b5a48;}.te-sub{display:block;}.te-del{flex:none;border:0;background:#f8f1e6;border-radius:12px;font-size:20px;cursor:pointer;width:64px;height:64px;}';
  function ensureCss() { if (document.getElementById('teCss')) return; var s = document.createElement('style'); s.id = 'teCss'; s.textContent = css; document.head.appendChild(s); }
  function close() { var b = document.getElementById('teSheet'); if (b) b.remove(); }
  /** Elle tartım formu. opts: { apiaryId, onSaved } — hiveId boşsa kovan seçilir. */
  function open(hiveId, opts) {
    opts = opts || {};
    var D = global.SuperAriDemo; if (!D) return;
    ensureCss(); close();
    var h = hiveId != null && hiveId !== '' ? D.hiveById(hiveId) : null;
    var aps = D.loadApiaries(), apSel = String((h && h.apiaryId) || opts.apiaryId || (aps[0] && aps[0].id) || '');
    function hiveOpts(ap) { return D.loadHives().filter(function (x) { return String(x.apiaryId) === String(ap) && x.colonyState !== 'birlestirildi' && x.colonyState !== 'sonuk'; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join(''); }
    var back = document.createElement('div'); back.className = 'te-back'; back.id = 'teSheet';
    var auto = h ? autoReading(h.id) : null;
    var formHtml = '<form data-te-form autocomplete="off" onsubmit="return false">' +
      (h ? '' : '<label class="f">Arılık<select name="ap">' + aps.map(function (a) { return '<option value="' + esc(a.id) + '"' + (String(a.id) === apSel ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="f">Kovan<select name="hive">' + hiveOpts(apSel) + '</select></label>') +
      '<label class="f">Ağırlık (kg)<input class="te-kg" type="number" name="kg" inputmode="decimal" step="0.1" min="1" max="400" placeholder="ör. 42,5" required></label>' +
      '<label class="f">Tarih / saat<input type="datetime-local" name="at" value="' + nowLocal() + '"></label>' +
      '<p class="te-tare" data-te-tare hidden></p>' +
      '<div class="te-sync" data-te-sync hidden></div>' +
      '<div class="te-rev" data-te-rev hidden></div>' +
      '<label class="te-chk"><input type="checkbox" name="kat"> Kat eklendi</label>' +
      '<label class="te-chk"><input type="checkbox" name="besleme"> Besleme yapıldı</label>' +
      '<label class="f" data-te-add hidden>Eklenen ağırlık (kg, isteğe bağlı — sonraki okumalardan düşülür)<input type="number" name="addKg" inputmode="decimal" step="0.1" min="0" max="100" placeholder="ör. kat ≈ 8, 5 L şurup ≈ 6,5"></label>' +
      '<label class="f">Not (isteğe bağlı)<input type="text" name="note" maxlength="200"></label>' +
      '<button type="button" class="te-btn" data-te-save>Elle tartımı kaydet</button><p class="te-msg" data-te-msg role="status"></p></form>';
    /* Kovan seçiliyse: cihaz varsa önce otomatik okuma (tek dokunuşla kaydet), altında elle tartım her zaman; cihaz yoksa elle tartım önce + Cihazlar notu */
    var devQ = h ? 'cihazlar.html?apiary=' + encodeURIComponent(h.apiaryId) + '&tip=tarti#devList' : 'cihazlar.html';
    back.innerHTML = '<div class="te" role="dialog" aria-modal="true" aria-label="Tartım"><h2>⚖ ' + (h ? esc(h.name) + ' · Tartım' : 'Elle tartım') + '<button type="button" class="te-x" data-te-close aria-label="Kapat">×</button></h2>' +
      '<p style="margin:0 0 10px;font-size:13px;color:#6b5a48;">' + (auto ? 'Otomatik tartı okuması aşağıda; elle tartım her zaman eklenebilir.' : 'Kovanı el kantarı / baskülle tartıp yazın. Tartı cihazı bağlı olsa da elle kayıt her zaman eklenebilir.') + (isLive() ? '' : ' · Demo') + '</p>' +
      (auto ? autoHtml(auto) + '<h3 class="te-sec">Elle tartım</h3>' : '') + formHtml +
      (h && !auto ? '<div class="te-noscale"><span>📡 Bu kovanda tartı cihazı yok. Otomatik tartı Cihazlar sayfasından eklenebilir.</span><a class="te-link" href="' + devQ + '">Cihazlar ›</a></div>' : '') +
      '<div data-te-list style="margin-top:10px;"></div>' +
      (h ? '<a class="te-link" style="margin-top:10px;" href="kovan.html?id=' + encodeURIComponent(h.id) + '">🏠 Kovan detayı ›</a>' : '') + '</div>';
    document.body.appendChild(back);
    var f = back.querySelector('[data-te-form]');
    var syncHint = null, revHint = null;
    function renderRev(hid) {
      var revEl = back.querySelector('[data-te-rev]');
      if (!revEl) return;
      revHint = null;
      revEl.hidden = true;
      revEl.innerHTML = '';
      if (hid == null || hid === '') return;
      var BD = global.SuperAriTartiBakim;
      if (!BD || !BD.pendingRevize) return;
      try { revHint = BD.pendingRevize(hid); } catch (eR) { revHint = null; }
      if (!revHint) return;
      var parts = [];
      if (revHint.autoApplied && revHint.autoApplied.length) parts.push('Otomatik uygulandı: ' + revHint.autoApplied.slice(0, 3).join(' · '));
      if (revHint.chips && revHint.chips.length) parts.push('Bekleyen: ' + revHint.chips.join(' · '));
      if (!parts.length) return;
      var sug = revHint.suggestedKg != null && revHint.netKg ? ' Önerilen tartı: ' + num(revHint.suggestedKg) + ' kg.' : '';
      revEl.hidden = false;
      revEl.innerHTML = parts.join('<br>') + sug + (revHint.netKg ? '<br><button type="button" data-te-rev-dismiss>Öneriyi kapat (otomatik revize zaten uygulandıysa elle girin)</button>' : '');
      if (revHint.suggestedKg != null && revHint.netKg && !f.elements.kg.value) f.elements.kg.value = String(revHint.suggestedKg).replace('.', ',');
    }
    if (h) {
      var TS = global.SuperAriTartiSync;
      if (TS && TS.hints) {
        try { syncHint = TS.hints(h.id, { list: list }); } catch (eS) { syncHint = null; }
        if (syncHint && (syncHint.kat || syncHint.besleme)) {
          if (syncHint.kat) f.elements.kat.checked = true;
          if (syncHint.besleme) f.elements.besleme.checked = true;
          var syncEl = back.querySelector('[data-te-sync]');
          if (syncEl && syncHint.chips && syncHint.chips.length) {
            syncEl.hidden = false;
            syncEl.innerHTML = syncHint.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
          }
        }
      }
      renderRev(h.id);
    }
    function curHive() { return h ? h.id : (f.elements.hive && f.elements.hive.value); }
    function renderList() {
      var hid = curHive(), l = hid != null && hid !== '' ? list(hid).slice(0, 6) : [];
      back.querySelector('[data-te-list]').innerHTML = l.length ? '<b style="font-size:14px;">Son tartımlar</b>' + l.map(function (x) { return rowHtml(x, { del: true }); }).join('') : '';
    }
    function toggleAdd() { back.querySelector('[data-te-add]').hidden = !(f.elements.kat.checked || f.elements.besleme.checked); showTare(); }
    function showTare() {
      var el = back.querySelector('[data-te-tare]'), hid = curHive(); if (!el) return;
      var tw = hid != null && hid !== '' ? tare(hid, f.elements.at.value, { noFeed: !!(f.elements.besleme.checked && parseKg(f.elements.addKg.value) > 0) }) : { kg: 0, items: [] };
      el.hidden = !(tw.kg > 0);
      el.textContent = tw.kg > 0 ? '⚖ ' + tareNote(tw).charAt(0).toLocaleUpperCase('tr') + tareNote(tw).slice(1) + ' (' + tw.items.map(function (x) { return x.label; }).join(', ') + ')' : '';
    }
    function applySyncForHive(hid) {
      syncHint = null;
      var syncEl = back.querySelector('[data-te-sync]');
      if (syncEl) { syncEl.hidden = true; syncEl.innerHTML = ''; }
      if (hid == null || hid === '') return;
      var TS = global.SuperAriTartiSync;
      if (!TS || !TS.hints) return;
      try { syncHint = TS.hints(hid, { list: list }); } catch (eS) { syncHint = null; }
      if (!syncHint || !(syncHint.kat || syncHint.besleme)) return;
      if (syncHint.kat) f.elements.kat.checked = true;
      if (syncHint.besleme) f.elements.besleme.checked = true;
      if (syncEl && syncHint.chips && syncHint.chips.length) {
        syncEl.hidden = false;
        syncEl.innerHTML = syncHint.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
      }
      toggleAdd();
      renderRev(hid);
    }
    renderList(); showTare(); if (syncHint && (syncHint.kat || syncHint.besleme)) toggleAdd();
    back.addEventListener('change', function (e) {
      if (e.target.name === 'ap') { f.elements.hive.innerHTML = hiveOpts(e.target.value); renderList(); applySyncForHive(curHive()); showTare(); }
      else if (e.target.name === 'hive') { renderList(); applySyncForHive(curHive()); showTare(); }
      else if (e.target.name === 'at' || e.target.name === 'addKg') showTare();
      else if (e.target.name === 'kat' || e.target.name === 'besleme') toggleAdd();
    });
    back.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-te-rev-dismiss]')) {
        var hidD = curHive(), BD = global.SuperAriTartiBakim;
        if (BD && revHint && revHint.items && hidD != null) {
          revHint.items.forEach(function (it) { if (!it.applied && it.key) BD.dismiss(hidD, it.key); });
          renderRev(hidD);
        }
        return;
      }
      if (e.target === back || (e.target.hasAttribute && e.target.hasAttribute('data-te-close'))) { close(); if (typeof opts.onClose === 'function') opts.onClose(); return; }
      if (e.target.closest && e.target.closest('[data-te-auto-save]') && auto) {
        var ma = back.querySelector('[data-te-msg]'), bt = e.target.closest('[data-te-auto-save]');
        try { var ra = add({ hiveId: h.id, at: auto.at, kg: auto.kg, source: 'otomatik', deviceId: auto.device && auto.device.id }); bt.disabled = true; bt.textContent = '✓ Kaydedildi: ' + num(ra.kg) + ' kg (' + fmtAt(ra.at) + ')'; renderList(); if (typeof opts.onSaved === 'function') opts.onSaved(ra); }
        catch (err0) { bt.textContent = err0.message || 'Kaydedilemedi'; }
        void ma; return;
      }
      var del = e.target.closest ? e.target.closest('[data-te-del]') : null;
      if (del) { if (global.confirm && !global.confirm('Bu tartım silinsin mi?')) return; remove(del.getAttribute('data-te-del')); renderList(); if (opts.onSaved) opts.onSaved(); return; }
      if (!e.target.closest || !e.target.closest('[data-te-save]')) return;
      var m = back.querySelector('[data-te-msg]');
      try {
        var syncFrom = [];
        if (syncHint) {
          if (f.elements.kat.checked && syncHint.katSrc && syncHint.katSrc.length) syncFrom = syncFrom.concat(syncHint.katSrc);
          if (f.elements.besleme.checked && syncHint.beslemeSrc && syncHint.beslemeSrc.length) syncFrom = syncFrom.concat(syncHint.beslemeSrc);
        }
        var r = add({ hiveId: curHive(), at: f.elements.at.value, kg: f.elements.kg.value, kat: f.elements.kat.checked, besleme: f.elements.besleme.checked, addKg: f.elements.addKg.value, note: f.elements.note.value, syncFrom: syncFrom });
        m.className = 'te-msg ok'; m.textContent = '✓ Kaydedildi: ' + num(r.kg) + ' kg (' + fmtAt(r.at) + ')' + (r.tareKg ? ' · net ' + num2(netOf(r)) + ' kg, ' + tareNote({ kg: r.tareKg }) : '');
        f.elements.kg.value = ''; f.elements.note.value = ''; f.elements.kat.checked = false; f.elements.besleme.checked = false; f.elements.addKg.value = ''; syncHint = null;
        var syncEl2 = back.querySelector('[data-te-sync]'); if (syncEl2) { syncEl2.hidden = true; syncEl2.innerHTML = ''; }
        toggleAdd();
        renderList();
        if (typeof opts.onSaved === 'function') opts.onSaved(r);
      } catch (err) { m.className = 'te-msg err'; m.textContent = err.message || 'Kaydedilemedi'; }
    });
    if (!auto) setTimeout(function () { try { f.elements.kg.focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function muayeneHints(hiveId, opts) {
    var TS = global.SuperAriTartiSync;
    if (!TS || !TS.hints) return { kat: false, besleme: false, katSrc: [], beslemeSrc: [], chips: [] };
    return TS.hints(hiveId, Object.assign({ list: list }, opts || {}));
  }
  global.SuperAriTarti = { MATERIAL: MATERIAL, feeder: feeder, FEED_KEY_LIVE: FEED_KEY_LIVE, tare: tare, tareNote: tareNote, netOf: netOf, KEY_LIVE: KEY_LIVE, KEY_DEMO: KEY_DEMO, all: all, list: list, latest: latest, add: add, remove: remove, removeRaw: removeRaw, revertRevizeRow: revertRevizeRow, series: series, rowHtml: rowHtml, fmtAt: fmtAt, flagText: flagText, muayeneHints: muayeneHints, ensureCss: ensureCss, open: open, close: close, autoReading: autoReading, scaleDevice: scaleDevice, SENSOR_KEY: SENSOR_KEY };
})(window);
