/* k241: Kullanım şartları (2026-10-20) ve robots.txt AI tarayıcı engeli */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(W, f), 'utf8');

const sartlar = rd('sartlar.html');
const sartlarJs = rd('sartlar.js');
const robots = rd('robots.txt');

assert.match(sartlarJs, /VERSION = '2026-10-20'/);
assert.ok(sartlar.includes('Yürürlük tarihi:</b> 20 Ekim 2026'));
assert.ok(/yazılı izin olmadan/.test(sartlar) && /AI agent/.test(sartlar));
assert.ok(/harvest edemezsiniz/.test(sartlar));
assert.ok(/tersine mühendislik/.test(sartlar) && /benchmark/.test(sartlar));
assert.ok(/askıya alınabilir veya sonlandırılabilir/.test(sartlar));
assert.ok(/Türkiye Cumhuriyeti kanunları/.test(sartlar) && /Türkiye mahkemeleri/.test(sartlar));
assert.ok(sartlar.includes('ykslaksoy@gmail.com'));

const kayit = rd('kayit.html');
assert.ok(/Kayıt olarak.*Kullanım Şartları/.test(kayit));

const bots = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Bytespider',
  'Applebot-Extended',
  'meta-externalagent',
];
bots.forEach((b) => {
  assert.ok(robots.includes('User-agent: ' + b), b);
  const block = robots.split('User-agent: ' + b)[1].split(/\n\n/)[0];
  assert.match(block, /Disallow: \//);
});
assert.match(robots, /User-agent: \*\s*\nAllow: \//);

console.log('k241 ok');
