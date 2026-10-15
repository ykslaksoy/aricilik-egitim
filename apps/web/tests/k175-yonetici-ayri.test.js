/* k175: Yönetici paneli superari.vercel.app/yonetici/ altında, uygulamadan ayrı (kendi girişi, ayrı oturum, bağlantı yok). */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '../../..'), W = path.join(R, 'apps/web'), Y = path.join(R, 'apps/yonetici');
const rd = p => fs.readFileSync(p, 'utf8');
/* Kopyalar senkron: apps/web değişince apps/yonetici'ye kopyalanmalı */
['bulut.js', 'demo-data.js', 'panels.css', 'agac.js', 'data/fiyat-ref.json', 'vendor/supabase.js'].forEach(f =>
  assert.strictEqual(rd(path.join(Y, f)), rd(path.join(W, f)), 'apps/yonetici/' + f + ' apps/web ile aynı olmalı (cp apps/web/' + f + ' apps/yonetici/' + f + ')'));
const idx = rd(path.join(Y, 'index.html'));
assert.ok(/noindex,\s*nofollow/.test(idx), 'robots noindex');
assert.ok(idx.includes("SA_AUTH_KEY='sb-superari-yonetici-auth'"), 'ayrı oturum anahtarı');
assert.ok(idx.includes("rpc('sa_is_admin')") && idx.includes('signOut'), 'yalnız sa_is_admin; değilse çıkış');
assert.ok(rd(path.join(W, 'bulut.js')).includes('global.SA_AUTH_KEY ||'), 'bulut.js oturum anahtarı ayarlanabilir');
/* Panelden uygulama sayfalarına gezinme yok */
const src = require('./_yonetici.js');
assert.ok(!/href=["'](?!https?:|#)[^"']*\.html/.test(src), 'panelde uygulama sayfasına bağlantı olmamalı');
assert.ok(!/location\.(href|replace|assign)\s*[=(]\s*['"][^'"]*\.html/.test(src), 'panelden uygulamaya yönlendirme olmamalı');
/* Uygulamada panele bağlantı / yönlendirme yok */
assert.ok(!fs.existsSync(path.join(W, 'yonetici.html')), 'eski yonetici.html kaldırıldı (vercel.json yönlendirir)');
fs.readdirSync(W).filter(f => /\.(html|js)$/.test(f)).forEach(f => {
  const s = rd(path.join(W, f)).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/['"\/]yonetici(\.html|\/)/.test(s), f + ': panele bağlantı olmamalı');
});
const v = JSON.parse(rd(path.join(R, 'vercel.json')));
assert.ok(v.redirects.some(r => r.source === '/yonetici.html' && r.destination === '/yonetici/'));
assert.ok(v.rewrites.some(r => r.source === '/yonetici/' && r.destination === '/apps/yonetici/index.html'));
const iY = v.rewrites.findIndex(r => r.source === '/yonetici/:path+'), iAll = v.rewrites.findIndex(r => r.source === '/:path*');
assert.ok(iY >= 0 && iY < iAll, 'panel rewrite genel kuraldan önce');
assert.ok(v.headers.some(h => h.source === '/yonetici/(.*)' && h.headers.some(x => x.key === 'X-Robots-Tag')));
assert.ok(v.headers.some(h => h.source === '/version.json'), 'version.json CORS kalsın');
console.log('k175 ok');
