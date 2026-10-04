/* Bölge bandı rakımla: Yanıkdağ Baluğundüzü (≈215 m, Karadeniz kıyısı) ılıman; Tortum yayla; Palandöken / Cimil yüksek yayla; Kayaköy sıcak. */
const assert = require('assert');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const RealDate = Date;
const FIX = new RealDate('2026-10-04T12:00:00+03:00').getTime();
class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
globalThis.Date = FakeDate;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.document = { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: { style: {} }, readyState: 'complete', head: { appendChild() {} } };
globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {};
globalThis.location = { href: 'http://x/bakim-yap.html', search: '', pathname: '/bakim-yap.html', hash: '' };
globalThis.navigator = { onLine: true };
['demo-data.js', 'ilac-katalog.js', 'bakim-plan.js', 'tarti-elle.js'].forEach((f) => require(W + f));
const D = globalThis.SuperAriDemo, P = globalThis.SuperAriPlan, R = D.records;
const want = { a1: 'sicak', a2: 'yayla', a3: 'yuksek', a4: 'iliman', a5: 'yuksek' };
Object.keys(want).forEach((id) => assert.strictEqual(P.profileKey(id), want[id], id + ' bakım bandı'));
Object.keys(want).forEach((id) => assert.strictEqual(D.colony.swarmSeason(id, '2026-05-01').profile, want[id], id + ' oğul mevsimi bandı'));
const hv = D.loadHives().find((h) => h.apiaryId === 'a4');
const e = R.envFor(hv, '2026-07-01');
assert.deepStrictEqual([e.bandKey, e.band.fobMean, e.winterKg], ['iliman', 8.6, 20], 'Yanıkdağ ılıman: 8,6 çerçeve / 20 kg');
const eP = R.envFor(D.loadHives().find((h) => h.apiaryId === 'a3'), '2026-07-01');
assert.ok(eP.winterKg > e.winterKg && eP.band.fobMean > e.band.fobMean, 'Palandöken (yüksek yayla) Yanıkdağ\'dan yüksek');
/* kullanıcı arılığında kayıtlı rakım her zaman önceliklidir (adında «yayla» geçse de) */
assert.strictEqual(D.colony.autoSeasonProfile({ id: 'x9', name: 'Kıyı Yaylası', il: 'Rize', altitude: 220 }), 'iliman');
assert.strictEqual(D.colony.autoSeasonProfile({ id: 'x9', name: 'Palandöken 2', il: 'Erzurum', altitude: 2100 }), 'yuksek');
console.log('bant-rakim ok');
