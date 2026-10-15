const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path');
const R = p.join(__dirname, '../../..');
test('otomatik_takip: admin-only RLS, gerçek tohumlar, panel bölümü', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261016010000_otomatik_takip.sql'), 'utf8');
  assert.match(m, /enable row level security/); assert.match(m, /sa_is_admin\(\)/); assert.match(m, /'bal-ormanlari'/);
  const j = fs.readFileSync(p.join(R, 'apps/yonetici/panel7.js'), 'utf8');
  assert.match(j, /Otomatik Takip/); assert.match(j, /Veri yok/);
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel7\.js/);
  for (const f of fs.readdirSync(p.join(R, 'apps/web')).filter(f => f.endsWith('.html'))) assert.doesNotMatch(fs.readFileSync(p.join(R, 'apps/web', f), 'utf8'), /Otomatik Takip/);
});
