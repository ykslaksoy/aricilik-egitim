/* k116: muayene / bakım → elle tartım (kat, besleme) senkronu */
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
['demo-data.js', 'tarti-muayene-sync.js', 'tarti-elle.js'].forEach((f) => require(W + f));

const D = globalThis.SuperAriDemo;
const R = D.records;
const C = D.colony;
const T = globalThis.SuperAriTarti;
const S = globalThis.SuperAriTartiSync;

const hive = D.loadHives().find((h) => h.colonyState !== 'sonuk' && h.colonyState !== 'birlestirildi');
assert.ok(hive, 'demo kovan');

const today = '2026-10-09';

C.addEvent(hive.id, { date: today, type: 'bakim', text: 'Hızlı muayene · 1 kat eklendi' });
let h = T.muayeneHints(hive.id);
assert.ok(h.kat && h.katSrc.some((s) => s.indexOf('ev:') === 0), JSON.stringify(h));
assert.ok(h.chips.some((c) => /Muayeneden.*Kat/.test(c)), h.chips.join(' | '));

R.add(hive.id, 'feed', { date: today, type: 'surup21', amount: 3, note: 'Hızlı muayene · bakım' });
h = T.muayeneHints(hive.id);
assert.ok(h.besleme && h.beslemeSrc.some((s) => s.indexOf('feed:') === 0), JSON.stringify(h));

const tw = T.add({ hiveId: hive.id, kg: 42, kat: true, besleme: true, syncFrom: h.katSrc.concat(h.beslemeSrc) });
assert.ok(Array.isArray(tw.syncFrom) && tw.syncFrom.length >= 2);

const h2 = T.muayeneHints(hive.id);
assert.strictEqual(h2.kat, false, 'kat kaynakları tartımla bağlandı');
assert.strictEqual(h2.besleme, false, 'besleme kaynakları tartımla bağlandı');

R.add(hive.id, 'strength', { date: today, beeFrames: 8, broodFrames: 4, honeyFrames: 2, inspection: true, space: 'kat', note: 'Kolay muayene' });
const h3 = T.muayeneHints(hive.id);
assert.ok(h3.kat && h3.katSrc.some((s) => s.indexOf('strength:') === 0), JSON.stringify(h3));

console.log('k116-muayene-tartim-sync ok');
