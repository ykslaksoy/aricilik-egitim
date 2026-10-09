/**
 * Muayene / bakım → elle tartım (kat, besleme) önerisi. tarti-elle.js ile kullanılır.
 */
(function (global) {
  'use strict';
  var DAYS = 14;
  var KAT_EV = /(?:^|·\s*)(?:1\s+)?kat\s+eklendi|kat\s+at\s*\(|bal\s+katı\s+verildi/i;
  var KAT_EV_SKIP = /kat\s+bırakıldı|bal\s+katı\s+alındı|kat\s+atm/i;

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(date, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').slice(0, 10));
    if (!m) return '';
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(n || 0));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function srcFromNote(note) {
    var n = String(note || '');
    if (/Hızlı muayene|Kolay muayene/i.test(n)) return 'Muayeneden';
    if (/Bakım planı|bakım/i.test(n)) return 'Bakımdan';
    return 'Kayıttan';
  }
  function fmtChip(prefix, detail, date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').slice(0, 10));
    return prefix + ': ' + detail + (m ? ' (' + m[3] + '.' + m[2] + '.' + m[1] + ')' : '');
  }

  function linkedSources(hiveId, listFn) {
    var set = {}, list = listFn ? listFn(hiveId) : [];
    (list || []).forEach(function (t) {
      (t.syncFrom || []).forEach(function (s) { if (s) set[String(s)] = true; });
    });
    return set;
  }

  /** Son N gün muayene/bakım → { kat, besleme, katSrc, beslemeSrc, chips } */
  function hints(hiveId, opts) {
    opts = opts || {};
    var days = opts.days > 0 ? opts.days : DAYS;
    var from = addDays(todayLocal(), -days);
    var D = global.SuperAriDemo;
    var out = { kat: false, besleme: false, katSrc: [], beslemeSrc: [], chips: [] };
    if (!D || hiveId == null || hiveId === '') return out;
    var linked = linkedSources(hiveId, opts.list);
    var h = D.hiveById(hiveId);
    var R = D.records;
    var rec = null;
    try { rec = R.recordsFor(hiveId); } catch (e) { rec = null; }

    function pushKat(id, chip) {
      var k = 'ev:' + id;
      if (linked[k]) return;
      out.katSrc.push(k);
      out.kat = true;
      if (chip && out.chips.indexOf(chip) < 0) out.chips.push(chip);
    }
    function pushBes(id, chip) {
      var k = 'feed:' + id;
      if (linked[k]) return;
      out.beslemeSrc.push(k);
      out.besleme = true;
      if (chip && out.chips.indexOf(chip) < 0) out.chips.push(chip);
    }

    ((h && h.colonyEvents) || []).forEach(function (e) {
      if (!e || !e.date || e.date < from) return;
      var tx = String(e.text || '');
      if (KAT_EV_SKIP.test(tx)) return;
      if (KAT_EV.test(tx) || (/kat\s+eklendi/i.test(tx) && !/alındı/i.test(tx))) {
        pushKat(e.id, fmtChip(/Hızlı muayene/i.test(tx) ? 'Muayeneden' : 'Bakımdan', 'Kat eklendi', e.date));
      }
    });

    if (rec && rec.strength) {
      rec.strength.forEach(function (r) {
        if (!r || r.date < from) return;
        if (r.space === 'kat' || (r.inspection && /yer:\s*bal katı|kat takılı/i.test(String(r.note || '')))) {
          var sid = 'strength:' + r.id;
          if (!linked[sid]) {
            out.katSrc.push(sid);
            out.kat = true;
            var c = fmtChip('Muayeneden', 'Bal katı / kat', r.date);
            if (out.chips.indexOf(c) < 0) out.chips.push(c);
          }
        }
      });
    }

    if (h && h.boxes && h.boxes.date && h.boxes.date >= from && Number(h.boxes.kat) > 0) {
      var bid = 'boxes:' + h.id + ':' + h.boxes.date;
      if (!linked[bid] && out.katSrc.indexOf(bid) < 0) {
        var evKat = out.katSrc.some(function (s) { return s.indexOf('ev:') === 0 || s.indexOf('strength:') === 0; });
        if (!evKat) {
          out.katSrc.push(bid);
          out.kat = true;
          var c2 = fmtChip('Muayeneden', 'Kat (' + h.boxes.kat + ')', h.boxes.date);
          if (out.chips.indexOf(c2) < 0) out.chips.push(c2);
        }
      }
    }

    if (rec && rec.feed) {
      var FL = R.FEED_LABEL || {}, FU = R.FEED_UNIT || {};
      rec.feed.forEach(function (r) {
        if (!r || !r.date || r.date < from || !(Number(r.amount) > 0)) return;
        var lbl = (FL[r.type] || r.type || 'Besleme') + ' ' + String(r.amount).replace('.', ',') + ' ' + (FU[r.type] || '');
        pushBes(r.id, fmtChip(srcFromNote(r.note), 'Besleme · ' + lbl.trim(), r.date));
      });
    }

    return out;
  }

  global.SuperAriTartiSync = { DAYS: DAYS, hints: hints, linkedSources: linkedSources, addDays: addDays };
})(typeof window !== 'undefined' ? window : globalThis);
