/* koloni-284: Oğul bağlamında «Mevsim dışı» yerine «Oğul dönemi değil» (döşeme, liste rozeti, başlık, not, kovan rozeti); diğer mevsim etiketleri değişmez. */
const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');
const U = fs.readFileSync(path.join(W, 'uyarilar.html'), 'utf8');
const K = fs.readFileSync(path.join(W, 'kovan.html'), 'utf8');
const D = fs.readFileSync(path.join(W, 'demo-data.js'), 'utf8');
test('k284: oğul etiketleri «Oğul dönemi değil»', () => {
  assert.ok(/apQ, 'Oğul dönemi değil', nMd \+ ' kovan'/.test(U), 'döşeme');
  assert.ok(/>Oğul dönemi değil<\/span>/.test(U), 'liste rozeti');
  assert.ok(/mdV \? 'Oğul dönemi değil'/.test(U), 'liste başlığı');
  assert.ok(!/'Mevsim dışı'|>Mevsim dışı</.test(U + K), 'oğul ekranlarında «Mevsim dışı» kalmadı');
  assert.ok(/phase === 'disi' \? 'Oğul dönemi değil'/.test(K), 'kovan rozeti');
  assert.ok(/'Oğul dönemi değil \(' \+ season\.profileLabel/.test(D), 'oğul nedeni');
  assert.strictEqual(D, fs.readFileSync(path.join(W, '..', 'yonetici', 'demo-data.js'), 'utf8'), 'yönetici demo-data.js eşit');
});
