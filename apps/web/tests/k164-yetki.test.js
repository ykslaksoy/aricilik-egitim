/* koloni-165: rol/yetki kuralları — yetki.js varsayılanları, Ayarlar rozet, Sahip-yalnız anahtarlar, RLS migration */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.join(__dirname, '..');
function yuk(store, search) {
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const win = { localStorage: ls, location: { search: search || '', pathname: '/ana.html' }, URLSearchParams, document: { readyState: 'complete', documentElement: { classList: { add() {} } }, querySelectorAll: () => [], body: {}, createTreeWalker: () => ({ nextNode: () => null }) }, setTimeout: () => 0, NodeFilter: { SHOW_TEXT: 4 } };
  win.window = win; vm.createContext(win); vm.runInContext('var localStorage=window.localStorage,location=window.location,document=window.document,NodeFilter=window.NodeFilter;' + fs.readFileSync(path.join(W, 'yetki.js'), 'utf8'), win); return win.SuperAriYetki;
}
let Y = yuk({});
assert.strictEqual(Y.rol(), 'owner', 'hesabı kuran Sahip'); assert.ok(Y.izin('mali'));
Y = yuk({}, '?rol=bakici'); assert.strictEqual(Y.izin('mali'), false); assert.strictEqual(Y.izin('gorev'), false); assert.strictEqual(Y.izin('duzen'), true);
Y = yuk({}, '?rol=bakici&mali=1'); assert.strictEqual(Y.izin('mali'), true, 'Sahip açtıysa bakıcı görür');
Y = yuk({}, '?rol=arici'); assert.ok(Y.izin('mali') && Y.izin('gorev') && Y.izin('duzen'), 'Arıcı varsayılan açık');
Y = yuk({}, '?rol=arici&mali=0'); assert.strictEqual(Y.izin('mali'), false);
['satis.html', 'rapor-kar-zarar.html', 'giderler.html', 'rapor-bal.html'].forEach((p) => assert.ok(Y.MALI_SAYFA.includes(p)));
const ay = fs.readFileSync(path.join(W, 'ayarlar.html'), 'utf8');
assert.ok(!/id="rolSeg"/.test(ay) && /Rolün: /.test(ay), 'seçici yok, salt okunur rozet');
assert.ok(/data-yetki=/.test(ay) && /Mali verileri görebilsin/.test(ay) && /Görev atayabilsin/.test(ay) && /Arılık\/kovan düzenleyebilsin/.test(ay));
assert.ok(/var sahip = !window.SuperAriYetki \|\| SuperAriYetki.rol\(\) === 'owner'/.test(ay), 'anahtarlar yalnız Sahip');
assert.ok(/Sahipliği devret/.test(ay) && /onayKart\(/.test(ay));
const sql = fs.readFileSync(path.join(W, '..', '..', 'supabase', 'migrations', '20261015080000_ekip_yetki.sql'), 'utf8');
assert.ok(/Yetkileri yalnız Sahip değiştirir/.test(sql) && /as restrictive for select/.test(sql) && /En az bir Sahip kalmalı/.test(sql) && /sa_uye_gunluk/.test(sql));
assert.ok(/signInWithPassword/.test(ay) && /Sahipliği devredersen Sahip yetkilerini kaybedip Arıcı olursun/.test(ay), 'çift onay + şifre');
assert.ok(/id="btnDavet" disabled/.test(ay) && /Daveti kabul edince açılır/.test(ay));
const sq2 = fs.readFileSync(path.join(W, '..', '..', 'supabase', 'migrations', '20261015100000_davet_yetki.sql'), 'utf8');
assert.ok(/check \(not mali_gorur and not gorev_atar and not duzenler\)/.test(sq2));
console.log('k164-yetki ok');
