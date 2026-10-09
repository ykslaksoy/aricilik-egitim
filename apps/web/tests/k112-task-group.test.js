/* Görev kategori gruplama (task-group.js) */
const assert = require('assert');
const TG = require('../task-group.js');

assert.strictEqual(TG.taskCategoryKey({ title: 'Besleme 1/3: şurup 1,5 L — K12', note: '[plan:sonbahar]' }), 'besleme');
assert.strictEqual(TG.taskCategoryKey({ title: 'Varroa sayımı — K4', note: '[varroa]' }), 'varroa');
assert.strictEqual(TG.taskCategoryKey({ title: 'Oğul memesi — K7', note: '[ogul:meme] detay' }), 'ogul');
assert.strictEqual(TG.taskCategoryKey({ title: 'Kışlık stok kontrolü — K2' }), 'kislik');
assert.strictEqual(TG.taskCategoryKey({ title: 'Kontrol: AYÇ — K9', note: '[muayene-oto:ayc]' }), 'hastalik');
assert.strictEqual(TG.taskCategoryKey({ kind: 'ana', title: 'Ana arı yenileme — K1' }), 'ana');
assert.strictEqual(TG.taskCategoryKey({ title: 'Petek fotoğrafı çek — K3' }), 'diger');
assert.strictEqual(TG.taskCategoryKey({ id: 'kr-varroa-sayim-42', title: 'Sayım', hiveId: 42 }), 'varroa');

var today = '2026-10-09';
var groups = TG.groupTasksByCategory([
  { id: 'a', title: 'Besleme — K1', due: '2026-10-01', priority: 2 },
  { id: 'b', title: 'Besleme — K2', due: '2026-10-05', priority: 2 },
  { id: 'c', title: 'Varroa sayımı — K1', due: '2026-10-08', priority: 1 }
], today);
assert.strictEqual(groups.length, 2);
var bes = groups.filter(function (g) { return g.key === 'besleme'; })[0];
assert.ok(bes);
assert.strictEqual(bes.count, 2);
assert.strictEqual(bes.worstLateDays, 8);
assert.strictEqual(groups[0].late && groups[0].pr <= (groups[1].pr || 9), true);
assert.ok(TG.feedingHint('Besleme: şurup 1,5 L'));
console.log('k112-task-group ok');
