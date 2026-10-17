/* koloni-240: Yönetici › Alan kullanımı — plan sınırları (Free varsayılan, Pro hazır), eşikler %80/%95 (uzman tahmini), eğilim «yaklaşık X gün sonra dolar», egress «Veri yok», migration güvenliği. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..', '..');
const A = require(path.join(R, 'apps/yonetici/alan.js'));
const MB = 1048576, GB = 1073741824;

// Plan varsayılanları (supabase.com/pricing, 17.10.2026)
assert.deepStrictEqual([A.VARSAYILAN.db_limit_mb, A.VARSAYILAN.storage_limit_mb, A.VARSAYILAN.egress_limit_gb, A.VARSAYILAN.dosya_limit_mb], [500, 1024, 5, 50]);
assert.deepStrictEqual([A.PLAN.Pro.db_limit_mb, A.PLAN.Pro.storage_limit_mb, A.PLAN.Pro.egress_limit_gb], [8192, 102400, 250]);
assert.strictEqual(A.VARSAYILAN.uyari_yuzde, 80);
assert.strictEqual(A.VARSAYILAN.kritik_yuzde, 95);
assert.strictEqual(A.VARSAYILAN.esik_kaynak, 'uzman tahmini');
assert.match(A.VARSAYILAN.kaynak, /supabase\.com\/pricing/);

// Seviye
assert.strictEqual(A.seviye(null), null);
assert.strictEqual(A.seviye(79.9), 'normal');
assert.strictEqual(A.seviye(80), 'uyari');
assert.strictEqual(A.seviye(94.9), 'uyari');
assert.strictEqual(A.seviye(95), 'kritik');
assert.strictEqual(A.seviye(70, { uyari_yuzde: 60, kritik_yuzde: 90 }), 'uyari');
assert.strictEqual(A.yuzde(400 * MB, 500 * MB), 80);
assert.strictEqual(A.yuzde(null, 500), null);

// Eğilim: günde 10 MB artış, 400 MB'tan 500 MB sınıra → 10 gün
const G = [0, 1, 2, 3].map(i => ({ gun: '2026-10-1' + i, v: (370 + i * 10) * MB }));
assert.ok(Math.abs(A.egim(G) - 10 * MB) < 1);
assert.strictEqual(A.dolmaGun(G, 400 * MB, 500 * MB), 10);
assert.strictEqual(A.dolmaGun(G.slice(0, 1), 400 * MB, 500 * MB), null);               // tek gün → Veri yok
assert.strictEqual(A.dolmaGun(G.map(x => ({ gun: x.gun, v: 5 })), 5, 500), Infinity);   // artış yok
assert.match(A.egilimMetin(10), /yaklaşık 10 gün sonra dolar \(uzman tahmini\)/);
assert.match(A.egilimMetin(null, 1), /Veri yok/);
assert.match(A.egilimMetin(Infinity), /artış yok/);

// Satırlar + egress Veri yok + en kötü seviye
const gecmis = [0, 1, 2, 3].map(i => ({ gun: '2026-10-1' + i, db_bytes: (370 + i * 10) * MB, storage_bytes: (900 + i) * MB }));
const rows = A.satirlar({ db_bytes: 400 * MB, storage_bytes: 980 * MB, egress_bytes: null, gecmis });
assert.strictEqual(rows.length, 3);
assert.strictEqual(rows[0].seviye, 'uyari');
assert.strictEqual(rows[0].gun, 10);
assert.strictEqual(rows[1].seviye, 'kritik');
assert.strictEqual(rows[2].kullanim, null);
assert.strictEqual(rows[2].seviye, null);
assert.strictEqual(rows[2].limit, 5 * GB);
assert.strictEqual(A.enKotu(rows), 'kritik');
assert.strictEqual(A.enKotu(A.satirlar({ db_bytes: 1, storage_bytes: 1 })), null);
// Pro ayarıyla aynı kullanım normal
assert.strictEqual(A.enKotu(A.satirlar({ db_bytes: 400 * MB, storage_bytes: 980 * MB, ayar: Object.assign({}, A.VARSAYILAN, A.PLAN.Pro) })), null);

// Ayar doğrulama
assert.deepStrictEqual(A.ayarDogrula(A.VARSAYILAN), []);
assert.ok(A.ayarDogrula(Object.assign({}, A.VARSAYILAN, { kritik_yuzde: 70 })).includes('kritik_yuzde'));
assert.ok(A.ayarDogrula(Object.assign({}, A.VARSAYILAN, { db_limit_mb: 0 })).includes('db_limit_mb'));
assert.strictEqual(A.boyut(null), 'Veri yok');
assert.strictEqual(A.boyut(1024 * MB), '1 GB');

// Migration: yalnız yönetici, security definer, günlük iş, egress Veri yok, e-posta yok
const mig = fs.readdirSync(path.join(R, 'supabase/migrations')).find(f => /alan_kullanimi\.sql$/.test(f));
assert.ok(mig, 'migration var');
const sql = fs.readFileSync(path.join(R, 'supabase/migrations', mig), 'utf8');
assert.match(sql, /function public\.sa_alan_kullanimi\(\)[\s\S]*?security definer[\s\S]*?if not public\.sa_is_admin\(\)/);
assert.match(sql, /pg_database_size\(current_database\(\)\)/);
assert.match(sql, /storage\.objects/);
assert.match(sql, /revoke all on function public\.sa_alan_olc_ic\(\) from public, anon, authenticated/);
assert.match(sql, /cron\.schedule\('sa-alan-gunluk'/);
assert.match(sql, /sa_yonetici_bildirim/);
assert.match(sql, /db_limit_mb numeric not null default 500/);
assert.match(sql, /storage_limit_mb numeric not null default 1024/);
assert.match(sql, /uyari_yuzde int not null default 80/);
assert.match(sql, /kritik_yuzde int not null default 95/);
assert.match(sql, /'sa_alan_ayar', jsonb_build_object/);   // değişiklik kaydı
assert.match(sql, /Veri yok/);
assert.doesNotMatch(sql, /net\.http_post|smtp|resend/i);
['sa_alan_ayar', 'sa_alan_olcum', 'sa_yonetici_bildirim'].forEach(t => assert.match(sql, new RegExp('create policy \\w+ on public\\.' + t + ' for select to authenticated using \\(public\\.sa_is_admin\\(\\)\\)')));

// Panel bağlantısı + değişiklik kaydı adı
const idx = fs.readFileSync(path.join(R, 'apps/yonetici/index.html'), 'utf8');
assert.ok(/load\('alan\.js\?v=koloni-\d+'\)/.test(idx), 'index.html alan.js yükler');
const dk = fs.readFileSync(path.join(R, 'apps/yonetici/degisiklik-kaydi.js'), 'utf8');
assert.ok(dk.includes("sa_alan_ayar: 'Alan sınırları ve uyarı eşikleri'"));
assert.ok(dk.includes("uyari_yuzde: 'Uyarı eşiği (%)'"));
console.log('k240 alan kullanımı: ok');
