/* k175: Ekipman, Koloni ek, Bakım planı — arılık değişince yerinde çizim (redraw), sayfa yenilenmez. */
const assert=require('assert'),fs=require('fs'),path=require('path');
['ekipman.html','koloni-ek.html','bakim-plan.html'].forEach(f=>{const s=fs.readFileSync(path.join(__dirname,'..',f),'utf8');assert.ok(/P\.init\(\{[\s\S]*?redraw: function \(sc\)/.test(s),f+' redraw');assert.ok(!/location\.reload\(\)/.test(s.split('SuperAriQuickActions')[0]),f+' reload yok');});
console.log('k175 yerinde ok');
