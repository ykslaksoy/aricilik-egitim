#!/usr/bin/env node
/* Bakım ekranı Ana ile aynı görünsün: ana.html'deki <style> bloğunu ve alt menüyü bakim.html'deki
 * ANA-CSS / ANA-TABBAR işaretleri arasına birebir kopyalar. Ana'da stil/menü değişince çalıştırın:
 *   node scripts/sync-bakim-ana.js        (yazar)
 *   node scripts/sync-bakim-ana.js --check (fark varsa çıkış kodu 1) */
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'apps', 'web');
const ana = fs.readFileSync(path.join(web, 'ana.html'), 'utf8');
const bkPath = path.join(web, 'bakim.html');
const bk = fs.readFileSync(bkPath, 'utf8');
const css = /<style>[\s\S]*?<\/style>/.exec(ana);
const nav = /  <nav class="tabbar"[\s\S]*?<\/nav>/.exec(ana);
if (!css || !nav) { console.error('ana.html: <style> veya alt menü bulunamadı'); process.exit(2); }
const tab = nav[0].replace(' class="tab active" href="ana.html" aria-current="page"', ' class="tab" href="ana.html"')
  .replace('<a class="tab" href="bakim.html">', '<a class="tab active" href="bakim.html" aria-current="page">');
function put(src, name, body) {
  const re = new RegExp('(<!-- ' + name + ':BEGIN[^>]*-->)[\\s\\S]*?(\\n?[ \\t]*<!-- ' + name + ':END -->)');
  if (!re.test(src)) { console.error('bakim.html: ' + name + ' işaretleri yok'); process.exit(2); }
  return src.replace(re, (m, a, b) => a + '\n' + body + b);
}
const next = put(put(bk, 'ANA-CSS', css[0]), 'ANA-TABBAR', tab);
if (process.argv.includes('--check')) { if (next !== bk) { console.error('bakim.html Ana ile eşit değil: node scripts/sync-bakim-ana.js'); process.exit(1); } console.log('bakim.html Ana ile eşit'); process.exit(0); }
if (next === bk) console.log('bakim.html zaten güncel'); else { fs.writeFileSync(bkPath, next); console.log('bakim.html güncellendi (Ana CSS + alt menü)'); }
