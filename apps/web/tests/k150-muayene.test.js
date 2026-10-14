const assert=require('assert'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),km=fs.readFileSync(path.join(W,'kolay-muayene.js'),'utf8'),dd=fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),ss=fs.readFileSync(path.join(W,'ses-siniflari.js'),'utf8');
assert.ok(/\['kupa', 'Yalnız boş kupa/.test(km));assert.ok(/belirti: \{/.test(km));assert.ok(/Oğul yüksüğü: 7 gün sonra tekrar kontrol et/.test(km));
assert.ok(/var anyCell = !!\(st && st\.swarmCell\);/.test(dd),'sessiz değiştirme bypass etmez');
assert.ok(/Yalancı ana arı şüphesi/.test(dd)&&/Oğul çıkmış olabilir/.test(dd)&&/ALARM_AYRI_QUEENLESS_01/.test(dd)&&!/kra-ses-anasiz2-/.test(dd));
assert.ok(!/kaynak|Hz|Kaynak/.test(ss),'uygulamada kaynak/frekans yok');
console.log('k150 muayene ok');
