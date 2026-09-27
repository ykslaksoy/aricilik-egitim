/**
 * Koloni UI yardımcıları — ana arı yaşı / renk noktası / özet / düzenleyici.
 * Veri tek kaynaktan gelir: demo-data.js kovan kaydı (SuperAriDemo.colony).
 * Düzenleme yalnız Koloni sayfasında (kovanlar.html?view=koloni) yapılır;
 * diğer sayfalar yalnız okur ve «Düzenle» ile buraya bağlanır.
 */
(function (global) {
  function D() { return global.SuperAriDemo || null; }
  function C() { var d = D(); return d && d.colony ? d.colony : null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- Fotoğraflar (foto.js gerektiğinde yüklenir) ---- */
  var FOTO_SRC = (function () {
    var s = document.currentScript, m = s && /[?&]v=([^&]+)/.exec(s.src || '');
    return 'foto.js' + (m ? '?v=' + m[1] : '');
  })();
  var fotoP = null;
  function ensureFoto() {
    if (global.SuperAriFoto) return Promise.resolve(global.SuperAriFoto);
    if (fotoP) return fotoP;
    fotoP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = FOTO_SRC;
      s.onload = function () { global.SuperAriFoto ? res(global.SuperAriFoto) : rej(new Error('foto')); };
      s.onerror = function () { fotoP = null; rej(new Error('foto')); };
      document.head.appendChild(s);
    });
    return fotoP;
  }
  var thumbTimer = null;
  function scheduleThumbs() {
    if (thumbTimer) return;
    thumbTimer = setTimeout(function () {
      thumbTimer = null;
      ensureFoto().then(function (F) {
        F.fillThumbs(document, { onCount: function (rid, hid, kind, n) { var rr = R(); if (rr && rr.setPhotoCount && hid && kind) rr.setPhotoCount(hid, kind, rid, n); } });
      }).catch(function () { /* ignore */ });
    }, 0);
  }
  function thumbsBox(rec, kind, hiveId) {
    if (!rec || !rec.photoCount) return '';
    scheduleThumbs();
    return '<span class="bt-thumbs" style="display:flex;" data-foto-rec="' + esc(rec.id) + '" data-foto-hive="' + esc(hiveId) + '" data-foto-kind="' + esc(kind) + '" aria-label="' + rec.photoCount + ' fotoğraf"></span>';
  }
  /** Kayıt formunun altına fotoğraf seçici kurar; ctl.save(records) → Promise */
  function mountPhotoPicker(holder, opts) {
    var ctl = { picker: null, count: function () { return ctl.picker ? ctl.picker.count() : 0; }, busy: function () { return !!(ctl.picker && ctl.picker.busy()); } };
    ensureFoto().then(function (F) {
      if (!holder.isConnected) return;
      ctl.picker = F.picker(holder, opts || {});
    }).catch(function () { holder.innerHTML = '<p class="kol-sub" style="margin:.4rem 0 0;">Fotoğraf modülü yüklenemedi.</p>'; });
    /** list: [{ id, hiveId, kind }] */
    ctl.save = function (list) {
      var items = ctl.picker ? ctl.picker.items() : [];
      if (!items.length || !list.length) return Promise.resolve(0);
      return ensureFoto().then(function (F) {
        return F.attach(list.map(function (x) { return x.id; }), items).then(function () {
          return Promise.all(list.map(function (x) {
            return F.listFor(x.id).then(function (l) { var rr = R(); if (rr && rr.setPhotoCount) rr.setPhotoCount(x.hiveId, x.kind, x.id, l.length); });
          }));
        }).then(function () { ctl.picker.clear(); return items.length; });
      }).catch(function () { toast('Fotoğraflar saklanamadı (cihaz depolaması dolu olabilir)'); return 0; });
    };
    return ctl;
  }
  function detachPhotos(recordId) { if (global.SuperAriFoto) global.SuperAriFoto.detachRecord(recordId); else ensureFoto().then(function (F) { F.detachRecord(recordId); }).catch(function () {}); }

  var CSS = '' +
    '.qdot{display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:-.08em;margin-right:.3em;border:1px solid rgba(0,0,0,.25);flex:0 0 auto;}' +
    '.qdot.unk{background:#e9ecef;border:1.5px dashed #868e96;}.qdot.big{width:1.1em;height:1.1em;vertical-align:-.2em;}' +
    '.qcol{display:inline-flex;align-items:center;gap:.1rem;padding:.2rem .6rem;border-radius:999px;background:#fff;border:1px solid #ced4da;font-weight:800;font-size:.85rem;white-space:nowrap;}' +
    '.qleg{font-size:.8rem;padding:.55rem .7rem;border-radius:12px;background:#fff;border:1px solid var(--border,#ead9b3);}.qleg-s{color:#6b7280;font-size:.74rem;}' +
    '.qleg-row{display:flex;flex-wrap:wrap;gap:.3rem .7rem;margin-top:.3rem;}.qleg-row>span{white-space:nowrap;}' +
    '.qlabel-hint{font-size:.8rem;margin-top:.4rem;padding:.45rem .55rem;border-radius:10px;background:#fff4e6;border:1px solid #ffd8a8;color:#8a4b00;}.qlabel-hint a{color:#2b6cb0;text-decoration:underline;}' +
    '.qbadge{display:inline-flex;align-items:center;padding:.12rem .45rem;border-radius:999px;font-size:.72rem;font-weight:800;white-space:nowrap;margin-left:.3rem;}' +
    '.qbadge.renew{background:#ffe3e3;color:#c92a2a;}' +
    '.qbadge.unk{background:#e9ecef;color:#495057;}' +
    '.kol-sum{display:grid;gap:.5rem;padding:.8rem .9rem;border-radius:14px;background:#fff8df;border:1px solid var(--border,#ead9b3);}' +
    '.kol-sum .kol-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4rem;}' +
    '.kol-sum .kol-stat{background:#fff;border:1px solid var(--border,#ead9b3);border-radius:10px;padding:.45rem .5rem;min-width:0;}' +
    '.kol-sum .kol-stat b{display:block;font-size:1.1rem;color:var(--ink,#1f2933);}' +
    '.kol-sum .kol-stat span{display:block;font-size:.72rem;color:var(--muted,#6b7280);font-weight:650;line-height:1.2;}' +
    '.kol-breeds{display:flex;flex-wrap:wrap;gap:.3rem;}' +
    '.kol-breeds span{font-size:.75rem;font-weight:700;padding:.18rem .5rem;border-radius:999px;background:#fff;border:1px solid var(--border,#ead9b3);color:#5c4813;}' +
    '.kol-card{display:grid;gap:.35rem;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;}' +
    '.kol-card .kol-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.2rem .6rem;font-size:.84rem;}' +
    '.kol-card .kol-grid div{min-width:0;overflow-wrap:anywhere;}' +
    '.kol-card .kol-grid .k{color:var(--muted,#6b7280);font-size:.72rem;font-weight:700;display:block;}' +
    '.kol-card .kol-links{font-size:.8rem;color:var(--muted,#6b7280);}' +
    '.kol-card .kol-links a{color:#2b6cb0;text-decoration:underline;}' +
    '.kol-back{position:fixed;inset:0;background:rgba(20,16,8,.45);z-index:900;display:flex;align-items:flex-end;justify-content:center;}' +
    '.kol-sheet{background:var(--card,#fffdf8);width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom));box-shadow:0 -10px 30px rgba(0,0,0,.18);}' +
    '.kol-sheet h3{margin:0 0 .15rem;font-size:1.05rem;}' +
    '.kol-sheet .kol-sub{margin:0 0 .7rem;color:var(--muted,#6b7280);font-size:.82rem;}' +
    '.kol-form{display:grid;grid-template-columns:1fr 1fr;gap:.55rem .6rem;}' +
    '.kol-form label{display:grid;gap:.2rem;font-size:.75rem;font-weight:700;color:#5c4813;min-width:0;}' +
    '.kol-form .full{grid-column:1 / -1;}' +
    '.kol-form [hidden]{display:none!important;}' +
    '.kol-seg{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin:.2rem 0 .35rem;}' +
    '.kol-seg button{font:inherit;font-size:.85rem;font-weight:800;padding:.55rem .4rem;border-radius:10px;border:1.5px solid var(--border,#ead9b3);background:#fff;color:#5c4813;cursor:pointer;}' +
    '.kol-seg button.on{background:linear-gradient(180deg,#fff6df 0%,#fff3bf 100%);border-color:#e0c56a;}' +
    '.kol-queen{padding:.7rem .8rem;}' +
    '.kol-queen summary{cursor:pointer;list-style:none;display:grid;gap:.2rem;}' +
    '.kol-queen summary::-webkit-details-marker{display:none;}' +
    '.kol-queen .qid{font-weight:800;font-size:.95rem;}' +
    '.kol-queen .qmeta{font-size:.82rem;color:var(--muted,#6b7280);overflow-wrap:anywhere;}' +
    '.kol-queen ol{margin:.5rem 0 0;padding-left:1.2em;font-size:.82rem;display:grid;gap:.25rem;}' +
    '.kol-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-top:.6rem;}' +
    '.kol-tabs a{display:flex;justify-content:center;padding:.6rem .5rem;border-radius:12px;border:1.5px solid var(--border,#ead9b3);background:#fff;font-size:.88rem;font-weight:800;color:#5c4813;}' +
    '.kol-tabs a.on{background:linear-gradient(180deg,#fff6df 0%,#fff3bf 100%);border-color:#e0c56a;}' +
    '.kol-form input,.kol-form select,.kol-form textarea{width:100%;min-width:0;font:inherit;font-size:.95rem;padding:.55rem .6rem;border-radius:10px;border:1px solid var(--border,#ead9b3);background:#fff;color:var(--ink,#1f2933);}' +
    '.kol-form textarea{min-height:64px;resize:vertical;}' +
    '.kol-actions{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.8rem;}' +
    '.kol-actions .btn{padding:.75rem;white-space:normal;line-height:1.2;font-size:.9rem;}' +
    '.kol-toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);background:#2b2410;color:#fff;padding:.55rem .9rem;border-radius:999px;font-size:.85rem;font-weight:700;z-index:950;}' +
    '.kol-line{font-size:.8rem;color:var(--muted,#6b7280);line-height:1.35;overflow-wrap:anywhere;}' +
    '.kol-line a{color:#2b6cb0;text-decoration:underline;}' +
    '.kol-bulk-btn{display:flex;align-items:center;justify-content:center;gap:.4rem;width:100%;margin-top:.6rem;padding:.7rem .8rem;border-radius:12px;border:1.5px solid #e0c56a;background:linear-gradient(180deg,#fff6df 0%,#fff3bf 100%);color:#5c4813;font:inherit;font-size:.9rem;font-weight:800;cursor:pointer;}' +
    '.kol-checks{grid-column:1 / -1;border:1px solid var(--border,#ead9b3);border-radius:12px;background:#fff;max-height:34vh;overflow:auto;padding:.3rem .5rem;}' +
    '.kol-checks-head{grid-column:1 / -1;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.4rem;font-size:.8rem;font-weight:700;color:#5c4813;}' +
    '.kol-checks-head button{font:inherit;font-size:.78rem;font-weight:800;padding:.3rem .6rem;border-radius:999px;border:1px solid var(--border,#ead9b3);background:#fff8df;color:#5c4813;cursor:pointer;}' +
    '.kol-form .kol-check{display:flex;align-items:center;gap:.5rem;padding:.35rem .1rem;border-bottom:1px solid #f3ead3;font-size:.85rem;font-weight:600;color:var(--ink,#1f2933);}' +
    '.kol-form .kol-check:last-child{border-bottom:0;}' +
    '.kol-form .kol-check input{width:1.1rem;height:1.1rem;flex:0 0 auto;padding:0;}' +
    '.kol-form .kol-check span{min-width:0;overflow-wrap:anywhere;}' +
    '.kol-form .kol-check small{margin-left:auto;color:var(--muted,#6b7280);font-weight:600;white-space:nowrap;}' +
    '.kol-sheet .btn{display:inline-flex;justify-content:center;align-items:center;gap:.4rem;width:100%;border:0;border-radius:12px;padding:.75rem 1rem;background:linear-gradient(145deg,#ffd666,#f5b700);color:#3b2b00;font:inherit;font-weight:700;font-size:.95rem;cursor:pointer;}' +
    '.kol-sheet .btn.secondary{background:#fff;border:1px solid var(--border,#ead9b3);color:var(--ink,#1f2933);}' +
    '.kol-sheet{color:var(--ink,#1f2933);font-family:inherit;box-sizing:border-box;}' +
    '.kol-sheet *{box-sizing:border-box;}' +
    '.qk-types{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.35rem;margin:.3rem 0 .6rem;}' +
    '.qk-types button{font:inherit;font-size:.78rem;font-weight:800;padding:.55rem .2rem;border-radius:10px;border:1.5px solid var(--border,#ead9b3);background:#fff;color:#5c4813;cursor:pointer;line-height:1.15;}' +
    '.qk-types button.on{background:linear-gradient(180deg,#fff6df 0%,#fff3bf 100%);border-color:#e0c56a;}' +
    '.qk-scope{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.35rem;}' +
    '.qk-scope button{font:inherit;font-size:.78rem;font-weight:800;padding:.5rem .2rem;border-radius:10px;border:1.5px solid var(--border,#ead9b3);background:#fff;color:#5c4813;cursor:pointer;}' +
    '.qk-scope button.on{background:#fff3bf;border-color:#e0c56a;}';
  function ensureCss() {
    if (!global.document || document.getElementById('koloniCss')) return;
    var s = document.createElement('style');
    s.id = 'koloniCss';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function editHref(hiveId) {
    return 'kovanlar.html?view=koloni&hiveId=' + encodeURIComponent(hiveId);
  }

  /* Uluslararası ana arı renk kodu: yılın son hanesi 1/6 beyaz, 2/7 sarı, 3/8 kırmızı, 4/9 yeşil, 5/0 mavi; yıl yoksa gri/boş. */
  function dotHtml(year) {
    ensureCss();
    var c = C(); var col = c && c.queenColor(year);
    if (!col) return '<span class="qdot unk" title="Ana arı yılı bilinmiyor" aria-label="Yıl bilinmiyor"></span>';
    return '<span class="qdot" style="background:' + col.hex + '" title="Ana arı rengi: ' + esc(col.name) + '" aria-label="' + esc(col.name) + '"></span>';
  }
  /** Büyük rozet: ● 2026 · Beyaz */
  function colorBadgeHtml(year) {
    ensureCss();
    var c = C(); var col = c && c.queenColor(year);
    if (!col) return '<span class="qcol"><span class="qdot unk big"></span>Yıl bilinmiyor · gri</span>';
    return '<span class="qcol"><span class="qdot big" style="background:' + col.hex + '"></span>' + esc(year + ' · ' + col.name) + '</span>';
  }
  function legendHtml() {
    ensureCss();
    var L = [['1 / 6', 'Beyaz', '#f4f4f4'], ['2 / 7', 'Sarı', '#f2c500'], ['3 / 8', 'Kırmızı', '#d62828'], ['4 / 9', 'Yeşil', '#2f9e44'], ['5 / 0', 'Mavi', '#1e6fd9']];
    var c = C(), cy = c && c.currentYear ? c.currentYear() : new Date().getFullYear();
    return '<div class="qleg" aria-label="Ana arı renk kodu"><b>Renk kodu</b> <span class="qleg-s">(doğum yılının son hanesi · bu yıl ' + cy + ')</span><div class="qleg-row">' +
      L.map(function (x) { return '<span><span class="qdot" style="background:' + x[2] + '"></span>' + x[0] + ' ' + x[1] + '</span>'; }).join('') +
      '<span><span class="qdot unk"></span>bilinmiyor · gri</span></div></div>';
  }
  /* Basılan QR etiketindeki ana yılı (kovan başına): etiket yenileme ipucu için. */
  function labelKey() { var d = D(); var live = false; try { live = localStorage.getItem('superari.workMode') === 'live'; } catch (e) { /* ignore */ } return live ? 'superari.etiketAnaYili.v1' : 'superari.etiketAnaYili.demo.v1'; }
  function labelMap() { try { var o = JSON.parse(localStorage.getItem(labelKey()) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function markLabelsPrinted(hives) {
    var m = labelMap(), t = new Date().toISOString().slice(0, 10);
    (hives || []).forEach(function (h) { m[String(h.id)] = { y: h.queenYear != null ? Number(h.queenYear) : null, d: t }; });
    try { localStorage.setItem(labelKey(), JSON.stringify(m)); } catch (e) { /* ignore */ }
  }
  /** null (hiç basılmadı / takip yok) | { printedYear, date, refresh } */
  function labelStatus(h) {
    var e = h ? labelMap()[String(h.id)] : null;
    if (!e) return null;
    var cur = h.queenYear != null ? Number(h.queenYear) : null;
    return { printedYear: e.y, date: e.d, refresh: e.y !== cur };
  }
  function labelHintHtml(h) {
    var s = labelStatus(h);
    if (!s || !s.refresh) return '';
    ensureCss();
    return '<div class="qlabel-hint">🏷️ <b>Etiketi yenile:</b> basılı etikette ana yılı ' + esc(s.printedYear != null ? s.printedYear : 'yok') + ', şu anki ana ' + esc(h.queenYear != null ? h.queenYear : 'bilinmiyor') +
      '. <a href="qr-etiket.html?apiary=' + encodeURIComponent(h.apiaryId) + '&yenile=1">Etiket bas</a></div>';
  }
  function statusBadgeHtml(h) {
    ensureCss();
    var c = C(); if (!c) return '';
    var st = c.queenStatus(h);
    if (st === 'Yenile') return '<span class="qbadge renew">Yenile</span>';
    if (st === 'Bilinmiyor') return '<span class="qbadge unk">Bilinmiyor</span>';
    return '';
  }
  /** «● 2025 · 1 yaş · Sarı» + rozet */
  function queenHtml(h) {
    var c = C(); if (!c) return '—';
    var age = c.queenAge(h);
    if (age == null) return dotHtml(null) + 'Yıl yok' + statusBadgeHtml(h);
    var col = c.queenColor(h.queenYear);
    return dotHtml(h.queenYear) + esc(h.queenYear + ' · ' + age + ' yaş' + (col ? ' · ' + col.name : '')) + statusBadgeHtml(h);
  }
  function queenText(h) {
    var c = C(); if (!c) return '—';
    var age = c.queenAge(h);
    if (age == null) return 'Bilinmiyor (yıl girilmemiş)';
    var col = c.queenColor(h.queenYear);
    return h.queenYear + ' · ' + age + ' yaş' + (col ? ' · ' + col.name : '') + (age >= 2 ? ' · Yenile' : '');
  }
  function calmText(h) {
    var c = C(); var t = c ? c.calmLabel(h && h.calmness) : '';
    return t || '—';
  }

  function summaryHtml(hives, title) {
    ensureCss();
    var c = C(); if (!c) return '';
    var s = c.summary(hives);
    var breeds = s.breeds.map(function (b) { return '<span>' + esc(b.breed) + ' · ' + b.count + '</span>'; }).join('');
    return '<div class="kol-sum" id="koloniSummary">' +
      (title ? '<div style="font-weight:800;color:#5c4813;font-size:.9rem;">' + esc(title) + '</div>' : '') +
      '<div class="kol-breeds" aria-label="Irk dağılımı">' + (breeds || '<span>Irk kaydı yok</span>') + '</div>' +
      '<div class="kol-stats">' +
        '<div class="kol-stat"><b>' + (s.avgQueenAge != null ? String(s.avgQueenAge).replace('.', ',') : '—') + '</b><span>Ort. ana arı yaşı</span></div>' +
        '<div class="kol-stat"><b style="color:#c92a2a">' + s.requeen + '</b><span>Yenilenecek ana (≥ 2 yaş)</span></div>' +
        '<div class="kol-stat"><b>' + s.unknown + '</b><span>Yaşı bilinmiyor</span></div>' +
      '</div></div>';
  }
  /** Tek satır özet (arılık kartları / rapor). */
  function summaryLineHtml(hives, apiaryId) {
    ensureCss();
    var c = C(); if (!c) return '';
    var s = c.summary(hives);
    if (!s.total) return '';
    var br = s.breeds.map(function (b) { return b.breed + ' ' + b.count; }).join(' · ');
    var href = 'kovanlar.html?view=koloni&mode=apiary&apiary=' + encodeURIComponent(apiaryId || '');
    return '<div class="kol-line">🐝 Cins: ' + esc(br) +
      ' · Ort. ana yaşı ' + (s.avgQueenAge != null ? String(s.avgQueenAge).replace('.', ',') : '—') +
      ' · Yenilenecek ana ' + s.requeen + (s.unknown ? ' · Bilinmeyen ' + s.unknown : '') +
      (apiaryId ? ' · <a href="' + href + '" onclick="event.stopPropagation();">Koloni</a>' : '') + '</div>';
  }

  function hiveCardHtml(h, apiaryName, extraHtml) {
    ensureCss();
    var sw = h.swarmTendency || '—';
    var swTone = sw === 'Yüksek' ? ' style="color:#c92a2a;font-weight:800"' : (sw === 'Orta' ? ' style="color:#e67700;font-weight:800"' : '');
    return '<button type="button" class="item-card kol-card" data-hive="' + esc(h.id) + '" aria-label="' + esc(h.name) + ' koloni bilgisini düzenle">' +
      '<div class="row"><h3>' + esc(h.name) + '</h3><span class="badge priority-3" title="Koloni skoru">' + esc(h.colonyScore) + '</span></div>' +
      '<div class="kol-grid">' +
        '<div><span class="k">Irk</span>' + esc(h.breed || '—') + '</div>' +
        '<div><span class="k">Ana arı yaşı</span>' + queenHtml(h) + '</div>' +
        '<div><span class="k">Sakinlik</span>' + esc(calmText(h)) + '</div>' +
        '<div><span class="k">Oğul eğilimi</span><span' + swTone + '>' + esc(sw) + '</span></div>' +
      '</div>' + (extraHtml || '') +
      '<div class="kol-links">' + esc(apiaryName || '') + ' · Düzenlemek için dokunun · <a href="kovan.html?id=' + encodeURIComponent(h.id) + '" onclick="event.stopPropagation();">Kovan detayı</a></div>' +
    '</button>';
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'kol-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  function openEditor(hiveId, onSaved) {
    ensureCss();
    var d = D(); var c = C();
    if (!d || !c) return;
    var h = d.hiveById(hiveId);
    if (!h) return;
    var existing = document.getElementById('koloniEditor');
    if (existing) existing.parentNode.removeChild(existing);
    var q = h.currentQueenId && c.queenById ? c.queenById(h.currentQueenId) : null;
    var yr = c.currentYear();
    var opts = c.BREED_OPTIONS.slice();
    var curBreed = String(h.breed || '');
    var isOther = curBreed && opts.indexOf(curBreed) === -1;
    var breedSel = '<option value="">Seçin</option>' + opts.map(function (b) {
      var sel = (b === curBreed || (isOther && b === 'Diğer')) ? ' selected' : '';
      return '<option value="' + esc(b) + '"' + sel + '>' + esc(b) + '</option>';
    }).join('');
    var yearSel = '<option value="">Bilinmiyor</option>';
    var yMin = Math.min(yr - 7, h.queenYear || yr);
    for (var y = yr; y >= yMin; y--) {
      var col = c.queenColor(y);
      yearSel += '<option value="' + y + '"' + (h.queenYear === y ? ' selected' : '') + '>' + y + ' · ' + (yr - y) + ' yaş · ' + col.name + '</option>';
    }
    var calmSel = '<option value="">—</option>';
    for (var k = 5; k >= 1; k--) calmSel += '<option value="' + k + '"' + (h.calmness === k ? ' selected' : '') + '>' + k + ' · ' + c.CALM_LABELS[k] + '</option>';
    var swSel = '<option value="">—</option>' + c.SWARM_TENDENCIES.map(function (s) {
      return '<option value="' + s + '"' + (h.swarmTendency === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    var markSel = '<option value="">—</option><option value="1"' + (h.queenMarked === true ? ' selected' : '') + '>Evet</option>' +
      '<option value="0"' + (h.queenMarked === false ? ' selected' : '') + '>Hayır</option>';
    var ap = d.apiaryById(h.apiaryId);

    var back = document.createElement('div');
    back.className = 'kol-back';
    back.id = 'koloniEditor';
    back.innerHTML =
      '<div class="kol-sheet" role="dialog" aria-modal="true" aria-labelledby="kolTitle">' +
        '<h3 id="kolTitle">' + esc(h.name) + ' · Koloni</h3>' +
        '<p class="kol-sub">' + esc(ap ? ap.name : '') + ' · Mevcut ana: <b>' + esc(q ? q.id : '—') + '</b></p>' +
        '<div class="kol-seg" role="tablist">' +
          '<button type="button" data-mode="correct" class="on" aria-selected="true">Bilgileri düzelt</button>' +
          '<button type="button" data-mode="replace" aria-selected="false">Ana arıyı değiştir</button>' +
        '</div>' +
        '<p class="kol-sub" id="kolModeHint">Aynı ana arının bilgilerini düzeltir; yeni ana kaydı oluşturmaz.</p>' +
        '<form class="kol-form" id="kolForm" autocomplete="off">' +
          '<label class="full" id="kolDateWrap" hidden>Değişim tarihi<input type="date" name="date" value="' + esc(c.todayLocal ? c.todayLocal() : '') + '"></label>' +
          '<label class="full">Irk<select name="breed">' + breedSel + '</select></label>' +
          '<label class="full" id="kolOtherWrap"' + (isOther ? '' : ' hidden') + '>Irk adı<input name="breedOther" maxlength="60" value="' + esc(isOther ? curBreed : '') + '" placeholder="ör. Yerel melez"></label>' +
          '<label class="full"><span id="kolYearLbl">Ana arı doğum yılı</span><select name="queenYear">' + yearSel + '</select></label>' +
          '<label class="full">Kaynak / üretici<input name="queenSource" maxlength="120" value="' + esc(h.queenSource || '') + '" placeholder="ör. Kendi üretimim, ana arı yetiştiricisi"></label>' +
          '<label>İşaretli mi<select name="queenMarked">' + markSel + '</select></label>' +
          '<label>Sakinlik<select name="calmness">' + calmSel + '</select></label>' +
          '<label class="full">Oğul eğilimi<select name="swarmTendency">' + swSel + '</select></label>' +
          '<label class="full">Ana arı notu<input name="queenNote" maxlength="300" value="' + esc(q && q.note ? q.note : '') + '" placeholder="Bu ana arıya özel not"></label>' +
          '<label class="full">Koloni notu<textarea name="colonyNote" maxlength="500" placeholder="Koloni notu">' + esc(h.colonyNote || '') + '</textarea></label>' +
        '</form>' +
        '<div class="kol-actions">' +
          '<button type="button" class="btn secondary" id="kolCancel">Vazgeç</button>' +
          '<button type="button" class="btn" id="kolSave">Kaydet</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);
    var form = back.querySelector('#kolForm');
    var otherWrap = back.querySelector('#kolOtherWrap');
    var saveBtn = back.querySelector('#kolSave');
    var mode = 'correct';
    var snapshot = {
      queenYear: form.queenYear.value, queenSource: form.queenSource.value,
      queenMarked: form.queenMarked.value, queenNote: form.queenNote.value
    };
    function setMode(m) {
      mode = m;
      Array.prototype.forEach.call(back.querySelectorAll('.kol-seg button'), function (btn) {
        var on = btn.getAttribute('data-mode') === m;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      back.querySelector('#kolDateWrap').hidden = m !== 'replace';
      back.querySelector('#kolYearLbl').textContent = m === 'replace' ? 'Yeni ana arı doğum yılı' : 'Ana arı doğum yılı';
      back.querySelector('#kolModeHint').textContent = m === 'replace'
        ? 'Eski ana arının bu kovandaki kaydı kapanır («Değiştirildi»), yeni ana kaydı oluşturulur ve kovan geçmişine yazılır.'
        : 'Aynı ana arının bilgilerini düzeltir; yeni ana kaydı oluşturmaz.';
      if (m === 'replace') {
        form.queenYear.value = String(yr);
        form.queenSource.value = '';
        form.queenMarked.value = '1';
        form.queenNote.value = '';
        saveBtn.textContent = 'Ana arıyı değiştir';
      } else {
        form.queenYear.value = snapshot.queenYear;
        form.queenSource.value = snapshot.queenSource;
        form.queenMarked.value = snapshot.queenMarked;
        form.queenNote.value = snapshot.queenNote;
        saveBtn.textContent = 'Kaydet';
      }
    }
    Array.prototype.forEach.call(back.querySelectorAll('.kol-seg button'), function (btn) {
      btn.addEventListener('click', function () { setMode(btn.getAttribute('data-mode')); });
    });
    form.breed.addEventListener('change', function () {
      otherWrap.hidden = form.breed.value !== 'Diğer';
    });
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('#kolCancel').addEventListener('click', close);
    saveBtn.addEventListener('click', function () {
      var breed = form.breed.value;
      if (breed === 'Diğer') breed = String(form.breedOther.value || '').trim() || 'Diğer';
      var marked = form.queenMarked.value === '' ? null : form.queenMarked.value === '1';
      var patch = {
        breed: breed || h.breed || '',
        queenYear: form.queenYear.value,
        queenSource: form.queenSource.value,
        queenMarked: marked,
        calmness: form.calmness.value,
        swarmTendency: form.swarmTendency.value,
        colonyNote: form.colonyNote.value
      };
      if (mode === 'replace') { patch.note = form.queenNote.value; patch.date = form.date.value; }
      else patch.queenNote = form.queenNote.value;
      var saved = c.updateHive(h.id, patch, mode);
      close();
      if (!saved) { toast('Kaydedilemedi'); return; }
      if (typeof onSaved === 'function') onSaved(saved);
      if (mode === 'replace') {
        var last = saved.queenHistory && saved.queenHistory[saved.queenHistory.length - 1];
        showResult(saved.name + ' · ana arı değiştirildi', [{
          name: saved.name, oldYear: last && last.oldYear, newYear: last && last.newYear,
          newBreed: last && last.newBreed, oldQueenId: last && last.oldQueenId, newQueenId: last && last.newQueenId
        }]);
      } else toast('Kaydedildi');
    });
  }


  function fmtDate(dt) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dt || ''));
    return m ? (m[3] + '.' + m[2] + '.' + m[1]) : String(dt || '');
  }
  /** Tek geçmiş girdisi → «26.09.2026 · 2024 → 2026 · Kafkas → Karniyol · kaynak · toplu · not» */
  function historyEntryText(e) {
    if (!e) return '';
    var parts = [fmtDate(e.date)];
    if (e.label) {
      parts.push(e.label);
      if (e.oldQueenId || e.newQueenId) parts.push((e.oldQueenId || '—') + ' → ' + (e.newQueenId || 'anasız'));
      if (e.note) parts.push(e.note);
      return parts.join(' · ');
    }
    parts.push((e.oldYear != null ? e.oldYear : '?') + ' → ' + (e.newYear != null ? e.newYear : '?') + ' anası');
    if (e.oldBreed && e.newBreed && e.oldBreed !== e.newBreed) parts.push(e.oldBreed + ' → ' + e.newBreed);
    else if (e.newBreed || e.oldBreed) parts.push(e.newBreed || e.oldBreed);
    if (e.source) parts.push(e.source);
    if (e.marked === true) parts.push('işaretli');
    if (e.oldQueenId || e.newQueenId) parts.push((e.oldQueenId || '?') + ' → ' + (e.newQueenId || '?'));
    if (e.bulk) parts.push('toplu');
    if (e.note) parts.push(e.note);
    return parts.join(' · ');
  }
  function lastChangeText(h) {
    var hist = h && Array.isArray(h.queenHistory) ? h.queenHistory : [];
    return hist.length ? historyEntryText(hist[hist.length - 1]) : '';
  }
  /** Kovanın ana arı geçmişi (yeniden eskiye) — HTML liste. */
  function historyHtml(h, max) {
    var hist = h && Array.isArray(h.queenHistory) ? h.queenHistory.slice().reverse() : [];
    if (!hist.length) return '';
    max = max || 10;
    return '<ul style="margin:0;padding-left:1.1em;display:grid;gap:4px;">' + hist.slice(0, max).map(function (e) {
      return '<li>' + (e.newYear != null ? dotHtml(e.newYear) : '') + esc(historyEntryText(e)) + '</li>';
    }).join('') + '</ul>' + (hist.length > max ? '<p style="margin:4px 0 0;">+' + (hist.length - max) + ' eski kayıt</p>' : '');
  }
  function namesShort(names, max) {
    max = max || 3;
    var nums = names.map(function (n) { return String(n).replace(/^Kovan\s+/i, ''); });
    if (nums.length <= max) return 'Kovan ' + nums.join(', ');
    return 'Kovan ' + nums.slice(0, max).join(', ') + ', … +' + (nums.length - max);
  }
  function showResult(title, items) {
    var back = document.createElement('div');
    back.className = 'kol-back';
    back.id = 'koloniResult';
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true">' +
      '<h3>' + esc(title) + '</h3>' +
      '<div class="kol-checks" style="max-height:50vh;margin:.6rem 0;">' + items.map(function (u) {
        return '<div class="kol-check" style="display:flex;align-items:center;gap:.5rem;padding:.35rem .1rem;border-bottom:1px solid #f3ead3;font-size:.85rem;">' +
          '<span style="font-weight:700;">' + esc(u.name) + '</span>' +
          '<small style="margin-left:auto;color:var(--muted,#6b7280);text-align:right;">' +
            (u.oldYear != null ? esc(u.oldYear) : '?') + ' → ' + dotHtml(u.newYear) + esc(u.newYear != null ? u.newYear : '?') +
            (u.newBreed ? ' · ' + esc(u.newBreed) : '') +
            (u.newQueenId ? '<br>' + esc((u.oldQueenId || '?') + ' → ' + u.newQueenId) : '') + '</small></div>';
      }).join('') + '</div>' +
      '<button type="button" class="btn" id="kolResOk">Tamam</button></div>';
    document.body.appendChild(back);
    function close() { if (back.parentNode) back.parentNode.removeChild(back); }
    back.querySelector('#kolResOk').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
  }

  /**
   * Toplu ana arı değişimi: arılık seç, kovanlar işaretli gelir, değerler bir kez girilir.
   * opts: { apiaryId, onSaved(count) }
   */
  function openBulkEditor(opts) {
    ensureCss();
    opts = opts || {};
    var d = D(); var c = C();
    if (!d || !c || typeof c.bulkQueenReplace !== 'function') return;
    var existing = document.getElementById('koloniBulk');
    if (existing) existing.parentNode.removeChild(existing);
    var aps = d.loadApiaries() || [];
    if (!aps.length) return;
    var apId = opts.apiaryId && d.apiaryById(opts.apiaryId) ? String(opts.apiaryId) : String(aps[0].id);
    var yr = c.currentYear();
    var yearSel = '';
    for (var y = yr; y >= yr - 3; y--) {
      yearSel += '<option value="' + y + '"' + (y === yr ? ' selected' : '') + '>' + y + ' · ' + c.queenColor(y).name + '</option>';
    }
    var breedSel = '<option value="">Değiştirme (mevcut ırk kalsın)</option>' + c.BREED_OPTIONS.filter(function (b) { return b !== 'Diğer'; }).map(function (b) {
      return '<option value="' + esc(b) + '">' + esc(b) + '</option>';
    }).join('');
    var apSel = aps.map(function (a) {
      return '<option value="' + esc(a.id) + '"' + (String(a.id) === apId ? ' selected' : '') + '>' + esc(a.name) + '</option>';
    }).join('');

    var back = document.createElement('div');
    back.className = 'kol-back';
    back.id = 'koloniBulk';
    back.innerHTML =
      '<div class="kol-sheet" role="dialog" aria-modal="true" aria-labelledby="kolBulkTitle">' +
        '<h3 id="kolBulkTitle">Toplu ana arı değişimi</h3>' +
        '<p class="kol-sub">Arılığı seçin; tüm kovanlar işaretli gelir. Değerler seçili kovanların hepsine yazılır ve her kovanın ana arı geçmişine eklenir.</p>' +
        '<form class="kol-form" id="kolBulkForm" autocomplete="off">' +
          '<label class="full">Arılık<select name="apiary">' + apSel + '</select></label>' +
          '<div class="kol-checks-head"><span id="kolBulkCount"></span><span style="display:flex;gap:.3rem;"><button type="button" id="kolBulkAll">Tümünü seç</button><button type="button" id="kolBulkNone">Hiçbirini seçme</button></span></div>' +
          '<div class="kol-checks" id="kolBulkChecks"></div>' +
          '<label>Ana arı doğum yılı<select name="queenYear">' + yearSel + '</select></label>' +
          '<label>Değişim tarihi<input type="date" name="date" value="' + esc(c.todayLocal ? c.todayLocal() : '') + '"></label>' +
          '<label class="full">Irk<select name="breed">' + breedSel + '</select></label>' +
          '<label class="full">Kaynak / üretici<input name="queenSource" maxlength="120" placeholder="ör. Kendi üretimim, ana arı yetiştiricisi"></label>' +
          '<label>İşaretli mi<select name="queenMarked"><option value="1">Evet</option><option value="0">Hayır</option><option value="">—</option></select></label>' +
          '<label>Not (isteğe bağlı)<input name="note" maxlength="300" placeholder="ör. İlkbahar değişimi"></label>' +
        '</form>' +
        '<div class="kol-actions">' +
          '<button type="button" class="btn secondary" id="kolBulkCancel">Vazgeç</button>' +
          '<button type="button" class="btn" id="kolBulkSave">Kaydet</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);
    var form = back.querySelector('#kolBulkForm');
    var checksEl = back.querySelector('#kolBulkChecks');
    var countEl = back.querySelector('#kolBulkCount');
    var allBtn = back.querySelector('#kolBulkAll');
    var saveBtn = back.querySelector('#kolBulkSave');

    function boxes() { return Array.prototype.slice.call(checksEl.querySelectorAll('input[type=checkbox]')); }
    function updateCount() {
      var bs = boxes();
      var n = bs.filter(function (b) { return b.checked; }).length;
      countEl.textContent = n + ' / ' + bs.length + ' kovan seçili';
      var names = bs.filter(function (b) { return b.checked; }).map(function (b) { return b.getAttribute('data-name'); });
      saveBtn.textContent = n ? ('Seçili ' + n + ' kovana uygula (' + namesShort(names, 3) + ')') : 'Kovan seçin';
      saveBtn.disabled = n === 0;
      saveBtn.style.opacity = n === 0 ? '.55' : '';
    }
    function fillHives() {
      var hs = d.hivesForApiary(form.apiary.value) || [];
      checksEl.innerHTML = hs.map(function (h) {
        var age = c.queenAge(h);
        return '<label class="kol-check"><input type="checkbox" value="' + esc(h.id) + '" data-name="' + esc(h.name) + '" checked>' +
          '<span><b>' + esc(h.name) + '</b><br><small style="margin:0;">' + esc(h.breed || 'Irk yok') + '</small></span>' +
          '<small>' + (age == null ? 'Ana yılı yok' : dotHtml(h.queenYear) + esc(h.queenYear + ' · ' + age + ' yaş')) + '</small></label>';
      }).join('') || '<p class="kol-sub" style="margin:.4rem 0;">Bu arılıkta kovan yok.</p>';
      updateCount();
    }
    fillHives();
    form.apiary.addEventListener('change', fillHives);
    checksEl.addEventListener('change', updateCount);
    allBtn.addEventListener('click', function () {
      boxes().forEach(function (b) { b.checked = true; });
      updateCount();
    });
    back.querySelector('#kolBulkNone').addEventListener('click', function () {
      boxes().forEach(function (b) { b.checked = false; });
      updateCount();
    });
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('#kolBulkCancel').addEventListener('click', close);
    saveBtn.addEventListener('click', function () {
      var ids = boxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      if (!ids.length) return;
      var updated = c.bulkQueenReplace(ids, {
        queenYear: form.queenYear.value,
        breed: form.breed.value,
        queenSource: form.queenSource.value,
        queenMarked: form.queenMarked.value === '' ? null : form.queenMarked.value === '1',
        note: form.note.value,
        date: form.date.value
      });
      close();
      if (!updated || !updated.length) { toast('Güncellenemedi'); return; }
      if (typeof opts.onSaved === 'function') opts.onSaved(updated);
      showResult(updated.length + ' kovanda ana arı güncellendi', updated);
    });
  }

  function placementText(p, hiveMap, apMap) {
    var hv = hiveMap[p.hiveId];
    var name = hv ? hv.name : ('Kovan ' + p.hiveId + ' (kaldırıldı)');
    var ap = hv ? apMap[hv.apiaryId] : null;
    return name + (ap ? ' · ' + ap.name : '') + ' · ' + (p.from ? fmtDate(p.from) : 'başlangıç bilinmiyor') +
      ' → ' + (p.to ? fmtDate(p.to) : 'halen') + (p.endReason ? ' · ' + p.endReason : '');
  }
  /** «Ana arılar» listesi: kapsamdaki kovanlarda bulunan / bulunmuş ana kayıtları. */
  function queensListHtml(hives) {
    ensureCss();
    var d = D(); var c = C();
    if (!d || !c || !c.queensForHives) return '';
    var res = c.queensForHives((hives || []).map(function (h) { return h.id; }));
    var hiveMap = {}, apMap = {};
    d.loadHives().forEach(function (h) { hiveMap[h.id] = h; });
    d.loadApiaries().forEach(function (a) { apMap[a.id] = a; });
    function card(q, isCurrent) {
      var op = c.openPlacement(q);
      var hv = op ? hiveMap[op.hiveId] : null;
      var age = q.year != null ? (c.currentYear() - q.year) : null;
      var col = c.queenColor(q.year);
      var ps = q.placements.slice().reverse();
      return '<details class="item-card kol-queen">' +
        '<summary>' +
          '<div class="row"><span class="qid">' + dotHtml(q.year) + esc(q.id) + '</span>' +
            (isCurrent ? (age != null && age >= 2 ? '<span class="qbadge renew">Yenile</span>' : (age == null ? '<span class="qbadge unk">Bilinmiyor</span>' : '<span class="badge ok">Aktif</span>'))
              : '<span class="badge cevrimdisi">Geçmiş</span>') + '</div>' +
          '<div class="qmeta">' + esc((q.year != null ? q.year + ' · ' + age + ' yaş' + (col ? ' · ' + col.name : '') : 'Yıl bilinmiyor') +
            ' · ' + (q.breed || 'Irk yok') + (q.source ? ' · ' + q.source : '') + (q.marked === true ? ' · işaretli' : '')) + '</div>' +
          '<div class="qmeta">' + (hv ? 'Şu an: <b style="color:var(--ink,#1f2933)">' + esc(hv.name) + '</b>' : 'Şu an bir kovanda değil') +
            ' · ' + ps.length + ' yerleşim · ayrıntı için dokunun</div>' +
        '</summary>' +
        '<ol>' + ps.map(function (p) { return '<li>' + esc(placementText(p, hiveMap, apMap)) + '</li>'; }).join('') + '</ol>' +
        (q.note ? '<div class="qmeta" style="margin-top:.35rem;">Not: ' + esc(q.note) + '</div>' : '') +
        (hv ? '<div class="qmeta" style="margin-top:.35rem;"><a href="' + editHref(hv.id) + '" style="color:#2b6cb0;text-decoration:underline;">Düzenle</a></div>' : '') +
      '</details>';
    }
    var hintN = (hives || []).filter(function (h) { var s = labelStatus(h); return s && s.refresh; });
    return legendHtml() +
      (hintN.length ? '<div class="qlabel-hint">🏷️ <b>Etiketi yenile:</b> ' + hintN.length + ' kovanın basılı etiketindeki ana yılı güncel değil (' + esc(hintN.slice(0, 6).map(function (h) { return h.name; }).join(', ') + (hintN.length > 6 ? '…' : '')) + '). <a href="qr-etiket.html?yenile=1">Etiket bas</a></div>' : '') +
      '<h3 style="margin:.2rem 0 0;font-size:1rem;">Mevcut ana arılar (' + res.current.length + ')</h3>' +
      (res.current.map(function (q) { return card(q, true); }).join('') || '<p class="muted">Kayıt yok.</p>') +
      '<h3 style="margin:.6rem 0 0;font-size:1rem;">Önceki ana arılar (' + res.past.length + ')</h3>' +
      (res.past.map(function (q) { return card(q, false); }).join('') || '<p class="muted">Henüz değiştirilen ana arı yok.</p>');
  }

  /* ================= Koloni 3×3 menü + muayene kayıtları (güç / yavru / hastalık) ================= */
  function R() { var d = D(); return d && d.records ? d.records : null; }
  var TOPIC_ICONS = {
    ana: '<path d="M6.6 9.4 8.9 11.6 12 7.2l3.1 4.4 2.3-2.2-1.2 6.3H7.8z"/><path d="M7.8 17.8h8.4"/>',
    guc: '<path d="M7.2 17.2v-5.4M10.4 17.2V8.6M13.6 17.2v-6.8M16.8 17.2V7"/><path d="M6 17.8h12"/>',
    yavru: '<path d="M12 6.3l4.6 2.65v5.3L12 16.9l-4.6-2.65v-5.3z"/><circle cx="12" cy="11.6" r="1.7"/>',
    hastalik: '<path d="M12 5.4l5.3 2v4c0 3.2-2.2 5.6-5.3 7-3.1-1.4-5.3-3.8-5.3-7v-4z"/><path d="M12 9v5.2M9.4 11.6h5.2"/>',
    besleme: '<path d="M12 5.6c2.5 3.2 3.9 5.4 3.9 7.4a3.9 3.9 0 0 1-7.8 0c0-2 1.4-4.2 3.9-7.4z"/><path d="M10.4 13.4a1.7 1.7 0 0 0 1.6 1.5"/>',
    bolme: '<path d="M12 18.2v-5.1M12 13.1 7.7 7.6M12 13.1l4.3-5.5"/><path d="M7.4 10.3V7.4h2.9M16.6 10.3V7.4h-2.9"/>',
    ogul: '<ellipse cx="9.3" cy="10" rx="1.7" ry="1.1"/><ellipse cx="14.2" cy="8.6" rx="1.7" ry="1.1"/><ellipse cx="12.4" cy="13.2" rx="1.7" ry="1.1"/><ellipse cx="8.6" cy="15" rx="1.4" ry="0.9"/><ellipse cx="15.6" cy="14.4" rx="1.4" ry="0.9"/>',
    tasima: '<rect x="5.8" y="9" width="8.2" height="6.4" rx="0.8"/><path d="M8.4 9v6.4M11.2 9v6.4"/><path d="M15.4 12.2h3.2M17.2 10.7l1.5 1.5-1.5 1.5"/>',
    uretim: '<path d="M12 5.4c1.9 0 3 1.7 3 4.2 0 3.6-1.4 7.8-3 8.8-1.6-1-3-5.2-3-8.8 0-2.5 1.1-4.2 3-4.2z"/><path d="M10.2 9.6h3.6M10.1 12.2h3.8"/>'
  };
  var TOPICS = [
    { key: 'ana', label: 'Ana arı', ready: true },
    { key: 'guc', label: 'Koloni gücü', ready: true },
    { key: 'yavru', label: 'Yavru durumu', ready: true },
    { key: 'hastalik', label: 'Hastalık', ready: true },
    { key: 'besleme', label: 'Besleme', ready: true },
    { key: 'bolme', label: 'Bölme / Birleştirme', ready: true },
    { key: 'ogul', label: 'Oğul', ready: true },
    { key: 'tasima', label: 'Ana taşıma', ready: true },
    { key: 'uretim', label: 'Ana üretimi', ready: true }
  ];
  var TOPIC_LABEL = {};
  TOPICS.forEach(function (t) { TOPIC_LABEL[t.key] = t.label; });
  TOPIC_LABEL.kis = 'Kışlık hazırlık';
  TOPIC_LABEL.hasat = 'Hasat notu';
  TOPIC_LABEL.ilac = 'İlaçlama';

  var GRID_CSS = '' +
    '.kg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}' +
    '.kg-tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:84px;padding:6px 3px 7px;border-radius:14px;border:1px solid #e4e6ea;background:#f4f5f7;color:#5c3a1f;font:inherit;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;min-width:0;}' +
    '.kg-tile:active{transform:scale(.985);}' +
    '.kg-tile.on{border-color:#e0c56a;background:linear-gradient(180deg,#fff6df 0%,#fff3bf 100%);}' +
    '.kg-tile.soon{opacity:.62;}' +
    '.kg-hive{position:relative;width:42px;height:40px;flex:0 0 auto;}' +
    '.kg-lid{position:absolute;left:0;right:0;top:0;height:5px;border-radius:2px 2px 1px 1px;background:linear-gradient(180deg,#f4f5f7 0%,#c8ccd2 48%,#9aa1aa 100%);box-shadow:0 1px 0 #7c828a;}' +
    '.kg-box{position:absolute;left:3px;right:3px;height:15px;background-color:#e8c48e;background-image:repeating-linear-gradient(90deg,rgba(90,52,16,.07) 0 1px,transparent 1px 6px),linear-gradient(180deg,rgba(255,248,230,.35),transparent 42%,rgba(90,50,14,.16));border:1px solid #8a6030;box-sizing:border-box;}' +
    '.kg-box.t{top:5px;border-bottom:0;}.kg-box.b{top:20px;}' +
    '.kg-feet{position:absolute;left:5px;right:5px;top:36px;display:flex;justify-content:space-between;}.kg-feet span{width:6px;height:3px;background:#c99755;border-radius:1px;}' +
    '.kg-ico{position:absolute;left:50%;top:20px;transform:translate(-50%,-50%);width:26px;height:26px;}' +
    '.kg-ico svg{width:100%;height:100%;display:block;fill:none;stroke:#1a0c06;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round;mix-blend-mode:multiply;}' +
    '.kg-ico .burn-ring{fill:none;stroke:#160a05;stroke-width:1.55;}' +
    '.kg-lbl{font-size:10.5px;font-weight:750;line-height:1.12;text-align:center;overflow-wrap:anywhere;max-width:100%;}' +
    '.kg-soon{font-size:9px;font-weight:800;color:#7a5a32;background:#efe2cb;border-radius:999px;padding:1px 6px;}' +
    '.kg-count{position:absolute;top:4px;right:4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#e03131;color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.2);}' +
    '.kg-count.zero{background:#d3f9d8;color:#2b8a3e;}' +
    '.kr-chips{display:flex;flex-wrap:wrap;gap:.25rem;}' +
    '.kr-chip{display:inline-flex;align-items:center;gap:.2rem;padding:.1rem .45rem;border-radius:999px;font-size:.7rem;font-weight:800;white-space:nowrap;background:#e9ecef;color:#495057;}' +
    '.kr-chip.red{background:#ffe3e3;color:#c92a2a;}.kr-chip.orange{background:#fff3bf;color:#e67700;}.kr-chip.green{background:#d3f9d8;color:#2b8a3e;}.kr-chip.blue{background:#e7f5ff;color:#1971c2;}' +
    '.kr-hist{display:grid;gap:.35rem;margin:.4rem 0 .6rem;}' +
    '.kr-hrow{border:1px solid var(--border,#ead9b3);border-radius:10px;background:#fff;padding:.45rem .55rem;font-size:.82rem;display:grid;gap:.15rem;}' +
    '.kr-hrow .top{display:flex;justify-content:space-between;align-items:center;gap:.4rem;font-weight:800;}' +
    '.kr-hrow .top button{font:inherit;font-size:.72rem;font-weight:700;border:0;background:none;color:#c92a2a;text-decoration:underline;cursor:pointer;padding:0;}' +
    '.kr-hrow .sub{color:var(--muted,#6b7280);overflow-wrap:anywhere;}' +
    '.kr-warn{padding:.5rem .6rem;border-radius:10px;background:#ffe3e3;color:#a61e1e;font-size:.8rem;font-weight:700;line-height:1.35;}' +
    '.kr-info{padding:.5rem .6rem;border-radius:10px;background:#fff8df;color:#6b5314;font-size:.8rem;font-weight:650;line-height:1.35;}' +
    '.kol-form .kr-checkline{display:flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:700;color:var(--ink,#1f2933);}' +
    '.kol-form .kr-checkline input{width:1.15rem;height:1.15rem;padding:0;flex:0 0 auto;}' +
    '.kr-section-title{margin:.2rem 0 0;font-size:.95rem;font-weight:800;color:#5c4813;}';
  function ensureGridCss() {
    ensureCss();
    if (document.getElementById('koloniGridCss')) return;
    var s = document.createElement('style');
    s.id = 'koloniGridCss';
    s.textContent = GRID_CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /** Konu başına ilgilenilmesi gereken kovan sayısı (yalnız hazır konular). */
  function topicCounts(hives) {
    var c = C(), r = R();
    var out = { ana: 0, guc: 0, yavru: 0, hastalik: 0, besleme: 0, ogul: 0, bolme: 0, tasima: 0, uretim: 0 };
    if (!r) return out;
    var all = r.loadAll();
    /* Ana üretimi: kapsamdaki kovanlardan başlatılmış etkin partiler. */
    var inScope = {};
    (hives || []).forEach(function (h) { inScope[String(h.id)] = true; });
    var d1 = D();
    if (d1 && d1.colonyOps) {
      d1.colonyOps.batches().forEach(function (b) { if (b.status === 'aktif' && (b.sourceHiveId == null || inScope[String(b.sourceHiveId)])) out.uretim++; });
    }
    var d0 = D();
    var ogulHives = {};
    ((d0 && d0.alerts) || []).forEach(function (a) { if (a && a.type === 'ogul' && a.hiveId != null) ogulHives[String(a.hiveId)] = true; });
    (hives || []).forEach(function (h) {
      if (h.colonyState === 'birlestirildi') return;
      if (c && c.queenStatus(h) === 'Yenile') out.ana++;
      var isOgul = !!ogulHives[String(h.id)];
      if (!all[String(h.id)] && !h.queenless) { if (isOgul) out.ogul++; return; }
      var st = r.status(h.id, all);
      /* Bölme adayı: oğul hücresi; birleştirme adayı: zayıf veya anasız. Ana taşıma: ana bekleyen kovan. */
      if (st.swarmCell || st.weak || st.queenless) out.bolme++;
      if (st.queenless || h.queenless) out.tasima++;
      var ws = r.winterStatus(h.id, all);
      if (st.weak || (ws.rec && ws.statusKey !== 'hazir')) out.guc++;
      if (ws.storesKg != null && !ws.storesOk) out.besleme++;
      if (isOgul || st.swarmCell) out.ogul++;
      if (st.broodIssue) out.yavru++;
      if (st.diseases.length || st.dueChecks.length) out.hastalik++;
    });
    return out;
  }

  function gridHtml(hives, activeTopic, hrefFor) {
    ensureGridCss();
    var counts = topicCounts(hives);
    return '<div class="kg-grid" role="navigation" aria-label="Koloni konuları">' + TOPICS.map(function (t) {
      var icon = '<div class="kg-hive" aria-hidden="true"><div class="kg-lid"></div><div class="kg-box t"></div><div class="kg-box b"></div>' +
        '<div class="kg-feet"><span></span><span></span></div>' +
        '<div class="kg-ico"><svg viewBox="0 0 24 24"><circle class="burn-ring" cx="12" cy="12" r="10.2"/>' + TOPIC_ICONS[t.key] + '</svg></div></div>';
      if (!t.ready) {
        return '<button type="button" class="kg-tile soon" data-soon="' + esc(t.label) + '" aria-label="' + esc(t.label) + ' — yakında">' +
          icon + '<span class="kg-lbl">' + esc(t.label) + '</span><span class="kg-soon">Yakında</span></button>';
      }
      var n = counts[t.key] || 0;
      var why = { bolme: ' kovan bölme veya birleştirme adayı', tasima: ' kovan ana bekliyor', uretim: ' etkin üretim partisi' }[t.key] || ' kovan ilgi bekliyor';
      return '<a class="kg-tile' + (activeTopic === t.key ? ' on' : '') + '" href="' + hrefFor(t.key) + '" aria-label="' + esc(t.label) + (n ? ', ' + n + why : '') + '">' +
        '<span class="kg-count' + (n ? '' : ' zero') + '">' + n + '</span>' +
        icon + '<span class="kg-lbl">' + esc(t.label) + '</span></a>';
    }).join('') + '</div>';
  }

  function openSoon(label) {
    ensureGridCss();
    var back = document.createElement('div');
    back.className = 'kol-back';
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true"><h3>' + esc(label) + '</h3>' +
      '<p class="kol-sub" style="margin:.4rem 0 .9rem;">Bu bölüm yakında. Henüz kayıt tutulmuyor ve örnek veri gösterilmiyor.</p>' +
      '<button type="button" class="btn">Tamam</button></div>';
    document.body.appendChild(back);
    function close() { if (back.parentNode) back.parentNode.removeChild(back); }
    back.querySelector('.btn').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
  }

  function chip(text, tone) { return '<span class="kr-chip ' + (tone || '') + '">' + esc(text) + '</span>'; }
  function levelTone(level) {
    return level === 'kritik' || level === 'yüksek' ? 'red' : (level === 'orta' ? 'orange' : (level === 'izle' ? 'blue' : 'green'));
  }
  /** Kovan kartı rozetleri: güç sınıfı, anasız, üşümüş, hastalık, ilaç bekleme. */
  function recordChipsHtml(h, all) {
    var r = R(); if (!r) return '';
    var st = r.status(h.id, all);
    var out = [];
    if (st.strengthClass) out.push(chip('Güç: ' + st.strengthClass, st.strengthClass === 'Zayıf' ? 'red' : (st.strengthClass === 'Güçlü' ? 'green' : 'orange')));
    if (st.chilled) out.push(chip('Zayıf koloni', 'red'));
    if (h.colonyState === 'birlestirildi') out.push(chip('Birleştirildi' + (h.mergedInto ? ' → Kovan ' + h.mergedInto : ''), ''));
    if (st.queenless) out.push(chip('Anasız', 'red'));
    if (st.queenCellSince) out.push(chip('Ana hücresi verildi', 'orange'));
    if (st.swarmCell) out.push(chip('Oğul hücresi', 'orange'));
    st.diseases.forEach(function (d) { out.push(chip('🦠 ' + d.label, levelTone(d.level))); });
    if (st.withdrawalUntil) out.push(chip('İlaç bekleme', 'blue'));
    var ws = r.winterStatus(h.id, all);
    if (ws.rec) out.push(chip('Kış: ' + ws.status, ws.statusKey === 'hazir' ? 'green' : (ws.statusKey === 'birlestir' ? 'red' : 'orange')));
    return out.length ? '<div class="kr-chips">' + out.join('') + '</div>' : '';
  }

  function strengthText(s) {
    if (!s) return 'Kayıt yok';
    return fmtDate(s.date) + ' · ' + strengthClassOf(s) + ' · arı ' + s.beeFrames + ' · yavru ' + s.broodFrames + ' · bal ' + s.honeyFrames + ' · polen ' + s.pollenFrames + ' çerçeve';
  }
  function strengthClassOf(s) { var r = R(); return r ? r.strengthClass(s) : ''; }
  function broodText(b) {
    var r = R(); if (!b || !r) return 'Kayıt yok';
    var parts = [fmtDate(b.date), 'yumurta ' + (b.eggs ? 'görüldü' : 'görülmedi'), 'düzen ' + r.PATTERN_LABEL[b.pattern].toLocaleLowerCase('tr'),
      'ana hücresi: ' + r.QUEEN_CELL_LABEL[b.queenCell].toLocaleLowerCase('tr')];
    if (b.queenless) parts.push('ANASIZ');
    if (b.chilled) parts.push('üşümüş yavru');
    return parts.join(' · ');
  }
  function diseaseText(d) {
    var r = R(); if (!d || !r) return '';
    var lv = r.diseaseLevel(d);
    var parts = [fmtDate(d.date), r.DISEASE_LABEL[d.disease], lv.text];
    if (d.treatment) parts.push('önlem: ' + d.treatment);
    if (d.dose != null) parts.push('doz ' + String(d.dose).replace('.', ',') + ' ' + (r.DOSE_UNIT_LABEL[d.doseUnit] || '') + '/kovan');
    if (d.appliedBy) parts.push('uygulayan: ' + d.appliedBy);
    if (d.withdrawalDays) parts.push('bekleme ' + d.withdrawalDays + ' gün (' + fmtDate(r.addDays(d.date, d.withdrawalDays)) + ')');
    if (d.checkDate) parts.push('kontrol ' + fmtDate(d.checkDate));
    return parts.join(' · ');
  }

  /** Hasat çakışması: ilaç bekleme süresi içinde arılıkta hasat kaydı (rapor deposu varsa). */
  function harvestConflicts(h, st) {
    var out = [];
    var Rp = global.SuperAriRapor || global.SuperAriReports || null;
    if (!Rp || typeof Rp.harvestSummary !== 'function' || !st || !st.records) return out;
    var r = R();
    st.records.disease.forEach(function (d) {
      if (!d.withdrawalDays) return;
      var until = r.addDays(d.date, d.withdrawalDays);
      [Number(d.date.slice(0, 4)), Number(until.slice(0, 4))].filter(function (y, i, a) { return a.indexOf(y) === i; }).forEach(function (y) {
        var s; try { s = Rp.harvestSummary(y, h.apiaryId); } catch (e) { s = null; }
        (s && s.rows || []).forEach(function (row) {
          if (row.hiveId != null && String(row.hiveId) !== String(h.id)) return;
          if (row.date >= d.date && row.date <= until) out.push({ date: row.date, until: until, disease: r.DISEASE_LABEL[d.disease] });
        });
      });
    });
    return out;
  }
  function withdrawalHtml(h, st) {
    if (!st) return '';
    var html = '';
    if (st.withdrawalUntil) {
      html += '<div class="kr-info">💊 İlaç bekleme süresi: <b>' + esc(fmtDate(st.withdrawalUntil)) + '</b> tarihine kadar bu kovandan bal hasadı yapmayın.</div>';
    }
    harvestConflicts(h, st).forEach(function (c) {
      html += '<div class="kr-warn">⚠️ Bekleme süresi içinde hasat kaydı var: ' + esc(fmtDate(c.date)) + ' (' + esc(c.disease) + ', bitiş ' + esc(fmtDate(c.until)) + ').</div>';
    });
    return html;
  }

  /** Konu listesi (güç / yavru / hastalık) — kovan satırları. */
  function topicListHtml(topic, hives) {
    ensureGridCss();
    var r = R(); if (!r) return '';
    var all = r.loadAll();
    var withRec = 0;
    var rows = (hives || []).map(function (h) {
      var st = r.status(h.id, all);
      var line, chips = [];
      if (topic === 'guc') {
        line = st.strength ? strengthText(st.strength) : 'Kayıt yok';
        if (st.strength) withRec++;
        if (st.strengthClass) chips.push(chip(st.strengthClass, st.strengthClass === 'Zayıf' ? 'red' : (st.strengthClass === 'Güçlü' ? 'green' : 'orange')));
        if (st.chilled) chips.push(chip('Zayıf koloni', 'red'));
      } else if (topic === 'yavru') {
        line = st.brood ? broodText(st.brood) : 'Kayıt yok';
        if (st.brood) withRec++;
        if (st.queenless) chips.push(chip('Anasız', 'red'));
        if (st.chilled) chips.push(chip('Üşümüş yavru', 'red'));
        if (st.swarmCell) chips.push(chip('Oğul hücresi', 'orange'));
        if (st.brood && st.brood.queenCell === 'yenileme') chips.push(chip('Yenileme hücresi', 'blue'));
      } else if (topic === 'besleme') {
        var fl = st.records.feed;
        if (fl.length) withRec++;
        var ws1 = r.winterStatus(h.id, all);
        line = fl.length ? feedText(fl[0]) + ' · sezonda ' + fl.filter(function (x) { return r.currentSeason() === seasonOfDate(x.date); }).length + ' kayıt' : 'Kayıt yok';
        if (ws1.storesKg != null) chips.push(chip('Stok ' + num(ws1.storesKg) + ' kg', ws1.storesOk ? 'green' : 'red'));
      } else if (topic === 'kis') {
        var ws2 = r.winterStatus(h.id, all);
        if (ws2.rec) withRec++;
        line = ws2.rec ? (fmtDate(ws2.rec.date) + (ws2.missing.length ? ' · eksik: ' + ws2.missing.join(', ') : ' · tüm maddeler tamam')) :
          (ws2.suggestedOnly ? 'Kayıt yok · son güç kaydı Zayıf' : 'Kayıt yok');
        if (ws2.status) chips.push(chip(ws2.status + (ws2.suggestedOnly ? ' (öneri)' : ''), ws2.statusKey === 'hazir' ? 'green' : (ws2.statusKey === 'birlestir' ? 'red' : 'orange')));
      } else {
        var n = st.records.disease.length;
        if (n) withRec++;
        line = st.diseases.length ? st.diseases.map(function (d) { return d.label + ' (' + d.text + ')'; }).join(' · ') :
          (n ? 'Etkin hastalık yok · ' + n + ' kayıt' : 'Kayıt yok');
        st.diseases.forEach(function (d) { chips.push(chip('🦠 ' + d.label, levelTone(d.level))); });
        st.dueChecks.forEach(function (c) { chips.push(chip('Kontrol: ' + c.label, 'orange')); });
        if (st.withdrawalUntil) chips.push(chip('İlaç bekleme · ' + fmtDate(st.withdrawalUntil), 'blue'));
      }
      var has = topic === 'guc' ? !!st.strength : (topic === 'yavru' ? !!st.brood : (topic === 'besleme' ? st.records.feed.length > 0 :
        (topic === 'kis' ? !!r.winterStatus(h.id, all).rec : st.records.disease.length > 0)));
      var rank = chips.length && (topic !== 'guc' || st.weak) ? 0 : (has ? 1 : 2);
      if (topic === 'hastalik' && !st.diseases.length && !st.dueChecks.length) rank = has ? 1 : 2;
      if (topic === 'besleme') rank = chips.length && chips[0].indexOf(' red') > 0 ? 0 : (has ? 1 : 2);
      if (topic === 'kis') rank = has || chips.length ? (chips.length && chips[0].indexOf(' green') < 0 ? 0 : 1) : 2;
      return { rank: rank, html: '<button type="button" class="item-card kol-card kr-row" data-hive="' + esc(h.id) + '" data-topic="' + topic + '">' +
        '<div class="row"><h3>' + esc(h.name) + '</h3>' + (chips.length ? '<span class="kr-chips">' + chips.join('') + '</span>' : '') + '</div>' +
        '<div class="kol-links" style="color:var(--ink,#1f2933);font-size:.84rem;">' + esc(line) + '</div>' +
        '<div class="kol-links">Kayıt eklemek ve geçmişi görmek için dokunun</div></button>' };
    }).map(function (x, i) { x.i = i; return x; }).sort(function (a, b) { return a.rank - b.rank || a.i - b.i; })
      .map(function (x) { return x.html; });
    var mode = r.workMode() === 'live' ? 'Canlı mod: yalnız sizin girdiğiniz kayıtlar.' : 'Demo mod: birkaç örnek kayıt «Demo» etiketiyle gösterilir.';
    var head = '';
    if (topic === 'besleme') head = feedTotalsHtml(hives, all);
    if (topic === 'kis') head = winterLineHtml(hives, '', true);
    return head + '<p class="kol-sub" style="margin:0;">' + withRec + ' / ' + (hives || []).length + ' kovanda kayıt var. ' + mode + '</p>' +
      (rows.join('') || '<p class="muted">Kovan bulunamadı.</p>');
  }

  function histRow(title, sub, rec, kind, hiveId) {
    return '<div class="kr-hrow"><div class="top"><span>' + esc(title) + (rec.demo ? ' <span class="kr-chip">Demo</span>' : '') + '</span>' +
      '<button type="button" data-del="' + esc(rec.id) + '" data-kind="' + kind + '" data-hive="' + esc(hiveId) + '">Sil</button></div>' +
      (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + thumbsBox(rec, kind, hiveId) + '</div>';
  }

  function sevOptions(labels, keys, cur) {
    return keys.map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(labels[k]) + '</option>'; }).join('');
  }

  function diseaseFieldsHtml(key) {
    var r = R();
    var sevSel = '<select name="severity">' + sevOptions(r.SEVERITY_LABEL, r.SEVERITY, 'yok') + '</select>';
    if (key === 'varroa') {
      return '<label>Akar sayısı<input type="number" name="count" min="0" max="5000" inputmode="numeric" placeholder="ör. 6"></label>' +
        '<label>Yöntem<select name="method">' + sevOptions(r.VARROA_METHOD_LABEL, ['seker', 'alkol', 'tabla'], 'seker') + '</select></label>' +
        '<label class="full">Bulaşma %<input type="number" name="infestation" min="0" max="100" step="0.1" inputmode="decimal" placeholder="Boşsa otomatik hesaplanır"></label>';
    }
    if (key === 'nosema') {
      return '<label>Durum<select name="status">' + sevOptions(r.NOSEMA_LABEL, ['yok', 'suphe', 'dogrulandi'], 'yok') + '</select></label>' +
        '<label>Spor sayısı (isteğe bağlı)<input type="number" name="spores" min="0" inputmode="numeric"></label>';
    }
    if (key === 'kirec') {
      return '<label>Derece' + sevSel + '</label><label>Etkilenen çerçeve<input type="number" name="frames" min="0" max="30" inputmode="numeric"></label>';
    }
    if (key === 'ayc') {
      return '<label class="full">Durum<select name="status">' + sevOptions(r.AYC_LABEL, ['temiz', 'suphe', 'dogrulandi'], 'temiz') + '</select></label>' +
        '<div class="kr-warn full" style="grid-column:1 / -1;">Amerikan yavru çürüğü ihbarı zorunlu bir hastalıktır. Doğrulanırsa İl/İlçe Tarım ve Orman Müdürlüğüne bildirin; kovan «Müdahale» durumuna geçer ve arılıktaki diğer kovanlar için kontrol görevi açılır.</div>';
    }
    return '<label class="full">Derece' + sevSel + '</label>';
  }

  /* Konu formları (Koloni sayfası, kovan detayı ve Hızlı kayıt ortak kullanır). */
  var KIND_OF_TOPIC = { guc: 'strength', yavru: 'brood', hastalik: 'disease', besleme: 'feed', hasat: 'harvest', ilac: 'disease' };
  function topicFormHtml(topic, today) {
    var r = R();
    var form = '';
    if (topic === 'guc') {
      form = '<label class="full">Muayene tarihi<input type="date" name="date" value="' + esc(today) + '"></label>' +
        '<label>Arılı çerçeve<input type="number" name="beeFrames" min="0" max="40" inputmode="numeric" required></label>' +
        '<label>Yavrulu çerçeve<input type="number" name="broodFrames" min="0" max="30" inputmode="numeric"></label>' +
        '<label>Ballı çerçeve<input type="number" name="honeyFrames" min="0" max="30" inputmode="numeric"></label>' +
        '<label>Polenli çerçeve<input type="number" name="pollenFrames" min="0" max="20" inputmode="numeric"></label>' +
        '<div class="kr-info" id="krClass" style="grid-column:1 / -1;">Sınıf: —</div>' +
        '<label class="full">Not<input name="note" maxlength="300"></label>';
    } else if (topic === 'besleme') {
      form = '<label class="full">Tarih<input type="date" name="date" value="' + esc(today) + '"></label>' +
        '<label>Tür<select name="type">' + r.FEED_TYPES.map(function (x) { return '<option value="' + x.key + '">' + esc(x.label) + '</option>'; }).join('') + '</select></label>' +
        '<label><span id="krAmtLbl">Miktar (L)</span><input type="number" name="amount" min="0" max="500" step="0.1" inputmode="decimal" required></label>' +
        '<label class="full">Not<input name="note" maxlength="300"></label>';
    } else if (topic === 'yavru') {
      form = '<label class="full">Muayene tarihi<input type="date" name="date" value="' + esc(today) + '"></label>' +
        '<label>Yumurta görüldü mü<select name="eggs"><option value="1">Evet</option><option value="0">Hayır</option></select></label>' +
        '<label>Yavru düzeni<select name="pattern"><option value="duzenli">Düzenli</option><option value="daginik">Dağınık</option></select></label>' +
        '<label class="full">Ana hücresi<select name="queenCell"><option value="yok">Yok</option><option value="ogul">Oğul hücresi</option><option value="yenileme">Yenileme hücresi</option></select></label>' +
        '<label class="kr-checkline full"><input type="checkbox" name="queenless"> Anasız</label>' +
        '<label class="kr-checkline full"><input type="checkbox" name="chilled"> Üşümüş yavru</label>' +
        '<label class="full">Not<input name="note" maxlength="300"></label>';
    } else if (topic === 'hasat') {
      form = '<label class="full">Tarih<input type="date" name="date" value="' + esc(today) + '"></label>' +
        '<label>Bal (kg)<input type="number" name="kg" min="0" max="500" step="0.1" inputmode="decimal"></label>' +
        '<label>Çerçeve<input type="number" name="frames" min="0" max="60" inputmode="numeric"></label>' +
        '<label class="full">Bal türü<input name="honeyType" maxlength="40" list="krHoneyTypes" placeholder="ör. Çiçek, Kestane">' + honeyTypesDatalist() + '</label>' +
        '<label class="full">Not<input name="note" maxlength="300" placeholder="ör. 2 ballık, ikinci sıyırma"></label>' +
        '<p class="kol-sub full" style="grid-column:1 / -1;margin:0;">Raporlar › Bal / verim toplamlarına da eklenir.</p>';
    } else {
      form = '<label class="full">Tarih<input type="date" name="date" value="' + esc(today) + '"></label>' +
        '<label class="full">Hastalık<select name="disease">' + r.DISEASES.map(function (x) { return '<option value="' + x.key + '">' + esc(x.label) + '</option>'; }).join('') + '</select></label>' +
        '<div id="krDzFields" style="grid-column:1 / -1;display:grid;grid-template-columns:1fr 1fr;gap:.55rem .6rem;">' + diseaseFieldsHtml('varroa') + '</div>' +
        '<label class="full">Tedavi / önlem (ilaç)<input name="treatment" maxlength="200" placeholder="ör. Oksalik asit damlatma"></label>' +
        '<label>Doz (kovan başına)<input type="number" name="dose" min="0" max="1000" step="0.1" inputmode="decimal"></label>' +
        '<label>Birim<select name="doseUnit"><option value="serit">şerit</option><option value="ml">ml</option><option value="g">g</option></select></label>' +
        '<label class="full">Uygulayan kişi<input name="appliedBy" maxlength="80" placeholder="ör. Yüksel"></label>' +
        '<label>İlaç bekleme (gün)<input type="number" name="withdrawalDays" min="0" max="365" inputmode="numeric" placeholder="0"></label>' +
        '<label>Kontrol tarihi<input type="date" name="checkDate"></label>' +
        '<label class="full">Not<input name="note" maxlength="300"></label>';
    }
    return form;
  }
  /* ---- Sesli not (Web Speech API, tr-TR) ---- */
  var activeRec = null;
  function speechCtor() { return global.SpeechRecognition || global.webkitSpeechRecognition || null; }
  function micCss() {
    if (document.getElementById('krMicCss')) return;
    var s = document.createElement('style');
    s.id = 'krMicCss';
    s.textContent = '.kr-mic-row{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;min-width:0;margin-top:-.15rem;}' +
      '.kr-mic{display:inline-flex;align-items:center;gap:.3rem;padding:.36rem .7rem;border-radius:999px;border:1px solid var(--border,#ead9b3);background:#fff;font:inherit;font-size:.8rem;font-weight:750;color:#5c4813;cursor:pointer;}' +
      '.kr-mic.on{background:#ffe3e3;border-color:#f5a3a3;color:#c92a2a;animation:krMicPulse 1.2s ease-in-out infinite;}' +
      '@keyframes krMicPulse{50%{box-shadow:0 0 0 5px rgba(201,42,42,.15);}}' +
      '.kr-mic-msg{font-size:.74rem;color:var(--muted,#6b7280);min-width:0;flex:1 1 12rem;overflow-wrap:anywhere;}';
    document.head.appendChild(s);
  }
  function micUnsupportedText() {
    if (global.isSecureContext === false) return 'Sesle yazma yalnız güvenli (https) bağlantıda çalışır.';
    return 'Sesle yazma bu tarayıcıda desteklenmiyor (ör. Firefox). Chrome, Edge veya Safari kullanın ya da klavyenin mikrofon tuşuyla yazdırın.';
  }
  /** Formdaki not alanlarının altına «🎤 Sesle yaz» düğmesi ekler. */
  function addMicButtons(form) {
    if (!form) return;
    micCss();
    Array.prototype.forEach.call(form.querySelectorAll('input[name=note], textarea[name=note]'), function (el) {
      if (el.__micBound) return;
      el.__micBound = true;
      var host = el.closest('label') || el;
      var row = document.createElement('div');
      row.className = 'kr-mic-row';
      row.innerHTML = '<button type="button" class="kr-mic" aria-label="Notu sesle yaz">🎤 Sesle yaz</button><span class="kr-mic-msg" aria-live="polite"></span>';
      host.parentNode.insertBefore(row, host.nextSibling);
      var btn = row.querySelector('.kr-mic'), msg = row.querySelector('.kr-mic-msg');
      var rec = null, base = '';
      function stopUi() { btn.classList.remove('on'); btn.textContent = '🎤 Sesle yaz'; rec = null; if (activeRec && activeRec.btn === btn) activeRec = null; }
      btn.addEventListener('click', function () {
        if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } return; }
        var Ctor = speechCtor();
        if (!Ctor || global.isSecureContext === false) { msg.textContent = micUnsupportedText(); return; }
        if (activeRec) { try { activeRec.rec.abort(); } catch (e) { /* ignore */ } }
        try { rec = new Ctor(); } catch (e) { msg.textContent = micUnsupportedText(); return; }
        rec.lang = 'tr-TR';
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        base = String(el.value || '').replace(/\s+$/, '');
        var max = Number(el.getAttribute('maxlength')) || 300;
        rec.onresult = function (ev) {
          var fin = '', tmp = '';
          for (var i = 0; i < ev.results.length; i++) {
            var t = ev.results[i][0] ? ev.results[i][0].transcript : '';
            if (ev.results[i].isFinal) fin += t; else tmp += t;
          }
          var said = (fin + tmp).trim();
          el.value = ((base ? base + ' ' : '') + said).slice(0, max);
          msg.textContent = tmp ? 'Dinleniyor…' : 'Eklendi. Düzeltebilirsiniz.';
          try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* ignore */ }
        };
        rec.onerror = function (ev) {
          var c = ev && ev.error;
          msg.textContent = c === 'not-allowed' || c === 'service-not-allowed' ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.'
            : c === 'no-speech' ? 'Ses algılanmadı; tekrar deneyin.'
            : c === 'network' ? 'Ses tanıma için internet bağlantısı gerekiyor.'
            : c === 'audio-capture' ? 'Mikrofon bulunamadı.'
            : c === 'aborted' ? '' : 'Ses tanınamadı; tekrar deneyin.';
          stopUi();
        };
        rec.onend = function () { stopUi(); };
        try {
          rec.start();
          activeRec = { rec: rec, btn: btn };
          btn.classList.add('on'); btn.textContent = '⏹ Durdur';
          msg.textContent = 'Konuşun… (Türkçe)';
        } catch (e) { msg.textContent = 'Ses tanıma başlatılamadı.'; stopUi(); }
      });
    });
  }

  function wireTopicForm(topic, f, root) {
    var r = R();
    addMicButtons(f);
    if (topic === 'guc') {
      var upd = function () {
        var cls = r.strengthClass({ beeFrames: f.elements.beeFrames.value, broodFrames: f.elements.broodFrames.value });
        var el = root.querySelector('#krClass'); if (el) el.textContent = 'Sınıf: ' + (f.elements.beeFrames.value === '' ? '—' : cls);
      };
      f.addEventListener('input', upd);
      upd();
    }
    if (topic === 'besleme') {
      var lbl = function () { var el = root.querySelector('#krAmtLbl'); if (el) el.textContent = 'Miktar (' + r.FEED_UNIT[f.elements['type'].value] + ')'; };
      f.elements['type'].addEventListener('change', lbl);
      lbl();
    }
    if (topic === 'hastalik' || topic === 'ilac') {
      f.elements.disease.addEventListener('change', function () { root.querySelector('#krDzFields').innerHTML = diseaseFieldsHtml(f.elements.disease.value); });
    }
  }
  function resetTopicForm(topic, f, root, today) {
    var r = R();
    f.reset();
    if (f.elements.date) f.elements.date.value = today;
    if (topic === 'hastalik' || topic === 'ilac') root.querySelector('#krDzFields').innerHTML = diseaseFieldsHtml(f.elements.disease.value);
    if (topic === 'besleme') root.querySelector('#krAmtLbl').textContent = 'Miktar (' + r.FEED_UNIT[f.elements['type'].value] + ')';
    if (topic === 'guc') f.dispatchEvent(new Event('input'));
  }
  /** Formdan kayıt: { kind, rec } veya null (eksik alan: uyarı + odak). */
  function readTopicForm(topic, f) {
    function v(n) { return f.elements[n] ? f.elements[n].value : ''; }
    if (topic === 'guc') {
      if (v('beeFrames') === '') { f.elements.beeFrames.focus(); toast('Arılı çerçeve sayısını girin'); return null; }
      return { kind: 'strength', rec: { date: v('date'), beeFrames: v('beeFrames'), broodFrames: v('broodFrames'), honeyFrames: v('honeyFrames'), pollenFrames: v('pollenFrames'), note: v('note') } };
    }
    if (topic === 'besleme') {
      if (v('amount') === '') { f.elements.amount.focus(); toast('Miktarı girin'); return null; }
      return { kind: 'feed', rec: { date: v('date'), type: v('type'), amount: v('amount'), note: v('note') } };
    }
    if (topic === 'yavru') {
      return { kind: 'brood', rec: { date: v('date'), eggs: v('eggs') === '1', pattern: v('pattern'), queenCell: v('queenCell'), queenless: f.elements.queenless.checked, chilled: f.elements.chilled.checked, note: v('note') } };
    }
    if (topic === 'hasat') {
      if (v('kg') === '' && v('frames') === '' && v('note') === '') { f.elements.kg.focus(); toast('Kg, çerçeve veya not girin'); return null; }
      return { kind: 'harvest', rec: { date: v('date'), kg: v('kg'), frames: v('frames'), honeyType: v('honeyType'), note: v('note') } };
    }
    if (topic === 'ilac' && !v('treatment')) { f.elements.treatment.focus(); toast('Uygulanan ilacı / yöntemi yazın'); return null; }
    return { kind: 'disease', rec: { date: v('date'), disease: v('disease'), count: v('count'), method: v('method'), infestation: v('infestation'), status: v('status'), spores: v('spores'),
      severity: v('severity'), frames: v('frames'), treatment: v('treatment'), dose: v('dose'), doseUnit: v('doseUnit'), appliedBy: v('appliedBy'),
      withdrawalDays: v('withdrawalDays'), checkDate: v('checkDate'), note: v('note') } };
  }

  /** Konu kayıt sayfası: geçmiş + yeni kayıt formu. */
  function openRecordSheet(topic, hiveId, onSaved, editRec) {
    ensureGridCss();
    if (topic === 'kis') return openWinterSheet(hiveId, onSaved);
    var d = D(), r = R();
    if (!d || !r) return;
    var h = d.hiveById(hiveId);
    if (!h) return;
    var old = document.getElementById('koloniRecord');
    if (old) old.parentNode.removeChild(old);
    var today = C() && C().todayLocal ? C().todayLocal() : '';
    var back = document.createElement('div');
    back.className = 'kol-back';
    back.id = 'koloniRecord';
    function histHtml() {
      var st = r.status(h.id);
      var rec = st.records;
      var items = '';
      if (topic === 'guc') {
        items = rec.strength.map(function (s) {
          return histRow(fmtDate(s.date) + ' · ' + r.strengthClass(s), 'Arı ' + s.beeFrames + ' · yavru ' + s.broodFrames + ' · bal ' + s.honeyFrames + ' · polen ' + s.pollenFrames + ' çerçeve' + (s.note ? ' · ' + s.note : ''), s, 'strength', h.id);
        }).join('');
      } else if (topic === 'besleme') {
        items = rec.feed.map(function (x) {
          return histRow(fmtDate(x.date) + ' · ' + r.FEED_LABEL[x.type], num(x.amount) + ' ' + r.FEED_UNIT[x.type] + (x.note ? ' · ' + x.note : ''), x, 'feed', h.id);
        }).join('');
      } else if (topic === 'hasat') {
        items = rec.harvest.map(function (x) {
          return histRow(fmtDate(x.date) + ' · Hasat notu', harvestText(x), x, 'harvest', h.id);
        }).join('');
      } else if (topic === 'yavru') {
        items = rec.brood.map(function (b) {
          return histRow(fmtDate(b.date) + (b.queenless ? ' · Anasız' : '') + (b.chilled ? ' · Üşümüş yavru' : ''), broodText(b).split(' · ').slice(1).join(' · ') + (b.note ? ' · ' + b.note : ''), b, 'brood', h.id);
        }).join('');
      } else {
        items = rec.disease.map(function (x) {
          var lv = r.diseaseLevel(x);
          return histRow(fmtDate(x.date) + ' · ' + r.DISEASE_LABEL[x.disease] + ' · ' + lv.text, diseaseText(x).split(' · ').slice(3).join(' · ') + (x.note ? ' · ' + x.note : ''), x, 'disease', h.id);
        }).join('');
      }
      var trend = '';
      if (topic === 'guc' && rec.strength.length > 1) {
        var a = rec.strength[rec.strength.length - 1], z = rec.strength[0];
        var diff = z.beeFrames - a.beeFrames;
        trend = '<div class="kr-info">Eğilim: ' + fmtDate(a.date) + ' → ' + fmtDate(z.date) + ' arılı çerçeve ' + a.beeFrames + ' → ' + z.beeFrames + ' (' + (diff > 0 ? '+' : '') + diff + ').</div>';
      }
      if (topic === 'besleme') {
        var ws = r.winterStatus(h.id);
        trend = '<div class="kr-info">Sonbahar beslemesi (kışlık stok önerisi): <b>' + num(ws.suggestedKg) + ' kg</b>' +
          (ws.rec && ws.rec.storesKg != null ? ' · kayıtlı kışlık stok ' + num(ws.rec.storesKg) + ' kg' : '') +
          ' · en az ' + r.WINTER_MIN_KG + ' kg önerilir. <a href="#" data-open-kis="1">Kışlık hazırlık</a></div>';
      }
      if (topic === 'guc') {
        var ws3 = r.winterStatus(h.id);
        trend += '<div class="kr-info">Kışlık hazırlık: <b>' + esc(ws3.status ? ws3.status + (ws3.suggestedOnly ? ' (öneri)' : '') : 'kayıt yok') + '</b> · <a href="#" data-open-kis="1">Aç</a></div>';
      }
      var cnt = topic === 'guc' ? rec.strength.length : topic === 'yavru' ? rec.brood.length : topic === 'besleme' ? rec.feed.length : topic === 'hasat' ? rec.harvest.length : rec.disease.length;
      return (topic === 'hastalik' ? withdrawalHtml(h, st) : '') + trend +
        '<div class="kr-section-title">Geçmiş (' + cnt + ')</div>' +
        '<div class="kr-hist">' + (items || '<p class="kol-sub" style="margin:0;">Henüz kayıt yok.</p>') + '</div>';
    }
    var form = topicFormHtml(topic, today);
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true" aria-labelledby="krTitle">' +
      '<h3 id="krTitle">' + esc(h.name) + ' · ' + esc(TOPIC_LABEL[topic]) + '</h3>' +
      '<p class="kol-sub">' + esc(r.workMode() === 'live' ? 'Canlı mod' : 'Demo mod') + ' · kayıtlar bu kovana yazılır</p>' +
      '<div id="krHist">' + histHtml() + '</div>' +
      '<div class="kr-section-title">' + (editRec ? 'Kaydı düzenle · ' + esc(fmtDate(editRec.date)) : 'Yeni kayıt') + '</div>' +
      '<form class="kol-form" id="krForm" autocomplete="off" style="margin-top:.4rem;">' + form + '</form>' +
      '<div id="krFoto"></div>' +
      '<div class="kol-actions"><button type="button" class="btn secondary" id="krClose">Kapat</button><button type="button" class="btn" id="krSave">' + (editRec ? 'Güncelle' : 'Kaydet') + '</button></div></div>';
    document.body.appendChild(back);
    var f = back.querySelector('#krForm');
    var photoKind = topic === 'guc' ? 'strength' : topic === 'yavru' ? 'brood' : topic === 'besleme' ? 'feed' : topic === 'hasat' ? 'harvest' : 'disease';
    var photos = mountPhotoPicker(back.querySelector('#krFoto'), editRec ? {
      existingRecordId: editRec.photoCount ? editRec.id : null, hiveId: h.id, kind: photoKind,
      onCount: function (rid, hid, kind, n) { r.setPhotoCount(hid, kind, rid, n); if (typeof onSaved === 'function') onSaved(); }
    } : {});
    function fillForm(rec) {
      if (!rec) return;
      if (topic === 'hastalik' && rec.disease) {
        f.elements.disease.value = rec.disease;
        back.querySelector('#krDzFields').innerHTML = diseaseFieldsHtml(rec.disease);
      }
      Object.keys(rec).forEach(function (k) {
        var el = f.elements[k];
        if (!el || k === 'disease') return;
        var val = rec[k];
        if (el.type === 'checkbox') el.checked = !!val;
        else if (k === 'eggs') el.value = val ? '1' : '0';
        else el.value = val == null ? '' : String(val);
      });
    }
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('#krClose').addEventListener('click', close);
    fillForm(editRec);
    wireTopicForm(topic, f, back);
    back.querySelector('#krHist').addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-open-kis]') : null;
      if (!a) return;
      e.preventDefault();
      close();
      openWinterSheet(h.id, onSaved);
    });
    back.querySelector('#krHist').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-del]') : null;
      if (!btn) return;
      if (!confirm('Bu kayıt silinsin mi?')) return;
      r.remove(btn.getAttribute('data-hive'), btn.getAttribute('data-kind'), btn.getAttribute('data-del'));
      detachPhotos(btn.getAttribute('data-del'));
      back.querySelector('#krHist').innerHTML = histHtml();
      if (typeof onSaved === 'function') onSaved();
    });
    back.querySelector('#krSave').addEventListener('click', function () {
      var got = readTopicForm(topic, f);
      if (!got) return;
      var rec = got.rec, kind = got.kind;
      if (photos.busy()) { toast('Fotoğraf hazırlanıyor, birazdan tekrar deneyin'); return; }
      if (kind === 'harvest' && !confirmHarvestWithdrawal([h.id], rec.date)) return;
      var saved = editRec ? r.update(h.id, kind, editRec.id, rec) : r.add(h.id, kind, rec);
      if (!saved) { toast('Kaydedilemedi'); return; }
      var saveBtn = back.querySelector('#krSave');
      saveBtn.disabled = true;
      photos.save([{ id: saved.id, hiveId: h.id, kind: kind }]).then(function (np) {
        saveBtn.disabled = false;
        var pmsg = np ? ' · ' + np + ' fotoğraf' : '';
        if (editRec) { toast('Güncellendi' + pmsg); close(); if (typeof onSaved === 'function') onSaved(saved); return; }
        afterSave(pmsg);
      });
      function afterSave(pmsg) {
      back.querySelector('#krHist').innerHTML = histHtml();
      resetTopicForm(topic, f, back, today);
      var msg = 'Kaydedildi';
      if (kind === 'brood' && saved.queenless) msg = 'Kaydedildi · Anasız: görev ve uyarı açıldı';
      else if (kind === 'brood' && saved.chilled) msg = 'Kaydedildi · Zayıf koloni: «Birleştir veya çerçeve azalt» önerildi';
      else if (kind === 'disease' && saved.disease === 'ayc' && saved.status === 'dogrulandi') msg = 'Kaydedildi · AYÇ: ihbarı zorunlu, komşu kovan kontrol görevi açıldı';
      toast(msg + pmsg);
      if (typeof onSaved === 'function') onSaved(saved);
      }
    });
  }

  function num(n) { return String(Math.round((Number(n) || 0) * 10) / 10).replace('.', ','); }
  function seasonOfDate(dt) {
    var m = /^(\d{4})-(\d{2})/.exec(dt || ''); if (!m) return 0;
    return Number(m[2]) <= 2 ? Number(m[1]) - 1 : Number(m[1]);
  }
  function honeyTypesDatalist() {
    var d = D();
    var list = (d && d.harvests && d.harvests.HONEY_TYPES) || [];
    return '<datalist id="krHoneyTypes">' + list.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist>';
  }
  /** Hasat kaydında ilaç bekleme süresi onayı: yalnız hedef kovanlar. true → kaydet. */
  function confirmHarvestWithdrawal(hiveIds, date) {
    var r = R(); if (!r || !r.withdrawalConflicts || !date) return true;
    var set = {}; (hiveIds || []).forEach(function (id) { set[String(id)] = true; });
    var wc = r.withdrawalConflicts(null, date).filter(function (c) { return set[String(c.hiveId)]; });
    if (!wc.length) return true;
    var lines = wc.map(function (c) { return '• ' + c.hiveName + ': ' + c.disease + ' ilacı, bekleme ' + fmtDate(c.until) + ' tarihine kadar'; }).join('\n');
    var ok = confirm('Uyarı: Bu tarih ilaç bekleme süresi içinde.\n' + lines + '\n\nBu kovanların balı hasada dahil edilmemeli. Yine de kaydedilsin mi?');
    if (!ok) toast('Kaydedilmedi: bekleme süresindeki kovan var (' + namesShort(wc.map(function (c) { return c.hiveName; }), 3) + ')');
    return ok;
  }
  function harvestText(x) {
    var p = [];
    if (x.kg != null) p.push(num(x.kg) + ' kg');
    if (x.honeyType) p.push(x.honeyType);
    if (x.frames != null) p.push(x.frames + ' çerçeve');
    if (x.note) p.push(x.note);
    return p.join(' · ') || '—';
  }
  function feedText(f) {
    var r = R(); if (!f || !r) return '';
    return fmtDate(f.date) + ' · ' + r.FEED_LABEL[f.type] + ' ' + num(f.amount) + ' ' + r.FEED_UNIT[f.type];
  }
  /** Türkçe iyelik eki: 28'i, 3'ü, 6'sı, 10'u, 40'ı … */
  function possSuffix(n) {
    n = Math.abs(Math.round(Number(n) || 0));
    if (n === 0) return "'ı";
    if (n % 1000 === 0) return "'i";
    if (n % 100 === 0) return "'ü";
    var last = n % 10;
    if (last) return ["", "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u"][last];
    return { 1: "'u", 2: "'si", 3: "'u", 4: "'ı", 5: "'si", 6: "'ı", 7: "'i", 8: "'i", 9: "'ı" }[(n % 100) / 10];
  }
  /** «35 kovanın 28'i kışa hazır» satırı (kışlık hazırlık kayıtlarından). */
  function winterLineHtml(hives, apiaryId, inList) {
    var r = R(); if (!r) return '';
    ensureGridCss();
    var s = r.winterSummary(hives || []);
    if (!s.total) return '';
    var href = 'kovanlar.html?view=koloni&topic=guc&sub=kis' + (apiaryId ? '&mode=apiary&apiary=' + encodeURIComponent(apiaryId) : '&mode=all');
    var extra = [];
    if (s.eksik) extra.push('eksik var ' + s.eksik);
    if (s.birlestir) extra.push('birleştirilmeli ' + s.birlestir);
    var body = s.recorded || s.birlestir
      ? '❄️ ' + s.total + ' kovanın ' + s.ready + possSuffix(s.ready) + ' kışa hazır' + (extra.length ? ' · ' + extra.join(' · ') : '') +
        (s.total - s.recorded ? ' · kayıtsız ' + (s.total - s.recorded) : '')
      : '❄️ Kışlık hazırlık: henüz kayıt yok';
    return '<div class="kr-info kr-winter-line" style="margin:' + (inList ? '0 0 .5rem' : '.4rem 0 0') + ';">' + esc(body) +
      (inList ? '' : ' · <a href="' + href + '" onclick="event.stopPropagation();">Kışlık hazırlık</a>') + '</div>';
  }
  function feedTotalsHtml(hives, all) {
    var r = R(); if (!r) return '';
    var t = r.feedTotals(hives, all);
    var parts = r.FEED_TYPES.filter(function (x) { return t.byType[x.key]; }).map(function (x) { return x.label + ' ' + num(t.byType[x.key]) + ' ' + x.unit; });
    return '<div class="kr-info" style="margin:0 0 .5rem;">🍯 ' + t.season + ' sezonu besleme toplamı: ' +
      (parts.length ? esc(parts.join(' · ')) + ' · ' + t.hivesFed + ' kovan, ' + t.count + ' kayıt' : 'kayıt yok') + '</div>';
  }

  /** Kışlık hazırlık: kovan başına sezonda tek kayıt (Koloni gücü ve Besleme aynı kaydı açar). */
  function openWinterSheet(hiveId, onSaved) {
    ensureGridCss();
    var d = D(), r = R();
    if (!d || !r) return;
    var h = d.hiveById(hiveId);
    if (!h) return;
    var old = document.getElementById('koloniRecord');
    if (old) old.parentNode.removeChild(old);
    var today = C() && C().todayLocal ? C().todayLocal() : '';
    var ws = r.winterStatus(h.id);
    var w = ws.rec || {};
    var st = r.status(h.id);
    function sel(name, opts, cur) {
      return '<select name="' + name + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    }
    function cb(name, label, on) {
      return '<label class="kr-checkline full"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + '> ' + esc(label) + '</label>';
    }
    var vrInfo = ws.varroaAuto
      ? 'Hastalık kaydından: ' + fmtDate(ws.varroaAuto.date) + ' · ' + (ws.varroaAuto.treatment || 'ilaç uygulandı')
      : 'Hastalık bölümünde son 150 günde varroa ilaç kaydı yok.';
    var strongHint = st.strength ? 'Son güç kaydı: ' + fmtDate(st.strength.date) + ' · ' + st.strengthClass + ' (arılı çerçeve ' + st.strength.beeFrames + ')' : 'Güç kaydı yok.';
    var back = document.createElement('div');
    back.className = 'kol-back';
    back.id = 'koloniRecord';
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true" aria-labelledby="krTitle">' +
      '<h3 id="krTitle">' + esc(h.name) + ' · Kışlık hazırlık</h3>' +
      '<p class="kol-sub">' + ws.season + ' kışı · kovan başına tek kayıt; Koloni gücü ve Besleme aynı kaydı gösterir' + (w.demo ? ' · <span class="kr-chip">Demo</span>' : '') + '</p>' +
      (ws.weakAuto ? '<div class="kr-warn" style="margin:.4rem 0;">Son güç kaydı Zayıf: durum otomatik olarak «Birleştirilmeli» önerilir.</div>' : '') +
      '<form class="kol-form" id="krForm" autocomplete="off" style="margin-top:.4rem;">' +
        '<label class="full">Kontrol tarihi<input type="date" name="date" value="' + esc(w.date || today) + '"></label>' +
        '<label class="full">Arı gücü yeterli mi' + sel('strongEnough', [['', 'Seçin'], ['evet', 'Evet'], ['hayir', 'Hayır']], w.strongEnough || '') + '</label>' +
        '<div class="kol-sub" style="grid-column:1 / -1;margin:-.3rem 0 0;">' + esc(strongHint) + '</div>' +
        '<label class="full">Kışlık bal / kek (kg)<input type="number" name="storesKg" min="0" max="100" step="0.1" inputmode="decimal" value="' + (w.storesKg != null ? esc(w.storesKg) : '') + '" placeholder="Öneri: ' + num(ws.suggestedKg) + '"></label>' +
        '<div class="kol-sub" style="grid-column:1 / -1;margin:-.3rem 0 0;">Sonbahar beslemelerinden öneri: <b>' + num(ws.suggestedKg) + ' kg</b> (' + ws.autumnFeeds + ' kayıt; şurup şeker eşdeğeriyle) · en az ' + r.WINTER_MIN_KG + ' kg önerilir · <a href="#" id="krUseSug">Öneriyi kullan</a></div>' +
        '<label class="full">Son varroa ilacı yapıldı mı' + sel('varroa', [['auto', 'Otomatik (Hastalık kaydından)'], ['evet', 'Evet'], ['hayir', 'Hayır']], w.varroa || 'auto') + '</label>' +
        '<div class="kol-sub" style="grid-column:1 / -1;margin:-.3rem 0 0;">' + esc(vrInfo) + '</div>' +
        cb('narrowed', 'Kovan daraltıldı', w.narrowed) +
        cb('entrance', 'Giriş küçültüldü', w.entrance) +
        cb('insulation', 'Yalıtım yapıldı', w.insulation) +
        '<label class="full">Durum' + sel('statusChoice', [['auto', 'Otomatik'], ['hazir', 'Hazır'], ['eksik', 'Eksik var'], ['birlestir', 'Birleştirilmeli']], w.statusChoice || 'auto') + '</label>' +
        '<div class="kr-info" id="krWinPrev" style="grid-column:1 / -1;"></div>' +
        '<label class="full">Not<input name="note" maxlength="300" value="' + esc(w.note || '') + '"></label>' +
      '</form>' +
      '<div class="kol-actions"><button type="button" class="btn secondary" id="krClose">Kapat</button><button type="button" class="btn" id="krSave">Kaydet</button></div></div>';
    document.body.appendChild(back);
    var f = back.querySelector('#krForm');
    addMicButtons(f);
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('#krClose').addEventListener('click', close);
    back.querySelector('#krUseSug').addEventListener('click', function (e) { e.preventDefault(); f.storesKg.value = ws.suggestedKg; preview(); });
    function preview() {
      var miss = [];
      if (f.strongEnough.value !== 'evet') miss.push('arı gücü');
      var kg = f.storesKg.value === '' ? (ws.autumnFeeds ? ws.suggestedKg : null) : Number(f.storesKg.value);
      if (kg == null || kg < r.WINTER_MIN_KG) miss.push('kışlık bal/kek');
      if (!(f.varroa.value === 'evet' || (f.varroa.value === 'auto' && ws.varroaAuto))) miss.push('varroa ilacı');
      if (!f.narrowed.checked) miss.push('daraltma');
      if (!f.entrance.checked) miss.push('giriş küçültme');
      if (!f.insulation.checked) miss.push('yalıtım');
      var auto = (ws.weakAuto || f.strongEnough.value === 'hayir') ? 'birlestir' : (miss.length ? 'eksik' : 'hazir');
      var key = f.statusChoice.value === 'auto' ? auto : f.statusChoice.value;
      back.querySelector('#krWinPrev').textContent = 'Durum: ' + r.WINTER_STATUS_LABEL[key] +
        (f.statusChoice.value !== 'auto' ? ' (elle; otomatik öneri ' + r.WINTER_STATUS_LABEL[auto] + ')' : '') +
        (miss.length ? ' · eksik: ' + miss.join(', ') : '');
    }
    f.addEventListener('input', preview);
    f.addEventListener('change', preview);
    preview();
    back.querySelector('#krSave').addEventListener('click', function () {
      var saved = r.add(h.id, 'winter', {
        date: f.date.value, strongEnough: f.strongEnough.value, storesKg: f.storesKg.value, varroa: f.varroa.value,
        narrowed: f.narrowed.checked, entrance: f.entrance.checked, insulation: f.insulation.checked,
        statusChoice: f.statusChoice.value, note: f.note.value
      });
      if (!saved) { toast('Kaydedilemedi'); return; }
      var now = r.winterStatus(h.id);
      toast('Kaydedildi · Kışlık hazırlık: ' + (now.status || '—'));
      close();
      if (typeof onSaved === 'function') onSaved(saved);
    });
  }

  /* ---- Bakım geçmişi (kovan detayı): tüm kayıtlar tek zaman çizelgesinde ---- */
  var TL_KIND = {
    strength: { icon: '💪', label: 'Koloni gücü / muayene', topic: 'guc' },
    brood: { icon: '🥚', label: 'Yavru durumu', topic: 'yavru' },
    disease: { icon: '💊', label: 'Hastalık / ilaçlama', topic: 'hastalik' },
    feed: { icon: '🍯', label: 'Besleme', topic: 'besleme' },
    winter: { icon: '❄️', label: 'Kışlık hazırlık', topic: 'kis' },
    harvest: { icon: '🫙', label: 'Hasat notu', topic: 'hasat' },
    aharvest: { icon: '🫙', label: 'Arılık hasadı', topic: null },
    colony: { icon: '🔀', label: 'Koloni işlemi', topic: null },
    queen: { icon: '👑', label: 'Ana arı değişimi', topic: 'ana' }
  };
  var TL_CSS = '.bt-list{display:grid;gap:6px;margin-top:8px;}' +
    '.bt-item{display:grid;grid-template-columns:30px minmax(0,1fr);gap:8px;align-items:start;width:100%;text-align:left;font:inherit;color:inherit;background:#fff;border:1px solid var(--border,#ead9b3);border-radius:12px;padding:8px 10px;cursor:pointer;}' +
    '.bt-ico{width:30px;height:30px;border-radius:50%;background:#fff3bf;display:flex;align-items:center;justify-content:center;font-size:15px;}' +
    '.bt-top{display:flex;justify-content:space-between;gap:6px;font-size:.84rem;font-weight:800;}' +
    '.bt-top .dt{color:var(--muted,#6b7280);font-weight:700;white-space:nowrap;}' +
    '.bt-sum{font-size:.8rem;color:var(--muted,#6b7280);overflow-wrap:anywhere;margin-top:2px;}' +
    '.bt-add{width:100%;margin-top:8px;padding:.7rem;border-radius:12px;border:1.5px dashed #d9a520;background:#fffaf0;color:#7a5a12;font:inherit;font-weight:800;cursor:pointer;}' +
    '.bt-menu{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:.6rem 0;}' +
    '.bt-menu button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:.7rem .4rem;border-radius:12px;border:1px solid var(--border,#ead9b3);background:#fff;font:inherit;font-size:.82rem;font-weight:800;color:#5c4813;cursor:pointer;}' +
    '.bt-menu button span{font-size:20px;}';
  function ensureTlCss() {
    ensureGridCss();
    if (document.getElementById('koloniTlCss')) return;
    var st = document.createElement('style'); st.id = 'koloniTlCss'; st.textContent = TL_CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function timelineEntries(h) {
    var r = R(); if (!r || !h) return [];
    var rec = r.recordsFor(h.id);
    var out = [];
    rec.strength.forEach(function (x) { out.push({ kind: 'strength', rec: x, date: x.date, sum: r.strengthClass(x) + ' · arı ' + x.beeFrames + ' · yavru ' + x.broodFrames + ' · bal ' + x.honeyFrames + ' · polen ' + x.pollenFrames + ' çerçeve' + (x.note ? ' · ' + x.note : '') }); });
    rec.brood.forEach(function (x) { out.push({ kind: 'brood', rec: x, date: x.date, sum: broodText(x).split(' · ').slice(1).join(' · ') + (x.note ? ' · ' + x.note : '') }); });
    rec.disease.forEach(function (x) { out.push({ kind: 'disease', rec: x, date: x.date, sum: diseaseText(x).split(' · ').slice(1).join(' · ') + (x.note ? ' · ' + x.note : '') }); });
    rec.harvest.forEach(function (x) { out.push({ kind: 'harvest', rec: x, date: x.date, sum: harvestText(x) }); });
    /* Arılık geneli hasatlar (kovan belirtilmeden, Raporlar › Bal / verim): bu kovanın arılığı. */
    var dd = D();
    if (dd && dd.harvests && h.apiaryId != null) {
      dd.harvests.list({ apiaryId: String(h.apiaryId), apiaryOnly: true }).forEach(function (x) {
        out.push({ kind: 'aharvest', rec: { id: x.id, demo: !!x.demo }, date: x.date, sum: 'Arılık geneli · ' + harvestText({ kg: x.honeyKg, frames: x.frames || null, honeyType: x.honeyType, note: x.note }) });
      });
    }
    rec.feed.forEach(function (x) { out.push({ kind: 'feed', rec: x, date: x.date, sum: r.FEED_LABEL[x.type] + ' ' + num(x.amount) + ' ' + r.FEED_UNIT[x.type] + (x.note ? ' · ' + x.note : '') }); });
    rec.winter.forEach(function (x) {
      var ws = r.winterStatus(h.id);
      var cur = ws.rec && ws.rec.id === x.id;
      out.push({ kind: 'winter', rec: x, date: x.date, sum: x.season + ' kışı' + (cur ? ' · ' + ws.status + (ws.missing.length ? ' · eksik: ' + ws.missing.join(', ') : '') : '') + (x.note ? ' · ' + x.note : '') });
    });
    var EV_LABEL = { bolme: 'Bölme', birlestirme: 'Birleştirme', tasima: 'Ana taşıma', uretim: 'Ana üretimi' };
    (Array.isArray(h.colonyEvents) ? h.colonyEvents : []).forEach(function (e) {
      out.push({ kind: 'colony', rec: { id: e.id || ('ev' + e.date), evType: e.type }, date: e.date, sum: (EV_LABEL[e.type] || 'İşlem') + ' · ' + e.text });
    });
    (Array.isArray(h.queenHistory) ? h.queenHistory : []).forEach(function (e, i) {
      out.push({ kind: 'queen', rec: { id: 'q' + i }, date: String(e.date || '').slice(0, 10), sum: historyEntryText(e).split(' · ').slice(1).join(' · ') });
    });
    out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    return out;
  }
  function timelineHtml(h) {
    ensureTlCss();
    var list = timelineEntries(h);
    var items = list.map(function (e) {
      var k = TL_KIND[e.kind];
      return '<button type="button" class="bt-item" data-bt-kind="' + e.kind + '" data-bt-id="' + esc(e.rec.id) + '" aria-label="' + esc(k.label + ' ' + fmtDate(e.date) + (e.kind === 'aharvest' ? ' · Bal / verim raporunda aç' : (e.kind === 'colony' ? ' · işlem sayfasında aç' : ' düzenle'))) + '">' +
        '<span class="bt-ico" aria-hidden="true">' + k.icon + '</span><span><span class="bt-top"><span>' + esc(k.label) +
        (e.rec.demo ? ' <span class="kr-chip">Demo</span>' : '') + '</span><span class="dt">' + esc(fmtDate(e.date)) + '</span></span>' +
        '<span class="bt-sum" style="display:block;">' + esc(e.sum) + '</span>' + (e.kind !== 'aharvest' ? thumbsBox(e.rec, e.kind, h.id) : '') + '</span></button>';
    }).join('');
    return '<button type="button" class="bt-add" data-bt-add="1">+ İşlem ekle</button>' +
      '<div class="bt-list">' + (items || '<p class="kol-sub" style="margin:0;">Henüz bakım kaydı yok. «+ İşlem ekle» ile başlayın; tüm kovanları Koloni sayfasından da takip edebilirsiniz.</p>') + '</div>';
  }
  function openAddAction(hiveId, onSaved) {
    ensureTlCss();
    var d = D(); if (!d) return;
    var h = d.hiveById(hiveId); if (!h) return;
    var back = document.createElement('div');
    back.className = 'kol-back';
    var order = ['strength', 'brood', 'disease', 'feed', 'winter', 'harvest', 'queen'];
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true"><h3>' + esc(h.name) + ' · İşlem ekle</h3>' +
      '<p class="kol-sub">Kayıt, Koloni sayfasındaki ile aynı kovan kaydına yazılır.</p>' +
      '<div class="bt-menu">' + order.map(function (k) {
        return '<button type="button" data-add-kind="' + k + '"><span aria-hidden="true">' + TL_KIND[k].icon + '</span>' + esc(TL_KIND[k].label) + '</button>';
      }).join('') + '</div>' +
      '<div class="kol-actions"><button type="button" class="btn secondary" data-close="1">Kapat</button></div></div>';
    document.body.appendChild(back);
    function close() { if (back.parentNode) back.parentNode.removeChild(back); }
    back.addEventListener('click', function (e) {
      if (e.target === back || (e.target.closest && e.target.closest('[data-close]'))) { close(); return; }
      var b = e.target.closest ? e.target.closest('[data-add-kind]') : null;
      if (!b) return;
      close();
      var k = b.getAttribute('data-add-kind');
      if (k === 'queen') openEditor(h.id, onSaved);
      else if (k === 'winter') openWinterSheet(h.id, onSaved);
      else openRecordSheet(TL_KIND[k].topic, h.id, onSaved);
    });
  }
  /** Kovan detayındaki bakım geçmişi kutusunu bağlar (tek seferlik). */
  function bindTimeline(container, hiveId, onSaved) {
    if (!container || container.__btBound) return;
    container.__btBound = true;
    container.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-bt-add]')) { openAddAction(hiveId, onSaved); return; }
      var it = e.target.closest ? e.target.closest('.bt-item') : null;
      if (!it) return;
      var kind = it.getAttribute('data-bt-kind'), id = it.getAttribute('data-bt-id');
      if (kind === 'queen') { openEditor(hiveId, onSaved); return; }
      if (kind === 'winter') { openWinterSheet(hiveId, onSaved); return; }
      if (kind === 'aharvest') { global.location.href = 'rapor-bal.html'; return; }
      if (kind === 'colony') {
        var hh = D() && D().hiveById(hiveId);
        var ev = hh && (hh.colonyEvents || []).filter(function (x) { return (x.id || ('ev' + x.date)) === id; })[0];
        var isl = ev && (ev.type === 'tasima' ? 'tasima' : (ev.type === 'uretim' ? 'uretim' : 'bolme'));
        global.location.href = 'koloni-islem.html?islem=' + (isl || 'bolme') + (hh ? '&apiary=' + encodeURIComponent(hh.apiaryId) : '');
        return;
      }
      var r = R(); if (!r) return;
      var rec = (r.recordsFor(hiveId)[kind] || []).filter(function (x) { return x.id === id; })[0];
      openRecordSheet(TL_KIND[kind].topic, hiveId, onSaved, rec || null);
    });
  }


  /* ---- Hızlı kayıt (＋): tam muayeneden bağımsız, tek / seçili / tüm arılık ---- */
  var LAST_APIARY_KEY = 'superari.lastApiary.v1';
  function lastApiary() {
    var d = D(); var aps = d && d.loadApiaries ? d.loadApiaries() : [];
    var id = ''; try { id = localStorage.getItem(LAST_APIARY_KEY) || ''; } catch (e) { id = ''; }
    if (!aps.some(function (a) { return String(a.id) === id; })) id = aps[0] ? String(aps[0].id) : '';
    return id;
  }
  function setLastApiary(id) { try { if (id) localStorage.setItem(LAST_APIARY_KEY, String(id)); } catch (e) { /* ignore */ } }
  var QUICK_TYPES = [
    { key: 'ilac', label: 'İlaçlama' },
    { key: 'besleme', label: 'Besleme' },
    { key: 'guc', label: 'Muayene / Koloni gücü' },
    { key: 'yavru', label: 'Yavru' },
    { key: 'hasat', label: 'Hasat notu' }
  ];
  function hiveNo(h) { var m = /(\d+)\s*$/.exec(String(h.name || '')); return m ? m[1] : String(h.id); }
  function openQuickRecord(opts) {
    opts = opts || {};
    ensureGridCss();
    var d = D(), r = R();
    if (!d || !r) return;
    var old = document.getElementById('koloniRecord');
    if (old) old.parentNode.removeChild(old);
    var today = C() && C().todayLocal ? C().todayLocal() : r.todayLocal();
    var preHive = opts.hiveId != null ? d.hiveById(opts.hiveId) : null;
    var apiaryId = preHive ? String(preHive.apiaryId) : (opts.apiaryId || lastApiary());
    var type = opts.type || 'ilac';
    var scope = preHive ? 'one' : (opts.scope || 'one');
    var aps = d.loadApiaries();
    var back = document.createElement('div');
    back.className = 'kol-back';
    back.id = 'koloniRecord';
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true" aria-labelledby="qkTitle">' +
      '<h3 id="qkTitle">＋ Hızlı kayıt</h3>' +
      '<p class="kol-sub">Tam muayene gerekmez. Her kovana ayrı kayıt yazılır ve Bakım geçmişinde görünür.</p>' +
      '<div class="kr-section-title">Tür</div>' +
      '<div class="qk-types">' + QUICK_TYPES.map(function (t) { return '<button type="button" data-qtype="' + t.key + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
      '<form class="kol-form" id="qkScopeForm" autocomplete="off">' +
        '<label class="full">Arılık<select name="apiary">' + aps.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>'; }).join('') + '</select></label>' +
        '<div class="full qk-scope" style="grid-column:1 / -1;"><button type="button" data-scope="one">Tek kovan</button><button type="button" data-scope="sel">Seçili kovanlar</button><button type="button" data-scope="all">Tüm arılık</button></div>' +
        '<div id="qkTargets" style="grid-column:1 / -1;display:grid;gap:.4rem;"></div>' +
      '</form>' +
      '<div class="kr-section-title" id="qkFormTitle" style="margin-top:.6rem;"></div>' +
      '<form class="kol-form" id="krForm" autocomplete="off" style="margin-top:.4rem;"></form>' +
      '<form class="kol-form" id="qkStock" autocomplete="off" style="margin-top:.55rem;" hidden></form>' +
      '<div id="qkFoto"></div>' +
      '<div class="kol-actions"><button type="button" class="btn secondary" id="krClose">Kapat</button><button type="button" class="btn" id="krSave">Kaydet</button></div></div>';
    document.body.appendChild(back);
    var sf = back.querySelector('#qkScopeForm');
    var f = back.querySelector('#krForm');
    var photos = mountPhotoPicker(back.querySelector('#qkFoto'), {});
    sf.elements.apiary.value = apiaryId;
    var selected = {};
    if (preHive) selected[preHive.id] = true;
    function hivesOf() { return d.hivesForApiary ? d.hivesForApiary(sf.elements.apiary.value) : d.loadHives().filter(function (h) { return String(h.apiaryId) === sf.elements.apiary.value; }); }
    function renderTargets() {
      back.querySelectorAll('[data-scope]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-scope') === scope); });
      var hs = hivesOf();
      var box = back.querySelector('#qkTargets');
      if (!hs.length) { box.innerHTML = '<p class="kol-sub" style="margin:0;">Bu arılıkta kovan yok.</p>'; return; }
      if (scope === 'one') {
        var cur = preHive && String(preHive.apiaryId) === sf.elements.apiary.value ? preHive.id : (Object.keys(selected)[0] || hs[0].id);
        box.innerHTML = '<label style="display:grid;gap:.2rem;font-size:.75rem;font-weight:700;color:#5c4813;">Kovan<select name="one">' + hs.map(function (h) {
          return '<option value="' + esc(h.id) + '"' + (String(h.id) === String(cur) ? ' selected' : '') + '>' + esc(h.name) + ' (No ' + esc(hiveNo(h)) + ')</option>';
        }).join('') + '</select></label>';
      } else if (scope === 'sel') {
        box.innerHTML = '<div class="kol-checks-head"><span id="qkSelCount"></span><span style="display:flex;gap:.3rem;"><button type="button" data-selall="1">Tümünü seç</button><button type="button" data-selnone="1">Hiçbirini seçme</button></span></div>' +
          '<div class="kol-checks">' + hs.map(function (h) {
            return '<label class="kol-check"><input type="checkbox" data-hid="' + esc(h.id) + '"' + (selected[h.id] ? ' checked' : '') + '><span>' + esc(h.name) + '</span><small>No ' + esc(hiveNo(h)) + '</small></label>';
          }).join('') + '</div>';
        updSel();
      } else {
        box.innerHTML = '<div class="kr-info">Arılıktaki ' + hs.length + ' kovanın her birine ayrı kayıt yazılır.</div>';
      }
    }
    function updSel() {
      var n = back.querySelectorAll('#qkTargets input[data-hid]:checked').length;
      var el = back.querySelector('#qkSelCount'); if (el) el.textContent = n + ' kovan seçili';
      back.querySelector('#krSave').textContent = scope === 'sel' ? 'Seçili ' + n + ' kovana kaydet' : (scope === 'all' ? 'Tüm arılığa kaydet (' + hivesOf().length + ')' : 'Kaydet');
      if (typeof calcStock === 'function') calcStock();
    }
    /* ---- Stoktan düşme (İlaçlama / Besleme, isteğe bağlı) ---- */
    var SK = d.stock || null;
    var sf2 = back.querySelector('#qkStock');
    var stockTouched = false;
    function currentTargets() {
      if (scope === 'one') return [sf.querySelector('select[name=one]') ? sf.querySelector('select[name=one]').value : null].filter(Boolean);
      if (scope === 'sel') return Array.prototype.map.call(back.querySelectorAll('#qkTargets input[data-hid]:checked'), function (c) { return c.getAttribute('data-hid'); });
      return hivesOf().map(function (h) { return h.id; });
    }
    function stockItems() {
      if (!SK) return [];
      var list = SK.list();
      if (type === 'ilac') return list.filter(function (x) { return x.category === 'ilac'; });
      if (type === 'besleme') return list.filter(function (x) { return x.feedType || ['surup', 'seker', 'kek', 'polen'].indexOf(x.category) >= 0; });
      return [];
    }
    function renderStock() {
      var items = stockItems();
      if (!SK || (type !== 'ilac' && type !== 'besleme')) { sf2.hidden = true; sf2.innerHTML = ''; return; }
      sf2.hidden = false;
      stockTouched = false;
      sf2.innerHTML = '<label class="full">Stoktan düş (isteğe bağlı)<select name="sitem"><option value="">Düşme</option>' + items.map(function (x) {
        return '<option value="' + esc(x.id) + '">' + esc(x.name + ' · stokta ' + num(x.qty) + ' ' + x.unit + (x.demo ? ' · Demo' : '')) + '</option>';
      }).join('') + '</select></label>' +
        '<label class="full" data-sq hidden><span id="qkSqLbl">Düşülecek toplam</span><input type="number" name="sqty" min="0" step="0.1" inputmode="decimal"></label>' +
        '<p class="kol-sub full" id="qkSqHint" style="margin:0;">' + (items.length ? '' : 'Stokta uygun kalem yok · <a href="stok.html" style="color:#2b6cb0;text-decoration:underline;">Malzeme stoku</a>') + '</p>';
      if (type === 'besleme' && f.elements['type']) {
        var m = items.filter(function (x) { return x.feedType === f.elements['type'].value; })[0];
        if (m) sf2.elements.sitem.value = m.id;
      }
      calcStock();
    }
    function calcStock() {
      if (sf2.hidden || !sf2.elements.sitem) return;
      var id = sf2.elements.sitem.value;
      var wrap = sf2.querySelector('[data-sq]'), hint = sf2.querySelector('#qkSqHint');
      if (!id) { wrap.hidden = true; if (stockItems().length) hint.textContent = ''; return; }
      var it = stockItems().filter(function (x) { return x.id === id; })[0];
      if (!it) return;
      wrap.hidden = false;
      sf2.querySelector('#qkSqLbl').textContent = 'Düşülecek toplam (' + it.unit + ')';
      var n = currentTargets().length;
      var per = null, perUnit = '';
      if (type === 'besleme' && f.elements.amount) { per = Number(String(f.elements.amount.value).replace(',', '.')); perUnit = r.FEED_UNIT[f.elements['type'].value]; }
      if (type === 'ilac' && f.elements.dose) { per = Number(String(f.elements.dose.value).replace(',', '.')); perUnit = r.DOSE_UNIT_LABEL[f.elements.doseUnit.value]; }
      var same = perUnit && perUnit === it.unit;
      if (!stockTouched) sf2.elements.sqty.value = (same && per > 0 && n) ? String(Math.round(per * n * 10) / 10) : '';
      hint.textContent = same && per > 0
        ? num(per) + ' ' + perUnit + ' × ' + n + ' kovan = ' + num(per * n) + ' ' + it.unit + ' · stokta ' + num(it.qty) + ' ' + it.unit
        : (per > 0 && perUnit ? 'Birim farklı (' + perUnit + ' / ' + it.unit + '): düşülecek toplamı elle girin.' : 'Miktar / doz girilince toplam hesaplanır; elle de yazabilirsiniz.') + ' Stokta ' + num(it.qty) + ' ' + it.unit + '.';
    }
    sf2.addEventListener('change', function (e) { if (e.target.name === 'sitem') { stockTouched = false; calcStock(); } });
    sf2.addEventListener('input', function (e) { if (e.target.name === 'sqty') stockTouched = true; });
    f.addEventListener('input', function () { calcStock(); });
    f.addEventListener('change', function (e) {
      if (type === 'besleme' && e.target.name === 'type' && sf2.elements.sitem) {
        var m = stockItems().filter(function (x) { return x.feedType === e.target.value; })[0];
        if (m) { sf2.elements.sitem.value = m.id; stockTouched = false; }
      }
      calcStock();
    });
    function renderForm() {
      back.querySelectorAll('[data-qtype]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-qtype') === type); });
      var t = QUICK_TYPES.filter(function (x) { return x.key === type; })[0];
      back.querySelector('#qkFormTitle').textContent = t.label;
      f.innerHTML = topicFormHtml(type === 'ilac' ? 'hastalik' : type, today);
      wireTopicForm(type, f, back);
      if (type === 'ilac' && f.elements.treatment) f.elements.treatment.placeholder = 'ör. Oksalik asit damlatma, Amitraz şerit';
      renderStock();
    }
    back.addEventListener('click', function (e) {
      var t = e.target;
      if (t === back) { close(); return; }
      var q = t.closest && t.closest('[data-qtype]');
      if (q) { type = q.getAttribute('data-qtype'); renderForm(); return; }
      var sc = t.closest && t.closest('[data-scope]');
      if (sc) { scope = sc.getAttribute('data-scope'); renderTargets(); updSel(); return; }
      if (t.closest && t.closest('[data-selall]')) { back.querySelectorAll('#qkTargets input[data-hid]').forEach(function (c) { c.checked = true; selected[c.getAttribute('data-hid')] = true; }); updSel(); return; }
      if (t.closest && t.closest('[data-selnone]')) { back.querySelectorAll('#qkTargets input[data-hid]').forEach(function (c) { c.checked = false; }); selected = {}; updSel(); return; }
    });
    back.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'apiary') { selected = {}; preHive = null; setLastApiary(t.value); renderTargets(); updSel(); }
      if (t.getAttribute && t.getAttribute('data-hid')) { if (t.checked) selected[t.getAttribute('data-hid')] = true; else delete selected[t.getAttribute('data-hid')]; updSel(); }
    });
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.querySelector('#krClose').addEventListener('click', close);
    back.querySelector('#krSave').addEventListener('click', function () {
      var targets;
      if (scope === 'one') targets = [sf.querySelector('select[name=one]') ? sf.querySelector('select[name=one]').value : null].filter(Boolean);
      else if (scope === 'sel') targets = Array.prototype.map.call(back.querySelectorAll('#qkTargets input[data-hid]:checked'), function (c) { return c.getAttribute('data-hid'); });
      else targets = hivesOf().map(function (h) { return h.id; });
      if (!targets.length) { toast('En az bir kovan seçin'); return; }
      var got = readTopicForm(type, f);
      if (!got) return;
      if (photos.busy()) { toast('Fotoğraf hazırlanıyor, birazdan tekrar deneyin'); return; }
      if (got.kind === 'harvest' && !confirmHarvestWithdrawal(targets, got.rec.date)) return;
      var stockPlan = null;
      if (!sf2.hidden && sf2.elements.sitem && sf2.elements.sitem.value) {
        var sit = stockItems().filter(function (x) { return x.id === sf2.elements.sitem.value; })[0];
        var sq = Number(String(sf2.elements.sqty.value || '').replace(',', '.'));
        if (sit && sq > 0) {
          if (sq > sit.qty && !confirm('Stokta ' + num(sit.qty) + ' ' + sit.unit + ' ' + sit.name + ' var; ' + num(sq) + ' ' + sit.unit + ' düşülecek ve stok eksiye inecek. Devam edilsin mi?')) return;
          stockPlan = { item: sit, qty: sq };
        } else if (sit && !(sq > 0)) { toast('Stoktan düşülecek miktarı girin veya «Düşme» seçin'); return; }
      }
      var names = [], savedList = [];
      targets.forEach(function (id) {
        var copy = {}; Object.keys(got.rec).forEach(function (k) { copy[k] = got.rec[k]; });
        var sv = r.add(id, got.kind, copy);
        if (sv) { var h = d.hiveById(id); names.push(h ? h.name : String(id)); savedList.push({ id: sv.id, hiveId: id, kind: got.kind }); }
      });
      setLastApiary(sf.elements.apiary.value);
      if (!names.length) { toast('Kaydedilemedi'); return; }
      var stockMsg = '';
      if (stockPlan && SK) {
        var tl = (QUICK_TYPES.filter(function (x) { return x.key === type; })[0] || {}).label || '';
        var adj = SK.adjust(stockPlan.item.id, -stockPlan.qty, 'Hızlı kayıt: ' + tl + ' · ' + names.length + ' kovan', got.rec.date);
        if (adj) stockMsg = ' · stoktan ' + num(stockPlan.qty) + ' ' + adj.unit + ' düşüldü' + (adj.low ? ' (stok azaldı)' : '');
      }
      back.querySelector('#krSave').disabled = true;
      photos.save(savedList).then(function (np) {
        close();
        toast((names.length === 1 ? 'Kaydedildi · ' + names[0] : names.length + ' kovana kaydedildi (' + namesShort(names, 4) + ')') + stockMsg + (np ? ' · ' + np + ' fotoğraf' : ''));
        if (typeof opts.onSaved === 'function') opts.onSaved(names.length);
        try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
      });
    });
    renderForm();
    renderTargets();
    updSel();
  }

  /* ---- Görev tamamlama: tarih + isteğe bağlı not ---- */
  function openTaskDone(taskId, onDone) {
    ensureGridCss();
    var d = D(); if (!d || !d.taskStore) return;
    var t = d.taskStore.all().filter(function (x) { return x.id === taskId; })[0];
    if (!t) { toast('Görev bulunamadı'); return; }
    var r = R();
    var today = r ? r.todayLocal() : '';
    var back = document.createElement('div');
    back.className = 'kol-back';
    back.innerHTML = '<div class="kol-sheet" role="dialog" aria-modal="true" aria-labelledby="tdTitle"><h3 id="tdTitle">✅ Görevi tamamla</h3>' +
      '<p class="kol-sub" style="overflow-wrap:anywhere;">' + esc(t.title) + '</p>' +
      '<form class="kol-form" id="tdForm" autocomplete="off">' +
        '<label class="full">Tamamlanma tarihi<input type="date" name="date" value="' + esc(today) + '" max="' + esc(today) + '"></label>' +
        '<label class="full">Not (isteğe bağlı)<input name="note" maxlength="300" placeholder="ör. 2 çerçeve kek verildi"></label>' +
      '</form>' +
      (t.auto ? '<div class="kr-info">Otomatik görev: aynı durum yeni bir tarihle yeniden oluşursa görev tekrar açılır.</div>' : '') +
      '<div class="kol-actions"><button type="button" class="btn secondary" data-close="1">Vazgeç</button><button type="button" class="btn" id="tdSave">Tamamlandı</button></div></div>';
    document.body.appendChild(back);
    function close() { if (back.parentNode) back.parentNode.removeChild(back); }
    back.addEventListener('click', function (e) { if (e.target === back || (e.target.closest && e.target.closest('[data-close]'))) close(); });
    back.querySelector('#tdSave').addEventListener('click', function () {
      var f = back.querySelector('#tdForm');
      var res = d.taskStore.complete(taskId, { date: f.elements.date.value, note: f.elements.note.value });
      close();
      if (!res) { toast('Kaydedilemedi'); return; }
      toast('Görev tamamlandı · «Tamamlanan» bölümüne taşındı');
      try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
      if (typeof onDone === 'function') onDone(res);
    });
  }
  function undoTask(taskId, onDone) {
    var d = D(); if (!d || !d.taskStore) return;
    if (d.taskStore.undo(taskId)) {
      toast('Geri alındı · görev yeniden açık');
      try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
      if (typeof onDone === 'function') onDone();
    }
  }

  /* ---- Bakım: gecikenler, bu hafta, ilaç bekleme, son işlemler ---- */
  function maintenance(hives) {
    var r = R(); var d = D();
    var out = { overdue: [], week: [], withdrawal: [], recent: [] };
    if (!r || !d) return out;
    var today = r.todayLocal();
    var weekEnd = r.addDays(today, 7);
    var ids = {};
    (hives || []).forEach(function (h) { ids[String(h.id)] = h; });
    var apIds = {};
    (hives || []).forEach(function (h) { apIds[String(h.apiaryId)] = true; });
    /* Açık görevler (tamamlananlar hariç): otomatik + elle eklenen. Ana arı yenileme Görevler sayfasında. */
    var ts = d.taskStore;
    (ts ? ts.open() : r.derived().tasks).forEach(function (t) {
      if (!(t.auto || t.manual) || t.kind === 'ana') return;
      var h = t.hiveId != null ? ids[String(t.hiveId)] : null;
      if (!h && !(t.manual && t.hiveId == null && t.apiaryId && apIds[String(t.apiaryId)])) return;
      var item = { hive: h || null, apiaryId: h ? h.apiaryId : t.apiaryId, title: t.title, date: t.due || '', priority: t.priority || 3, id: t.id, task: true, manual: !!t.manual };
      if (t.due && t.due < today) out.overdue.push(item);
      else if (!t.due || t.due <= weekEnd) out.week.push(item);
    });
    out.done = [];
    if (ts) {
      var since30 = r.addDays(today, -30);
      ts.done().forEach(function (t) {
        if ((t.doneAt || '') < since30) return;
        var h = t.hiveId != null ? ids[String(t.hiveId)] : null;
        if (!h && !(t.hiveId == null && t.apiaryId && apIds[String(t.apiaryId)])) return;
        out.done.push({ hive: h || null, apiaryId: h ? h.apiaryId : t.apiaryId, title: t.title, date: t.doneAt || '', note: t.doneNote || '', id: t.id, demo: !!t.demo });
      });
    }
    var all = r.loadAll();
    /* Hasat tek depodan gelir: yalnız hasadı olan kovanlar da listelenir. */
    var harvestHive = {}, aHarv = [];
    if (d.harvests) {
      d.harvests.list().forEach(function (x) {
        if (x.hiveId != null) harvestHive[String(x.hiveId)] = true;
        else aHarv.push(x);
      });
    }
    var apiaryShown = {};
    Object.keys(ids).forEach(function (key) {
      var hh = ids[key];
      if (hh && hh.apiaryId != null) apiaryShown[String(hh.apiaryId)] = true;
    });
    var sinceA = r.addDays(today, -30);
    aHarv.forEach(function (x) {
      if (x.date < sinceA || !apiaryShown[String(x.apiaryId)]) return;
      out.recent.push({ hive: null, apiaryId: x.apiaryId, apiaryName: x.apiaryName, href: 'rapor-bal.html', kind: 'harvest', icon: '🫙', label: 'Arılık hasadı',
        date: x.date, sum: 'Arılık geneli · ' + harvestText({ kg: x.honeyKg, frames: x.frames || null, honeyType: x.honeyType, note: x.note }), demo: !!x.demo, id: x.id });
    });
    Object.keys(ids).forEach(function (key) {
      if (!all[key] && !harvestHive[key]) return;
      var h = ids[key];
      var st = r.status(h.id, all);
      Object.keys(st.latestByDisease).forEach(function (k) {
        var x = st.latestByDisease[k];
        if (x.checkDate && x.checkDate > today && x.checkDate <= weekEnd) {
          out.week.push({ hive: h, title: 'Kontrol: ' + r.DISEASE_LABEL[k] + ' — ' + h.name, date: x.checkDate, priority: 2, id: 'up-k-' + x.id });
        }
      });
      var lv = st.latestByDisease.varroa;
      if (lv && (lv.treatment || lv.withdrawalDays || lv.dose != null)) {
        var rc = r.addDays(lv.date, 14);
        if (rc > r.addDays(today, 2) && rc <= weekEnd) out.week.push({ hive: h, title: 'Varroa tekrar sayımı — ' + h.name, date: rc, priority: 2, id: 'up-v-' + h.id });
      }
      if (st.withdrawalUntil) {
        out.withdrawal.push({ hive: h, until: st.withdrawalUntil, rec: st.withdrawalRec });
        if (st.withdrawalUntil <= weekEnd) out.week.push({ hive: h, title: 'İlaç bekleme süresi bitiyor — ' + h.name, date: st.withdrawalUntil, priority: 3, id: 'up-w-' + h.id });
      }
      var since = r.addDays(today, -30);
      var rec = st.records;
      [['disease', '💊', 'İlaçlama / hastalık'], ['feed', '🍯', 'Besleme'], ['strength', '💪', 'Muayene / koloni gücü'], ['brood', '🥚', 'Yavru'], ['harvest', '🫙', 'Hasat notu']].forEach(function (k) {
        (rec[k[0]] || []).forEach(function (x) {
          if (x.date < since) return;
          var sum = k[0] === 'disease' ? diseaseText(x).split(' · ').slice(1).join(' · ') : k[0] === 'feed' ? feedText(x).split(' · ').slice(1).join(' · ') :
            k[0] === 'strength' ? r.strengthClass(x) + ' · arı ' + x.beeFrames + ' · yavru ' + x.broodFrames + ' çerçeve' : k[0] === 'brood' ? broodText(x).split(' · ').slice(1).join(' · ') : harvestText(x);
          out.recent.push({ hive: h, kind: k[0], icon: k[1], label: k[2], date: x.date, sum: sum, demo: !!x.demo, id: x.id });
        });
      });
    });
    function byDate(a, b) { return (a.date || '9999') < (b.date || '9999') ? -1 : ((a.date || '9999') > (b.date || '9999') ? 1 : a.priority - b.priority); }
    out.overdue.sort(byDate);
    out.week.sort(byDate);
    out.withdrawal.sort(function (a, b) { return a.until < b.until ? -1 : 1; });
    out.recent.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    return out;
  }
  /** Dikkat gereken kovanlar (Koloni rozetleriyle aynı ölçüt). */
  function attentionHives(hives) {
    var r = R(); if (!r) return [];
    var all = r.loadAll();
    var out = [];
    (hives || []).forEach(function (h) {
      if (h.colonyState === 'birlestirildi') return;
      if (!all[String(h.id)] && !h.queenless) return;
      var st = r.status(h.id, all);
      var ws = r.winterStatus(h.id, all);
      var why = [];
      if (st.queenless) why.push('anasız');
      if (st.afb === 'dogrulandi') why.push('AYÇ doğrulandı');
      st.diseases.forEach(function (x) { if (x.key !== 'ayc') why.push(x.label.toLocaleLowerCase('tr')); });
      if (st.dueChecks.length) why.push('kontrol tarihi geçti');
      if (st.weak) why.push(st.chilled ? 'zayıf koloni (üşümüş yavru)' : 'zayıf koloni');
      if (st.swarmCell) why.push('oğul hücresi');
      if (ws.storesKg != null && !ws.storesOk) why.push('kışlık stok yetersiz');
      if (ws.rec && ws.statusKey === 'birlestir') why.push('birleştirilmeli');
      if (why.length) out.push({ hive: h, why: why, level: st.queenless || st.afb === 'dogrulandi' ? 0 : (st.diseases.length ? 1 : 2) });
    });
    out.sort(function (a, b) { return a.level - b.level; });
    return out;
  }

  /** Kovan detayı için son kayıt özetleri (salt okunur). */
  function latestRowsData(h) {
    var r = R(); if (!r || !h) return null;
    ensureGridCss();
    var st = r.status(h.id);
    return {
      strengthClass: st.strengthClass || '',
      strength: st.strength ? strengthText(st.strength) : 'Kayıt yok',
      brood: st.brood ? broodText(st.brood) : 'Kayıt yok',
      disease: st.diseases.length ? st.diseases.map(function (x) { return x.label + ' (' + x.text + ')'; }).join(' · ') :
        (st.records.disease[0] ? 'Etkin hastalık yok · son: ' + diseaseText(st.records.disease[0]) : 'Kayıt yok'),
      withdrawalHtml: withdrawalHtml(h, st),
      feed: st.records.feed[0] ? feedText(st.records.feed[0]) + ' · ' + st.records.feed.length + ' kayıt' : 'Kayıt yok',
      winter: (function () {
        var ws = r.winterStatus(h.id);
        if (!ws.rec) return ws.suggestedOnly ? 'Kayıt yok · öneri: Birleştirilmeli (güç Zayıf)' : 'Kayıt yok';
        return ws.status + (ws.missing.length ? ' · eksik: ' + ws.missing.join(', ') : '') + (ws.storesKg != null ? ' · stok ' + num(ws.storesKg) + ' kg' : '');
      })(),
      afb: st.afb
    };
  }

  global.SuperAriKoloni = {
    TOPICS: TOPICS,
    TOPIC_LABEL: TOPIC_LABEL,
    gridHtml: gridHtml,
    openSoon: openSoon,
    topicListHtml: topicListHtml,
    openRecordSheet: openRecordSheet,
    openWinterSheet: openWinterSheet,
    timelineHtml: timelineHtml,
    openQuickRecord: openQuickRecord,
    maintenance: maintenance,
    attentionHives: attentionHives,
    lastApiary: lastApiary,
    setLastApiary: setLastApiary,
    hiveNo: hiveNo,
    fmtDate: fmtDate,
    esc: esc,
    openAddAction: openAddAction,
    bindTimeline: bindTimeline,
    winterLineHtml: winterLineHtml,
    possSuffix: possSuffix,
    recordChipsHtml: recordChipsHtml,
    latestRowsData: latestRowsData,
    ensureGridCss: ensureGridCss,
    queensListHtml: queensListHtml,
    lastChangeText: lastChangeText,
    historyHtml: historyHtml,
    historyEntryText: historyEntryText,
    openBulkEditor: openBulkEditor,
    ensureCss: ensureCss,
    editHref: editHref,
    dotHtml: dotHtml,
    colorBadgeHtml: colorBadgeHtml,
    legendHtml: legendHtml,
    markLabelsPrinted: markLabelsPrinted,
    labelStatus: labelStatus,
    labelHintHtml: labelHintHtml,
    statusBadgeHtml: statusBadgeHtml,
    queenHtml: queenHtml,
    queenText: queenText,
    calmText: calmText,
    summaryHtml: summaryHtml,
    summaryLineHtml: summaryLineHtml,
    hiveCardHtml: hiveCardHtml,
    openEditor: openEditor,
    openTaskDone: openTaskDone,
    toast: toast,
    addMicButtons: addMicButtons,
    undoTask: undoTask
  };
})(window);
