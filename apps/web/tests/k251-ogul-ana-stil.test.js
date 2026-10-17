/* önizleme: Oğul düzey filtreleri Ana sayfa döşemeleri (ana-hive-tiles.css + anaModuleTile), 3×2, sabit yükseklik */
const test = require('node:test'); const assert = require('node:assert');
const U = require('fs').readFileSync(require('path').join(__dirname, '..', 'uyarilar.html'), 'utf8');
test('Oğul filtreleri Ana döşemesi', () => {
  assert.ok(/ana-hive-tiles\.css\?v=/.test(U));
  assert.ok(/class="grid ana-hive-grid og-ana"/.test(U));
  assert.ok(/KS\.anaModuleTile\(/.test(U));
  assert.ok(/classList\.add\('sa-tile-select'\)/.test(U), 'seçili döşeme yeşil kenar');
  assert.ok(/#ogulPanel \.grid\.ana-hive-grid\.og-ana \.tile \{ min-height:122px; \}/.test(U), 'sabit yükseklik');
  assert.ok(!/og-lv/.test(U), 'eski hap düğmeler kalmadı');
});
