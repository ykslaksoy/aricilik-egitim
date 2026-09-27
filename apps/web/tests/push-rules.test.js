/* node apps/web/tests/push-rules.test.js — arka plan bildirim kuralları */
'use strict';
const assert = require('assert');
const R = require('../../../api/_push-rules.js');
const A = '11111111-1111-1111-1111-111111111111';
const hk = (l) => A + ':' + l;
const d = {
  hives: [
    { key: hk(101), local_id: '101', name: 'Kovan 1', data: { queenYear: 2023 } },
    { key: hk(102), local_id: '102', name: 'Kovan 2', data: { queenYear: 2026 } },
    { key: hk(103), local_id: '103', name: 'Kovan 3', data: {} }
  ],
  tasks: [
    { key: 't1', local_id: 'g1', kind: 'gorev', due: '2026-09-27', data: { title: 'Şurup ver', hiveId: 'hk:' + hk(101) } },
    { key: 't2', local_id: 'g2', kind: 'gorev', due: '2026-09-20', data: { title: 'Varroa sayımı' } },
    { key: 't3', local_id: 'g3', kind: 'gorev', due: '2026-10-05', data: { title: 'Gelecek' } },
    { key: 't4', local_id: 'g4', kind: 'gorev', due: '2026-09-26', data: { title: 'Bitti' } },
    { key: 't4d', local_id: 'done:g4', kind: 'tamamlama', due: '2026-09-26', data: {} },
    { key: 't5', local_id: 'kr-bekleme-bitti-x', kind: 'gorev', due: '2026-09-27', data: { title: 'dup' } }
  ],
  records: [
    { key: 'r1', hive_key: hk(102), kind: 'disease', record_date: '2026-09-13', data: { date: '2026-09-13', treatment: 'Oksalik', withdrawalDays: 14 } },
    { key: 'r2', hive_key: hk(103), kind: 'disease', record_date: '2026-09-01', data: { date: '2026-09-01', withdrawalDays: 60 } },
    { key: 'r3', kind: 'colony_event', record_date: '2026-09-05', data: { type: 'ogul', date: '2026-09-05', fromHiveId: 'hk:' + hk(103) } },
    { key: 'r4', hive_key: hk(101), kind: 'colony_event', record_date: '2026-09-20', data: { type: 'saglik', at: '2026-09-20T08:00', score: 80, status: 'Sağlıklı' } },
    { key: 'r5', hive_key: hk(101), kind: 'colony_event', record_date: '2026-09-27', data: { type: 'saglik', at: '2026-09-27T08:00', score: 38, status: 'Müdahale', reasons: ['Ana arı ve yumurta görülmedi'], swarm: 'Yüksek' } },
    { key: 'r6', hive_key: hk(102), kind: 'disease', record_date: '2026-09-13', data: { date: '2026-09-13', withdrawalDays: 14, demo: true } }
  ]
};
const it = R.items(d, '2026-09-27');
const keys = it.map((x) => x.key).sort();
assert.deepStrictEqual(keys, [
  'egg:r3', 'health:r5', 'requeen:' + hk(101) + ':2026', 'swarm:' + hk(101) + ':2026W39',
  'task:t1:2026-09-27', 'task:t2:2026-09-20', 'task:t2:2026-09-20:r3', 'wd:r1'
].sort());
assert.ok(it.find((x) => x.key === 'egg:r3').url === '/kovan.html?id=103');
assert.ok(/Oksalik/.test(it.find((x) => x.key === 'wd:r1').text));
assert.ok(/Müdahale \(38\)/.test(it.find((x) => x.key === 'health:r5').text));
const g = R.group(it);
assert.strictEqual(g.length, 6);
const t = g.find((x) => x.tag === 'superari-task');
assert.ok(/2 görev bekliyor/.test(t.title), t.title);
assert.strictEqual(t.keys.length, 3);
assert.ok(g.find((x) => x.tag === 'superari-health').urgent);
// ekim: ana yenileme sezon dışı; aynı durum tekrar → health yok
const it2 = R.items({ hives: d.hives, tasks: [], records: d.records.concat([{ key: 'r7', hive_key: hk(101), kind: 'colony_event', record_date: '2026-10-02', data: { type: 'saglik', at: '2026-10-02T08:00', score: 35, status: 'Müdahale' } }]) }, '2026-10-02');
assert.ok(!it2.some((x) => x.cat === 'queen'));
assert.ok(!it2.some((x) => x.cat === 'health'));
assert.strictEqual(R.istanbulToday(Date.parse('2026-09-26T22:30:00Z')), '2026-09-27');
console.log('push-rules: tamam (' + it.length + ' uyarı, ' + g.length + ' bildirim)');
