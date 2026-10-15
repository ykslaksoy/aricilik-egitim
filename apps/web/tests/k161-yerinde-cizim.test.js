const assert=require('assert'),fs=require('fs'),path=require('path');const W=path.join(__dirname,'..');const r=f=>fs.readFileSync(path.join(W,f),'utf8');
assert.ok(r('ks-sayfa.js').includes('o.redraw(scope, hs, sum)'));
[['bugun.html','__saBugunScope'],['uyarilar.html','__saUyariScope'],['saglik.html','__saSaglikScope'],['goc.html','__saGocScope']].forEach(([f,k])=>{const s=r(f);assert.ok(s.includes('redraw: function (sc')||s.includes('redraw: function (s)'),f);assert.ok(s.includes('window.'+k+' = function'),f);});
const kv=r('kovanlar.html');assert.ok(kv.includes('window.__saKoloniScope = function')&&kv.includes('window.__saDrawTarti = drawTarti'));
['bakim.html','bakim-akis.html'].forEach(f=>assert.ok(!/l: 'Geciken muayene', href: kolHref\('guc'\)/.test(r(f)),f));
assert.ok(!/'bakim\.html': 1/.test(r('nav.js').match(/BACK_SKIP = \{[^}]*\}/)[0]));
['giris.html','kayit.html'].forEach(f=>assert.ok(r(f).includes('id="saBack"')));
console.log('k161 ok');
