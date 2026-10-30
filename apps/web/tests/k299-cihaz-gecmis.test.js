/* k299: cihaz geçmişi — atama/taşıma/söküm zaman çizelgesi (sensör arşivinden ayrı). */
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');
const R = path.join(W, '../..');

function boot(mode) {
  const store = {};
  if (mode) store['superari.workMode'] = mode;
  const ls = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: (i) => Object.keys(store)[i],
    get length() { return Object.keys(store).length; }
  };
  const w = {
    localStorage: ls,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    Event: function () {},
    console,
    setTimeout() {},
    confirm: () => true,
    alert() {},
    document: { addEventListener() {}, removeEventListener() {}, getElementById() { return null; }, visibilityState: 'visible', createElement() { return { style: {}, setAttribute() {}, appendChild() {}, textContent: '' }; }, head: { appendChild() {} }, body: { appendChild() {} }, hidden: false },
    HTMLElement: function () {}
  };
  w.window = w;
  w.self = w;
  vm.createContext(w);
  vm.runInContext(fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8'), w);
  vm.runInContext(fs.readFileSync(path.join(W, 'cihaz-gecmis.js'), 'utf8'), w);
  vm.runInContext(fs.readFileSync(path.join(W, 'device-runtime.js'), 'utf8'), w);
  return { w, store, CG: w.SuperAriCihazGecmis, Dv: w.SuperAriDevices, D: w.SuperAriDemo };
}

const m = fs.readFileSync(path.join(R, 'supabase/migrations/20261025120100_k299_cihaz_gecmis.sql'), 'utf8');
assert.match(m, /create table if not exists public\.cihaz_gecmis/);
assert.match(m, /sa_admin_cihaz_gecmis/);
assert.match(m, /sa_cihaz_gecmis_yaz/);

const h = fs.readFileSync(path.join(W, 'cihaz-gecmis.html'), 'utf8');
assert.ok(h.includes('Cihaz geçmişi') && h.includes('cihaz-gecmis.js'));
assert.ok(fs.readFileSync(path.join(W, 'cihazlar.html'), 'utf8').includes('cihaz-gecmis.html'));

const { CG, Dv, store } = boot('live');
assert.ok(CG && CG.timelineHtml);
const html = CG.timelineHtml({});
assert.ok(html.includes('cg-list') || html.includes('Henüz'));

Dv.addDevice({ tip: 'tarti', hiveId: 101, apiaryId: 'a1', name: 'Test tartı' });
const live = JSON.parse(store['superari.cihazGecmis.v1'] || '[]');
assert.ok(live.some((x) => x.tur === 'atama'));

const list = Dv.listDevices();
const id = list[list.length - 1].id;
Dv.removeUserDevice(id);
const live2 = JSON.parse(store['superari.cihazGecmis.v1'] || '[]');
assert.ok(live2.some((x) => x.tur === 'sokum'));

const { CG: CGd } = boot(null);
CGd.ensureDemoSeed();
const demo = CGd.timelineListe({});
assert.ok(demo.length >= 3);
assert.ok(CGd.timelineHtml({ apiaryId: 'a1' }).includes('Atama') || CGd.timelineHtml({ apiaryId: 'a1' }).includes('Taşıma'));

console.log('k299-cihaz-gecmis ok');
