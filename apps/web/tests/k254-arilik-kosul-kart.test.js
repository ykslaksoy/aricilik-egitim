/* koloni-254: Arılık koşulu kartı — arılık adı başlıkta, neden başına tek cümle, öneri tek satır, düğmeler «Taşınmayı planla» (öneri varsa) + «Kapat». */
const test = require('node:test'); const assert = require('node:assert');
const vm = require('vm'), fs = require('fs'), path = require('path'); const W = path.join(__dirname, '..');
test('k254: sade arılık koşulu kartı', () => {
  const store = { 'superari.bakim.scope': 'all' }; const ls = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const el = { innerHTML: '', offsetHeight: 0, addEventListener() {} };
  const w = { localStorage: ls, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {}, Event: function () {}, scrollBy() {}, document: { scrollingElement: { scrollTop: 0 } },
    SuperAriDemo: { loadApiaries: () => [{ id: 'a4', name: 'Yanıkdağ Baluğundüzü Arılığı' }, { id: 'a1', name: 'Kayaköy Ana Arılık' }] } }; w.window = w; vm.createContext(w);
  vm.runInContext(fs.readFileSync(path.join(W, 'kritik-alarm.js'), 'utf8'), w);
  const K = w.SuperAriKritik;
  K.ac({ kod: 'ALARM_ARILIK_KOSUL_01', anahtar: 'a4', apiaryId: 'a4', aksiyon: 'Sulak koy.', nedenler: ['su'], ekibeGitme: true });
  K.ac({ kod: 'ALARM_ARILIK_KOSUL_01', anahtar: 'a1', apiaryId: 'a1', aksiyon: 'Besleme planla.', nedenler: ['flora'], onay: { soru: 'x', hedef: { il: 'Antalya', ilce: 'Finike' }, tip: 'tasinma' }, ekibeGitme: true });
  K.ciz(el); const h = el.innerHTML;
  assert.ok(/Yanıkdağ Baluğundüzü Arılığı: koşul değişti/.test(h)); assert.ok(/Su kaynağı uzak\. Arılığa sulak koy\./.test(h));
  assert.ok(/Öneri: <b>Finike \(Antalya\)<\/b>/.test(h)); assert.ok(/>Taşınmayı planla</.test(h)); assert.ok(/>Kapat</.test(h));
  assert.ok(!/>Onayla</.test(h) && !/>Tamam</.test(h)); assert.ok(!/Bu arılığın koşulları değişti/.test(h)); assert.strictEqual((h.match(/Taşınmayı planla/g) || []).length, 1, 'yalnız önerili kartta');
});
