/* Kat rotasyonu tartım sihirbazı — durum makinesi */
const assert = require('assert');
const R = require('../tarti-rotasyon.js');

let s = R.initialState({ hiveId: 1, katBefore: 2 });
assert.strictEqual(s.step, 'config');

s = R.transition(s, { type: 'setConfig', body: 1, katBefore: 2, removedBox: '2', separateSuper: false });
assert.strictEqual(s.step, 'weighA');

s = R.transition(s, { type: 'weighA', reading: { kg: 50 } });
assert.strictEqual(s.step, 'rotate');

s = R.transition(s, { type: 'confirmRotate' });
assert.strictEqual(s.step, 'weighB');

s = R.transition(s, { type: 'weighB', reading: { kg: 50.5 } });
assert.strictEqual(s.step, 'summary');

var rec = R.reconcile(s);
assert.strictEqual(rec.deltaKg, 0.5);
assert.ok(rec.ok);

s.separateSuper = true;
s.weighA = { kg: 50 };
s.weighB = { kg: 57.8 };
rec = R.reconcile(s);
assert.ok(Math.abs(rec.deltaKg - 7.8) < 0.1);
assert.ok(rec.expectedKg === R.katKg());

console.log('tarti-rotasyon: ok');
