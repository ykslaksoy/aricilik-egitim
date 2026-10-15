/* koloni-166: çevre kuyruğu (sayfa açılışında dış sorgu yok), bal ormanı üst sınırı yok + üstel bekleme, şifre gözü/tekrar kontrolü, Hesap düzeni */
const assert = require('assert'), fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..'), R = path.join(W, '..', '..');
const rd = (p) => fs.readFileSync(path.join(W, p), 'utf8');
const rota = rd('rota-motoru.js'), cev = rd('cevre.js');
assert.ok(!/open-meteo\.com\/v1\/elevation\?latitude/.test(rota.replace(/\/\*[\s\S]*?\*\//g, '')), 'rota-motoru rakım için dış sorgu yapmaz');
assert.ok(/rakim_m/.test(rota) && /rakim_m/.test(cev), 'rakım kayıtlı sonuçtan');
['goc.html', 'ana.html', 'kovanlar.html', 'uyarilar.html'].forEach((h) => assert.ok(!/landcover-sync\.js|overpass/i.test(rd(h)), h + ': sayfa açılışında Overpass yok'));
assert.ok(/range\(i, i \+ SY - 1\)/.test(cev) && !/\b796\b/.test(cev), 'bal ormanları sayfalı, sabit sayı yok');
assert.ok(/Math\.pow\(2, n - 1\)/.test(cev) && /zaman aşımı/.test(cev), 'istemci üstel bekleme + zaman aşımı');
const fn = fs.readFileSync(path.join(R, 'supabase', 'functions', 'cevre-isle', 'index.ts'), 'utf8');
assert.ok(/GetBalOrmanlariByPlaka/.test(fn) && /veriTuru=6/.test(fn) && !/\b796\b|plaka <= 81/.test(fn), 'Bakanlık: liste ne dönerse');
assert.ok(/Math\.pow\(2, Math\.max\(1, deneme\)\)/.test(fn) && /status >= 500/.test(fn), 'sunucu: 5xx → üstel bekleme');
const sq = fs.readFileSync(path.join(R, 'supabase', 'migrations', '20261015110000_cevre_kuyruk.sql'), 'utf8');
assert.ok(/create table if not exists public\.cevre_kuyruk/.test(sq) && /after insert or update of data on public\.apiaries/.test(sq), 'konum değişince kuyruk');
/* bekleme formülü */
const bek = (d) => Math.min(24 * 60, Math.pow(2, Math.max(1, d))) * 60000;
assert.deepStrictEqual([1, 2, 3, 20].map(bek), [120000, 240000, 480000, 86400000]);
/* şifre */
const sg = rd('sifre-goz.js');
assert.ok(/Şifreyi göster/.test(sg) && /Şifreyi gizle/.test(sg) && /width:44px;height:44px/.test(sg));
assert.ok(/Şifreler aynı değil/.test(sg) && /En az 8 karakter/.test(sg) && /kay\.disabled = !ok/.test(sg) && /min-height:1\.3em/.test(sg), 'canlı kontrol, yer ayrılmış ileti');
['giris.html', 'yeni-sifre.html', 'hesap.html', 'ayarlar.html'].forEach((h) => assert.ok(/sifre-goz\.js/.test(rd(h)), h + ' göz'));
const ay = rd('ayarlar.html');
assert.ok(/>Değiştir<\/button>/.test(ay) && /Bağlantı gönder/.test(ay) && /Çıkış yap/.test(ay) && /sat eposta/.test(ay));
console.log('k166 ok');
