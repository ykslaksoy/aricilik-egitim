/* Net bal: kovan tipi kataloğu, dara, çerçeve tahmini, hasat */
const assert = require('assert');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};
globalThis.document = { addEventListener() {}, querySelector() { return null; }, getElementById() { return null; } };
globalThis.addEventListener = () => {};
mem['superari.workMode'] = 'demo';
mem['superari.kovanlar.v1'] = JSON.stringify([
  { id: 101, name: 'K-101', apiaryId: 'a1', hiveType: 'langstroth_10', emptyHiveKg: 18.5, emptyHiveSource: 'varsayilan' }
]);
require(W + 'bal-agirlik.js');
require(W + 'demo-data.js');
require(W + 'tarti-elle.js');
const B = globalThis.SuperAriBalAgirlik;
const D = globalThis.SuperAriDemo;

assert.strictEqual(B.DEFAULT_HIVE_TYPE, 'langstroth_10');
assert.strictEqual(B.typeSpec('langstroth_10').label, 'Langstroth');
assert.strictEqual(B.typeSpec('langstroth_10').subtitle, 'Standart · 10 çerçeve');
assert.strictEqual(B.typeSpec('langstroth_10').frameHoneyKg, 3);
assert.ok(B.isKnownHiveType('layens_12'));
assert.ok(B.isKnownHiveType('national'));
assert.ok(B.isKnownHiveType('warre'));
assert.strictEqual(B.typeSpec('dadant_11').label, 'Dadant');
B.saveCustomHiveType({ id: 'custom_wbc', label: 'WBC', emptyHiveKg: 14, frameEmptyKg: 1, frameHoneyKg: 2.8, frameCapacity: 10 });
assert.ok(B.isKnownHiveType('custom_wbc'));
assert.strictEqual(B.typeSpec('custom_wbc').emptyHiveKg, 14);
assert.strictEqual(B.typeDisplayLabel('ozel', { customTypeLabel: 'Yerel' }), 'Yerel');
B.saveCustomHiveType(null);
assert.strictEqual(B.estimateHarvestKg(101, 10), 18);
const net = B.netHoneyFromScale(40, 101, { skipMaterial: true });
assert.strictEqual(net.netKg, 21.5);
assert.strictEqual(net.emptyHiveKg, 18.5);

const row = B.enrichHarvestRow({ hiveId: 101, frames: 5, date: '2026-08-01' });
assert.strictEqual(row.honeyKg, 9);
assert.strictEqual(row.method, 'cerceve');

const mig = B.migrateHiveTypesOnList([{ id: 2, apiaryId: 'a1' }]);
assert.strictEqual(mig.list[0].hiveType, 'langstroth_10');

const added = D.harvests.add({ hiveId: 101, date: '2026-08-02', frames: 2, honeyKg: 3, apiaryId: 'a1', source: 'kayit' });
assert.ok(added && added.netKg >= 2.8);
const h = D.hiveById(101);
assert.ok((h.colonyEvents || []).some((e) => e.type === 'hasat' && /Sağım/.test(e.text)));

console.log('bal-agirlik.test.js OK');
