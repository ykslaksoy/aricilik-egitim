/* koloni-270: sıcak bölge çam balı illerinde uçuş mevsimi sonu ayrı ayar «Çam balı bölgesi mevsim sonu» (varsayılan 30 Kas); diğer sıcak bölgeler 1 Kas */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..'), Y = path.join(__dirname, '../../yonetici');
const r = f => fs.readFileSync(path.join(W, f), 'utf8');
function ctx() {
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const c = { console, Date, Math, JSON, Number, String, Object, Array, RegExp, isFinite, Promise, URLSearchParams, setInterval() {}, setTimeout() {}, localStorage: ls,
    location: { search: '', hash: '', href: '' }, history: { replaceState() {} }, navigator: { userAgent: '' }, fetch: () => new Promise(() => {}),
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], referrer: '' }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  c.window = c; c.self = c; vm.createContext(c); vm.runInContext(r('demo-data.js'), c);
  return c;
}
test('k270: Kayaköy (Muğla, sıcak) mevsimi 30 Kasım’a kadar açık, 1 Aralık kapalı; çam balı işareti', () => {
  const C = ctx().SuperAriDemo.colony;
  assert.strictEqual(C.ucusSezon('a1', '2026-11-15').acik, true);
  assert.strictEqual(C.ucusSezon('a1', '2026-11-30').acik, true);
  assert.strictEqual(C.ucusSezon('a1', '2026-12-01').acik, false);
  assert.strictEqual(C.ucusSezon('a1', '2026-11-15').cam, true);
  assert.strictEqual(C.ucusSezon('a1', '2026-11-15').to, '11-30');
});
test('k270: çam balı ili olmayan sıcak bölge (Mersin) 1 Kasım’da kalır; yönetici ayarı ve elle dönem geçerli', () => {
  const c = ctx(), D = c.SuperAriDemo, C = D.colony, aps = D.loadApiaries();
  aps.push({ id: 'zm', name: 'Erdemli', place: 'Erdemli', il: 'Mersin', altitude: 50, hiveCount: 1 }); D.saveApiaries(aps);
  assert.strictEqual(C.ucusSezon('zm', '2026-11-15').profile, 'sicak');
  assert.strictEqual(C.ucusSezon('zm', '2026-11-15').acik, false);
  assert.strictEqual(C.ucusSezon('zm', '2026-11-15').to, '11-01');
  assert.strictEqual(C.camBaliBolge('zm'), false);
  const m = C.ogulSkorMerge({ sensor: { ucusSezonCamSon: 1215 } }); assert.strictEqual(m.sensor.ucusSezonCamSon, 1215);
  assert.strictEqual(C.ogulSkorMerge({ sensor: { ucusSezonCamSon: 1332 } }).sensor.ucusSezonCamSon, 1130, 'geçersiz AAGG varsayılana döner');
});
test('k270: yönetici panelinde ayrı ayar ve kaynaklar; kullanıcı sayfasında kaynak/ayar adı yok', () => {
  const p = fs.readFileSync(path.join(Y, 'panel10.js'), 'utf8');
  assert.match(p, /Çam balı bölgesi mevsim sonu[^\n]*kaynaklı[^\n]*MAYBİR[^\n]*Küre[^\n]*Günbey[^\n]*'ucusSezonCamSon'/);
  assert.strictEqual(fs.readFileSync(path.join(Y, 'demo-data.js'), 'utf8'), r('demo-data.js'));
  assert.doesNotMatch(r('hava-sayfa.js'), /Küre|ucusSezonCamSon/);
  assert.match(r('demo-data.js'), /ucusSezonCamSon: 1130/);
});
