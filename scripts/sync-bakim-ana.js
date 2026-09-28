#!/usr/bin/env node
/* Bakım ve Muayene ekranları Ana ile aynı görünsün: ana.html'deki <style> bloğunu ve alt menüyü
 * bakim.html ve bakim-akis.html'deki ANA-CSS / ANA-TABBAR işaretleri arasına birebir kopyalar.
 * Muayene (bakim-akis.html) ayrıca Bakım'ın Kapsam kartı stilini (bakim.html'deki ikinci <style>) BK-SCOPE-CSS arasına alır.
 *   node scripts/sync-bakim-ana.js        (yazar)
 *   node scripts/sync-bakim-ana.js --check (fark varsa çıkış kodu 1) */
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'apps', 'web');
const ana = fs.readFileSync(path.join(web, 'ana.html'), 'utf8');
const css = /<style>[\s\S]*?<\/style>/.exec(ana);
const nav = /  <nav class="tabbar"[\s\S]*?<\/nav>/.exec(ana);
if (!css || !nav) { console.error('ana.html: <style> veya alt menü bulunamadı'); process.exit(2); }
const tab = nav[0].replace(' class="tab active" href="ana.html" aria-current="page"', ' class="tab" href="ana.html"')
  .replace('<a class="tab" href="bakim.html">', '<a class="tab active" href="bakim.html" aria-current="page">');
function put(src, file, name, body) {
  const re = new RegExp('(<!-- ' + name + ':BEGIN[^>]*-->)[\\s\\S]*?(\\n?[ \\t]*<!-- ' + name + ':END -->)');
  if (!re.test(src)) { console.error(file + ': ' + name + ' işaretleri yok'); process.exit(2); }
  return src.replace(re, (m, a, b) => a + '\n' + body + b);
}
const bk = fs.readFileSync(path.join(web, 'bakim.html'), 'utf8');
const bkScope = /<!-- ANA-CSS:END -->\s*(<style>[\s\S]*?<\/style>)/.exec(bk);
if (!bkScope) { console.error('bakim.html: Kapsam kartı <style> bulunamadı'); process.exit(2); }
const targets = [
  { file: 'bakim.html', parts: [['ANA-CSS', css[0]], ['ANA-TABBAR', tab]] },
  { file: 'bakim-akis.html', parts: [['ANA-CSS', css[0]], ['BK-SCOPE-CSS', bkScope[1]], ['ANA-TABBAR', tab]] }
];
const check = process.argv.includes('--check');
let bad = 0;
targets.forEach((t) => {
  const p = path.join(web, t.file), src = fs.readFileSync(p, 'utf8');
  let next = src;
  t.parts.forEach(([n, body]) => { next = put(next, t.file, n, body); });
  if (check) { if (next !== src) { console.error(t.file + ' Ana ile eşit değil: node scripts/sync-bakim-ana.js'); bad++; } else console.log(t.file + ' Ana ile eşit'); return; }
  if (next === src) console.log(t.file + ' zaten güncel'); else { fs.writeFileSync(p, next); console.log(t.file + ' güncellendi'); }
});
if (bad) process.exit(1);
