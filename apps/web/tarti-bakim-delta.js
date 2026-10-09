/**
 * Bakım / muayene → kovan ağırlığı revizesi (otomatik) + elle tartım önerisi.
 * Ağırlık varsayımları tarti-elle.js MATERIAL ile uyumlu; kovan yapısı DELTA tablosunda.
 *
 * Otomatik: applyMaintenanceDelta → hive.weightKg günceller + tartı kaydı (source: bakim-revize).
 * Elle: SuperAriTartiSync.hints + pendingRevize() öneri kg; kullanıcı yine elle kaydedebilir.
 * Idempotent: linkedEventId / syncFrom anahtarı (ev:, feed:, disease:, strength:, boxes:).
 */
(function (global) {
  'use strict';

  /* VARSAYIM: boş/temel petek çerçeve ≈1,2 kg; tam bal katı (kutu+çerçeve) ≈8 kg — tarti-elle addKg ipucu ile aynı */
  var DELTA = {
    cerceveKg: 1.2,
    katKg: 8
  };

  var DISMISS_LIVE = 'superari.tartiRevize.dismiss.v1';
  var DISMISS_DEMO = 'superari.tartiRevize.dismiss.demo.v1';

  function isLive() { try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function dismissKey() { return isLive() ? DISMISS_LIVE : DISMISS_DEMO; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function todayLocal() { return nowLocal().slice(0, 10); }
  function num(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
  function round2(v) { return Math.round(Number(v) * 100) / 100; }

  function material() {
    var T = global.SuperAriTarti;
    return (T && T.MATERIAL) ? T.MATERIAL : { seritKg: 0.01, altlikKg: 0.15, feedKg: { surup11: 1.23, surup21: 1.33, kek: 1, polen: 1 } };
  }

  function linkKey(type, id) { return String(type) + ':' + String(id); }

  function readDismiss() {
    try { var v = JSON.parse(localStorage.getItem(dismissKey()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function writeDismiss(all) { try { localStorage.setItem(dismissKey(), JSON.stringify(all)); } catch (e) { /* ignore */ } }

  function isDismissed(hiveId, key) {
    var d = readDismiss()[String(hiveId)];
    return !!(d && d[key]);
  }
  function dismiss(hiveId, key) {
    var all = readDismiss(), k = String(hiveId);
    all[k] = all[k] || {};
    all[k][key] = todayLocal();
    writeDismiss(all);
  }
  function undismiss(hiveId, key) {
    var all = readDismiss(), k = String(hiveId);
    if (!all[k]) return;
    delete all[k][key];
    writeDismiss(all);
  }

  function tartiList(hiveId) {
    var T = global.SuperAriTarti;
    return T && T.list ? T.list(hiveId) : [];
  }

  function wasApplied(hiveId, key) {
    return tartiList(hiveId).some(function (r) {
      if (!r || r.source !== 'bakim-revize') return false;
      if (r.linkedEventId === key) return true;
      return Array.isArray(r.syncFrom) && r.syncFrom.indexOf(key) >= 0;
    });
  }

  function currentWeightKg(hiveId) {
    var lat = tartiList(hiveId)[0];
    if (lat && Number(lat.kg) > 0) return Number(lat.kg);
    var D = global.SuperAriDemo;
    var h = D && D.hiveById ? D.hiveById(hiveId) : null;
    return h && Number(h.weightKg) > 0 ? Number(h.weightKg) : 0;
  }

  function adjustHiveWeight(hiveId, kg) {
    var D = global.SuperAriDemo;
    if (!D || !D.loadHives || !D.saveHives) return false;
    var n = Number(hiveId), w = round2(kg);
    if (!(w > 0 && w < 400)) return false;
    var list = D.loadHives(), hit = false;
    var out = list.map(function (h) {
      if (h.id !== n) return h;
      hit = true;
      var c = Object.assign({}, h);
      c.weightKg = w;
      c.colonyUpdatedAt = new Date().toISOString();
      return c;
    });
    if (!hit) return false;
    D.saveHives(out);
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return true;
  }

  function stripPrefix(text) {
    return String(text || '').replace(/^Hızlı muayene\s*·\s*/i, '').replace(/^Kolay muayene\s*·\s*/i, '');
  }

  /** Olay metninden kg delta; 0 ise uygulanmaz. */
  function deltaFromEventText(text) {
    var tx = stripPrefix(text);
    var M = material(), d = 0, label = '';
    var m;
    m = /^(\d+)\s+boş çerçeve verildi/i.exec(tx);
    if (m) { d = Number(m[1]) * DELTA.cerceveKg; label = m[1] + ' boş çerçeve'; }
    else if (/^2 boş çerçeve verildi/i.test(tx)) { d = 2 * DELTA.cerceveKg; label = '2 boş çerçeve'; }
    else if (/^1 kat eklendi/i.test(tx) || /kat eklendi/i.test(tx) && !/alındı/i.test(tx)) {
      m = /^(\d+)\s+kat eklendi/i.exec(tx);
      d = (m ? Number(m[1]) : 1) * DELTA.katKg;
      label = (m ? m[1] : '1') + ' kat';
    } else if (/bal katı alındı/i.test(tx)) { d = -DELTA.katKg; label = 'Bal katı alındı'; }
    else if (/^(\d+)\s+çerçeve\s+alındı/i.test(tx) || /çerçeve alındı/i.test(tx) || /çerçeve aldık/i.test(tx)) {
      m = /^(\d+)\s+çerçeve\s+alındı/i.exec(tx) || /(\d+)\s*çerçeve\s+alındı/i.exec(tx);
      var n = m ? Number(m[1]) : 1;
      d = -n * DELTA.cerceveKg;
      label = n + ' çerçeve alındı';
    } else if (/şerit.*uygulandı|ilaç.*şerit/i.test(tx)) {
      m = /(\d+(?:[.,]\d+)?)\s*şerit/i.exec(tx);
      if (m) { d = Number(String(m[1]).replace(',', '.')) * M.seritKg; label = 'Varroa şeridi'; }
    }
    if (!d) return null;
    return { deltaKg: round2(d), label: label, note: 'Bakım: ' + label + ' (' + (d > 0 ? '+' : '−') + num(Math.abs(d)) + ' kg)' };
  }

  function deltaFromFeed(rec) {
    if (!rec || !(Number(rec.amount) > 0)) return null;
    var M = material(), per = M.feedKg[rec.type];
    if (!per) return null;
    var d = round2(Number(rec.amount) * per);
    var names = { kek: 'Kek', polen: 'Polen pastası', surup11: 'Şurup 1:1', surup21: 'Şurup 2:1' };
    var lbl = (names[rec.type] || rec.type) + ' ' + num(rec.amount);
    return { deltaKg: d, label: lbl, note: 'Besleme: ' + lbl + ' (+' + num(d) + ' kg)' };
  }

  function deltaFromDisease(rec) {
    if (!rec) return null;
    var M = material(), d = 0, label = '';
    if (rec.doseUnit === 'serit' && Number(rec.dose) > 0) {
      d = round2(Number(rec.dose) * M.seritKg);
      label = (rec.treatment || 'İlaç') + ' ' + num(rec.dose) + ' şerit';
    } else if (rec.method === 'tabla' || /yapışkan altlık/i.test(String(rec.note || ''))) {
      d = M.altlikKg;
      label = 'Yapışkan altlık';
    } else return null;
    return { deltaKg: d, label: label, note: 'İlaç: ' + label + ' (+' + num(d) + ' kg)' };
  }

  function deltaFromStrength(rec) {
    if (!rec || rec.space !== 'kat') return null;
    if (!(rec.inspection || /kat|bal katı/i.test(String(rec.note || '')))) return null;
    return { deltaKg: DELTA.katKg, label: 'Bal katı / kat', note: 'Muayene: kat (+' + num(DELTA.katKg) + ' kg)' };
  }

  function deltaFromBoxChange(prev, next) {
    if (!next) return null;
    var pk = prev ? Number(prev.kat) || 0 : 0, nk = Number(next.kat) || 0;
    var dKat = nk - pk;
    if (!dKat) return null;
    return {
      deltaKg: round2(dKat * DELTA.katKg),
      label: (dKat > 0 ? '+' : '') + dKat + ' kat',
      note: 'Kovan kutusu: ' + (dKat > 0 ? dKat + ' kat eklendi' : 'Bal katı alındı') + ' (' + (dKat > 0 ? '+' : '−') + num(Math.abs(dKat * DELTA.katKg)) + ' kg)'
    };
  }

  /**
   * Otomatik revize uygula. payload: { key, deltaKg, note, label?, at?, date? }
   * veya { eventId, text, date } / { recordKind, record }
   */
  function applyMaintenanceDelta(hiveId, payload) {
    payload = payload || {};
    var T = global.SuperAriTarti;
    if (!T || !T.add) return null;
    var key = payload.key;
    var info = null;
    if (!key && payload.eventId != null) {
      key = linkKey('ev', payload.eventId);
      info = deltaFromEventText(payload.text || '');
    } else if (!key && payload.recordKind && payload.record) {
      var rec = payload.record;
      if (payload.recordKind === 'feed') { key = linkKey('feed', rec.id); info = deltaFromFeed(rec); }
      else if (payload.recordKind === 'disease') { key = linkKey('disease', rec.id); info = deltaFromDisease(rec); }
      else if (payload.recordKind === 'strength') { key = linkKey('strength', rec.id); info = deltaFromStrength(rec); }
    } else if (!key && payload.boxKey) {
      key = payload.boxKey;
      info = { deltaKg: payload.deltaKg, note: payload.note, label: payload.label || '' };
    }
    if (!key) return null;
    if (wasApplied(hiveId, key)) return { skipped: true, key: key };
    if (!info && payload.deltaKg != null) info = { deltaKg: payload.deltaKg, note: payload.note || 'Bakım revizesi', label: payload.label || '' };
    if (!info || !info.deltaKg) return null;
    var dKg = round2(info.deltaKg);
    if (dKg === 0) return null;
    var at = payload.at || (payload.date ? String(payload.date).slice(0, 10) + 'T12:00' : nowLocal());
    var base = currentWeightKg(hiveId);
    var newKg = round2(base + dKg);
    if (!(newKg > 0)) return null;
    adjustHiveWeight(hiveId, newKg);
    try {
      var row = T.add({
        hiveId: hiveId,
        at: at,
        kg: newKg,
        source: 'bakim-revize',
        note: info.note,
        linkedEventId: key,
        revizeDeltaKg: dKg,
        syncFrom: [key]
      });
      undismiss(hiveId, key);
      return { key: key, deltaKg: dKg, kg: newKg, row: row };
    } catch (e) {
      adjustHiveWeight(hiveId, base);
      return null;
    }
  }

  function revokeLink(hiveId, key) {
    var T = global.SuperAriTarti;
    if (!T || !T.all || !T.remove) return false;
    var hit = tartiList(hiveId).filter(function (r) {
      return r.source === 'bakim-revize' && (r.linkedEventId === key || (Array.isArray(r.syncFrom) && r.syncFrom.indexOf(key) >= 0));
    })[0];
    if (!hit) return false;
    var rev = Number(hit.revizeDeltaKg);
    if (T.revertRevizeRow) T.revertRevizeRow(hit);
    if (T.removeRaw) T.removeRaw(hit.id);
    else T.remove(hit.id);
    return true;
  }

  function applyFromEvent(hiveId, ev) {
    if (!ev || ev.eventId == null) return null;
    return applyMaintenanceDelta(hiveId, { eventId: ev.eventId, text: ev.text, date: ev.date });
  }

  function applyFromRecord(hiveId, kind, rec) {
    if (!rec || !rec.id) return null;
    return applyMaintenanceDelta(hiveId, { recordKind: kind, record: rec });
  }

  function applyFromBoxes(hiveId, prev, next, date) {
    var info = deltaFromBoxChange(prev, next);
    if (!info) return null;
    var d = todayLocal();
    var boxKey = linkKey('boxes', hiveId + ':' + (date || d) + ':' + (Number(next.kat) || 0));
    return applyMaintenanceDelta(hiveId, { boxKey: boxKey, deltaKg: info.deltaKg, note: info.note, label: info.label, date: date || d });
  }

  /** Son tartımdan sonra bekleyen (henüz bakim-revize uygulanmamış) kalemler — elle form önerisi. */
  function pendingRevize(hiveId, opts) {
    opts = opts || {};
    var D = global.SuperAriDemo, out = { items: [], netKg: 0, suggestedKg: null, chips: [], autoApplied: [] };
    if (!D || hiveId == null) return out;
    var lat = tartiList(hiveId)[0];
    var since = lat ? String(lat.at || lat.date || '').slice(0, 10) : '1970-01-01';
    var h = D.hiveById(hiveId);
    var base = currentWeightKg(hiveId);

    function consider(key, chip, deltaKg, applied) {
      if (isDismissed(hiveId, key) && !applied) return;
      if (!applied && wasApplied(hiveId, key)) applied = true;
      var item = { key: key, chip: chip, deltaKg: deltaKg, applied: !!applied };
      out.items.push(item);
      if (applied) { out.autoApplied.push(chip); return; }
      out.netKg = round2(out.netKg + deltaKg);
      if (chip && out.chips.indexOf(chip) < 0) out.chips.push(chip);
    }

    ((h && h.colonyEvents) || []).forEach(function (e) {
      if (!e || !e.date || e.date < since) return;
      var info = deltaFromEventText(e.text);
      if (!info) return;
      var chip = 'Bakımdan: ' + (info.deltaKg > 0 ? '+' : '−') + num(Math.abs(info.deltaKg)) + ' kg · ' + info.label;
      consider(linkKey('ev', e.id), chip, info.deltaKg, wasApplied(hiveId, linkKey('ev', e.id)));
    });

    var rec = null;
    try { rec = D.records.recordsFor(hiveId); } catch (eR) { rec = null; }
    if (rec) {
      (rec.feed || []).forEach(function (r) {
        if (!r || !r.date || r.date < since) return;
        var info = deltaFromFeed(r);
        if (!info) return;
        var chip = 'Besleme: +' + num(info.deltaKg) + ' kg · ' + info.label;
        consider(linkKey('feed', r.id), chip, info.deltaKg, wasApplied(hiveId, linkKey('feed', r.id)));
      });
      (rec.disease || []).forEach(function (r) {
        if (!r || !r.date || r.date < since) return;
        var info = deltaFromDisease(r);
        if (!info) return;
        var chip = 'İlaç: +' + num(info.deltaKg) + ' kg · ' + info.label;
        consider(linkKey('disease', r.id), chip, info.deltaKg, wasApplied(hiveId, linkKey('disease', r.id)));
      });
      (rec.strength || []).forEach(function (r) {
        if (!r || !r.date || r.date < since) return;
        var info = deltaFromStrength(r);
        if (!info) return;
        var chip = 'Muayeneden: +' + num(info.deltaKg) + ' kg · ' + info.label;
        consider(linkKey('strength', r.id), chip, info.deltaKg, wasApplied(hiveId, linkKey('strength', r.id)));
      });
    }

    if (out.netKg) out.suggestedKg = round2(base + out.netKg);
    else if (base > 0) out.suggestedKg = base;
    return out;
  }

  global.SuperAriTartiBakim = {
    DELTA: DELTA,
    linkKey: linkKey,
    deltaFromEventText: deltaFromEventText,
    deltaFromFeed: deltaFromFeed,
    deltaFromDisease: deltaFromDisease,
    deltaFromStrength: deltaFromStrength,
    deltaFromBoxChange: deltaFromBoxChange,
    applyMaintenanceDelta: applyMaintenanceDelta,
    applyFromEvent: applyFromEvent,
    applyFromRecord: applyFromRecord,
    applyFromBoxes: applyFromBoxes,
    revokeLink: revokeLink,
    pendingRevize: pendingRevize,
    dismiss: dismiss,
    wasApplied: wasApplied,
    currentWeightKg: currentWeightKg
  };
})(typeof window !== 'undefined' ? window : globalThis);
