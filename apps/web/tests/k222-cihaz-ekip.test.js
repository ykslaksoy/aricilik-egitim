/* koloni-222: cihaz devre dışı ekip genelinde — hesap (Sahip) kapsamı, RLS, yenileme, ekip bildirimi + push. */
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path');
const W = p.join(__dirname, '..'); const r = f => fs.readFileSync(p.join(W, f), 'utf8');
test('k222: migration — Sahip hesabı, üye okur, düzen yetkisi yazar, bildirim tetikleyici, realtime', () => {
  const m = fs.readFileSync(p.join(W, '../../supabase/migrations/20261017090000_k222_cihaz_ekip.sql'), 'utf8');
  assert.match(m, /add column if not exists apiary_id/);
  assert.match(m, /cdd_oku[\s\S]*sa_is_member\(apiary_id\)/);
  assert.match(m, /sa_yetki\(apiary_id, 'duzen'\) and user_id = \(select owner_id from public\.apiaries/);
  assert.match(m, /function public\.sa_cihaz_dd_yaz/); assert.match(m, /arılık düzenleme yetkisi gerekiyor/);
  assert.match(m, /' devre dışı bırakıldı'/); assert.match(m, /' tekrar etkinleştirildi'/); assert.match(m, /'Yönetici'/);
  assert.match(m, /'isi_nem' then 'termometresi'/); assert.doesNotMatch(m, /Hz/);
  assert.match(m, /supabase_realtime add table public\.cihaz_devre_disi/);
});
test('k222: uygulama — buluttan tüm ekip satırları, odak/realtime yenileme, Uyarılar kartı, push', () => {
  const d = r('device-runtime.js');
  assert.match(d, /rpc\('sa_cihaz_dd_yaz'/); assert.doesNotMatch(d, /from\('cihaz_devre_disi'\)\.select\([^)]*\)\.eq\('user_id'/);
  assert.match(d, /visibilitychange/); assert.match(d, /postgres_changes/); assert.match(d, /action: 'ekip_cihaz'/);
  assert.match(d, /kod: 'cihaz_dd'/); assert.match(d, /ekibeGitme: true/);
  const k = r('kritik-alarm.js'); assert.match(k, /cihaz_dd: 4/); assert.match(k, /o\.ekibeGitme \? null/);
  const a = fs.readFileSync(p.join(W, '../../api/push-subscribe.js'), 'utf8'); assert.match(a, /action === 'ekip_cihaz'/); assert.match(a, /x\.uid <> \$2/); assert.match(a, /'eb:' \+ b\.id/);
  const y = fs.readFileSync(p.join(W, '../yonetici/panel11.js'), 'utf8'); assert.match(y, /ekip_cihaz/); assert.match(y, /Ekibe bildirildi/);
  assert.equal(JSON.parse(r('version.json')).version, 'koloni-228');
});
