/**
 * SüperArı — Elle tartım (manuel ağırlık kaydı). Cihaz/tartı bağlı olsa da her zaman kullanılabilir.
 * Depo: superari.tartiElle.v1 (Canlı, buluta eşitlenir) / superari.tartiElle.demo.v1 (Demo, «Demo» etiketli, eşitlenmez).
 * Kayıt: { id:'tw…', hiveId, at:'YYYY-MM-DDTHH:MM', date, kg, addKg?, kat?, besleme?, note?, demo? }
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
    seritKg: 0.01, altlikKg: 0.15,
    feedKg: { surup11: 1.23, surup21: 1.33, kek: 1, polen: 1 }, /* kg / birim (L ya da kg) */
    consumeDays: { surup11: 3, surup21: 4, kek: 14, polen: 14 }
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
    var r = { id: 'tw' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), hiveId: Number(o.hiveId), at: at, date: at.slice(0, 10), kg: kg, source: 'elle' };
    if (!isFinite(r.hiveId)) throw new Error('Kovan seçin');
    if (o.kat) r.kat = true;
    if (o.besleme) r.besleme = true;
    var ad = parseKg(o.addKg); if (ad > 0 && ad < 100 && (r.kat || r.besleme)) r.addKg = ad;
    var note = String(o.note || '').trim(); if (note) r.note = note.slice(0, 200);
    /* dara: kayıt anındaki kovandaki malzeme (sonraki kayıt değişikliklerinden etkilenmesin diye saklanır). Elle eklenen besleme ağırlığı varsa besleme kalemleri düşülmez (çift sayım yok). */
    try { var tw = tare(r.hiveId, at, { noFeed: !!(r.besleme && r.addKg) }); if (tw.kg > 0) { r.tareKg = tw.kg; r.tareItems = tw.items.map(function (x) { return x.label; }).slice(0, 6); } } catch (eT) { /* ignore */ }
    if (!isLive()) r.demo = true;
    var l = read(); l.push(r); write(l);
    return r;
  }
  function remove(id) { write(read().filter(function (x) { return x.id !== id; })); }
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
    return '<div class="te-row"><span class="te-tag">Elle</span><span class="te-main"><b>' + num(x.kg) + ' kg</b>' + (h ? ' · ' + esc(h.name) : '') + ' <small>' + esc(fmtAt(x.at)) + (x.demo ? ' · Demo' : '') + '</small>' +
      (flagText(x) || x.note ? '<small class="te-sub">' + esc([flagText(x), x.note || ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</span>' +
      (opts && opts.del ? '<button type="button" class="te-del" data-te-del="' + esc(x.id) + '" aria-label="Sil">🗑</button>' : '') + '</div>';
  }
  var css = '.te-back{position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9100;display:flex;align-items:flex-end;justify-content:center;}' +
    '.te{background:#fffaf2;width:100%;max-width:560px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;color:#3d2616;overflow-wrap:anywhere;}' +
    '.te h2{margin:0 0 4px;font-size:18px;display:flex;align-items:center;gap:8px;}.te .te-x{margin-left:auto;flex:none;border:0;background:#efe4d2;border-radius:999px;width:34px;height:34px;font-size:19px;cursor:pointer;}' +
    '.te form{display:grid;gap:10px;}.te label.f{display:grid;gap:4px;font-size:13px;font-weight:700;color:#5c4813;min-width:0;}' +
    '.te input[type=datetime-local],.te input[type=text],.te input[type=number],.te select{font:inherit;font-size:16px;padding:9px 10px;border-radius:10px;border:1px solid #d8c7aa;background:#fff;width:100%;box-sizing:border-box;min-width:0;}' +
    '.te .te-kg{font-size:26px;font-weight:800;text-align:center;}.te .te-chk{display:flex;gap:8px;align-items:center;font-size:14px;font-weight:700;}.te .te-chk input{width:20px;height:20px;}' +
    '.te-btn{font:inherit;font-size:16px;font-weight:800;min-height:50px;border-radius:14px;border:1px solid #3d2616;background:#3d2616;color:#fff;cursor:pointer;width:100%;}' +
    '.te-msg{margin:0;font-size:14px;}.te-msg.ok{color:#1b7a3d;font-weight:700;}.te-msg.err{color:#c92a2a;font-weight:700;}' +
    '.te-row{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid #f1e8da;font-size:14px;}.te-row:first-child{border-top:0;}' +
    '.te-tag{flex:none;background:#fff3bf;color:#7a5b00;border:1px solid #ffe066;border-radius:999px;font-size:11px;font-weight:800;padding:1px 7px;margin-top:1px;}' +
    '.te [hidden]{display:none!important;}.te-tare{margin:-4px 0 0;font-size:13px;font-weight:700;color:#5c4813;background:#fff3bf;border:1px solid #ffe066;border-radius:10px;padding:6px 8px;}' +
    '.te-main{flex:1;min-width:0;}.te-main small{color:#6b5a48;}.te-sub{display:block;}.te-del{flex:none;border:0;background:none;font-size:16px;cursor:pointer;padding:0 4px;}';
  function ensureCss() { if (document.getElementById('teCss')) return; var s = document.createElement('style'); s.id = 'teCss'; s.textContent = css; document.head.appendChild(s); }
  function close() { var b = document.getElementById('teSheet'); if (b) b.remove(); }
  /** Elle tartım formu. opts: { apiaryId, onSaved } — hiveId boşsa kovan seçilir. */
  function open(hiveId, opts) {
    opts = opts || {};
    var D = global.SuperAriDemo; if (!D) return;
    ensureCss(); close();
    var h = hiveId != null && hiveId !== '' ? D.hiveById(hiveId) : null;
    var aps = D.loadApiaries(), apSel = String((h && h.apiaryId) || opts.apiaryId || (aps[0] && aps[0].id) || '');
    function hiveOpts(ap) { return D.loadHives().filter(function (x) { return String(x.apiaryId) === String(ap) && x.colonyState !== 'birlestirildi'; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join(''); }
    var back = document.createElement('div'); back.className = 'te-back'; back.id = 'teSheet';
    back.innerHTML = '<div class="te" role="dialog" aria-modal="true" aria-label="Elle tartım"><h2>⚖ Elle tartım' + (h ? ' · ' + esc(h.name) : '') + '<button type="button" class="te-x" data-te-close aria-label="Kapat">×</button></h2>' +
      '<p style="margin:0 0 10px;font-size:13px;color:#6b5a48;">Kovanı el kantarı / baskülle tartıp yazın. Tartı cihazı bağlı olsa da elle kayıt her zaman eklenebilir.' + (isLive() ? '' : ' · Demo') + '</p>' +
      '<form data-te-form autocomplete="off" onsubmit="return false">' +
      (h ? '' : '<label class="f">Arılık<select name="ap">' + aps.map(function (a) { return '<option value="' + esc(a.id) + '"' + (String(a.id) === apSel ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="f">Kovan<select name="hive">' + hiveOpts(apSel) + '</select></label>') +
      '<label class="f">Tarih / saat<input type="datetime-local" name="at" value="' + nowLocal() + '"></label>' +
      '<label class="f">Ağırlık (kg)<input class="te-kg" type="number" name="kg" inputmode="decimal" step="0.1" min="1" max="400" placeholder="ör. 42,5" required></label>' +
      '<p class="te-tare" data-te-tare hidden></p>' +
      '<label class="te-chk"><input type="checkbox" name="kat"> Kat eklendi</label>' +
      '<label class="te-chk"><input type="checkbox" name="besleme"> Besleme yapıldı</label>' +
      '<label class="f" data-te-add hidden>Eklenen ağırlık (kg, isteğe bağlı — sonraki okumalardan düşülür)<input type="number" name="addKg" inputmode="decimal" step="0.1" min="0" max="100" placeholder="ör. kat ≈ 8, 5 L şurup ≈ 6,5"></label>' +
      '<label class="f">Not (isteğe bağlı)<input type="text" name="note" maxlength="200"></label>' +
      '<button type="button" class="te-btn" data-te-save>Kaydet</button><p class="te-msg" data-te-msg role="status"></p></form>' +
      '<div data-te-list style="margin-top:10px;"></div></div>';
    document.body.appendChild(back);
    var f = back.querySelector('[data-te-form]');
    function curHive() { return h ? h.id : (f.elements.hive && f.elements.hive.value); }
    function renderList() {
      var hid = curHive(), l = hid != null && hid !== '' ? list(hid).slice(0, 6) : [];
      back.querySelector('[data-te-list]').innerHTML = l.length ? '<b style="font-size:14px;">Son elle tartımlar</b>' + l.map(function (x) { return rowHtml(x, { del: true }); }).join('') : '';
    }
    function toggleAdd() { back.querySelector('[data-te-add]').hidden = !(f.elements.kat.checked || f.elements.besleme.checked); showTare(); }
    function showTare() {
      var el = back.querySelector('[data-te-tare]'), hid = curHive(); if (!el) return;
      var tw = hid != null && hid !== '' ? tare(hid, f.elements.at.value, { noFeed: !!(f.elements.besleme.checked && parseKg(f.elements.addKg.value) > 0) }) : { kg: 0, items: [] };
      el.hidden = !(tw.kg > 0);
      el.textContent = tw.kg > 0 ? '⚖ ' + tareNote(tw).charAt(0).toLocaleUpperCase('tr') + tareNote(tw).slice(1) + ' (' + tw.items.map(function (x) { return x.label; }).join(', ') + ')' : '';
    }
    renderList(); showTare();
    back.addEventListener('change', function (e) {
      if (e.target.name === 'ap') { f.elements.hive.innerHTML = hiveOpts(e.target.value); renderList(); showTare(); }
      else if (e.target.name === 'hive') { renderList(); showTare(); }
      else if (e.target.name === 'at' || e.target.name === 'addKg') showTare();
      else if (e.target.name === 'kat' || e.target.name === 'besleme') toggleAdd();
    });
    back.addEventListener('click', function (e) {
      if (e.target === back || (e.target.hasAttribute && e.target.hasAttribute('data-te-close'))) { close(); return; }
      var del = e.target.closest ? e.target.closest('[data-te-del]') : null;
      if (del) { if (global.confirm && !global.confirm('Bu tartım silinsin mi?')) return; remove(del.getAttribute('data-te-del')); renderList(); if (opts.onSaved) opts.onSaved(); return; }
      if (!e.target.closest || !e.target.closest('[data-te-save]')) return;
      var m = back.querySelector('[data-te-msg]');
      try {
        var r = add({ hiveId: curHive(), at: f.elements.at.value, kg: f.elements.kg.value, kat: f.elements.kat.checked, besleme: f.elements.besleme.checked, addKg: f.elements.addKg.value, note: f.elements.note.value });
        m.className = 'te-msg ok'; m.textContent = '✓ Kaydedildi: ' + num(r.kg) + ' kg (' + fmtAt(r.at) + ')' + (r.tareKg ? ' · net ' + num2(netOf(r)) + ' kg, ' + tareNote({ kg: r.tareKg }) : '');
        f.elements.kg.value = ''; f.elements.note.value = ''; f.elements.kat.checked = false; f.elements.besleme.checked = false; f.elements.addKg.value = ''; toggleAdd();
        renderList();
        if (typeof opts.onSaved === 'function') opts.onSaved(r);
      } catch (err) { m.className = 'te-msg err'; m.textContent = err.message || 'Kaydedilemedi'; }
    });
    setTimeout(function () { try { f.elements.kg.focus(); } catch (e) { /* ignore */ } }, 50);
  }
  global.SuperAriTarti = { MATERIAL: MATERIAL, tare: tare, tareNote: tareNote, netOf: netOf, KEY_LIVE: KEY_LIVE, KEY_DEMO: KEY_DEMO, all: all, list: list, latest: latest, add: add, remove: remove, series: series, rowHtml: rowHtml, fmtAt: fmtAt, flagText: flagText, ensureCss: ensureCss, open: open, close: close };
})(window);
