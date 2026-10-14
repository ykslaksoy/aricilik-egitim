const assert=require('assert'),fs=require('fs'),path=require('path');const W=path.join(__dirname,'..');const r=f=>fs.readFileSync(path.join(W,f),'utf8');
const n=r('nav.js');assert.ok(n.includes('global.SuperAriScroll = {')&&n.includes("superari.scroll.keep.v1")&&n.includes('.arilik-nav, [data-ks-prev], [data-ks-next]'));
assert.ok(r('kapsam.js').includes('global.SuperAriScroll.keep(render)'));
assert.ok(r('ks-sayfa.js').includes('global.SuperAriScroll.reload()')&&r('kovanlar.html').includes('SuperAriScroll.reload()'));
console.log('k157 ok');
