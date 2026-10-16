const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path'); const vm = require('vm');
const W = p.join(__dirname, '..');
test('k189: Cihaz ekle gerçek form açar (eskiden yalnız bilgi notu)', () => {
  const h = fs.readFileSync(p.join(W, 'cihazlar.html'), 'utf8');
  assert.ok(!/N\.info\('Cihaz ekle'/.test(h));
  assert.match(h, /run: function \(\) \{ window\.SuperAriCihazEkle\(\); \}/);
  assert.match(h, /Dv\.addDevice\(\{ tip:/);
  for (const t of ['gateway', 'kamera_merkez', 'role_hub', 'tarti', 'isi_nem', 'kamera_kovan']) assert.ok(h.includes("['" + t + "'"), t);
});
test('k189: addDevice kalıcı yazar ve listede görünür (Canlı + Demo)', () => {
  const store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const win = { localStorage: ls, dispatchEvent() {}, addEventListener() {}, SuperAriDemo: { hiveById: id => ({ id, name: 'Kovan ' + id, apiaryId: 'a1' }), apiaryById: id => ({ id, name: 'Arılık' }) } };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { CustomEvent: function () {}, document: { readyState: 'complete', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; } }, console }));
  try { vm.runInContext(fs.readFileSync(p.join(W, 'device-runtime.js'), 'utf8'), ctx); } catch (e) { /* DOM bağımlı kısımlar */ }
  const Dv = ctx.SuperAriDevices; assert.ok(Dv && Dv.addDevice);
  store['superari.workMode'] = 'live';
  Dv.addDevice({ tip: 'gateway', apiaryId: 'a1' });
  Dv.addDevice({ tip: 'tarti', hiveId: 5 });
  assert.strictEqual(JSON.parse(store['superari.devices']).length, 2);
  const l = Dv.listDevices().map(d => d.tip).sort();
  assert.strictEqual(JSON.stringify(l), '["gateway","tarti"]');
  assert.ok(Dv.listDevices().every(d => d.status === 'yok'), 'okuma yokken «Veri yok»');
  assert.throws(() => Dv.addDevice({ tip: 'gateway' }), /Arılık/);
  store['superari.workMode'] = 'demo';
  const n = Dv.listDevices().length; Dv.addDevice({ tip: 'kamera_merkez', apiaryId: 'a1' });
  assert.strictEqual(Dv.listDevices().length, n + 1);
  assert.strictEqual(JSON.parse(store['superari.devices']).length, 2, 'Demo kaydı Canlı listesine karışmaz');
});
