const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path'); const vm = require('vm');
const W = p.join(__dirname, '..');
function load(rol) {
  const store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const win = { localStorage: ls, dispatchEvent() {}, addEventListener() {}, SuperAriDemo: { hiveById: id => ({ id, name: 'Kovan ' + id, apiaryId: 'a1' }), apiaryById: id => ({ id, name: 'Arılık' }) } };
  if (rol) win.SuperAriYetki = { rol: () => rol, izin: () => rol !== 'bakici' };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, { CustomEvent: function () {}, document: { readyState: 'complete', addEventListener() {}, createElement() { return {}; }, head: { appendChild() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; } }, console }));
  try { vm.runInContext(fs.readFileSync(p.join(W, 'device-runtime.js'), 'utf8'), ctx); } catch (e) { /* DOM */ }
  store['superari.workMode'] = 'live';
  return { Dv: ctx.SuperAriDevices, store };
}
test('k220: kovan bazında cihaz devre dışı → durum, pil, okuma filtresi; geri açınca eski hâl', () => {
  const { Dv } = load('owner');
  const a = Dv.addDevice({ tip: 'isi_nem', hiveId: 12 }); Dv.addDevice({ tip: 'isi_nem', hiveId: 13 });
  Dv.setDisabled(a.id, true, { hiveId: 12, tip: 'isi_nem' });
  const d12 = Dv.listDevices().find(d => d.id === a.id);
  assert.strictEqual(d12.status, 'devre_disi'); assert.strictEqual(Dv.statusLabel(d12.status), 'Devre dışı');
  assert.strictEqual(Dv.isBatteryLow(Object.assign({}, d12, { batteryPct: 1 })), false);
  assert.ok(Dv.okumaKapali(12, 'isi_nem')); assert.ok(!Dv.okumaKapali(13, 'isi_nem'), 'yalnız Kovan 12');
  assert.match(Dv.toggleHtml(d12), /Tekrar etkinleştir/);
  Dv.setDisabled(a.id, false);
  assert.strictEqual(Dv.listDevices().find(d => d.id === a.id).status, 'yok'); assert.ok(!Dv.okumaKapali(12, 'isi_nem'));
});
test('k220: bakıcı (düzen yok) değiştiremez, Sahip her zaman', () => {
  const { Dv } = load('bakici'); const a = Dv.addDevice({ tip: 'tarti', hiveId: 5 });
  assert.throws(() => Dv.setDisabled(a.id, true), /yetki/); assert.match(Dv.toggleHtml(a), /disabled/);
  assert.ok(load('owner').Dv.canToggle());
});
test('k220: sayfalarda anahtar + onay + uyarı/okuma hesabından çıkarma', () => {
  const r = f => fs.readFileSync(p.join(W, f), 'utf8');
  assert.match(r('cihazlar.html'), /Dev\.toggleHtml\(d\)/); assert.match(r('kovan.html'), /Dev\.toggleHtml\(d\)/);
  assert.match(r('device-runtime.js'), /confirm\('Bu cihaz devre dışı bırakılsın mı/);
  const dd = r('demo-data.js'); assert.match(dd, /okumaKapali\(x\.kovan_id/); assert.match(dd, /okumaKapali\(x\.hiveId/); assert.match(dd, /!d\.disabled; \}\), Tc,/);
});
test('k220: bulut tablosu + yönetici bölümü', () => {
  const m = fs.readFileSync(p.join(W, '../../supabase/migrations/20261017070000_k220_cihaz_devre_disi.sql'), 'utf8');
  assert.match(m, /create table if not exists public\.cihaz_devre_disi/); assert.match(m, /sa_is_admin\(\)/);
  const y = fs.readFileSync(p.join(W, '../yonetici/panel11.js'), 'utf8');
  assert.match(y, /sa_admin_cihaz_devre_disi/); assert.match(y, /Etkinleştir/);
  assert.match(fs.readFileSync(p.join(W, '../yonetici/index.html'), 'utf8'), /panel11\.js/);
  assert.match(fs.readFileSync(p.join(W, 'device-runtime.js'), 'utf8'), /rpc\('sa_cihaz_dd_yaz'/);
});
