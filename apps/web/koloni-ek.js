/* k89 — Koloni ızgarasındaki 7 yeni ekran (koloni-ek.html?ek=<anahtar>) ve düğme rozetleri.
   Veriler yalnız kayıtlardan gelir; kayıt yoksa dürüst «kayıt yok / veri yok». Depo: SuperAriDemo.colonyExtra (demo-data.js).
   Larva takvimi mevcut ana üretimi partilerini (colonyOps.batches) kullanır; görevler otomatik (batchTasks / colonyExtra.tasks). */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo, K = global.SuperAriKoloni;
  if (!D || !D.colonyExtra) return;
  var X = D.colonyExtra, O = D.colonyOps, R = D.records;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function fmt(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? Number(m[3]) + ' ' + AY[Number(m[2]) - 1] + (m[1] !== today().slice(0, 4) ? ' ' + m[1] : '') : ''; }
  function days(a, b) { return Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 86400000); }
  function num(v, d) { return String(Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).replace('.', ','); }
  function live() { try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function allHives(ap) { var hs = []; try { hs = D.loadHives() || []; } catch (e) { hs = []; } return !ap || ap === 'all' ? hs : hs.filter(function (h) { return String(h.apiaryId) === String(ap); }); }
  function activeHives(ap) { return allHives(ap).filter(X.isActiveHive); }
  function hiveName(id) { var h = id != null ? D.hiveById(id) : null; return h ? h.name : 'Kovan ' + id; }
  function apName(id) { var a = id ? D.apiaryById(id) : null; return a ? (a.name || a.place || '') : ''; }
  var LABEL = {}; ((K && K.EXTRA_TOPICS) || []).forEach(function (t) { LABEL[t.key] = t.label; });
  var KEYS = ['larva', 'kapan', 'kayip', 'hircin', 'hat', 'foto', 'vet'];
  var STEP_SHORT = { asilama: 'aşılama', kabul: 'kabul kontrolü', kapanma: 'hücre kapanır, sarsmayın', dagitim: 'çiftleşme kutusuna taşı', cikis: 'ana çıkışı', ucus: 'uçuş kontrolü', yumurta: 'yumurta kontrolü', yumurta2: 'son yumurta kontrolü' };

  /* ---------- Larva takvimi ---------- */
  function batchesIn(ap) {
    var ids = {}; allHives(ap).forEach(function (h) { ids[String(h.id)] = true; });
    return (O.batches() || []).filter(function (b) { return b.status === 'aktif' && (b.sourceHiveId != null ? ids[String(b.sourceHiveId)] : (!ap || ap === 'all')); });
  }
  function batchSteps(b) {
    var t = today();
    return O.GRAFT_TIMELINE.map(function (s) { var d = b.dates[s.key]; return { key: s.key, d: s.d, win: s.win, label: s.label, crit: !!s.crit, date: d, rel: days(t, d), batch: b }; });
  }
  function batchTitle(b) { var src = b.sourceHiveId != null ? D.hiveById(b.sourceHiveId) : null; return fmt(b.date) + ' aşılama · ' + (src ? src.name : 'anne kovan yok') + ' · ' + b.cups + ' yüksük'; }
  function larvaUpcoming(ap, from, to) {
    var out = []; batchesIn(ap).forEach(function (b) { batchSteps(b).forEach(function (s) { if (s.key !== 'asilama' && s.rel >= from && s.rel <= to) out.push(s); }); });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }
  /* ---------- Hat performansı ---------- */
  function lastVarroa(rec) { var v = (rec.disease || []).filter(function (r) { return r.disease === 'varroa' && r.infestation != null; })[0]; return v ? Number(v.infestation) : null; }
  function hatRows(ap, mode) {
    var year = today().slice(0, 4), groups = {}, order = [];
    allHives(ap).forEach(function (h) {
      if (h.colonyState === 'birlestirildi') return;
      var q = h.currentQueenId && D.colony ? D.colony.queenById(h.currentQueenId) : null;
      var key = mode === 'ana' ? (q ? q.id : '') : ((q && q.line) || '');
      var g = groups[key]; if (!g) { g = groups[key] = { key: key, hives: [], honey: [], str: [], var: [], tmp: [], winObs: 0, winLoss: 0, sub: mode === 'ana' && q ? [q.year, q.breed, q.line ? 'hat ' + q.line : ''].filter(Boolean).join(' · ') : '' }; order.push(key); }
      g.hives.push(h);
      var rec = {}; try { rec = R.recordsFor(h.id) || {}; } catch (e) { rec = {}; }
      var hk = (rec.harvest || []).filter(function (x) { return String(x.date || '').slice(0, 4) === year; });
      if (hk.length) g.honey.push(hk.reduce(function (s, x) { return s + (Number(x.honeyKg) || 0); }, 0));
      if (h.colonyState !== 'sonuk' && rec.strength && rec.strength[0]) { var si = R.strengthInfo(rec.strength[0], { hiveId: h.id }); if (si) g.str.push(si.score); }
      var vv = lastVarroa(rec); if (vv != null) g.var.push(vv);
      var tp = X.lastTemper(h.id); if (tp) g.tmp.push(tp.score);
      var winLoss = h.colonyState === 'sonuk' && h.sonukAt && [10, 11, 12, 1, 2, 3, 4].indexOf(Number(h.sonukAt.slice(5, 7))) >= 0;
      if ((rec.winter && rec.winter.length) || winLoss) g.winObs++;
      if (winLoss) g.winLoss++;
    });
    return order.map(function (k) { return groups[k]; }).sort(function (a, b) { return (a.key ? 0 : 1) - (b.key ? 0 : 1) || b.hives.length - a.hives.length || String(a.key).localeCompare(String(b.key), 'tr'); });
  }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }

  /* ---------- Rozetler (Koloni ızgarası) ---------- */
  function badge(cls, t) { return { cls: cls, t: t }; }
  function tileInfo(key, ap) {
    var t = today();
    if (key === 'larva') {
      var bs = batchesIn(ap), crit = larvaUpcoming(ap, -2, 0).filter(function (s) { return s.rel === 0 || s.crit; });
      var nx = larvaUpcoming(ap, 0, 60)[0];
      return { n: bs.length, badge: bs.length ? badge(crit.length ? 'orange' : 'green', bs.length + ' etkin parti') : badge('gray', 'Parti yok'),
        sub: !bs.length ? 'takvim boş' : (crit.length ? 'bugün: ' + STEP_SHORT[crit[0].key] : (nx ? STEP_SHORT[nx.key] + ' · ' + (nx.rel ? nx.rel + ' gün' : 'bugün') : 'adımlar bitti')) };
    }
    if (key === 'kapan') {
      var tr = X.list({ type: 'kapan', apiaryId: ap }).filter(function (x) { return x.status !== 'kaldirildi'; });
      var due = tr.filter(function (x) { return X.trapNext(x) <= t; }).length;
      var cap = X.list({ type: 'yakalama', apiaryId: ap }).filter(function (x) { return x.hiveId == null; }).length;
      return { n: tr.length, badge: tr.length ? (due ? badge('orange', due + ' kontrol') : badge('green', tr.length + ' kapan')) : badge('gray', 'Kapan yok'),
        sub: cap ? cap + ' oğul kovana alınmadı' : (!tr.length ? 'kayıt yok' : (due ? 'kontrol günü geldi' : 'sıradaki ' + fmt(tr.map(X.trapNext).sort()[0]))) };
    }
    if (key === 'kayip') {
      var dead = allHives(ap).filter(function (h) { return h.colonyState === 'sonuk'; });
      return { n: dead.length, badge: dead.length ? badge('red', dead.length + ' sönük') : badge('green', '✓'), sub: dead.length ? 'etkin sayımlara girmez' : 'kayıp kaydı yok' };
    }
    if (key === 'hircin') {
      var hs = activeHives(ap), sc = 0, hot = 0;
      hs.forEach(function (h) { var l = X.lastTemper(h.id); if (l) { sc++; if (l.score >= 4) hot++; } });
      return { n: sc, badge: sc ? (hot ? badge('orange', hot + ' hırçın') : badge('green', sc + ' puanlı')) : badge('gray', 'Puan yok'), sub: sc ? sc + ' / ' + hs.length + ' kovan puanlı' : 'kayıt yok' };
    }
    if (key === 'hat') {
      var rows = hatRows(ap, 'hat').filter(function (g) { return g.key; });
      return { n: rows.length, badge: rows.length ? badge('tan', rows.length + ' hat') : badge('gray', 'Veri yok'), sub: rows.length ? 'kayıtlı verilerle' : 'hat girilmemiş' };
    }
    if (key === 'foto') {
      var fl = X.list({ type: 'foto', apiaryId: ap });
      return { n: fl.length, badge: fl.length ? badge('green', fl.length + ' kayıt') : badge('gray', 'Kayıt yok'), sub: fl.length ? 'son ' + fmt(fl[0].date) : 'fotoğraf yok' };
    }
    if (key === 'vet') {
      var vl = X.list({ type: 'vet', apiaryId: ap }), wait = vl.filter(function (x) { return x.withdrawalEnd && x.withdrawalEnd > t; }).length;
      return { n: vl.length, badge: wait ? badge('orange', wait + ' beklemede') : (vl.length ? badge('green', vl.length + ' kayıt') : badge('gray', 'Kayıt yok')), sub: wait ? 'bekleme süresi var' : (vl.length ? 'son ' + fmt(vl[0].date) : 'kayıt yok') };
    }
    return { n: 0, badge: badge('gray', '—'), sub: '' };
  }

  /* ---------- Kapsam kartı (sayfa) ---------- */
  function stats(key, ap) {
    var t = today(), hs = activeHives(ap);
    if (key === 'larva') {
      var open = 0; try { open = (D.tasks || []).filter(function (x) { return x.kind === 'uretim'; }).length; } catch (e) { open = 0; }
      var tdy = larvaUpcoming(ap, 0, 0).length;
      return [{ k: 'muayene', v: batchesIn(ap).length, l: 'Etkin parti' }, { k: 'uyari', v: tdy, l: 'Bugün', tone: tdy ? 'hot' : '' }, { k: 'saat', v: larvaUpcoming(ap, 1, 7).length, l: '7 gün içinde' }, { k: 'kovan', v: open, l: 'Açık görev', href: 'gorevler.html' }];
    }
    if (key === 'kapan') {
      var tr = X.list({ type: 'kapan', apiaryId: ap }).filter(function (x) { return x.status !== 'kaldirildi'; }), cp = X.list({ type: 'yakalama', apiaryId: ap });
      var due = tr.filter(function (x) { return X.trapNext(x) <= t; }).length;
      return [{ k: 'kovan', v: tr.length, l: 'Etkin kapan' }, { k: 'uyari', v: due, l: 'Kontrol günü', tone: due ? 'hot' : '' }, { k: 'muayene', v: cp.length, l: 'Yakalanan oğul' }, { k: 'saat', v: cp.filter(function (x) { return x.hiveId != null; }).length, l: 'Kovana alınan' }];
    }
    if (key === 'kayip') {
      var dead = allHives(ap).filter(function (h) { return h.colonyState === 'sonuk'; }), kl = X.list({ type: 'kayip', apiaryId: ap });
      var cc = {}; kl.forEach(function (x) { cc[x.cause] = (cc[x.cause] || 0) + 1; });
      var top = Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; })[0];
      var lbl = top ? (X.LOSS_CAUSES.filter(function (c) { return c.key === top; })[0] || {}).label : '—';
      return [{ k: 'uyari', v: dead.length, l: 'Sönük kovan', tone: dead.length ? 'hot' : '' }, { k: 'saat', v: kl.filter(function (x) { return x.date.slice(0, 4) === t.slice(0, 4); }).length, l: 'Bu yıl' }, { k: 'sorun', v: lbl, l: 'En sık neden' }, { k: 'kovan', v: hs.length, l: 'Etkin kovan' }];
    }
    if (key === 'hircin') {
      var sc = [], hot = 0; hs.forEach(function (h) { var l = X.lastTemper(h.id); if (l) { sc.push(l.score); if (l.score >= 4) hot++; } });
      return [{ k: 'kovan', v: sc.length + '/' + hs.length, l: 'Puanlı kovan' }, { k: 'muayene', v: sc.length ? num(avg(sc), 1) : '—', l: 'Ortalama' }, { k: 'uyari', v: hot, l: 'Hırçın (4–5)', tone: hot ? 'hot' : '' }, { k: 'saat', v: hs.length - sc.length, l: 'Puansız' }];
    }
    if (key === 'hat') {
      var rows = hatRows(ap, 'hat'), withL = rows.filter(function (g) { return g.key; });
      var nl = withL.reduce(function (s, g) { return s + g.hives.length; }, 0), nn = rows.filter(function (g) { return !g.key; }).reduce(function (s, g) { return s + g.hives.length; }, 0);
      return [{ k: 'muayene', v: withL.length, l: 'Hat' }, { k: 'kovan', v: nl, l: 'Hatlı kovan' }, { k: 'sorun', v: nn, l: 'Hat girilmemiş' }, { k: 'saat', v: rows.reduce(function (s, g) { return s + g.honey.length; }, 0), l: 'Hasatlı kovan' }];
    }
    if (key === 'foto') {
      var fl = X.list({ type: 'foto', apiaryId: ap }), hv = {}; fl.forEach(function (x) { hv[x.hiveId] = 1; });
      return [{ k: 'muayene', v: fl.length, l: 'Kayıt' }, { k: 'kovan', v: Object.keys(hv).length, l: 'Kovan' }, { k: 'sorun', v: fl.filter(function (x) { return x.pattern === 'daginik' || x.pattern === 'cok-daginik'; }).length, l: 'Dağınık desen' }, { k: 'saat', v: fl.length ? fmt(fl[0].date) : '—', l: 'Son kayıt' }];
    }
    if (key === 'vet') {
      var vl = X.list({ type: 'vet', apiaryId: ap }), wait = vl.filter(function (x) { return x.withdrawalEnd && x.withdrawalEnd > t; }).length;
      return [{ k: 'muayene', v: vl.length, l: 'Kontrol' }, { k: 'uyari', v: wait, l: 'Bekleme süresinde', tone: wait ? 'hot' : '' }, { k: 'sorun', v: vl.filter(function (x) { return x.medicine; }).length, l: 'Reçete' }, { k: 'saat', v: vl.length ? fmt(vl[0].date) : '—', l: 'Son kontrol' }];
    }
    return [];
  }
  function note(key, ap) {
    var t = today();
    if (key === 'larva') { var c = larvaUpcoming(ap, -2, 0)[0]; return c ? { t: '⚠ ' + (c.rel === 0 ? 'Bugün' : 'Gecikti') + ': ' + STEP_SHORT[c.key] + ' · ' + hiveName(c.batch.sourceHiveId), b: 'Takvim', href: '#keCrit', k: 'kritik' } : { t: batchesIn(ap).length ? '✓ Bugün kritik adım yok' : 'Etkin larva transferi yok', b: 'Yeni', href: '#keForm', k: 'yeni' }; }
    if (key === 'kapan') { var d = X.list({ type: 'kapan', apiaryId: ap }).filter(function (x) { return x.status !== 'kaldirildi' && X.trapNext(x) <= t; })[0]; return d ? { t: '⚠ Kontrol günü: ' + d.name, b: 'Kapanlar', href: '#keList', k: 'kontrol' } : { t: 'Kontrol günü gelen kapan yok', b: 'Yeni kapan', href: '#keForm', k: 'yeni' }; }
    if (key === 'kayip') return { t: 'Sönük kovan etkin sayımlardan ve güç ortalamalarından çıkar; geçmişi korunur', b: 'Kaydet', href: '#keForm', k: 'yeni' };
    if (key === 'hircin') return { t: '1 çok sakin … 5 çok hırçın · her muayenede puan verin', b: 'Puanla', href: '#keList', k: 'puan' };
    if (key === 'hat') return { t: 'Yalnız kayıtlı veriler · hat adı Hat ve Genetik’ten', b: 'Hat ve Genetik', href: 'kovanlar.html?view=koloni&topic=irk' + (ap && ap !== 'all' ? '&mode=apiary&apiary=' + encodeURIComponent(ap) : ''), k: 'hat' };
    if (key === 'foto') return { t: 'Otomatik yapay zekâ puanı yok · desen puanı sizin değerlendirmeniz', b: 'Fotoğraf ekle', href: '#keForm', k: 'yeni' };
    if (key === 'vet') { var w = X.list({ type: 'vet', apiaryId: ap }).filter(function (x) { return x.withdrawalEnd && x.withdrawalEnd > t; })[0]; return w ? { t: '⏳ Bekleme süresi: ' + (w.hiveId != null ? hiveName(w.hiveId) : 'arılık') + ' · ' + fmt(w.withdrawalEnd) + '’e kadar hasat yok', b: 'Kayıtlar', href: '#keList', k: 'bekleme' } : { t: 'Bekleme süresinde kovan yok', b: 'Yeni kayıt', href: '#keForm', k: 'yeni' }; }
    return { t: '', b: '', href: '#' };
  }

  /* ---------- Ekranlar ---------- */
  var CSS = '' +
    '.ke-card{background:#fff;border:1px solid #eadfcd;border-radius:16px;padding:14px;margin:12px 0 0;display:grid;gap:10px;}' +
    '.ke-card h2{margin:0;font-size:17px;}.ke-mut{margin:0;color:#6b5a48;font-size:14px;}.ke-empty{margin:0;padding:14px;border:1px dashed #d8c7aa;border-radius:12px;color:#6b5a48;font-size:14px;background:#fffaf2;}' +
    '.ke-form{display:grid;gap:10px;}.ke-form label.f{display:grid;gap:4px;font-size:13px;font-weight:800;color:#5c4813;min-width:0;}' +
    '.ke-form input,.ke-form select,.ke-form textarea{font:inherit;font-size:17px;min-height:64px;padding:10px 12px;border-radius:12px;border:1px solid #d8c7aa;background:#fff;width:100%;box-sizing:border-box;min-width:0;}' +
    '.ke-form textarea{min-height:88px;}.ke-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
    '.ke-btn{font:inherit;font-size:17px;font-weight:800;min-height:64px;padding:0 14px;border-radius:14px;border:1px solid #3d2616;background:#3d2616;color:#fff;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;text-decoration:none;box-sizing:border-box;text-align:center;}' +
    '.ke-btn.sec{background:#fff;color:#3d2616;border-color:#d8c7aa;}.ke-btn.ok{background:#1b5e20;border-color:#1b5e20;}.ke-btn.warn{background:#fff5f5;color:#c92a2a;border-color:#ffc9c9;}' +
    '.ke-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;}' +
    '.ke-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.ke-opt{display:flex;align-items:center;gap:10px;min-height:64px;padding:0 12px;border:1px solid #e0d2bb;border-radius:12px;background:#fff;font-weight:750;font-size:15px;box-sizing:border-box;cursor:pointer;}' +
    '.ke-opt input{width:26px;height:26px;flex:none;}.ke-opt:has(input:checked){border-color:#2f9e44;background:#ebfbee;}' +
    '.ke-item{border:1px solid #eadfcd;border-radius:14px;padding:12px;display:grid;gap:8px;background:#fffdf9;}.ke-item h3{margin:0;font-size:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}' +
    '.ke-item .m{font-size:14px;color:#5c4813;margin:0;overflow-wrap:anywhere;}.ke-chip{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:800;background:#e9ecef;color:#495057;}' +
    '.ke-chip.red{background:#ffe3e3;color:#c92a2a;}.ke-chip.orange{background:#ffe8cc;color:#d9480f;}.ke-chip.green{background:#d8f3dc;color:#2b8a3e;}.ke-chip.tan{background:#efe2cb;color:#7a5a32;}' +
    '.ke-tl{display:grid;gap:4px;}.ke-tl div{display:grid;grid-template-columns:64px 52px minmax(0,1fr);gap:6px;font-size:14px;align-items:baseline;}.ke-tl .past{color:#9a8b78;}.ke-tl .today{font-weight:900;color:#c92a2a;}.ke-tl .crit b{color:#d9480f;}' +
    '.ke-score{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;}.ke-score button{font:inherit;font-size:20px;font-weight:900;min-height:64px;border-radius:12px;border:1px solid #d8c7aa;background:#fff;color:#3d2616;cursor:pointer;padding:0;}' +
    '.ke-score button.on{outline:3px solid #2f9e44;}.ke-score button[data-s="1"]{background:#ebfbee;}.ke-score button[data-s="2"]{background:#f4fce3;}.ke-score button[data-s="3"]{background:#fff9db;}.ke-score button[data-s="4"]{background:#fff4e6;}.ke-score button[data-s="5"]{background:#fff5f5;}' +
    '.ke-legend{display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:#6b5a48;}' +
    '.ke-cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.ke-cmp>div{border:1px solid #eadfcd;border-radius:12px;padding:8px;display:grid;gap:6px;min-width:0;background:#fffdf9;}' +
    '.ke-cmp .bt-thumbs{display:grid;grid-template-columns:1fr;gap:6px;}.ke-cmp .kf-th{width:100%!important;height:auto!important;aspect-ratio:4/3;}.ke-cmp .kf-th img{width:100%;height:100%;object-fit:cover;}' +
    '.ke-met{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;font-size:14px;}.ke-met span:nth-child(odd){color:#6b5a48;font-weight:700;}.ke-met span:nth-child(even){font-weight:800;text-align:right;}.ke-met .na{color:#9a8b78;font-weight:700;}' +
    '.ke-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.ke-seg a{display:flex;align-items:center;justify-content:center;min-height:64px;border-radius:12px;border:1px solid #d8c7aa;background:#fff;font-weight:800;color:#3d2616;text-decoration:none;}.ke-seg a.on{background:#fff3bf;border-color:#e0c56a;}' +
    '.ks-glove .kf-btn{min-height:64px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;}' +
    '.ke-msg{margin:0;font-weight:800;font-size:14px;}.ke-msg.ok{color:#2b8a3e;}.ke-msg.err{color:#c92a2a;}';
  function ensureCss() { if (document.getElementById('keCss')) return; var s = document.createElement('style'); s.id = 'keCss'; s.textContent = CSS; document.head.appendChild(s); }
  function hiveOpts(ap, sel, extraFirst) {
    return (extraFirst || '') + activeHives(ap).map(function (h) { return '<option value="' + h.id + '"' + (String(sel) === String(h.id) ? ' selected' : '') + '>' + esc(h.name + (ap === 'all' ? ' · ' + apName(h.apiaryId) : '')) + '</option>'; }).join('');
  }
  function apOpts(ap) { return (D.loadApiaries() || []).map(function (a) { return '<option value="' + esc(a.id) + '"' + (String(a.id) === String(ap) ? ' selected' : '') + '>' + esc(a.name || a.place) + '</option>'; }).join(''); }
  function apField(ap) { return ap && ap !== 'all' ? '<input type="hidden" name="apiaryId" value="' + esc(ap) + '">' : '<label class="f">Arılık<select name="apiaryId">' + apOpts('') + '</select></label>'; }
  function msg(root, ok, t) { var m = root.querySelector('.ke-msg'); if (!m) return; m.hidden = false; m.className = 'ke-msg ' + (ok ? 'ok' : 'err'); m.textContent = t; }
  function demoTag() { return live() ? '' : ' · Demo'; }
  function photoPicker(box, rid) { var F = global.SuperAriFoto; if (!F || !box) return null; return F.picker(box, rid ? { existingRecordId: rid } : {}); }
  function attachPhotos(pk, rid) { var F = global.SuperAriFoto; if (!F || !pk || !pk.count()) return Promise.resolve([]); var it = pk.items(); return F.attach(['ke:' + rid], it).then(function (r) { pk.clear(); return r; }); }
  function thumbs(rid) { return global.SuperAriFoto ? '<div class="bt-thumbs" data-foto-rec="ke:' + esc(rid) + '"></div>' : ''; }
  function fill(root) { if (global.SuperAriFoto) global.SuperAriFoto.fillThumbs(root); }
  function stepRow(s) { return '<div class="' + (s.rel < 0 ? 'past' : (s.rel === 0 ? 'today' : '')) + (s.crit ? ' crit' : '') + '"><span>' + esc(fmt(s.date)) + '</span><span>' + (s.win ? s.win : s.d) + '. gün</span><span>' + (s.crit ? '<b>⚠</b> ' : '') + esc(s.label) + '</span></div>'; }

  function renderLarva(root, ap, rerender) {
    var bs = batchesIn(ap), up = larvaUpcoming(ap, -3, 10);
    var html = '<section class="ke-card" id="keCrit"><h2>Kritik günler (3 gün önce → 10 gün sonra)</h2>' +
      (up.length ? '<div class="ke-tl">' + up.map(function (s) { return stepRow(s).replace('</span></div>', ' <small>· ' + esc(hiveName(s.batch.sourceHiveId)) + '</small></span></div>'); }).join('') + '</div>'
        : '<p class="ke-empty">' + (bs.length ? 'Bu aralıkta adım yok.' : 'Etkin larva transferi yok. Aşağıdan ilk aşılamayı kaydedin; takvim ve görevler otomatik oluşur.') + '</p>') + '</section>';
    html += '<section class="ke-card"><h2>Etkin partiler (' + bs.length + ')</h2>' + (bs.length ? bs.map(function (b) {
      return '<div class="ke-item"><h3>' + esc(batchTitle(b)) + '</h3><div class="ke-tl">' + batchSteps(b).map(stepRow).join('') + '</div></div>';
    }).join('') : '<p class="ke-empty">Kayıtlı etkin parti yok.</p>') +
      '<a class="ke-btn sec" href="koloni-islem.html?islem=uretim' + (ap && ap !== 'all' ? '&apiary=' + encodeURIComponent(ap) : '') + '">Kabul / çıkan ana kaydı: Ana Arı Üretimi ›</a></section>';
    var src = activeHives(ap).filter(function (h) { return h.currentQueenId; });
    html += '<section class="ke-card" id="keForm"><h2>Yeni larva transferi</h2><form class="ke-form" autocomplete="off">' +
      '<div class="ke-two"><label class="f">Aşılama tarihi<input type="date" name="date" value="' + today() + '"></label><label class="f">Yüksük sayısı<input type="number" name="cups" min="1" max="500" inputmode="numeric" placeholder="ör. 30" required></label></div>' +
      '<label class="f">Anne kovan (larva kaynağı)<select name="src">' + (src.length ? src.map(function (h) { return '<option value="' + h.id + '">' + esc(h.name + (h.currentQueenId ? ' · ' + h.currentQueenId : '')) + '</option>'; }).join('') : '<option value="">Ana arısı kayıtlı kovan yok</option>') + '</select></label>' +
      '<label class="f">Not (isteğe bağlı)<input name="note" maxlength="300"></label>' +
      '<p class="ke-mut">Takvim 1 günlük larvaya göredir: 0. gün aşılama · 5. gün hücreler kapanır · 10. gün çiftleşme kutusuna taşı · 11–12. gün ana çıkışı · 16–20. gün uçuş kontrolü · 21–28. gün yumurtlama kontrolü. Tarihli adımlar Görevler’e otomatik eklenir.</p>' +
      '<button type="submit" class="ke-btn ok">Larva transferini kaydet</button><p class="ke-msg" hidden></p></form></section>';
    root.innerHTML = html;
    var f = root.querySelector('#keForm form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        var b = O.addBatch({ date: f.date.value, cups: f.cups.value, sourceHiveId: f.src.value, note: f.note.value });
        var n = O.batchTasks().filter(function (x) { return x.id.indexOf('kr-uretim-' + b.id) === 0; }).length;
        if (K && K.toast) K.toast('Kaydedildi · Görevler’e ' + n + ' görev eklendi');
        try { global.dispatchEvent(new Event('superari-records-changed')); } catch (er) { /* ignore */ }
        rerender();
      } catch (err) { msg(f, false, err.message || 'Kaydedilemedi'); }
    });
  }

  function renderKapan(root, ap, rerender) {
    var t = today(), tr = X.list({ type: 'kapan', apiaryId: ap }), cp = X.list({ type: 'yakalama', apiaryId: ap });
    var act = tr.filter(function (x) { return x.status !== 'kaldirildi'; }).sort(function (a, b) { return X.trapNext(a) < X.trapNext(b) ? -1 : 1; });
    var html = '<section class="ke-card" id="keList"><h2>Kapanlar (' + act.length + ')</h2>' + (act.length ? act.map(function (x) {
      var nx = X.trapNext(x), due = nx <= t;
      return '<div class="ke-item" data-id="' + esc(x.id) + '"><h3>🪤 ' + esc(x.name) + ' <span class="ke-chip ' + (due ? 'orange' : 'green') + '">' + (due ? 'Kontrol günü' + (nx < t ? ' geçti' : '') : 'sıradaki ' + fmt(nx)) + '</span></h3>' +
        '<p class="m">' + esc([x.place, apName(x.apiaryId), 'her ' + x.every + ' günde bir', 'kuruldu ' + fmt(x.date), x.lastCheck ? 'son kontrol ' + fmt(x.lastCheck) : 'henüz kontrol yok'].filter(Boolean).join(' · ')) +
        (x.lat != null ? ' · <a href="https://www.google.com/maps?q=' + x.lat + ',' + x.lng + '" target="_blank" rel="noopener">📍 ' + x.lat + ', ' + x.lng + '</a>' : '') + '</p>' +
        '<div class="ke-btns"><button type="button" class="ke-btn ok" data-act="check">✓ Kontrol edildi</button><button type="button" class="ke-btn" data-act="cap">🐝 Oğul yakalandı</button></div>' +
        '<form class="ke-form" data-capform hidden><div class="ke-two"><label class="f">Tarih<input type="date" name="date" value="' + t + '"></label><label class="f">Oğul büyüklüğü<select name="size"><option value="kucuk">Küçük</option><option value="orta" selected>Orta</option><option value="buyuk">Büyük</option></select></label></div>' +
        '<label class="f">Not<input name="note" maxlength="200"></label><button type="submit" class="ke-btn ok">Yakalamayı kaydet</button></form>' +
        '<button type="button" class="ke-btn sec" data-act="off">Kapanı kaldır</button></div>';
    }).join('') : '<p class="ke-empty">Kayıtlı oğul kapanı yok. Aşağıdan ilk kapanı ekleyin; kontrol günleri Görevler’e otomatik düşer.</p>') + '</section>';
    html += '<section class="ke-card"><h2>Yakalanan oğullar (' + cp.length + ')</h2>' + (cp.length ? cp.map(function (c) {
      var trp = c.trapId ? X.get(c.trapId) : null;
      return '<div class="ke-item" data-id="' + esc(c.id) + '"><h3>🐝 ' + esc(fmt(c.date)) + ' · ' + esc(X.SWARM_SIZES[c.size] || 'Orta') + ' oğul ' + (c.hiveId != null ? '<span class="ke-chip green">Kovana alındı</span>' : '<span class="ke-chip orange">Kovana alınmadı</span>') + '</h3>' +
        '<p class="m">' + esc([trp ? 'kapan: ' + trp.name : 'kapan dışı', apName(c.apiaryId), c.note || ''].filter(Boolean).join(' · ')) + '</p>' +
        (c.hiveId != null ? '<a class="ke-btn sec" href="kovan.html?id=' + encodeURIComponent(c.hiveId) + '">' + esc(hiveName(c.hiveId)) + ' ›</a>'
          : '<form class="ke-form" data-hiveform><div class="ke-two"><label class="f">Yeni kovan adı<input name="name" maxlength="60" placeholder="otomatik"></label><label class="f">Arılı çerçeve<input type="number" name="bees" min="0" max="20" inputmode="numeric" placeholder="ör. 4"></label></div>' +
            '<button type="submit" class="ke-btn ok">Yeni kovan yap</button></form>') + '</div>';
    }).join('') : '<p class="ke-empty">Yakalama kaydı yok.</p>') + '</section>';
    html += '<section class="ke-card" id="keForm"><h2>Yeni kapan</h2><form class="ke-form" data-newtrap autocomplete="off">' + apField(ap) +
      '<label class="f">Kapan adı<input name="name" maxlength="60" placeholder="ör. Çam altı kapanı" required></label>' +
      '<label class="f">Yer tarifi<input name="place" maxlength="160" placeholder="ör. dere kenarı, 3 m yükseklik"></label>' +
      '<div class="ke-two"><label class="f">Kuruluş<input type="date" name="date" value="' + t + '"></label><label class="f">Kontrol aralığı<select name="every"><option value="3">3 günde bir</option><option value="5">5 günde bir</option><option value="7" selected>7 günde bir</option><option value="10">10 günde bir</option><option value="14">14 günde bir</option></select></label></div>' +
      '<input type="hidden" name="lat"><input type="hidden" name="lng"><button type="button" class="ke-btn sec" data-act="geo">📍 Bulunduğum konumu ekle</button>' +
      '<button type="submit" class="ke-btn ok">Kapanı kaydet</button><p class="ke-msg" hidden></p></form>' +
      '<button type="button" class="ke-btn sec" data-act="capfree">🐝 Kapan dışı yakalanan oğulu kaydet</button></section>';
    root.innerHTML = html;
    root.querySelectorAll('[data-act="check"]').forEach(function (b) { b.addEventListener('click', function () { var id = b.closest('[data-id]').getAttribute('data-id'); X.trapCheck(id); if (K && K.toast) K.toast('Kontrol kaydedildi'); rerender(); }); });
    root.querySelectorAll('[data-act="off"]').forEach(function (b) { b.addEventListener('click', function () { var id = b.closest('[data-id]').getAttribute('data-id'); if (!confirm('Kapan kaldırılsın mı? (Kayıt ve yakalamalar silinmez.)')) return; X.update(id, { status: 'kaldirildi' }); rerender(); }); });
    root.querySelectorAll('[data-act="cap"]').forEach(function (b) { b.addEventListener('click', function () { var f = b.closest('.ke-item').querySelector('[data-capform]'); f.hidden = !f.hidden; }); });
    root.querySelectorAll('[data-capform]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); var id = f.closest('[data-id]').getAttribute('data-id'); try { X.add('yakalama', { trapId: id, date: f.date.value, size: f.size.value, note: f.note.value }); X.trapCheck(id, f.date.value); rerender(); } catch (err) { alert(err.message); } }); });
    root.querySelectorAll('[data-hiveform]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); var id = f.closest('[data-id]').getAttribute('data-id'); try { var nh = X.captureToHive(id, { name: f.name.value, beeFrames: f.bees.value }); if (K && K.toast) K.toast(nh.name + ' oluşturuldu'); rerender(); } catch (err) { alert(err.message); } }); });
    var nf = root.querySelector('[data-newtrap]');
    root.querySelector('[data-act="geo"]').addEventListener('click', function (ev) {
      var b = ev.currentTarget; if (!navigator.geolocation) { b.textContent = 'Konum desteklenmiyor'; return; }
      b.textContent = 'Konum alınıyor…';
      navigator.geolocation.getCurrentPosition(function (p) { nf.lat.value = p.coords.latitude; nf.lng.value = p.coords.longitude; b.textContent = '📍 ' + num(p.coords.latitude, 5) + ', ' + num(p.coords.longitude, 5); }, function () { b.textContent = 'Konum alınamadı (izin?)'; }, { timeout: 15000 });
    });
    nf.addEventListener('submit', function (e) { e.preventDefault(); try { X.add('kapan', { apiaryId: nf.apiaryId.value, name: nf.name.value, place: nf.place.value, date: nf.date.value, every: nf.every.value, lat: nf.lat.value, lng: nf.lng.value }); if (K && K.toast) K.toast('Kapan kaydedildi · kontrol görevi eklendi'); rerender(); } catch (err) { msg(nf, false, err.message); } });
    root.querySelector('[data-act="capfree"]').addEventListener('click', function () {
      var a = ap && ap !== 'all' ? ap : ((D.loadApiaries() || [])[0] || {}).id;
      if (!a) return; if (!confirm('Kapan dışı yakalanan oğul bugünün tarihiyle ' + apName(a) + ' arılığına kaydedilsin mi?')) return;
      try { X.add('yakalama', { apiaryId: a, size: 'orta' }); rerender(); } catch (err) { alert(err.message); }
    });
  }

  function causeLabel(k) { return (X.LOSS_CAUSES.filter(function (c) { return c.key === k; })[0] || { label: 'Bilinmiyor' }).label; }
  function renderKayip(root, ap, rerender) {
    var kl = X.list({ type: 'kayip', apiaryId: ap });
    var html = '<section class="ke-card" id="keForm"><h2>Sönük kovan kaydı</h2>' + (activeHives(ap).length ? '<form class="ke-form" autocomplete="off">' +
      '<label class="f">Kovan<select name="hive">' + hiveOpts(ap) + '</select></label>' +
      '<label class="f">Tarih<input type="date" name="date" value="' + today() + '"></label>' +
      '<div class="f" style="font-size:13px;font-weight:800;color:#5c4813;">Şüphelenilen neden</div><div class="ke-opts">' + X.LOSS_CAUSES.map(function (c, i) { return '<label class="ke-opt"><input type="radio" name="cause" value="' + c.key + '"' + (c.key === 'bilinmiyor' ? ' checked' : '') + '>' + esc(c.label) + '</label>'; }).join('') + '</div>' +
      '<label class="f">Not<textarea name="note" maxlength="400" placeholder="ör. küme çıtaya yapışık, bal var / yok, ölü arı yığını"></textarea></label>' +
      '<div data-pick></div>' +
      '<button type="submit" class="ke-btn warn">Sönük olarak kaydet</button><p class="ke-msg" hidden></p></form>' : '<p class="ke-empty">Bu kapsamda etkin kovan yok.</p>') + '</section>';
    html += '<section class="ke-card" id="keList"><h2>Sönük kovanlar (' + kl.length + ')</h2>' + (kl.length ? kl.map(function (x) {
      return '<div class="ke-item" data-id="' + esc(x.id) + '"><h3>🪦 ' + esc(hiveName(x.hiveId)) + ' <span class="ke-chip red">' + esc(causeLabel(x.cause)) + '</span></h3><p class="m">' + esc([fmt(x.date), apName(x.apiaryId), x.note || ''].filter(Boolean).join(' · ')) + '</p>' + thumbs(x.id) +
        '<div class="ke-btns"><a class="ke-btn sec" href="kovan.html?id=' + encodeURIComponent(x.hiveId) + '">Kovan geçmişi ›</a><button type="button" class="ke-btn sec" data-act="undo">Geri al (yanlış kayıt)</button></div></div>';
    }).join('') : '<p class="ke-empty">Koloni kaybı kaydı yok.</p>') + '</section>';
    root.innerHTML = html; fill(root);
    var f = root.querySelector('#keForm form'), pk = f ? photoPicker(f.querySelector('[data-pick]')) : null;
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var h = D.hiveById(f.hive.value); if (!h) return;
      if (!confirm(h.name + ' sönük (koloni kaybı) olarak kaydedilsin mi? Kovan etkin sayımlardan çıkar; geçmişi korunur.')) return;
      try { var r = X.markDead({ hiveId: h.id, date: f.date.value, cause: (f.querySelector('input[name=cause]:checked') || {}).value, note: f.note.value }); attachPhotos(pk, r.id).then(rerender, rerender); } catch (err) { msg(f, false, err.message); }
    });
    root.querySelectorAll('[data-act="undo"]').forEach(function (b) { b.addEventListener('click', function () { var id = b.closest('[data-id]').getAttribute('data-id'); if (!confirm('Kayıt silinsin ve kovan yeniden etkin sayılsın mı?')) return; try { X.undoDead(id); if (global.SuperAriFoto) global.SuperAriFoto.detachRecord('ke:' + id); rerender(); } catch (err) { alert(err.message); } }); });
  }

  function renderHircin(root, ap, rerender) {
    var hs = activeHives(ap), C = D.colony;
    var html = '';
    if (!ap || ap === 'all') {
      html += '<section class="ke-card"><h2>Arılıklara göre</h2>' + (D.loadApiaries() || []).map(function (a) {
        var ah = activeHives(a.id), sc = []; ah.forEach(function (h) { var l = X.lastTemper(h.id); if (l) sc.push(l.score); });
        return '<div class="ke-met"><span>' + esc(a.name || a.place) + '</span><span>' + (sc.length ? 'ort. ' + num(avg(sc), 1) + ' · ' + sc.length + '/' + ah.length + ' puanlı · ' + sc.filter(function (s) { return s >= 4; }).length + ' hırçın' : '<span class="na">puan yok</span>') + '</span></div>';
      }).join('') + '</section>';
    }
    html += '<section class="ke-card" id="keList"><h2>Kovanlar (' + hs.length + ')</h2><div class="ke-legend"><span>1 Çok sakin</span><span>3 Orta</span><span>5 Çok hırçın</span></div>' + (hs.length ? hs.map(function (h) {
      var hist = X.list({ type: 'hircin', hiveId: h.id }), l = hist[0];
      var cal = !l && h.calmness != null ? ' · kovan kaydında sakinlik: ' + (C && C.calmLabel ? C.calmLabel(h.calmness) : h.calmness + '/5') : '';
      return '<div class="ke-item" data-hive="' + h.id + '"><h3>' + esc(h.name) + (l ? ' <span class="ke-chip ' + (l.score >= 4 ? 'orange' : (l.score <= 2 ? 'green' : 'tan')) + '">' + l.score + ' · ' + esc(X.TEMPER_LABELS[l.score]) + '</span>' : ' <span class="ke-chip">puan yok</span>') + '</h3>' +
        '<p class="m">' + (hist.length ? 'Geçmiş: ' + esc(hist.slice(0, 5).map(function (x) { return x.score + ' (' + fmt(x.date) + ')'; }).join(' · ')) : 'Muayene puanı yok' + esc(cal)) + (ap === 'all' ? ' · ' + esc(apName(h.apiaryId)) : '') + '</p>' +
        '<div class="ke-score" role="group" aria-label="' + esc(h.name) + ' hırçınlık puanı">' + [1, 2, 3, 4, 5].map(function (s) { return '<button type="button" data-s="' + s + '" aria-label="' + s + ' ' + X.TEMPER_LABELS[s] + '"' + (l && l.date === today() && l.score === s ? ' class="on"' : '') + '>' + s + '</button>'; }).join('') + '</div></div>';
    }).join('') : '<p class="ke-empty">Bu kapsamda etkin kovan yok.</p>') + '</section>';
    root.innerHTML = html;
    root.querySelectorAll('.ke-score button').forEach(function (b) {
      b.addEventListener('click', function () {
        var hid = b.closest('[data-hive]').getAttribute('data-hive'), s = Number(b.getAttribute('data-s'));
        var l = X.lastTemper(hid);
        try { if (l && l.date === today()) X.remove(l.id); X.setTemper({ hiveId: hid, score: s, date: today() }); if (K && K.toast) K.toast(hiveName(hid) + ': ' + s + ' · ' + X.TEMPER_LABELS[s]); rerender(); } catch (err) { alert(err.message); }
      });
    });
  }

  function renderHat(root, ap, rerender, params) {
    var mode = params.get('grup') === 'ana' ? 'ana' : 'hat', rows = hatRows(ap, mode);
    var base = 'koloni-ek.html?ek=hat' + (ap && ap !== 'all' ? '&mode=apiary&apiary=' + encodeURIComponent(ap) : '&mode=all');
    function met(l, v) { return '<span>' + esc(l) + '</span>' + (v == null ? '<span class="na">veri yok</span>' : '<span>' + esc(v) + '</span>'); }
    var html = '<section class="ke-card"><div class="ke-seg"><a href="' + base + '" class="' + (mode === 'hat' ? 'on' : '') + '">Hatta göre</a><a href="' + base + '&grup=ana" class="' + (mode === 'ana' ? 'on' : '') + '">Ana arıya göre</a></div>' +
      '<p class="ke-mut">Yalnız kayıtlı verilerden: bal = bu yılın hasat kayıtları · güç = son güç kaydı skoru · varroa = son sayım (%) · hırçınlık = son puan · kışlama = kış kaydı / kış kaybı. Kayıt yoksa «veri yok».</p></section>';
    html += rows.length ? rows.map(function (g) {
      var title = g.key ? (mode === 'ana' ? 'Ana ' + g.key : 'Hat: ' + g.key) : (mode === 'ana' ? 'Ana arı kaydı yok' : 'Hat girilmemiş');
      var h = avg(g.honey), s = avg(g.str), v = avg(g.var), tp = avg(g.tmp);
      return '<section class="ke-card"><h2>' + esc(title) + ' <span class="ke-chip ' + (g.key ? 'tan' : '') + '">' + g.hives.length + ' kovan</span></h2>' + (g.sub ? '<p class="ke-mut">' + esc(g.sub) + '</p>' : '') +
        '<div class="ke-met">' + met('Bal (' + today().slice(0, 4) + ')', h == null ? null : num(h, 1) + ' kg/kovan · ' + g.honey.length + ' kovan') + met('Koloni gücü', s == null ? null : 'skor ' + Math.round(s) + ' · ' + g.str.length + ' kovan') +
        met('Varroa', v == null ? null : '%' + num(v, 1) + ' · ' + g.var.length + ' kovan') + met('Hırçınlık', tp == null ? null : num(tp, 1) + ' / 5 · ' + g.tmp.length + ' kovan') +
        met('Kışlama', g.winObs ? (g.winObs - g.winLoss) + ' / ' + g.winObs + ' kovan kayıpsız' : null) + '</div>' +
        '<p class="ke-mut">' + esc(g.hives.slice(0, 8).map(function (x) { return x.name; }).join(', ') + (g.hives.length > 8 ? ' …' : '')) + '</p></section>';
    }).join('') : '<section class="ke-card"><p class="ke-empty">Bu kapsamda kovan yok.</p></section>';
    root.innerHTML = html;
  }

  function patLabel(k) { return (X.BROOD_PATTERNS.filter(function (p) { return p.key === k; })[0] || { label: 'Desen puanı yok' }).label; }
  function renderFoto(root, ap, rerender, params) {
    var hs = activeHives(ap), hid = params.get('kovan') || (hs[0] ? String(hs[0].id) : '');
    if (hid && !hs.some(function (h) { return String(h.id) === String(hid); })) hid = hs[0] ? String(hs[0].id) : '';
    var recs = hid ? X.list({ type: 'foto', hiveId: hid }) : [];
    var L = params.get('sol'), Rr = params.get('sag');
    var left = recs.filter(function (x) { return x.id === L; })[0] || recs[1] || recs[0], right = recs.filter(function (x) { return x.id === Rr; })[0] || (recs[1] ? recs[0] : null);
    function side(x, nm) {
      return '<div><label class="ke-form" style="gap:4px;"><span style="font-size:13px;font-weight:800;">' + nm + '</span><select data-side="' + (nm === 'Önce' ? 'sol' : 'sag') + '">' + recs.map(function (r) { return '<option value="' + esc(r.id) + '"' + (x && r.id === x.id ? ' selected' : '') + '>' + esc(fmt(r.date) + (r.frame ? ' · çerçeve ' + r.frame : '')) + '</option>'; }).join('') + '</select></label>' +
        (x ? thumbs(x.id) + '<p class="m" style="margin:0;font-size:13px;font-weight:800;">' + esc(patLabel(x.pattern)) + '</p>' + (x.note ? '<p class="m" style="margin:0;font-size:13px;">' + esc(x.note) + '</p>' : '') : '<p class="ke-empty">—</p>') + '</div>';
    }
    var html = '<section class="ke-card"><form class="ke-form"><label class="f">Kovan<select data-hive>' + hiveOpts(ap, hid) + '</select></label></form></section>';
    html += '<section class="ke-card" id="keCmp"><h2>Tarihe göre yan yana</h2>' + (recs.length >= 2 ? '<div class="ke-cmp">' + side(left, 'Önce') + side(right, 'Sonra') + '</div>'
      : '<p class="ke-empty">' + (recs.length ? 'Karşılaştırma için bu kovanda ikinci bir tarihte fotoğraf ekleyin.' : 'Bu kovanda çerçeve fotoğrafı yok.') + '</p>') + '</section>';
    html += '<section class="ke-card" id="keForm"><h2>Yeni çerçeve fotoğrafı</h2>' + (hid ? '<form class="ke-form" data-new autocomplete="off">' +
      '<div class="ke-two"><label class="f">Tarih<input type="date" name="date" value="' + today() + '"></label><label class="f">Çerçeve<input name="frame" maxlength="20" placeholder="ör. 4 (soldan)"></label></div>' +
      '<div class="f" style="font-size:13px;font-weight:800;color:#5c4813;">Kuluçka deseni (sizin değerlendirmeniz)</div><div class="ke-opts">' + X.BROOD_PATTERNS.map(function (p) { return '<label class="ke-opt"><input type="radio" name="pattern" value="' + p.key + '">' + esc(p.label) + '</label>'; }).join('') + '</div>' +
      '<label class="f">Not<input name="note" maxlength="300"></label><div data-pick></div>' +
      '<button type="submit" class="ke-btn ok">Fotoğraf kaydını kaydet</button><p class="ke-msg" hidden></p></form>' : '<p class="ke-empty">Bu kapsamda etkin kovan yok.</p>') + '</section>';
    html += '<section class="ke-card" id="keList"><h2>Kayıtlar (' + recs.length + ')</h2>' + (recs.length ? recs.map(function (x) {
      return '<div class="ke-item" data-id="' + esc(x.id) + '"><h3>' + esc(fmt(x.date)) + (x.frame ? ' · çerçeve ' + esc(x.frame) : '') + ' <span class="ke-chip ' + (x.pattern === 'duzenli' ? 'green' : (x.pattern ? 'orange' : '')) + '">' + esc(patLabel(x.pattern)) + '</span></h3>' + (x.note ? '<p class="m">' + esc(x.note) + '</p>' : '') + thumbs(x.id) +
        '<button type="button" class="ke-btn sec" data-act="rm">Kaydı sil</button></div>';
    }).join('') : '<p class="ke-empty">Kayıt yok.</p>') + '<p class="ke-mut">Otomatik yapay zekâ puanı yoktur; desen puanı sizin gözleminizdir. Fotoğraflar küçültülüp bu cihazda saklanır (canlı modda buluta yedeklenir).</p></section>';
    root.innerHTML = html; fill(root);
    function go(p) { var u = new URLSearchParams(location.search); Object.keys(p).forEach(function (k) { if (p[k]) u.set(k, p[k]); else u.delete(k); }); history.replaceState(null, '', 'koloni-ek.html?' + u.toString()); rerender(); }
    var hs0 = root.querySelector('[data-hive]'); if (hs0) hs0.addEventListener('change', function () { go({ kovan: hs0.value, sol: '', sag: '' }); });
    root.querySelectorAll('[data-side]').forEach(function (s) { s.addEventListener('change', function () { var p = {}; p[s.getAttribute('data-side')] = s.value; go(p); }); });
    var f = root.querySelector('[data-new]'), pk = f ? photoPicker(f.querySelector('[data-pick]')) : null;
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var pat = (f.querySelector('input[name=pattern]:checked') || {}).value || '';
      if (!pk || (!pk.count() && !pat)) { msg(f, false, 'Fotoğraf ekleyin veya kuluçka desenini seçin'); return; }
      if (pk.busy()) { msg(f, false, 'Fotoğraf küçültülüyor, bekleyin'); return; }
      try { var r = X.add('foto', { hiveId: hid, date: f.date.value, frame: f.frame.value, pattern: pat, note: f.note.value }); attachPhotos(pk, r.id).then(rerender, rerender); } catch (err) { msg(f, false, err.message); }
    });
    root.querySelectorAll('[data-act="rm"]').forEach(function (b) { b.addEventListener('click', function () { var id = b.closest('[data-id]').getAttribute('data-id'); if (!confirm('Kayıt ve fotoğrafları silinsin mi?')) return; X.remove(id); if (global.SuperAriFoto) global.SuperAriFoto.detachRecord('ke:' + id); rerender(); }); });
  }

  function renderVet(root, ap, rerender) {
    var t = today(), vl = X.list({ type: 'vet', apiaryId: ap });
    var html = '<section class="ke-card" id="keForm"><h2>Yeni kontrol / reçete</h2><form class="ke-form" autocomplete="off">' + apField(ap) +
      '<div class="ke-two"><label class="f">Tarih<input type="date" name="date" value="' + t + '"></label><label class="f">Kovan<select name="hive">' + hiveOpts(ap, '', '<option value="">Arılığın tamamı</option>') + '</select></label></div>' +
      '<label class="f">Kontrol eden (veteriner hekim / il-ilçe müdürlüğü)<input name="inspector" maxlength="80"></label>' +
      '<label class="f">Bulgular<textarea name="findings" maxlength="600" placeholder="ör. varroa %4, kireç hastalığı şüphesi, numune alındı"></textarea></label>' +
      '<label class="f">Reçete / ilaç<input name="medicine" maxlength="200" placeholder="ör. oksalik asit damlatma, 1 uygulama"></label>' +
      '<div class="ke-two"><label class="f">Bekleme süresi (gün)<input type="number" name="wd" min="0" max="365" inputmode="numeric" placeholder="etikette yazan"></label><label class="f">Belge / reçete no<input name="docNo" maxlength="60"></label></div>' +
      '<div data-pick></div><button type="submit" class="ke-btn ok">Kaydı kaydet</button><p class="ke-msg" hidden></p></form>' +
      '<p class="ke-mut">Bekleme süresini ilacın etiketinden / reçeteden girin; uygulama tahmin etmez. Bitiş günü Görevler’e otomatik eklenir.</p></section>';
    html += '<section class="ke-card" id="keList"><h2>Kayıtlar (' + vl.length + ')</h2>' + (vl.length ? vl.map(function (x) {
      var w = x.withdrawalEnd, left = w ? days(t, w) : null;
      return '<div class="ke-item" data-id="' + esc(x.id) + '"><h3>🩺 ' + esc(fmt(x.date)) + ' · ' + esc(x.hiveId != null ? hiveName(x.hiveId) : 'arılığın tamamı') + (w ? ' <span class="ke-chip ' + (left > 0 ? 'orange' : 'green') + '">' + (left > 0 ? 'Bekleme: ' + left + ' gün (' + fmt(w) + ')' : 'Bekleme bitti') + '</span>' : '') + '</h3>' +
        '<p class="m">' + esc([x.inspector ? 'Kontrol: ' + x.inspector : '', apName(x.apiaryId)].filter(Boolean).join(' · ')) + '</p>' + (x.findings ? '<p class="m"><b>Bulgular:</b> ' + esc(x.findings) + '</p>' : '') +
        (x.medicine ? '<p class="m"><b>Reçete:</b> ' + esc(x.medicine) + (x.withdrawalDays ? ' · bekleme ' + x.withdrawalDays + ' gün' : '') + '</p>' : '') + (x.docNo ? '<p class="m">Belge no: ' + esc(x.docNo) + '</p>' : '') + thumbs(x.id) +
        '<button type="button" class="ke-btn sec" data-act="rm">Kaydı sil</button></div>';
    }).join('') : '<p class="ke-empty">Veteriner kontrol kaydı yok.</p>') + '</section>';
    root.innerHTML = html; fill(root);
    var f = root.querySelector('#keForm form'), pk = photoPicker(f.querySelector('[data-pick]'));
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      try { var r = X.add('vet', { apiaryId: f.apiaryId.value, hiveId: f.hive.value || null, date: f.date.value, inspector: f.inspector.value, findings: f.findings.value, medicine: f.medicine.value, withdrawalDays: f.wd.value, docNo: f.docNo.value }); attachPhotos(pk, r.id).then(rerender, rerender); } catch (err) { msg(f, false, err.message); }
    });
    root.querySelectorAll('[data-act="rm"]').forEach(function (b) { b.addEventListener('click', function () { var id = b.closest('[data-id]').getAttribute('data-id'); if (!confirm('Kayıt silinsin mi?')) return; X.remove(id); if (global.SuperAriFoto) global.SuperAriFoto.detachRecord('ke:' + id); rerender(); }); });
  }

  var RENDER = { larva: renderLarva, kapan: renderKapan, kayip: renderKayip, hircin: renderHircin, hat: renderHat, foto: renderFoto, vet: renderVet };
  function render(key, root, ap) {
    ensureCss();
    var fn = RENDER[key]; if (!fn) { root.innerHTML = '<p class="ke-empty">Bilinmeyen ekran.</p>'; return; }
    var re = function () { location.reload(); };
    fn(root, ap, re, new URLSearchParams(location.search));
  }
  global.SuperAriKoloniEk = { KEYS: KEYS, LABEL: LABEL, tileInfo: tileInfo, stats: stats, note: note, render: render, hatRows: hatRows, larvaUpcoming: larvaUpcoming, batchesIn: batchesIn, demoTag: demoTag };
})(typeof window !== 'undefined' ? window : this);
