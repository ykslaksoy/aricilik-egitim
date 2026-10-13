/* k125: ırk oğul riskinde ana etken (7 düzey), melez kendi düzeyi (yayın) ya da «veri eksik» bildirimi */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
const st = {};
global.window = global; global.self = global;
global.localStorage = { getItem: (k) => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: (k) => { delete st[k]; } };
global.document = { addEventListener() {}, readyState: 'complete', querySelector() { return null; }, querySelectorAll() { return []; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: {}, head: { appendChild() {} }, body: null };
global.location = { search: '', pathname: '/ogul.html', href: '' }; global.navigator = {}; global.addEventListener = () => {}; global.dispatchEvent = () => {}; global.fetch = () => Promise.reject(new Error('x'));
require(path.join(root, 'demo-data.js'));
const D = global.SuperAriDemo;
const base = D.loadHives()[0];
function risk(breed) { const h = Object.assign({}, base, { breed: breed, currentQueenId: null, breedUnknown: false }); const a = D.colony.swarm(h); return { a: a, irk: (a.details.find((x) => x.key === 'irk') || {}).text || '' }; }
const lv = { 'Kafkas': 'çok çok az', 'Buckfast': 'çok az', 'Karadeniz': 'az', 'İtalyan': 'orta', 'Muğla': 'orta', 'Anadolu': 'yüksek', 'Trakya': 'yüksek', 'Karniyol': 'yüksek', 'İran': 'yüksek', 'Yığılca': 'çok yüksek', 'Hatay': 'çok çok yüksek' };
Object.keys(lv).forEach((b) => { const r = risk(b); assert.ok(r.irk.indexOf('oğul eğilimi ' + lv[b]) >= 0 && (lv[b] !== 'yüksek' || r.irk.indexOf('çok yüksek') < 0), b + ' → ' + r.irk); });
assert.ok(risk('Hatay').a.score > risk('Kafkas').a.score + 10, 'race is a strong factor');
assert.ok(risk('Kafkas × Anadolu').irk.indexOf('oğul eğilimi orta') >= 0, 'Kafkas×Anadolu from Yığılca study');
const kk = risk('Karadeniz × İran');
assert.ok(kk.irk.indexOf('melez verisi yok') >= 0, 'no-data hybrid is not averaged');
assert.ok(JSON.parse(st['superari.irk.ogulVeriEksik.v1']).items['iran+karadeniz'], 'missing hybrid reported for admin');
const ua = fs.readFileSync(path.join(root, 'uyarilar.html'), 'utf8');
assert.ok(!ua.includes('yalnız küçük bir etkidir') && ua.includes('ana arının ırkına'), 'bottom note updated');
assert.ok(fs.readFileSync(path.join(root, 'yonetici.html'), 'utf8').includes('superari.irk.ogulVeriEksik.v1'), 'admin lists missing hybrids');
console.log('k125 ok');
