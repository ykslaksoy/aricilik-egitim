/* SüperArı · Ekipman / temizlik kayıtları (Bakım › Ekipman-Temizlik).
 * Canlı: superari.ekipman.v1 (buluta eşitlenir: records kind colony_event, local_id 'ek:<id>', data.type 'ekipman')
 * Demo:  superari.ekipman.demo.v1 (örnekler demo=true, buluta gitmez). */
(function (global) {
  'use strict';
  var WORKS = [
    { key: 'cerceve', label: 'Çerçeve temizliği' },
    { key: 'kovan', label: 'Kovan temizliği' },
    { key: 'dezenfeksiyon', label: 'Dezenfeksiyon' },
    { key: 'onarim', label: 'Ekipman onarımı' },
    { key: 'diger', label: 'Diğer' }
  ];
  var LABEL = {}; WORKS.forEach(function (w) { LABEL[w.key] = w.label; });
  function live() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function key() { return live() ? 'superari.ekipman.v1' : 'superari.ekipman.demo.v1'; }
  function D() { return global.SuperAriDemo; }
  function today() { var d = D(); return d && d.records ? d.records.todayLocal() : new Date().toISOString().slice(0, 10); }
  function addDays(s, n) { var d = D(); return d && d.records && d.records.addDays ? d.records.addDays(s, n) : s; }
  function txt(v, max) { var t = String(v == null ? '' : v).trim(); return t ? t.slice(0, max || 200) : ''; }
  function read() {
    var arr = null;
    try { arr = JSON.parse(global.localStorage.getItem(key()) || 'null'); } catch (e) { arr = null; }
    if (!Array.isArray(arr)) { arr = live() ? [] : seedDemo(); if (!live()) write(arr); }
    return arr.filter(function (x) { return x && x.id; });
  }
  function write(a) { try { global.localStorage.setItem(key(), JSON.stringify(a)); } catch (e) { /* ignore */ } }
  function seedDemo() {
    var d = D(); if (!d || !d.loadApiaries) return [];
    var aps = d.loadApiaries() || [], t = today(), out = [];
    if (aps[0]) out.push({ id: 'ekd1', demo: true, date: addDays(t, -3), apiaryId: String(aps[0].id), hiveId: null, works: ['cerceve', 'dezenfeksiyon'], note: 'Boş çerçeveler kazındı, alevden geçirildi', createdAt: t });
    if (aps[1]) out.push({ id: 'ekd2', demo: true, date: addDays(t, -12), apiaryId: String(aps[1].id), hiveId: null, works: ['onarim'], note: 'Kırık kapak ve uçuş tahtası onarıldı', createdAt: t });
    return out;
  }
  function norm(r) {
    r = r || {};
    var works = (Array.isArray(r.works) ? r.works : [r.works]).filter(function (w) { return LABEL[w]; });
    if (!works.length) throw new Error('Yapılan işi seçin (çerçeve/kovan temizliği, dezenfeksiyon, onarım…).');
    var date = /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : today();
    var hid = r.hiveId != null && r.hiveId !== '' ? Number(r.hiveId) : null;
    var ap = r.apiaryId != null && r.apiaryId !== '' ? String(r.apiaryId) : '';
    if (hid != null && !ap) { var h = (D().loadHives() || []).filter(function (x) { return Number(x.id) === hid; })[0]; if (h) ap = String(h.apiaryId); }
    return { date: date, apiaryId: ap, hiveId: isFinite(hid) ? hid : null, works: works, note: txt(r.note, 300) };
  }
  function add(r) {
    var o = norm(r), a = read();
    o.id = 'ek' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    o.createdAt = new Date().toISOString();
    a.push(o); write(a);
    try { global.dispatchEvent(new CustomEvent('superari-records-changed', { detail: { kind: 'ekipman' } })); } catch (e) { /* ignore */ }
    return o;
  }
  function remove(id) {
    var a = read(), n = a.length; a = a.filter(function (x) { return String(x.id) !== String(id); });
    write(a); return a.length !== n;
  }
  function list(opts) {
    opts = opts || {};
    return read().filter(function (x) {
      if (opts.apiaryId && String(x.apiaryId) !== String(opts.apiaryId)) return false;
      if (opts.since && x.date < opts.since) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))); });
  }
  function worksText(x) { return (x.works || []).map(function (w) { return LABEL[w] || w; }).join(', '); }
  global.SuperAriEkipman = { WORKS: WORKS, LABEL: LABEL, list: list, add: add, remove: remove, worksText: worksText, key: key };
})(window);
