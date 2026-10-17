/* k246: oğul riski — (1) boş «else if (broodF >= 4)» dalı «var bxs = hiveBoxes(…)» satırını yutuyordu → kutu düzeni / bal katı her kovanda okunur;
   (2) «strength === 'güçlü'» hiç eşleşmiyordu (gerçek anahtar 'guclu') → güçlü = isStrongClass (guclu / cok-guclu / bolunmeli). */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
const st = {};
global.window = global; global.self = global;
global.localStorage = { getItem: (k) => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: (k) => { delete st[k]; } };
global.document = { addEventListener() {}, readyState: 'complete', querySelector() { return null; }, querySelectorAll() { return []; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, documentElement: {}, head: { appendChild() {} }, body: null };
global.location = { search: '', pathname: '/uyarilar.html', href: '' }; global.navigator = {}; global.addEventListener = () => {}; global.dispatchEvent = () => {}; global.fetch = () => Promise.reject(new Error('x'));
require(path.join(root, 'demo-data.js'));
const D = global.SuperAriDemo;
const src = fs.readFileSync(path.join(root, 'demo-data.js'), 'utf8');

/* kaynak */
assert.ok(!/strength === 'güçlü'/.test(src), "'güçlü' karşılaştırması kalmamalı");
assert.ok(/var guclu = isStrongClass\(strength\);/.test(src));
assert.ok(/else if \(broodF != null && broodF >= 4\) \{[^}]*\}\s*\n\s*var bxs = hiveBoxes\(/.test(src), '4–5 çerçeve dalı kendi gövdesine sahip; bxs her kovanda okunur');
assert.strictEqual(src, fs.readFileSync(path.join(root, '..', 'yonetici', 'demo-data.js'), 'utf8'), 'yonetici kopyası aynı');
const rm = fs.readFileSync(path.join(root, 'rapor-muayene.html'), 'utf8');
assert.ok(/isWeakClass/.test(rm) && /isStrongClass/.test(rm) && !/r\.strength === 'Zayıf'/.test(rm), 'rapor-muayene: ortak güç tanımı');

/* davranış: güçlü kovan, sayım yok, bal katı yok → oğul mevsiminde yer darlığı nedeni + kat at / bölme */
const h0 = D.hiveById(106);
const sicakSezon = '2027-04-20';
['güçlü', 'guclu', 'Güçlü', 'çok güçlü'].forEach((s) => {
  const h = Object.assign({}, h0, { strength: s });
  const a = D.colony.swarm(h, sicakSezon);
  if (a.key === 'dusuk') return; /* düşük riskte öneri dalı açılmaz */
  const t = a.recs.map((r) => r.title);
  assert.ok(a.reasons.some((x) => /Yer darlığı olabilir/.test(x)) || a.reasons.some((x) => /Yer darlığı|dolmak|dolu/.test(x)), s + ': yer nedeni');
  assert.ok(t.includes('Kat at (bal katı ver)'), s + ': Kat at önerisi → ' + t.join(', '));
  assert.ok(t.includes('Bölme yap'), s + ': Bölme önerisi → ' + t.join(', '));
});
/* normal güçte kovan güçlü sayılmaz */
const hn = Object.assign({}, h0, { strength: 'normal' });
assert.ok(!D.colony.swarm(hn, sicakSezon).recs.some((r) => r.title === 'Bölme yap' && /Güçlü koloniden/.test(r.detail)), 'normal kovana güçlü bölme önerisi yok');
console.log('k246 ok');
