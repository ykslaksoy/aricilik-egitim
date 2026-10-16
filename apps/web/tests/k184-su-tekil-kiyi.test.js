/* k184: deniz kıyısı + göl ilişkileri su sorgusunda; ilişki üyeleri kenar olarak ölçülür; tek kanonik kimlik (local_id eşleme);
 * Yanıkdağ sabit 240 m kaldırıldı, onaysız yerel değer sunucu değeriyle ezilir; foraj «uzman tahmini» yalnız panelde; Yapılacaklar maddesi. */
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'../../..'),W=R+'/apps/web';
const f=fs.readFileSync(R+'/supabase/functions/cevre-isle/index.ts','utf8');
assert.match(f,/way\$\{a\}\[natural=coastline\]/);assert.match(f,/relation\$\{a\}\[natural=water\]\[type=multipolygon\]/);
assert.match(f,/overpass\.private\.coffee[^\]]*overpass\.kumi\.systems/,'ana private.coffee, yedek kumi');
/* noktalar + enYakin: ilişki üyesi kenarına mesafe */
let src=f.slice(f.indexOf('function mesafe'),f.indexOf('// Sunucular yoğunken'));
src=src.replace(/export type[^\n]*\n/,'').replace(/export /g,'').replace(/let best: \{[^}]*\} \| null/,'let best').replace(/: (number|string|any|Nokta)(\[\])*( \| null)?/g,'').replace(/\(e as Error\)/g,'e');
const ctx={Math};vm.createContext(ctx);vm.runInContext(src+';this.noktalar=noktalar;this.enYakin=enYakin;',ctx);
const lat=41.0,lon=40.0,d=0.004; /* göl kıyısı ~ 0.004° kuzeyde (~445 m), merkezi çok uzakta */
const j={elements:[{type:'relation',tags:{natural:'water',name:'Göl'},members:[{type:'way',geometry:[{lat:lat+d,lon:lon-0.05},{lat:lat+d,lon:lon+0.05}]},{type:'way',geometry:[]}]},
  {type:'way',tags:{natural:'coastline'},geometry:[{lat:lat-0.01,lon:lon-0.05},{lat:lat-0.01,lon:lon+0.05}]}]};
const L=ctx.noktalar(j);assert.strictEqual(L.length,2);const b=ctx.enYakin(lat,lon,L);
assert.strictEqual(b.ad,'Göl');assert.ok(Math.abs(b.m-445)<5,'kenara mesafe '+b.m);
/* uygulama: local_id → bulut satırı; sunucu değeri onaysız 240'ı ezer */
const w={localStorage:{s:{},getItem(k){return this.s[k]??null},setItem(k,v){this.s[k]=v}},setTimeout(){},dispatchEvent(){}};w.window=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(W+'/cevre.js','utf8'),w);
const o=w.SuperAriCevre.cache([{arilik_id:'uuid-4',su_kaynagi_mesafe_metre:573}],[{id:'uuid-4',local_id:'a4'}]);
assert.strictEqual(o.a4.su_kaynagi_mesafe_metre,573);w.localStorage.setItem('superari.cevre.v1',JSON.stringify(o));
assert.strictEqual(w.SuperAriCevre.suM({id:'a4'}),573);
const dd=fs.readFileSync(W+'/demo-data.js','utf8');assert.match(dd,/function applyServerWater/);assert.match(dd,/source: 'sunucu'/);
const lc=fs.readFileSync(W+'/landcover-sync.js','utf8');assert.ok(!/YANIK_FALLBACK_M|= 240/.test(lc),'sabit 240 yok');
/* foraj uzman tahmini yalnız panelde */
assert.match(fs.readFileSync(R+'/apps/yonetici/panel5.js','utf8'),/Foraj yarıçapı: uzman tahmini/);
assert.ok(!/Foraj yarıçapı: uzman tahmini/.test(fs.readFileSync(W+'/arilik.html','utf8')));
const m=fs.readFileSync(R+'/supabase/migrations/20261016020000_k184_su_tekil_kiyi.sql','utf8');
assert.match(m,/arilik_cevre_yedek/);assert.match(m,/delete from public\.su_onbellek/);assert.match(m,/'Foraj yerleşim yoğunluğu', 'Uzman tahmini · kaynak aranıyor'/);
assert.strictEqual(JSON.parse(fs.readFileSync(W+'/version.json','utf8')).version,'koloni-200');
console.log('k184 ok');
