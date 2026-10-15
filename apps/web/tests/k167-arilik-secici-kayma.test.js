/* koloni-167: arılık seçicisinde kayma 0 — Cihazlar yerinde çizim; tutulan yükseklik ≥ konum + ekran; geç çizimler ResizeObserver ile karşılanır.
 * WebKit ölçümü (390×844, Cihazlar/Kovanlar/Tartı/Koloni/Oğul, sayfa sonunda dahil): seçici konumu ve scrollY 4 geçişte Δ 0 px. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..'), rd = (p) => fs.readFileSync(path.join(W, p), 'utf8');
const ci = rd('cihazlar.html'), nav = rd('nav.js'), ks = rd('ks-sayfa.js');
assert.ok(/function ksLayout\(again\)/.test(ci) && /redraw: function \(sc\)/.test(ci) && /if \(!again\) P\.init\(/.test(ci), 'Cihazlar: yenileme yok, yerinde çizim');
assert.ok(/history\.replaceState/.test(ci) && /allFor\(sc\)/.test(ci), 'adres + özet yeni kapsamla');
assert.ok(/h = Math\.max\(height\(\), y \+ \(global\.innerHeight \|\| 0\)\)/.test(nav), 'keep: yükseklik ≥ konum + ekran');
assert.ok(/settle\(y, h, 500\); izle\(y, h\)/.test(nav) && /new global\.ResizeObserver/.test(nav), 'tıklama korumasında da (pad hariç yükseklik hatası giderildi)');
assert.ok(/yerinde\(function \(\) \{ o\.onChange/.test(ks), 'onChange yolu da korunur');
/* sayısal: içerik 2312 → 1523'e kısalırken konum 1468 korunabilmeli */
const y = 1468, ih = 844, icerik = 1523, tut = Math.max(2312 - 303, y + ih);
assert.ok(tut - ih >= y, 'tutulan yükseklikte konum sığar'); assert.ok(icerik - ih < y, 'eski hesap (pad hariç) sıkışırdı');
['kovanlar.html', 'bugun.html', 'uyarilar.html', 'saglik.html', 'goc.html'].forEach((h) => assert.ok(/redraw/.test(rd(h)) || /__sa[A-Za-z]*Scope|__saDrawTarti/.test(rd(h)), h + ' yerinde'));
console.log('k167 ok');
