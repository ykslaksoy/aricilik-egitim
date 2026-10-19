/* k171: onaylı tahmini melez puanları; kaynak/gerekçe yalnız yönetici paneli. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','demo-data.js'),'utf8');
assert.ok(/'kafkas\+mugla': \{ v: 3,/.test(src)&&/'karadeniz\+mugla': \{ v: 4,/.test(src)&&/'anadolu\+karadeniz': \{ v: 4\.5,/.test(src));
/* koloni-292: oğul/hırçınlık kaynak sabitleri demo-data içinde (yönetici ayarı); kullanıcı metinlerinde yok */
assert.ok(!/143543|Uludağ Arıcılık Dergisi 5/.test(src.replace(/OGUL_YON_KAYNAK[\s\S]*?;/,'').replace(/HIRCINLIK_KAYNAK[\s\S]*?;/,'')),'kullanıcı metinlerinde kaynak yok');
const p6=fs.readFileSync(path.join(__dirname,'..','..','yonetici','panel6.js'),'utf8');
['143543','P>0,05','%30','10,80','6,05 ± 0,21','%25','%20','1782244','Veri eksik','Muğla AAE'].forEach(k=>assert.ok(p6.includes(k),k));
console.log('k171 ok');
