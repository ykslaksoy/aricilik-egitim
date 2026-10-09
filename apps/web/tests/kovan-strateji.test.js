/* Kovan genişleme stratejisi — öneri ve hedefler */
const assert = require('assert');
const STR = require('../kovan-strateji.js');

const base = { seasonKey: 'ilkbahar', bee: 8, body: 1, kat: 0, ratio: 0.5, apiaryId: 'a1' };
let early = STR.recommendExpansion(base);
assert.strictEqual(early.kind, 'frames_early');
assert.match(early.why, /tek gövde/i);

let mid = STR.recommendExpansion(Object.assign({}, base, { bee: 16, ratio: 0.78 }));
assert.strictEqual(mid.kind, 'first_super');
assert.ok(mid.options.some(function (o) { return o.id === 'kat_ekle'; }));

let strong = STR.recommendExpansion({
  seasonKey: 'akim', bee: 18, body: 1, kat: 1, ratio: 0.85, yer: 'dolmak', apiaryId: 'a1', goal: 'bal'
});
assert.strictEqual(strong.kind, 'strategy');
assert.strictEqual(strong.recommendedId, 'kat_ekle');

let splitGoal = STR.recommendExpansion({
  seasonKey: 'yaz', bee: 20, body: 1, kat: 1, ratio: 0.82, ogul: 2, apiaryId: 'a1', goal: 'koloni-artir'
});
assert.strictEqual(splitGoal.kind, 'strategy');
assert.strictEqual(splitGoal.recommendedId, 'bolme');

assert.ok(STR.followUpTasks('hibrit').length >= 2);
assert.ok(STR.GOALS.bal);

var shuffle = STR.recommendExpansion({
  seasonKey: 'akim', bee: 18, body: 1, kat: 2, ratio: 0.82, yer: 'dolu', apiaryId: 'a1', goal: 'bal'
});
assert.strictEqual(shuffle.kind, 'super_shuffle');
assert.ok(shuffle.options.some(function (o) { return o.id === 'kat_rotasyon'; }));

console.log('kovan-strateji: ok');
