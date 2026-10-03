/* koloni-77: cihaz yedeğine fotoğraflar (IndexedDB) base64 olarak girer; geri yüklemede eklenir; demo fotoğraf girmez. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..') + path.sep;
const mem = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
globalThis.document = { querySelector: () => null };
globalThis.dispatchEvent = () => {};
let rows = {};
globalThis.SuperAriFoto = {
  allRows: () => Promise.resolve(Object.values(rows)),
  putRow: (r) => { rows[r.id] = r; return Promise.resolve(r); }
};
require(W + 'yedek.js');
const Y = globalThis.SuperAriYedek;
const jpg = new Uint8Array(70000).map((_, i) => (i * 37) & 255); /* > 32 KB: parça parça base64 */
(async () => {
  localStorage.setItem('superari.kovanlar.v1', JSON.stringify([{ id: 'h1' }]));
  rows = {
    f1: { id: 'f1', recordIds: ['r1'], mode: 'live', createdAt: '2026-10-01T10:00:00Z', w: 1280, h: 960, blob: new Blob([jpg], { type: 'image/jpeg' }), thumb: new Blob([jpg.slice(0, 900)], { type: 'image/jpeg' }) },
    f2: { id: 'f2', recordIds: ['r2'], mode: 'demo', createdAt: '2026-10-01T10:00:00Z', blob: new Blob([jpg.slice(0, 10)], { type: 'image/jpeg' }) }
  };
  const info = await Y.photoInfo();
  assert.deepStrictEqual([info.n, info.bytes], [1, 70900], 'yalnız canlı fotoğraf; boyut notu');
  const b = await Y.collectFull();
  assert.strictEqual(b.photos.length, 1); assert.strictEqual(b.formatVersion, 2);
  assert.ok(/^data:image\/jpeg;base64,/.test(b.photos[0].blob) && b.photos[0].thumb && b.photos[0].recordIds[0] === 'r1');
  assert.strictEqual((await Y.collectFull({ photos: false })).photos, undefined, 'fotoğrafsız seçenek');
  /* yeni cihaz: fotoğraf yok → geri yükle */
  const text = JSON.stringify(b);
  rows = {};
  const rd = Y.read(text); assert.ok(rd.ok && rd.backup.photos.length === 1);
  assert.deepStrictEqual(await Y.photoPlan(rd.backup), { backup: 1, add: 1, same: 0 });
  const res = await Y.applyPhotos(rd.backup, 'birlestir');
  assert.deepStrictEqual(res, { added: 1, replaced: 0, failed: 0 });
  const back = rows.f1;
  assert.ok(back.blob instanceof Blob && back.blob.type === 'image/jpeg' && back.blob.size === 70000 && back.thumb.size === 900);
  assert.deepStrictEqual(new Uint8Array(await back.blob.arrayBuffer()), jpg, 'resim baytları aynen döner');
  assert.deepStrictEqual([back.mode, back.recordIds[0], back.w, back.createdAt], ['live', 'r1', 1280, '2026-10-01T10:00:00Z']);
  /* tekrar birleştir → eklenecek yok; değiştir → aynı kimlik yazılır */
  assert.deepStrictEqual(await Y.photoPlan(rd.backup), { backup: 1, add: 0, same: 1 });
  assert.deepStrictEqual(await Y.applyPhotos(rd.backup, 'birlestir'), { added: 0, replaced: 0, failed: 0 });
  assert.deepStrictEqual(await Y.applyPhotos(rd.backup, 'degistir'), { added: 0, replaced: 1, failed: 0 });
  /* bozuk / demo fotoğraf satırları okunmaz; eski (fotoğrafsız) yedek de okunur */
  const bad = JSON.parse(text); bad.photos.push({ id: 'x', blob: 'javascript:1' }, { id: 'y', mode: 'demo', blob: b.photos[0].blob }, { id: '../z', blob: b.photos[0].blob });
  assert.strictEqual(Y.read(JSON.stringify(bad)).backup.photos.length, 1);
  const old = JSON.parse(text); delete old.photos; old.formatVersion = 1;
  const ro = Y.read(JSON.stringify(old)); assert.ok(ro.ok && ro.backup.photos.length === 0);
  assert.deepStrictEqual(await Y.applyPhotos(ro.backup, 'birlestir'), { added: 0, replaced: 0, failed: 0 });
  const h = fs.readFileSync(W + 'hesap.html', 'utf8');
  assert.ok(h.includes('foto.js?v=') && h.includes('id="ydPhotos"') && h.includes('YD.downloadFull') && h.includes('YD.applyPhotos'));
  console.log('yedek-foto: ok');
})().catch((e) => { console.error(e); process.exit(1); });
