/* k180: su sorgusu — 2 ondalık hücre, 30 gün önbellek (yalnız servis yazar), hafif Overpass, 2 sunucu, AbortController, üstel bekleme, «Veri yok». */
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'../../..'),f=fs.readFileSync(R+'/supabase/functions/cevre-isle/index.ts','utf8');
assert.match(f,/\[out:json\]\[timeout:25\]/);assert.ok(!/fountain|wetland/.test(f),'etiket daraltıldı');
assert.match(f,/YARICAP = 2000/);assert.match(f,/out tags geom\(/,'kenara mesafe, kutuya kırpılmış geometri');assert.ok(!/out center/.test(f));assert.match(f,/ONBELLEK_GUN = 30/);assert.match(f,/toFixed\(2\)/);assert.match(f,/from\("su_onbellek"\)\.select/);
assert.ok(f.indexOf('from("su_onbellek").select')<f.indexOf('await overpass(suSorgu'),'önce önbellek');
assert.match(f,/new AbortController\(\)/);assert.strictEqual((f.match(/OVERPASS = \[([^\]]*)\]/)[1].match(/https:/g)||[]).length,2);
assert.ok(!/3001/.test(f));assert.match(f,/su_kaynagi_mesafe_metre: null/);
const m=fs.readFileSync(R+'/supabase/migrations/20261015240000_k180_varroa_su_onbellek.sql','utf8');
assert.match(m,/enable row level security/);assert.match(m,/revoke all on public\.su_onbellek from anon, authenticated/);assert.ok(!/grant (insert|update|all)[^;]*su_onbellek/.test(m));
/* bekleme: 2,4,8 … dk, en çok 24 saat */
const b=eval('(function(){'+f.match(/export function bekleme[^\n]*\}/)[0].replace('export ','').replace(/: number/g,'')+';return bekleme;})()');
assert.deepStrictEqual([1,2,3,20].map(b),[120000,240000,480000,1440*60000]);
/* uygulama: mesafe yoksa «Veri yok» */
const w={localStorage:{s:{},getItem(k){return this.s[k]??null},setItem(k,v){this.s[k]=v}},setTimeout(){},dispatchEvent(){}};w.window=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(R+'/apps/web/cevre.js','utf8'),w);
w.localStorage.setItem('superari.cevre.v1',JSON.stringify({a1:{arilik_id:'a1',su_kaynagi_mesafe_metre:null}}));
const u=w.SuperAriCevre.uyarilar({id:'a1'});assert.strictEqual(u.suVeriYok,true);assert.strictEqual(u.su_m,null);
assert.match(fs.readFileSync(R+'/apps/web/goc.html','utf8'),/Su kaynağı: Veri yok/);
