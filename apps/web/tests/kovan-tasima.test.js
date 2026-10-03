/* koloni-78: Taşınan kovan — bulutta kovan satırı yeni arılığa bağlanır, geçmiş kayıtlar tarihindeki arılıkta kalır; detayda «Taşındı: eski → yeni, tarih». */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = path.join(__dirname, '..') + path.sep;
const mem = { 'superari.workMode': 'live' };
const ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const ctx = { localStorage: ls, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, URLSearchParams, location: { pathname: '/kovan.html', search: '', hash: '', origin: 'http://x' }, navigator: { onLine: false }, document: { readyState: 'complete', currentScript: null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {}, getAttribute: () => null, classList: { add() {} } } }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, Event: function () {}, CustomEvent: function () {}, fetch: () => Promise.reject(new Error('offline')) };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(W + 'demo-data.js', 'utf8'), ctx);
const D = ctx.SuperAriDemo;
mem['superari.ariliklar.v1'] = JSON.stringify([{ id: 'apA', name: 'Kayaköy', hiveCount: 1 }, { id: 'apB', name: 'Tortum', hiveCount: 0 }]);
mem['superari.kovanlar.v1'] = JSON.stringify([{ id: 501, name: 'K-501', apiaryId: 'apA' }]);
assert.strictEqual(D.loadHives().length, 1, 'canlı kovan');
const rec = D.goc.add({ fromApiaryId: 'apA', toApiaryId: 'apB', hiveIds: [501], date: '2026-09-20', reason: 'diger', tasks: false });
assert.ok(rec && rec.id);
assert.strictEqual(D.hiveById(501).apiaryId, 'apB');
const ms = D.goc.movesForHive(501);
assert.deepStrictEqual(JSON.parse(JSON.stringify(ms.map((m) => [m.fromName, m.toName, m.date]))), [['Kayaköy', 'Tortum', '2026-09-20']]);
assert.strictEqual(D.goc.apiaryAt(501, '2026-09-01'), 'apA');
assert.strictEqual(D.goc.apiaryAt(501, '2026-09-20'), 'apB', 'taşıma günü → yeni arılık');
assert.strictEqual(D.goc.apiaryAt(501, '2026-10-01'), 'apB');
/* göç kaydı silinse de kovan olayından «Taşındı» okunur */
const goc0 = mem['superari.goc.v1']; D.goc.remove(rec.id);
assert.deepStrictEqual(JSON.parse(JSON.stringify(D.goc.movesForHive(501).map((m) => [m.fromName, m.toName]))), [['Kayaköy', 'Tortum']]);
mem['superari.goc.v1'] = goc0;

/* bulut: kayıtlar tarihindeki arılığa bağlanır */
mem['superari.koloniKayit.v1'] = JSON.stringify({ 501: { strength: [{ id: 'r-old', date: '2026-09-10', frames: 6 }, { id: 'r-new', date: '2026-09-25', frames: 7 }] } });
mem['superari.tartiElle.v1'] = JSON.stringify([{ id: 't-old', hiveId: 501, date: '2026-09-05', kg: 40 }, { id: 't-new', hiveId: 501, date: '2026-09-28', kg: 42 }]);
vm.runInContext(fs.readFileSync(W + 'bulut.js', 'utf8'), ctx);
const B = ctx.SuperAriBulut;
const st = B._loadState('u1');
st.links = { apA: 'uuid-a', apB: 'uuid-b' };
st.keys['hives:501'] = 'uuid-a:501'; /* ilk yüklemede A'daydı: anahtar değişmez */
const rows = B._collect(st);
const byLocal = (t, id) => Object.values(rows).find((e) => e.table === t && e.row.local_id === id);
assert.strictEqual(byLocal('hives', '501').row.apiary_id, 'uuid-b', 'kovan satırı yeni arılığa bağlı');
assert.strictEqual(byLocal('hives', '501').key, 'uuid-a:501', 'kovan anahtarı aynı');
assert.strictEqual(byLocal('records', 'r-old').row.apiary_id, 'uuid-a', 'taşımadan önceki muayene eski arılıkta');
assert.strictEqual(byLocal('records', 'r-new').row.apiary_id, 'uuid-b', 'taşımadan sonraki muayene yeni arılıkta');
assert.strictEqual(byLocal('records', 't-old').row.apiary_id, 'uuid-a', 'eski tartı eski arılıkta');
assert.strictEqual(byLocal('records', 't-new').row.apiary_id, 'uuid-b');
/* göç kaydı yoksa eski davranış (kovan anahtarındaki arılık) */
delete mem['superari.goc.v1'];
const rows2 = B._collect(st);
assert.strictEqual(Object.values(rows2).find((e) => e.row.local_id === 'r-new').row.apiary_id, 'uuid-a');
/* detay sayfası */
const kv = fs.readFileSync(W + 'kovan.html', 'utf8');
assert.ok(kv.includes("'Taşındı: '") && kv.includes('movesForHive'));
console.log('kovan-tasima: ok');
