const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const p = require('path');
const R = p.join(__dirname, '../../..');

test('k294: kullanıcı RPC + olay tablosu select revoke', () => {
  const m = fs.readFileSync(p.join(R, 'supabase/migrations/20261019008000_k294_ozellik_kullanim_kullanici.sql'), 'utf8');
  assert.match(m, /revoke select on public\.ozellik_kullanim_olay/);
  assert.match(m, /sa_ozellik_kullanim_kullanicilar/);
  assert.match(m, /sa_ozellik_kullanim_kullanici_detay/);
  assert.match(m, /sa_is_admin\(\)/);
  assert.match(m, /last_sign_in_at/);
  const j = fs.readFileSync(p.join(R, 'apps/yonetici/panel18.js'), 'utf8');
  assert.match(j, /Kullanıcı bazında/);
  assert.match(j, /sa_ozellik_kullanim_kullanici_detay/);
  assert.match(fs.readFileSync(p.join(R, 'apps/yonetici/index.html'), 'utf8'), /panel18\.js\?v=koloni-295/);
});
