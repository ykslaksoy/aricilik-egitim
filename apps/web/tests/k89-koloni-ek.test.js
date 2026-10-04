/* k89 önizleme: Koloni ızgarasına 7 yeni ekran — oğul kapanı / yakalama, sönük kovan, hırçınlık, çerçeve fotoğrafı, veteriner (tek depo superari.koloniEk.v1),
   larva takvimi (kritik günler + otomatik görevler), hat performansı (yalnız kayıtlı veri); bulut eşitlemesi records/colony_event 'ke:<id>'. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = path.join(__dirname, '..') + path.sep;
const RealDate = Date;
const FIX = new RealDate('2026-10-04T12:00:00+03:00').getTime();
class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
const mem = { 'superari.workMode': 'live' };
const ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const ctx = { localStorage: ls, console, setTimeout, clearTimeout, setInterval, clearInterval, Date: FakeDate, Math, JSON, URLSearchParams, location: { pathname: '/koloni-ek.html', search: '', hash: '', origin: 'http://x' }, navigator: { onLine: false }, document: { readyState: 'complete', currentScript: null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {}, getAttribute: () => null, classList: { add() {} } }, documentElement: { style: {} } }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, Event: function () {}, CustomEvent: function () {}, fetch: () => Promise.reject(new Error('offline')) };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(W + 'demo-data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(W + 'koloni.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(W + 'koloni-ek.js', 'utf8'), ctx);
const D = ctx.SuperAriDemo, X = D.colonyExtra, R = D.records, K = ctx.SuperAriKoloni, E = ctx.SuperAriKoloniEk;
const J = (o) => JSON.parse(JSON.stringify(o));
mem['superari.ariliklar.v1'] = JSON.stringify([{ id: 'apA', name: 'Kayaköy', hiveCount: 3 }, { id: 'apB', name: 'Tortum', hiveCount: 0 }]);
mem['superari.kovanlar.v1'] = JSON.stringify([{ id: 501, name: 'K-501', apiaryId: 'apA' }, { id: 502, name: 'K-502', apiaryId: 'apA' }, { id: 503, name: 'K-503', apiaryId: 'apA' }]);
assert.strictEqual(D.loadHives().length, 3);

/* düğme adları = ekran başlıkları (kısa adlar), 10 + 7 = 17 */
assert.deepStrictEqual(J(K.EXTRA_TOPICS.map((t) => t.label)), ['Larva Transferi ve Ana Takvimi', 'Oğul Kapanı ve Yakalama', 'Koloni Kaybı (Sönük Kovan)', 'Hırçınlık Skoru', 'Hat Performans Analizi', 'Çerçeve Fotoğraf Analizi', 'Veteriner Kontrol ve Reçete']);
assert.deepStrictEqual(J(E.KEYS), ['larva', 'kapan', 'kayip', 'hircin', 'hat', 'foto', 'vet']);
const all = fs.readFileSync(W + 'koloni-ek.js', 'utf8') + fs.readFileSync(W + 'koloni.js', 'utf8') + fs.readFileSync(W + 'koloni-ek.html', 'utf8') + fs.readFileSync(W + 'kovanlar.html', 'utf8');
['Larva Transfer ve Ana Arı Takvimi', 'Oğul Kapanı ve Kaçak Takibi', 'Sönük Kovan / Koloni Kaybı Kaydı', 'Hırçınlık / Sakinlik Skoru', 'Damızlık / Hat Performans Analizi', 'Görsel Çerçeve ve Kuluçka Analizi', 'Sağlık Kontrolü ve Reçete Kaydı'].forEach((n) => assert.ok(!all.includes(n), 'uzun ad kullanılmaz: ' + n));

/* k90: Koloni düğme sırası (3 sütun; 6. satırın 3. hücresi boş) */
const ord = /var KOLONI_ORDER = (\[[^\]]+\])/.exec(fs.readFileSync(W + 'kovanlar.html', 'utf8'));
assert.ok(ord, 'sıra listesi');
assert.deepStrictEqual(JSON.parse(ord[1].replace(/'/g, '"')), ['irk', 'hat', 'larva', 'kayip', 'hastalik', 'vet', 'ana', 'tasima', 'uretim', 'yavru', 'guc', 'hircin', 'foto', 'ogul', 'kapan', 'bolme', 'besleme']);
/* k90: Hat ve Genetik alt yazısı tek satır durum (eski «melez · hat · anne ana» yok) */
const kvh = fs.readFileSync(W + 'kovanlar.html', 'utf8');
assert.ok(!kvh.includes('melez · hat · anne ana') && kvh.includes("nol + ' kovan hatsız'") && kvh.includes("'hat kayıtlı'"));
/* boş durum: rozetler dürüst («yok»), uydurma sayı yok */
['larva', 'kapan', 'hircin', 'foto', 'vet'].forEach((k) => { const i = E.tileInfo(k, 'apA'); assert.strictEqual(i.n, 0, k); assert.strictEqual(i.badge.cls, 'gray', k); });
assert.strictEqual(E.tileInfo('kayip', 'apA').sub, 'kayıp kaydı yok');
assert.strictEqual(E.tileInfo('hat', 'apA').badge.t, 'Veri yok');

/* oğul kapanı: kontrol günü → görev; kontrol edildi → sıradaki tarih; yakalanan oğul → yeni kovan */
const tr = X.add('kapan', { apiaryId: 'apA', name: 'Çam altı', every: 7, date: '2026-09-25' });
assert.strictEqual(X.trapNext(tr), '2026-10-02');
assert.strictEqual(E.tileInfo('kapan', 'apA').badge.t, '1 kontrol');
let tk = D.tasks.filter((t) => t.id === 'kr-kapan-' + tr.id);
assert.strictEqual(tk.length, 1); assert.strictEqual(tk[0].due, '2026-10-02');
X.trapCheck(tr.id, '2026-10-04');
assert.strictEqual(X.trapNext(X.get(tr.id)), '2026-10-11');
assert.strictEqual(E.tileInfo('kapan', 'apA').badge.t, '1 kapan');
const cp = X.add('yakalama', { trapId: tr.id, size: 'buyuk', date: '2026-10-03' });
assert.strictEqual(cp.apiaryId, 'apA', 'kapanın arılığı');
const nh = X.captureToHive(cp.id, { beeFrames: 4 });
assert.strictEqual(nh.apiaryId, 'apA'); assert.strictEqual(X.get(cp.id).hiveId, nh.id);
assert.strictEqual(D.loadApiaries().find((a) => a.id === 'apA').hiveCount, 4);
assert.throws(() => X.captureToHive(cp.id, {}), /zaten/);

/* sönük kovan: etkin sayım ve güç ortalamasından çıkar, skor 0, geçmiş korunur; geri alınabilir */
const kr = X.markDead({ hiveId: 502, date: '2026-10-01', cause: 'aclik', note: 'küme öldü' });
assert.strictEqual(D.hiveById(502).colonyState, 'sonuk');
assert.strictEqual(D.hiveById(502).sonukAt, '2026-10-01');
assert.strictEqual(R.strengthInfo({ beeFrames: 9, broodFrames: 4, date: '2026-10-04' }, { hiveId: 502 }).score, 0);
assert.strictEqual(R.strengthInfo({ beeFrames: 9, broodFrames: 4, date: '2026-10-04' }, { hiveId: 502 }).label, 'Sönük kovan');
assert.ok(!X.isActiveHive(D.hiveById(502)) && X.isActiveHive(D.hiveById(501)));
assert.strictEqual(E.tileInfo('kayip', 'apA').badge.t, '1 sönük');
assert.ok(E.stats('kayip', 'apA').some((s) => s.l === 'En sık neden' && s.v === 'Açlık'));
assert.ok(E.stats('kayip', 'apA').some((s) => s.l === 'Etkin kovan' && s.v === 3), 'etkin = 501, 503 ve yeni oğul kovanı');
assert.throws(() => X.markDead({ hiveId: 502 }), /zaten/);
assert.ok(D.hiveById(502), 'kovan silinmez (geçmiş korunur)');
X.undoDead(kr.id); assert.strictEqual(D.hiveById(502).colonyState, undefined);
X.markDead({ hiveId: 502, date: '2026-10-01', cause: 'varroa' });
const kap = fs.readFileSync(W + 'kapsam.js', 'utf8');
assert.ok(/colonyState !== 'sonuk'/.test(kap), 'Kapsam sayımı sönük kovanı saymaz');

/* hırçınlık: 1–5, kovan kaydındaki sakinlik = 6 − skor */
assert.throws(() => X.setTemper({ hiveId: 501, score: 7 }), /1–5/);
X.setTemper({ hiveId: 501, score: 2, date: '2026-09-20' });
X.setTemper({ hiveId: 501, score: 5, date: '2026-10-04' });
assert.strictEqual(X.lastTemper(501).score, 5);
assert.strictEqual(D.hiveById(501).calmness, 1);
assert.strictEqual(X.list({ type: 'hircin', hiveId: 501 }).length, 2, 'geçmiş korunur');
assert.strictEqual(E.tileInfo('hircin', 'apA').badge.t, '1 hırçın');

/* çerçeve fotoğrafı: elle desen, YZ puanı yok */
assert.throws(() => X.add('foto', { apiaryId: 'apA' }), /Kovan/);
const fr = X.add('foto', { hiveId: 501, date: '2026-10-04', frame: '4', pattern: 'daginik' });
assert.strictEqual(fr.pattern, 'daginik'); assert.ok(!('score' in fr) && !('ai' in fr));
assert.strictEqual(X.add('foto', { hiveId: 501, pattern: 'uydurma' }).pattern, undefined);

/* veteriner: bekleme süresi bitişi + görev */
assert.throws(() => X.add('vet', { apiaryId: 'apA' }), /en az birini/);
const vt = X.add('vet', { apiaryId: 'apA', hiveId: 503, date: '2026-10-01', inspector: 'Vet. Hek. A', medicine: 'Oksalik asit', withdrawalDays: 14 });
assert.strictEqual(vt.withdrawalEnd, '2026-10-15');
assert.strictEqual(E.tileInfo('vet', 'apA').badge.t, '1 beklemede');
assert.ok(D.tasks.some((t) => t.id === 'kr-vet-' + vt.id && t.due === '2026-10-15'));

/* larva takvimi: 0 aşılama · 5 kapanma · 10 taşıma · 11–12 çıkış · uçuş · 21–28 yumurta; görevler otomatik */
const TL = J(D.colonyOps.GRAFT_TIMELINE.map((s) => [s.key, s.d]));
assert.deepStrictEqual(TL, [['asilama', 0], ['kabul', 1], ['kapanma', 5], ['dagitim', 10], ['cikis', 11], ['ucus', 17], ['yumurta', 21], ['yumurta2', 28]]);
const b = D.colonyOps.addBatch({ date: '2026-09-24', cups: 20, sourceHiveId: 503 });
const bt = D.colonyOps.batchTasks().filter((t) => t.id.indexOf('kr-uretim-' + b.id) === 0).map((t) => t.id.split('-').pop());
assert.deepStrictEqual(J(bt), ['kabul', 'dagitim', 'cikis', 'ucus', 'yumurta', 'yumurta2'], 'aşılama ve kapanma (dokunma) görev değil');
const today = E.larvaUpcoming('apA', 0, 0);
assert.strictEqual(today.length, 1); assert.strictEqual(today[0].key, 'dagitim'); assert.ok(today[0].crit);
assert.strictEqual(E.tileInfo('larva', 'apA').badge.cls, 'orange');
assert.ok(/çiftleşme kutusuna taşı/.test(E.tileInfo('larva', 'apA').sub));

/* hat performansı: yalnız kayıtlı veri */
const rows = E.hatRows('apA', 'hat');
assert.ok(rows.length >= 1 && rows.every((g) => g.honey.length === 0), 'hasat kaydı yok → veri yok');
assert.ok(rows.some((g) => g.tmp.length === 1));

/* bulut: records / colony_event / local_id 'ke:<id>' (fotoğraf eşlemesi için «records» ad alanı) */
vm.runInContext(fs.readFileSync(W + 'bulut.js', 'utf8'), ctx);
const B = ctx.SuperAriBulut;
const st = B._loadState('u1'); st.links = { apA: 'uuid-a', apB: 'uuid-b' };
const out = B._collect(st);
const ke = Object.values(out).filter((e) => e.table === 'records' && /^ke:/.test(e.row.local_id));
assert.strictEqual(ke.length, X.list({}).length, 'tüm ek kayıtlar gönderilir');
assert.ok(ke.every((e) => e.row.kind === 'colony_event' && e.row.apiary_id === 'uuid-a' && e.row.data.store === 'koloni_ek' && X.TYPES.indexOf(e.row.data.type) >= 0));
assert.ok(st.keys['records:ke:' + vt.id], 'fotoğraf record_ids eşlemesi');
assert.ok(ke.find((e) => e.row.local_id === 'ke:' + vt.id).row.hive_key, 'kovanlı kayıt hive_key taşır');
/* uzak satır → yerel depo (başka cihazdan gelen kayıt) */
const ve = ke.find((e) => e.row.local_id === 'ke:' + vt.id).row;
const remote = Object.assign({}, J(ve), { data: Object.assign({}, J(ve.data), { findings: 'Uzaktan güncellendi' }), updated_at: '2026-10-04T10:00:00Z', deleted: false });
B._applyRemote(st, { records: [remote] }, {});
assert.strictEqual(X.get(vt.id).findings, 'Uzaktan güncellendi');
assert.strictEqual(X.get(vt.id).hiveId, 503); assert.strictEqual(X.get(vt.id).apiaryId, 'apA');
/* demo kayıtları buluta gitmez */
const sql = fs.readdirSync(path.join(W, '..', '..', 'supabase', 'migrations')).join(' ');
assert.ok(!/koloni_ek/.test(sql), 'yeni tablo / migration gerekmez (records.kind colony_event)');
console.log('k89-koloni-ek ok');
