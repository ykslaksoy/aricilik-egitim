/* koloni-252: Oğul sayfasında Kapsam kartı alttaki kart genişliğinde — kart içindeki döşeme ızgarası (data-sa-no-align) nav.js alignActRow hizasını daraltmaz. */
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const N = fs.readFileSync(path.join(__dirname, '..', 'nav.js'), 'utf8');
const U = fs.readFileSync(path.join(__dirname, '..', 'uyarilar.html'), 'utf8');
test('k252: Oğul döşemeleri Kapsam kartını daraltmaz', () => {
  assert.ok(/closest\('\[data-sa-no-align\]'\)/.test(N));
  assert.ok(/class="grid ana-hive-grid og-ana" data-sa-no-align="1"/.test(U));
});
