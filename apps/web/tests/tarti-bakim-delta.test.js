/* Bakım / muayene → tartı revize (otomatik + idempotent) */
const assert = require('assert');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const RealDate = Date;
const FIX = new RealDate('2026-10-09T12:00:00+03:00').getTime();
class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
globalThis.Date = FakeDate;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.document = { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: { style: {} }, readyState: 'complete', head: { appendChild() {} } };
globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {};
globalThis.location = { href: 'http://x/kovan.html', search: '', pathname: '/kovan.html', hash: '' };
globalThis.navigator = { onLine: true };
['demo-data.js', 'tarti-bakim-delta.js', 'tarti-muayene-sync.js', 'tarti-elle.js'].forEach((f) => require(W + f));

const D = globalThis.SuperAriDemo;
const C = D.colony;
const T = globalThis.SuperAriTarti;
const BD = globalThis.SuperAriTartiBakim;

const hive = D.loadHives().find((h) => h.colonyState !== 'sonuk' && h.colonyState !== 'birlestirildi');
assert.ok(hive, 'demo kovan');
const w0 = Number(hive.weightKg);

const ev1 = C.addEvent(hive.id, { date: '2026-10-09', type: 'bakim', text: 'Hızlı muayene · 1 kat eklendi' });
assert.ok(ev1);
const dKat = BD.deltaFromEventText('Hızlı muayene · 1 kat eklendi');
assert.strictEqual(dKat.deltaKg, BD.DELTA.katKg);

const ap1 = BD.applyFromEvent(hive.id, { eventId: ev1, text: 'Hızlı muayene · 1 kat eklendi', date: '2026-10-09' });
assert.ok(ap1 && ap1.row, JSON.stringify(ap1));
assert.strictEqual(ap1.row.source, 'bakim-revize');
const h1 = D.hiveById(hive.id);
assert.ok(Math.abs(Number(h1.weightKg) - (w0 + BD.DELTA.katKg)) < 0.05, h1.weightKg + ' vs ' + (w0 + BD.DELTA.katKg));

const ap2 = BD.applyFromEvent(hive.id, { eventId: ev1, text: 'Hızlı muayene · 1 kat eklendi', date: '2026-10-09' });
assert.ok(ap2 && ap2.skipped, 'idempotent');

const ev2 = C.addEvent(hive.id, { date: '2026-10-09', type: 'bakim', text: 'Hızlı muayene · 2 boş çerçeve verildi' });
const dCer = BD.deltaFromEventText('Hızlı muayene · 2 boş çerçeve verildi');
assert.strictEqual(dCer.deltaKg, 2 * BD.DELTA.cerceveKg);

const feed = D.records.add(hive.id, 'feed', { date: '2026-10-09', type: 'kek', amount: 2, note: 'test' });
const dFeed = BD.deltaFromFeed(feed);
assert.strictEqual(dFeed.deltaKg, 2);

const pend = BD.pendingRevize(hive.id);
assert.ok(pend.chips.length >= 0);

console.log('tarti-bakim-delta ok');
