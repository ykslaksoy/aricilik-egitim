const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(W,f),'utf8');
const dd=rd('demo-data.js');
function load(){const store={};const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(dd,w);return w.SuperAriDemo.colony;}
const C=load();
/* 1) seviyeler */
assert.strictEqual(C.SWARM_LEVELS.map(l=>l.key).join(','),'dusuk,orta,yuksek,kritik');
assert.strictEqual(C.swarmLevelOf(34.9).label,'Düşük');assert.strictEqual(C.swarmLevelOf(35).label,'Orta');assert.strictEqual(C.swarmLevelOf(70).label,'Yüksek');assert.strictEqual(C.swarmLevelOf(100).label,'Yüksek');
/* 2) şablonlar */
['ALARM_KRITIK_PIP_01','ALARM_KRITIK_SW_01','ALARM_YUKSEK_SCORE_01','ALARM_YUKSEK_WORK_01','ALARM_YUKSEK_COMB_01','ALARM_ORTA_TREND_01','ALARM_ORTA_QUACK_01','ALARM_AYRI_QUEENLESS_01'].forEach(c=>assert.ok(dd.includes("'"+c+"'"),c));
assert.ok(dd.includes("'🚨 KRİTİK: Ana Arı Ötüyor!")&&dd.includes("'🚨 ACİL: Oğul Çıkıyor!")&&dd.includes("'💔 UYARI: Anasızlık Şüphesi'"));
assert.ok(/'kra-ses-pip-', 'ALARM_KRITIK_PIP_01', 'critical'/.test(dd)&&/'kra-ses-ogulani-', 'ALARM_KRITIK_SW_01', 'critical'/.test(dd)&&/ALARM_YUKSEK_WORK_01', 'high'/.test(dd)&&/ALARM_ORTA_QUACK_01', 'medium'/.test(dd));
/* 3) tekrarlar */
assert.ok(!dd.includes('kra-ses-anasiz2-')&&!dd.includes("'kra-ses-anasiz-'"));
assert.strictEqual((dd.match(/id: 'kra-anasiz-'/g)||[]).length,1);
assert.ok(dd.includes('kra-yalanci-yumurta-')&&dd.includes('kra-yalanci-erkek-')&&!/'kra-yalanci-' \+/.test(dd));
/* 4) sızıntı */
assert.ok(!/notes\.push\([^)]*(kg\/gün|°C|piping|Sensör \(Yüksek\)|erken uyarı\))/.test(dd));
assert.ok(!rd('uyarilar.html').includes('sonra ana arının ırkına'));
/* 5) terim / hitap */
['kolay-muayene.js','bakim-akis.js'].forEach(f=>assert.ok(!/'[^'\n]*(ana memesi|Oğul memesi|memelere)[^'\n]*'/.test(rd(f).replace(/\/[*\/].*$/mg,'')),f));
assert.ok(!/memeleri kırmayın|Kırın ya da|kontrol edin'/.test(dd));
/* kritik sayaç / yağmur */
const ai=rd('ana-ipucu.js');assert.ok(ai.includes("a.severity !== 'critical'")&&ai.includes("level: 'rain', kind: 'rain'"));
assert.ok(rd('rapor-store.js').includes("critical: 'Kritik'"));
const ss=rd('demo-data.js').match(/"id": "anasizlik"[^}]*/)[0];assert.ok(/"seviye": "ayri"/.test(ss));
console.log('k154 ok');
