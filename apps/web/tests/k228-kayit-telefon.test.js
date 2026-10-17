/* koloni-228: değişiklik kaydında telefon yedeği / okuma sıklığı Türkçe; telefon geri yüklemesi kayıttan geri alınır. */
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),r=f=>fs.readFileSync(path.join(W,f),'utf8');
test('k228',()=>{
delete globalThis.SuperAriDegisiklik;require(path.join(W,'degisiklik-kaydi.js'));const K=globalThis.SuperAriDegisiklik;
const e={id:44,at:'2026-10-17T00:00:00Z',tablo:'telefon_yedek',islem:'geri_yukle',once:{oncesi_yedek:18},sonra:{yedek:15,tarih:'2026-10-16',cihaz:'iPhone',adet:4,geri_yukleme:3}};
const h=K.liste([e],{geriAl:true,telefon:true});
assert.ok(/Telefon yedeği/.test(h)&&!/telefon_yedek/.test(h)&&/data-dk-tgeri="3"/.test(h)&&!/data-dk-geri=/.test(h));
assert.ok(/Telefonda geri alınır/.test(K.liste([e],{geriAl:true})));
assert.ok(!/data-dk-tgeri/.test(K.liste([e],{geriAl:false,telefon:true})),'izinsiz yok');
assert.ok(/Geri alındı/.test(K.liste([e],{geriAl:true,telefon:true,telGeriAlindi:{3:1}}))&&!/data-dk-tgeri/.test(K.liste([e],{geriAl:true,telefon:true,telGeriAlindi:{3:1}})));
const a=K.liste([{id:43,at:'2026-10-17T00:00:00Z',tablo:'cihaz_aralik',islem:'guncelle',once:{aralik_ms:3600000},sonra:{aralik_ms:14400000}}],{});
assert.ok(/Okuma sıklığı/.test(a)&&/4 saatte bir/.test(a)&&!/aralik_ms|cihaz_aralik/.test(a));
assert.strictEqual(r('degisiklik-kaydi.js'),fs.readFileSync(path.join(W,'../yonetici/degisiklik-kaydi.js'),'utf8'));
delete globalThis.SuperAriTelefonYedek;globalThis.localStorage={getItem:()=>null};require(path.join(W,'telefon-yedek.js'));const T=globalThis.SuperAriTelefonYedek;
const g={id:3,hesap_id:'h',telefon_yedek_id:7};
assert.equal(T.geriAlKontrol(g,[g]),'');assert.ok(/zaten/.test(T.geriAlKontrol(Object.assign({},g,{geri_alindi_at:'x'}),[])));
assert.ok(/daha yeni/.test(T.geriAlKontrol(g,[g,{id:5,hesap_id:'h',telefon_yedek_id:8}])));
assert.ok(r('degisiklik-kaydi.html').includes('geriAlId(CL, tid)')&&r('yedekler.html').includes('TY.geriAlId(CL, id)'));
assert.ok(!fs.readdirSync(__dirname).some(f=>/^k224/.test(f)),'k224 testi k226 ile değişti');
assert.equal(JSON.parse(r('version.json')).version,'koloni-232');});
