/* koloni-243: donanım kararları — SHT41 (DHT22 yerine), arılık başına tek gateway (Cihazlar uyarısı), Donanım sürüm 2 (onaylandı – test edilecek), firmware SHT41 sürücüsü. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..', '..'), W = path.join(R, 'apps', 'web'), Y = path.join(R, 'apps', 'yonetici');
const mem = {};
globalThis.localStorage = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = globalThis;
require(path.join(W, 'device-runtime.js'));
const Dv = globalThis.SuperAriDevices;

/* 1) tek gateway kuralı */
assert.strictEqual(typeof Dv.gatewayKontrol, 'function');
const base = [
  { id: 'g1', tip: 'gateway', apiaryId: 'a1', apiaryName: 'A1', hiveId: null },
  { id: 't1', tip: 'tarti', apiaryId: 'a1', apiaryName: 'A1', hiveId: 1 }
];
assert.deepStrictEqual(Dv.gatewayKontrol(base), [], 'tek gateway + düğüm → uyarı yok');
const fazla = Dv.gatewayKontrol(base.concat([{ id: 'g2', tip: 'gateway', apiaryId: 'a1', apiaryName: 'A1', hiveId: null }]));
assert.strictEqual(fazla.length, 1); assert.strictEqual(fazla[0].tur, 'fazla'); assert.strictEqual(fazla[0].sayi, 2); assert.match(fazla[0].metin, /tek gateway/);
const yok = Dv.gatewayKontrol([{ id: 'i1', tip: 'isi_nem', apiaryId: 'a2', apiaryName: 'A2', hiveId: 5 }, { id: 's1', tip: 'ses', apiaryId: 'a2', apiaryName: 'A2', hiveId: 6 }]);
assert.strictEqual(yok.length, 1); assert.strictEqual(yok[0].tur, 'yok'); assert.strictEqual(yok[0].sayi, 2); assert.match(yok[0].metin, /gateway yok/);
assert.deepStrictEqual(Dv.gatewayKontrol([{ id: 'c1', tip: 'kamera_kovan', apiaryId: 'a3', hiveId: 9 }, { id: 'k1', tip: 'kamera_arilik', apiaryId: 'a3', hiveId: null }]), [], 'kamera düğüm sayılmaz');
assert.deepStrictEqual(Dv.gatewayKontrol([{ id: 'g3', tip: 'gateway', apiaryId: 'a4', hiveId: null }, { id: 'g4', tip: 'gateway', apiaryId: 'a4', hiveId: null, disabled: true }]), [], 'devre dışı gateway sayılmaz');

/* 2) Cihazlar sayfası uyarıyı kullanır */
const ch = fs.readFileSync(path.join(W, 'cihazlar.html'), 'utf8');
assert.match(ch, /gatewayKontrol\(all\)/); assert.match(ch, /id = 'gwUyari'/); assert.match(ch, /zaten bir gateway var/);

/* 3) Donanım sürüm 2: kararlar */
const dj = fs.readFileSync(path.join(Y, 'donanim.js'), 'utf8');
const m = dj.match(/window\.SA_DONANIM_TASLAK = (\{.*?\});\n/); assert.ok(m);
const D = JSON.parse(m[1]), K = {}; D.kalemler.forEach(k => { K[k.id] = k; });
['node', 'isi_nem', 'giris_sicak', 'dis_isi_nem', 'tarti', 'ses', 'titresim', 'ir', 'gateway'].forEach(id => assert.strictEqual(K[id].durum, 'onaylandı – test edilecek', id));
assert.match(K.aku.durum, /^onaylandı – test edilecek/); assert.match(K.aku.durum, /açık/);
assert.match(K.isi_nem.adaylar, /^Seçilen: Sensirion SHT41/); assert.match(K.giris_sicak.adaylar, /DS18B20/); assert.match(K.ses.adaylar, /^Seçilen: Knowles SPH0645/);
assert.match(K.titresim.adaylar, /^Seçilen: ADXL345/); assert.match(K.titresim.adaylar, /ADXL355/);
assert.match(K.gateway.adaylar, /T-Beam V1\.2/); assert.match(K.gateway.adaylar, /A7670E/); assert.match(K.gateway.adaylar, /ARILIK BAŞINA 1/);
assert.match(K.aku.adaylar, /kapasite: Veri yok/);
assert.deepStrictEqual(D.kararlar.map(k => k.baslik), ['Pil kapasitesi', 'Güneş paneli modeli']);
assert.ok(D.verilenKararlar.some(k => k.baslik === 'Gateway yerleşimi' && /tek gateway/.test(k.karar)));
assert.match(dj, /data-dn-verilen/); assert.match(dj, /data-dn-durum/);

/* 4) migration + changelog etiketi + paylaşılan dosyalar eşit */
const mig = fs.readdirSync(path.join(R, 'supabase', 'migrations')).find(f => /_k243_donanim_karar\.sql$/.test(f)); assert.ok(mig);
const ms = fs.readFileSync(path.join(R, 'supabase', 'migrations', mig), 'utf8');
assert.match(ms, /update public\.sa_donanim/); assert.match(ms, /verilenKararlar/); assert.match(ms, /pil kapasitesi ve güneş paneli modeli/);
['degisiklik-kaydi.js', 'demo-data.js', 'pil-model.js'].forEach(f => assert.strictEqual(fs.readFileSync(path.join(W, f), 'utf8'), fs.readFileSync(path.join(Y, f), 'utf8'), f));
assert.match(fs.readFileSync(path.join(W, 'degisiklik-kaydi.js'), 'utf8'), /verilenKararlar: 'Verilen kararlar'/);

/* 5) firmware: DHT22 yok, SHT41 sürücüsü var */
const FN = path.join(R, 'firmware', 'node');
assert.ok(!fs.existsSync(path.join(FN, 'src', 'sensors', 'dht22.cpp')));
const sht = fs.readFileSync(path.join(FN, 'src', 'sensors', 'sht41.cpp'), 'utf8');
assert.match(sht, /0xFD/); assert.match(sht, /0x31/); assert.match(sht, /-45\.0f \+ 175\.0f/);
assert.match(fs.readFileSync(path.join(FN, 'src', 'config.h'), 'utf8'), /SHT41_I2C_ADDR 0x44/);
assert.match(fs.readFileSync(path.join(FN, 'README.md'), 'utf8'), /SHT41/); assert.doesNotMatch(fs.readFileSync(path.join(FN, 'README.md'), 'utf8'), /\| DHT22 \|/);
assert.match(fs.readFileSync(path.join(R, 'firmware', 'gate', 'src', 'config.h'), 'utf8'), /GATEWAY_APIARY_ID/);
/* CRC-8 (Sensirion örneği: 0xBEEF → 0x92) */
function crc8(d) { let c = 0xFF; for (const x of d) { c ^= x; for (let b = 0; b < 8; b++) c = (c & 0x80) ? ((c << 1) ^ 0x31) & 0xFF : (c << 1) & 0xFF; } return c; }
assert.strictEqual(crc8([0xBE, 0xEF]), 0x92);

/* 6) sürüm */
const v = JSON.parse(fs.readFileSync(path.join(W, 'version.json'), 'utf8')).version;
assert.ok(+v.split('-')[1] >= 243, v);
console.log('k243 donanım kararları: ok');
