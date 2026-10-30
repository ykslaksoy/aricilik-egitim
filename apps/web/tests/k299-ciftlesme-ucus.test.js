/* koloni-299: çiftleşme uçuşu saat penceresi (bakire ana) */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..'), Y = path.join(__dirname, '../../yonetici');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');

function ctx() {
  const c = { console, Date, Math, JSON, Number, String, Object, Array, isFinite, Promise, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch: () => Promise.reject(new Error('offline')), window: {}, document: {} };
  c.window = c; vm.createContext(c);
  vm.runInContext(r('demo-data.js'), c);
  vm.runInContext(r('ciftlesme-ucus.js'), c);
  return c;
}

test('k299: ciftlesmeEsik ve saat penceresi — genel uçuştan sıcak/rüzgar ayrımı', () => {
  const c = ctx(), C = c.SuperAriDemo.colony, M = c.SuperAriCiftlesmeUcus;
  const E = C.ciftlesmeEsik();
  assert.ok(E.uygunC >= C.ucusEsik(null).uygunC, 'çiftleşme sıcaklık eşiği ≥ genel uçuş');
  assert.ok(E.uygunRuzgar <= C.ucusEsik(null).uygunRuzgar, 'çiftleşme rüzgar eşiği ≤ genel uçuş');
  const hs = (t, o) => Object.assign({ t: '2026-07-10T' + t + ':00', temp: 20, mm: 0, pr: 5, wind: 8, rad: 500, day: 1 }, o || {});
  const day = { date: '2026-07-10', hi: 24, mm: 0, pr: 10, wind: 8, hs: [10, 11, 12, 13, 14, 15, 16, 17].map(h => hs(h)) };
  assert.strictEqual(M.dayMate(day, E), 'ok');
  day.hs = day.hs.map(h => hs(String(h.t).slice(11, 13), { temp: 14 }));
  assert.strictEqual(M.dayMate(day, E), 'no');
  day.hs = [hs('09'), hs('10')];
  assert.strictEqual(M.dayMate(Object.assign({}, day, { hs: day.hs }), E), 'no', 'pencere dışı saatler sayılmaz');
});

test('k299: yönetici paneli, larva kartı, migration, demo senkron', () => {
  const p = fs.readFileSync(path.join(Y, 'panel10.js'), 'utf8'), k = r('koloni-ek.js'), m = fs.readFileSync(path.join(W, '../../supabase/migrations/20261025120000_k299_ciftlesme_ucus.sql'), 'utf8');
  for (const key of ['ciftlesmeUygunC', 'ciftlesmeSaatBas', 'ciftlesmeSaatSon', 'ciftlesmeSaatMin']) {
    assert.ok(p.includes("'s', '" + key + "'"), key + ' panel10');
    assert.ok(m.includes(key), key + ' migration');
  }
  assert.ok(k.includes('keCiftlesme') && k.includes('SuperAriCiftlesmeUcus'));
  assert.ok(!r('hava-sayfa.js').includes('ciftlesme'), 'hava-sayfa ayrı');
  assert.strictEqual(r('demo-data.js'), fs.readFileSync(path.join(Y, 'demo-data.js'), 'utf8'));
  assert.ok(Number(String(JSON.parse(r('version.json')).version).replace(/^koloni-/, '')) >= 299);
});
