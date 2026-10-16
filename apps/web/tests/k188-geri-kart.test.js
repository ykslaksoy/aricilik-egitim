const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path');
const W = p.join(__dirname, '..');
test('k188: eylemsiz Kapsam kartında Geri kart içinde (Tartı deseni)', () => {
  const n = fs.readFileSync(p.join(W, 'nav.js'), 'utf8');
  assert.match(n, /if \(!cfg\) \{ if \(!card \|\| !back\) return false; cfg = \{ backOnly: true \}; \}/);
  assert.match(n, /var btn = cfg\.backOnly \? null/);
  assert.ok(!/function scheduleActRow\(\) \{\s*if \(!actRowCfg\(\)\) return;/.test(n));
  assert.match(n, /'kovanlar\.html\?tarti': \{ t: 'Elle tartım gir'/);
  assert.strictEqual(JSON.parse(fs.readFileSync(p.join(W, 'version.json'), 'utf8')).version, 'koloni-192');
});
