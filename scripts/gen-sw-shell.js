#!/usr/bin/env node
/* apps/web/sw.js içindeki SHELL listesini (çevrimdışı açılış için önbelleğe alınacak tüm dosyalar) yeniden üretir.
 * Kullanım: node scripts/gen-sw-shell.js   (her yeni sayfa / dosya eklenince, sürüm yükseltmeden önce) */
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'apps', 'web');
const SKIP_DIRS = new Set(['tests', 'node_modules', '.vercel', 'harita']); /* vendor/harita: yalnız bölge indirilince (superari-maps) */
const SKIP_FILES = new Set(['sw.js', 'ana-LOCKED-FINAL.html', 'master-78.html']);
const OK = /\.(html|js|css|json|png|jpe?g|webp|svg|ico|gif|wav|mp3|ogg|woff2?)$/i;
const out = ['/'];
(function walk(dir, rel) {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n), r = rel + '/' + n, st = fs.statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(n) && !n.startsWith('.')) walk(p, r); continue; }
    if (SKIP_FILES.has(n) || !OK.test(n) || n.startsWith('.')) continue;
    out.push(r);
  }
})(web, '');
const swPath = path.join(web, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const block = 'const SHELL = [\n' + out.map((u) => '  ' + JSON.stringify(u)).join(',\n') + '\n];';
const next = sw.replace(/const SHELL = \[[\s\S]*?\n\];/, block);
if (next === sw) { console.log('SHELL değişmedi (' + out.length + ' dosya)'); process.exit(0); }
fs.writeFileSync(swPath, next);
console.log('SHELL güncellendi: ' + out.length + ' dosya');
