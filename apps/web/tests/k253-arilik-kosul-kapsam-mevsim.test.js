/* koloni-253: «Arılık koşulları değişti» kartları — (1) tek arılık kapsamında başka arılığın kartı görünmez; (2) mevsim kapalı arılıkta çiçek olmaması/artışın durması
   taşınma önerisi ve «Besleme planla» üretmez (gerçek güz akımı yalnız kayıtlı arılığın tartısıyla doğrulanırsa); eski yanlış kartlar temizlenir. */
const test = require('node:test'); const assert = require('node:assert');
const vm = require('vm'), fs = require('fs'), path = require('path'); const W = path.join(__dirname, '..');
function ctx() {
  const store = {}; const ls = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, key: i => Object.keys(store)[i], get length() { return Object.keys(store).length; } };
  const w = { localStorage: ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: function () {}, Event: function () {}, console, setTimeout() {} }; w.window = w; w.self = w; vm.createContext(w);
  ['demo-data.js', 'plan-planlayici.js', 'cicek-veri.js', 'cicek.js', 'rota-motoru.js', 'kritik-alarm.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(W, f), 'utf8'), w));
  return w;
}
const kapali = (w, id) => w.SuperAriDemo.colony.ucusSezon(id).acik === false;
test('k253: mevsim kapalıyken taşınma önerisi yok, flora nedeni yok', () => {
  const w = ctx(), R = w.SuperAriRota;
  ['a4', 'a5'].forEach(id => { if (!kapali(w, id)) return; const y = R.yonlendir(id); assert.ok(!y.hedef, id + ': kışlamada hedef önerilmez'); });
  if (kapali(w, 'a5')) { const k = R.kosulDegerlendir('a5', { su_m: 200, alan: true, floraAktif: false }); assert.strictEqual(k.uyari, null, 'mevsim dışı çiçek yokluğu uyarı değil'); }
  if (!kapali(w, 'a1')) { const k = R.kosulDegerlendir('a1', { su_m: 200, alan: true, floraAktif: false }); assert.ok(k.uyari && /Besleme planla/.test(k.uyari.aksiyon), 'mevsim açıkken flora nedeni sürer'); }
});
test('k253: eski yanlış kartlar temizlenir', () => {
  const w = ctx(), K = w.SuperAriKritik; if (!kapali(w, 'a4') || !kapali(w, 'a5')) return;
  const onay = { soru: 'x: artış durdu. Kayıtlı arılıklarında uygun yer yok; Finike (Antalya) şu an çiçeklenme döneminde. Onaylıyor musun?', hedef: { il: 'Antalya', ilce: 'Finike' }, tip: 'tasinma' };
  K.ac({ kod: 'ALARM_ARILIK_KOSUL_01', anahtar: 'a4', apiaryId: 'a4', aksiyon: 'Sulak koy. Besleme planla.', onay, ekibeGitme: true });
  K.ac({ kod: 'ALARM_ARILIK_KOSUL_01', anahtar: 'a5', apiaryId: 'a5', aksiyon: 'Besleme planla.', onay, ekibeGitme: true });
  K.mevsimTemizle();
  const L = K.liste(); assert.strictEqual(L.length, 1); assert.strictEqual(L[0].apiaryId, 'a4'); assert.strictEqual(L[0].onay, null); assert.strictEqual(L[0].aksiyon, 'Sulak koy.');
  assert.ok(K.tumu().find(x => x.apiaryId === 'a5').kapandi.kim.indexOf('mevsim') >= 0);
});
test('k253: kapsam süzgeci', () => {
  const w = ctx(), K = w.SuperAriKritik;
  assert.strictEqual(K.gorunur({ apiaryId: 'a5' }, 'a4'), false); assert.strictEqual(K.gorunur({ apiaryId: 'a4' }, 'a4'), true);
  assert.strictEqual(K.gorunur({ apiaryId: 'a5' }, null), true); assert.strictEqual(K.gorunur({ apiaryId: null }, 'a4'), true);
  const kr = fs.readFileSync(path.join(W, 'kritik-alarm.js'), 'utf8'), ks = fs.readFileSync(path.join(W, 'kapsam.js'), 'utf8');
  assert.ok(/liste\(\)\.filter\(function \(x\) \{ return gorunur\(x, sc\); \}\)/.test(kr)); assert.ok(/addEventListener\('superari-kapsam'/.test(kr)); assert.ok(/new CustomEvent\('superari-kapsam'/.test(ks));
});
