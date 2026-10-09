/* k113 — giriş: demo API + Türkçe hata + giris.html şifre göster */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { login } = require('../../api/src/services/membershipAuth');

const giris = fs.readFileSync(path.join(__dirname, '..', 'giris.html'), 'utf8');
assert.match(giris, /data-toggle-password="password"/);
assert.match(giris, /demo@superari\.com/);
assert.match(giris, /Şifreyi göster/);

const bad = login({ email: 'demo@superari.com', password: 'yanlis' });
assert.equal(bad.ok, false);
assert.equal(bad.error, 'invalid_credentials');

const ok = login({ email: 'demo@superari.com', password: 'demo1234' });
assert.equal(ok.ok, true);
assert.equal(ok.panel, '/ana.html');

console.log('k113-giris-login ok');
