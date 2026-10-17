/* koloni-259 önizleme: Uyarılar — «Tümü» / «Sensör kaynaklı» hapları kalktı; Sensör döşemesi (sensör kaynaklı uyarı sayısı, dokun → süz, tekrar → sıfırla) */
const test = require('node:test'); const assert = require('node:assert');
const U = require('fs').readFileSync(require('path').join(__dirname, '..', 'uyarilar.html'), 'utf8');
test('Sensör döşemesi, hap yok', () => {
  assert.ok(!/>Sensör kaynaklı<\/a>/.test(U) && !/href="' \+ filterHref\(false\) \+ '">Tümü<\/a>/.test(U), 'haplar kalktı');
  assert.ok(/function inKat\(a, k\) \{ return k === 'sensor' \? \(isSensorAlert\(a\)/.test(U), 'sensör kaynaklı sayım');
  assert.ok(/if \(c\.k === 'sensor'\)/.test(U), 'Sensör döşemesi her zaman');
  assert.ok(/if \(!kat\) kat = 'sensor'/.test(U), 'eski filter=sensor bağlantısı');
});
