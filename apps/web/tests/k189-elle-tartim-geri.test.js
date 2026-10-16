const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const p = require('path');
const W = p.join(__dirname, '..');
const r = f => fs.readFileSync(p.join(W, f), 'utf8');
test('k189: Elle tartım Tartı deseninde (Kapsam kartı + [◀ Geri][▶ Kaydet], gri zemin, altın düğme)', () => {
  const t = r('tarti-elle.js');
  assert.match(t, /class="te-card te-head"/);
  assert.match(t, /data-te-stats/);
  assert.match(t, /class="te-gold te-geri" data-te-close/);
  assert.match(t, /class="te-gold" data-te-save/);
  assert.match(t, /\.te\{background:#f2f3f5;/);
  assert.ok(!/aria-label="Tartım"><h2>/.test(t), 'eski başlık + × düzeni kalktı');
  assert.match(t, /data-te-save>Elle tartımı kaydet/, 'form içi kaydet korunur');
});
test('k189: Geri ilk çizimden kart içinde — yer tutucu satır, üstte belirip kaymaz', () => {
  const n = r('nav.js'), k = r('kapsam.js');
  assert.match(k, /data-sa-act-res style="min-height:56px;margin-top:2px"/);
  for (const f of ['bakim.html', 'hava.html']) {
    const h = r(f);
    assert.match(h, /id="saActRow" class="sa-act-row" data-sa-act-res/);
    assert.match(h, /\.weather\.bk-scope \{ flex: 0 0 auto; height: auto;/, f + ': kart içerikle (boşluk yok)');
  }
  assert.match(n, /pendingBack = btn; return;/);
  assert.match(n, /else if \(!done\) backFallback\(\);/);
  assert.match(n, /body\.sa-has-act-row #bkScope\{height:auto!important;flex-basis:auto!important;flex-grow:0!important;/);
  assert.strictEqual(JSON.parse(r('version.json')).version, 'koloni-192');
});
