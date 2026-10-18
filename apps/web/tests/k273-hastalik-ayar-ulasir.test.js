/* koloni-273: ogulSkorMerge yönetici › Hastalık tahmini ayarlarını (data.hastalik) düşürüyordu → uygulama hep varsayılanı kullanıyordu */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..'), Y = path.join(__dirname, '../../yonetici');
function ctx(dir) {
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const c = { console, Date, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], referrer: '', createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, body: { appendChild() {} } }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(dir, 'demo-data.js'), 'utf8'), c);
  return c;
}
test('k273: ogulSkorMerge hastalik nesnesini korur (web + yönetici)', () => {
  [W, Y].forEach(dir => {
    const C = ctx(dir).SuperAriDemo.colony;
    const m = C.ogulSkorMerge({ hastalik: { varroaEsikTepe: 3 }, sensor: { kirecSaat: 12 } });
    assert.ok(m.hastalik, dir + ': hastalik düşmemeli');
    assert.strictEqual(m.hastalik.varroaEsikTepe, 3);
    assert.strictEqual(m.sensor.kirecSaat, 12);
    assert.strictEqual(C.ogulSkorMerge({ hastalik: [1, 2] }).hastalik, undefined, 'dizi kabul edilmez');
  });
});
test('k273: yönetici ayarı ogulSkorSet → SuperAriHastalikAyar.get() uygulamaya ulaşır', () => {
  const c = ctx(W);
  vm.runInContext(fs.readFileSync(path.join(W, 'hastalik-tahmin.js'), 'utf8'), c);
  const H = c.SuperAriHastalikAyar;
  assert.strictEqual(H.get().varroaEsikTepe, 2, 'varsayılan HBHC 2026');
  c.SuperAriDemo.colony.ogulSkorSet({ hastalik: { varroaEsikTepe: 3.5 } });
  assert.strictEqual(H.get().varroaEsikTepe, 3.5);
});
test('k273: iki demo-data.js aynı', () => {
  assert.strictEqual(fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8'), fs.readFileSync(path.join(Y, 'demo-data.js'), 'utf8'));
});
