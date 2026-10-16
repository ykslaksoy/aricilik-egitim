/* k193: Bildirim uçtan uca — Ayarlar'da aç/test/kategori, otomatik hatırlatma gönderimi, teslim günlüğü, SW ack. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),R=path.join(W,'..','..');
const rd=(p)=>fs.readFileSync(path.join(R,p),'utf8');
const ay=rd('apps/web/ayarlar.html'),push=rd('apps/web/push.js'),sw=rd('apps/web/sw.js'),sub=rd('api/push-subscribe.js'),lib=rd('api/_push-lib.js'),run=rd('api/_push-run.js');
assert.match(ay,/push\.js\?v=koloni-(19[3-9]|20[0-6])/);assert.match(ay,/Test bildirimi gönder/);assert.match(ay,/data-pk="/);assert.match(ay,/min-height:4\.2em/,'durum yazısı sabit yükseklik');
assert.ok(!/data-k="bildirim"|sw\('kritikSes'\)/.test(ay),'işlevsiz yerel düğmeler kaldırıldı');
assert.match(ay,/eşiklerini yönetici belirler/);
assert.match(push,/kr-\(kirec\|kulucka\|varroa-ses/);assert.match(push,/action: 'alert'/);assert.match(push,/push-resubscribe/);
assert.match(rd('apps/web/ana.html'),/push\.js\?v=koloni-(19[3-9]|20[0-6])/);
assert.match(sw,/ack=1/);assert.match(sw,/d\.lid/);
assert.match(sub,/action === 'alert'/);assert.match(sub,/action === 'prefs'/);assert.match(sub,/teslim_edildi/);assert.match(sub,/\^kr-/);
assert.ok(!/esik|threshold/i.test(sub.split("action === 'prefs'")[1].split("action === 'alert'")[0]),'kullanıcı eşik değiştiremez');
assert.match(lib,/push_teslim/);assert.match(lib,/'basarisiz'/);assert.match(lib,/'gonderildi'/);
assert.match(run,/push_tercih/);
assert.match(rd('apps/yonetici/index.html'),/panel9\.js/);assert.match(rd('apps/yonetici/panel9.js'),/Teslim edildi/);
console.log('k193 ok');
/* k193: k190 kuralı kabuksuz sayfaları (Ayarlar/Hesap) gizli bırakıyordu */
assert.match(rd('apps/web/sa-early.css'),/:not\(\.sa-duz\) body > main\.wrap\{visibility:hidden;\}/);
['ayarlar','hesap','arici','bakici','bakim-yap','index','kurulum','qr-etiket','sartlar'].forEach(f=>assert.match(rd('apps/web/'+f+'.html'),/<html lang="tr" class="sa-duz">/,f));
console.log('k193 sa-duz ok');
