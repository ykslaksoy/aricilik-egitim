/* koloni-260: Hastalık tahmini ayarları yönetici panelinde — varsayılanlar eski davranışla aynı. */
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'hastalik-tahmin.js'), 'utf8');
const yon = fs.readFileSync(path.join(__dirname, '..', '..', 'yonetici', 'hastalik-ayar.js'), 'utf8');
assert.ok(src.includes(yon), 'apps/web gömülü hastalik-ayar.js = apps/yonetici/hastalik-ayar.js');
function load(ayar) {
  const w = { SuperAriDemo: { colony: { ogulSkor: () => ({ hastalik: ayar }) } } };
  w.window = w; const ctx = { window: w, globalThis: w, document: { currentScript: null }, localStorage: { getItem: () => null } };
  vm.createContext(ctx); vm.runInContext(src, ctx); return w.SuperAriHastalik;
}
let H = load(null);
let r = H.assess({ kibrit: true }, []);
assert.strictEqual(r.list[0].key, 'ayc'); assert.strictEqual(r.list[0].word, 'En muhtemel'); assert.ok(r.aycSuspect);
r = H.assess({ koku: true }, []); assert.strictEqual(JSON.stringify(r.list.map(x => x.key + ':' + x.score)), JSON.stringify(['ayc:2', 'eyc:2']));
r = H.assess({ daginik: true }, [{ sym: 'akar', strong: true }]);
assert.strictEqual(r.list.length, 3); assert.strictEqual(r.list[0].key, 'varroa'); assert.strictEqual(r.list[0].score, 3.5);
r = H.assess({}, [{ sym: 'akar', strong: false, poor: true }]); assert.strictEqual(r.list.length, 0);
r = H.assess({ kapak: true, koku: true }, []); assert.ok(r.aycSuspect); assert.strictEqual(JSON.stringify(r.ihbar), JSON.stringify(['ayc']));
/* Yönetici değeri uygulanır */
H = load({ esikDus: 0.1, maxAday: 1, aycZorla: false, ihbar: { varroa: true }, agirlik: { nosema: { ishal: 9 } } });
r = H.assess({ ishal: true, akar: true }, []); assert.strictEqual(r.list.length, 1); assert.strictEqual(r.list[0].score, 9);
r = H.assess({ akar: true }, []); assert.strictEqual(JSON.stringify(r.ihbar), JSON.stringify(['varroa']));
r = H.assess({ kibrit: true, ishal: true }, []); assert.ok(!r.list.some(x => x.key === 'ayc'));
/* bozuk değer yok sayılır */
H = load({ esikDus: 'x', maxAday: -2 }); r = H.assess({ koku: true }, []); assert.strictEqual(r.list.length, 2);
console.log('k260 ok');
