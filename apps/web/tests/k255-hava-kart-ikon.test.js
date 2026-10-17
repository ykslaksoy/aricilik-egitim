/* koloni-255: Hava gün kartı — canlı renkli SVG simgeler + füme yazı, hamle/güneş/UV, sabit yükseklik */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('k255: gün kartı simge + renk + yeni değerler + sabit yükseklik', () => {
  const h = r('hava-sayfa.js'), c = r('hava.html');
  for (const k of ['mm', 'pr', 'wd', 'gu', 'rh', 'sun', 'uv']) { assert.ok(h.includes("SV('" + k + "')"), k); assert.ok(new RegExp('\\.hv-i\\.i-' + k + '\\{color:#[0-9a-f]{6};\\}').test(c), 'renk ' + k); }
  assert.ok(/\.hv-v\{color:#2b2f33;\}/.test(c), 'füme yazı');
  assert.ok(!/hvrenk|hv-fume/.test(h + c), 'varyant anahtarı kaldırıldı');
  assert.ok(h.includes('uv_index_max,sunshine_duration') && h.includes("hamle ' + r0(x.gust)"));
  assert.ok(/\.hv-card\{height:88px;/.test(c) && /\.hv-skel\{height:88px;\}/.test(c), 'sabit yükseklik (iskelet aynı)');
  assert.ok(!/[💧☔💨🌬💦☀🔆]/u.test(h.slice(h.indexOf('function dayCard'), h.indexOf('function hrLab'))), 'gün kartında emoji simge yok');
  assert.ok(Number(String(JSON.parse(r('version.json')).version).replace(/^koloni-/, '')) >= 255);
});
