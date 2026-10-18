/* koloni-281: Oğul döşemesine dokununca sayfa yeniden yüklenip en üste zıplıyordu — artık yerinde çizilir (history.replaceState), kaydırma korunur. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const U = fs.readFileSync(path.join(__dirname, '..', 'uyarilar.html'), 'utf8');
test('k281: #ogulPanel döşemeleri tıklamayı yakalar, yerinde çizer', () => {
  const i = U.indexOf("'#ogulPanel [data-key^=\"og-\"]'"); assert.ok(i > 0);
  const blk = U.slice(i, i + 700);
  assert.match(blk, /e\.preventDefault\(\)/);
  assert.match(blk, /k === 'md' \? 'mevsimdisi'/);
  assert.match(blk, /history\.replaceState/);
  assert.match(blk, /var y = window\.scrollY; drawUyari\(\); window\.scrollTo\(0, y\)/);
});
