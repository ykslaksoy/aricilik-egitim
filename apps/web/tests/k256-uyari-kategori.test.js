/* koloni-256 önizleme: Uyarılar kategori döşemeleri (Ana döşemesi), aynı tür uyarılar gruplu, düğmeler sığar */
const test = require('node:test'); const assert = require('node:assert');
const U = require('fs').readFileSync(require('path').join(__dirname, '..', 'uyarilar.html'), 'utf8');
test('Uyarılar kategori döşemeleri', () => {
  assert.ok(U.includes('id="katPanel"'));
  assert.ok(/function katOf\(a\)/.test(U) && /'besleme'/.test(U) && /'ana'/.test(U));
  assert.ok(/aria-label="Uyarı kategorisi"/.test(U));
  assert.ok(/#katPanel \.grid\.ana-hive-grid\.og-ana \.tile \{ min-height:122px; \}/.test(U), 'sabit yükseklik');
  assert.ok(/function renderGrouped\(/.test(U), 'aynı tür uyarılar gruplu');
  assert.ok(/\.ua-acts \{[^}]*flex-wrap:wrap/.test(U), 'düğme sığar');
  assert.ok(/window\.scrollTo\(0, y\)/.test(U), 'kayma yok');
});
