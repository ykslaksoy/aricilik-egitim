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

  var CSS = '' +
    '.qdot{display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:-.08em;margin-right:.3em;border:1px solid rgba(0,0,0,.25);flex:0 0 auto;}' +
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
    '.kol-form .kol-check small{margin-left:auto;color:var(--muted,#6b7280);font-weight:600;white-space:nowrap;}';
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

  function dotHtml(year) {
    ensureCss();
    var c = C(); var col = c && c.queenColor(year);
    if (!col) return '';
    return '<span class="qdot" style="background:' + col.hex + '" title="Ana arı rengi: ' + esc(col.name) + '" aria-label="' + esc(col.name) + '"></span>';
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
    if (age == null) return 'Yıl yok' + statusBadgeHtml(h);
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

  function hiveCardHtml(h, apiaryName) {
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
      '</div>' +
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
    return '<h3 style="margin:.2rem 0 0;font-size:1rem;">Mevcut ana arılar (' + res.current.length + ')</h3>' +
      (res.current.map(function (q) { return card(q, true); }).join('') || '<p class="muted">Kayıt yok.</p>') +
      '<h3 style="margin:.6rem 0 0;font-size:1rem;">Önceki ana arılar (' + res.past.length + ')</h3>' +
      (res.past.map(function (q) { return card(q, false); }).join('') || '<p class="muted">Henüz değiştirilen ana arı yok.</p>');
  }

  global.SuperAriKoloni = {
    queensListHtml: queensListHtml,
    lastChangeText: lastChangeText,
    historyHtml: historyHtml,
    historyEntryText: historyEntryText,
    openBulkEditor: openBulkEditor,
    ensureCss: ensureCss,
    editHref: editHref,
    dotHtml: dotHtml,
    statusBadgeHtml: statusBadgeHtml,
    queenHtml: queenHtml,
    queenText: queenText,
    calmText: calmText,
    summaryHtml: summaryHtml,
    summaryLineHtml: summaryLineHtml,
    hiveCardHtml: hiveCardHtml,
    openEditor: openEditor
  };
})(window);
