const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path');
const W = p.join(__dirname, '..');
test('k187: alt «Kovan ekle» kartı yok, üst düğme SuperAriKovanEkle çağırır', () => {
  const k = fs.readFileSync(p.join(W, 'kovanlar.html'), 'utf8');
  assert.ok(!k.includes('id="ksAdd"'), 'alt kart kaldırıldı');
  assert.ok(!k.includes('arılıkta kovan sayısı'), 'eski etiket yok');
  assert.match(k, /window\.SuperAriKovanEkle = function/);
  assert.match(k, /D\.updateApiary\(ap\.id, \{ hiveCount: cur \+ n \}\)/);
  assert.match(k, /window\.confirm\(ap\.name/);
  const n = fs.readFileSync(p.join(W, 'nav.js'), 'utf8');
  assert.match(n, /'kovanlar\.html': \{ t: 'Kovan ekle', fn: 'SuperAriKovanEkle' \}/);
  assert.match(n, /if \(cfg\.fn && typeof window\[cfg\.fn\] === 'function'\)/);
  assert.strictEqual(JSON.parse(fs.readFileSync(p.join(W, 'version.json'), 'utf8')).version, 'koloni-187');
});
