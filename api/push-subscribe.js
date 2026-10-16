/**
 * SüperArı — Web Push aboneliği.
 * GET  /api/push-subscribe            → { enabled, publicKey }
 * POST /api/push-subscribe            başlık «Authorization: Bearer <Supabase erişim belirteci>» (yalnız giriş yapmış kullanıcı)
 *   { action:'subscribe', subscription }   → aboneliği kaydet (kendi satırı)
 *   { action:'unsubscribe', endpoint }     → sil
 *   { action:'test' }                      → kullanıcının cihazlarına deneme bildirimi
 *   { action:'check' }                     → sağlık/oğul/sensör uyarılarını hemen denetle (Kontrol/Müdahale'ye düşünce uygulama çağırır; push_log tekrarı önler)
 */
const L = require('./_push-lib');
const R = require('./_push-rules');
const RUN = require('./_push-run');

/* Kullanıcı kategorileri: yalnız aç/kapa. Eşikler yönetici panelinde. */
const KATLAR = ['saglik', 'ogul', 'gorev', 'sensor'];
const KAT_OF = { task: 'gorev', withdrawal: 'gorev', egg: 'gorev', queen: 'gorev', health: 'saglik', oto: 'saglik', swarm: 'ogul', sensor: 'sensor' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports = async function handler(req, res) {
  const c = L.conf();
  const enabled = !!(c.vapidPublic && c.vapidPrivate && c.pg && c.url);
  if (req.method === 'GET') return L.send(res, 200, { enabled, publicKey: enabled ? c.vapidPublic : null });
  if (req.method !== 'POST') return L.send(res, 405, { error: 'yalniz GET/POST' });
  if (!enabled) return L.send(res, 503, { error: 'bildirim sunucusu kapali' });
  if (req.method === 'POST' && req.url && /[?&]ack=1/.test(req.url)) {
    /* SW «bildirim cihaza ulaştı» der (giriş gerekmez; yalnız bilinen, 2 gün içindeki gonderildi satırı güncellenir). */
    const b = await L.readBody(req), id = String(b.lid || '');
    if (!UUID.test(id)) return L.send(res, 400, { error: 'gecersiz' });
    const r = await L.withDb((db) => db.query("update public.push_teslim set durum = 'teslim_edildi', teslim_at = now() where id = $1 and durum = 'gonderildi' and created_at > now() - interval '2 days'", [id])).catch(() => ({ rowCount: 0 }));
    return L.send(res, 200, { ok: r.rowCount > 0 });
  }
  const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''));
  const user = m ? await L.userFromToken(m[1].trim()).catch(() => null) : null;
  if (!user) return L.send(res, 401, { error: 'giris gerekli' });
  const body = await L.readBody(req);
  const action = String(body.action || 'subscribe');
  try {
    if (action === 'subscribe') {
      const s = body.subscription || {};
      const endpoint = String(s.endpoint || ''), keys = s.keys || {};
      if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys.p256dh || !keys.auth) return L.send(res, 400, { error: 'gecersiz abonelik' });
      await L.withDb((db) => db.query(
        `insert into public.push_subscriptions (endpoint, user_id, keys, ua) values ($1, $2, $3, $4)
         on conflict (endpoint) do update set user_id = excluded.user_id, keys = excluded.keys, ua = excluded.ua, fail_count = 0`,
        [endpoint, user.id, JSON.stringify({ p256dh: String(keys.p256dh), auth: String(keys.auth) }), String(req.headers['user-agent'] || '').slice(0, 200)]));
      return L.send(res, 200, { ok: true });
    }
    if (action === 'unsubscribe') {
      const endpoint = String(body.endpoint || '');
      const r = await L.withDb((db) => db.query('delete from public.push_subscriptions where endpoint = $1 and user_id = $2', [endpoint, user.id]));
      return L.send(res, 200, { ok: true, removed: r.rowCount });
    }
    if (action === 'test') {
      if (!L.vapidReady()) return L.send(res, 503, { error: 'vapid yok' });
      const r = await L.withDb((db) => L.sendToUser(db, user.id, { title: 'SüperArı · test bildirimi', body: 'Bildirimler çalışıyor 🐝 Uygulama kapalıyken de hatırlatmalar gelecek.', url: '/ayarlar.html?konu=bildirim', tag: 'deneme', cat: 'test' }));
      return L.send(res, 200, Object.assign({ ok: r.ok > 0 }, r));
    }
    if (action === 'prefs') {
      const r = await L.withDb(async (db) => {
        if (Array.isArray(body.kapali)) {
          const k = body.kapali.map(String).filter((x) => KATLAR.indexOf(x) >= 0);
          await db.query('insert into public.push_tercih (user_id, kapali) values ($1, $2) on conflict (user_id) do update set kapali = excluded.kapali, updated_at = now()', [user.id, k]);
        }
        const q = await db.query('select kapali from public.push_tercih where user_id = $1', [user.id]);
        const n = await db.query('select count(*)::int n from public.push_subscriptions where user_id = $1', [user.id]);
        return { kapali: q.rows[0] ? q.rows[0].kapali : [], cihaz: n.rows[0].n };
      });
      return L.send(res, 200, Object.assign({ ok: true, katlar: KATLAR }, r));
    }
    if (action === 'alert') {
      /* Uygulamada üretilen otomatik hatırlatmalar (kireç, kuluçka sıcaklığı, varroa sayımı, genel kontrol): sunucu push_log ile bir kez gönderir. */
      if (!L.vapidReady()) return L.send(res, 503, { error: 'vapid yok' });
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map((x) => ({ id: String(x && x.id || '').slice(0, 120), sig: String(x && x.sig || '').slice(0, 40), text: String(x && x.title || '').slice(0, 160) })).filter((x) => /^kr-/.test(x.id) && x.text);
      if (!items.length) return L.send(res, 200, { ok: true, notifications: 0 });
      const r = await L.withDb(async (db) => {
        const t = await db.query('select kapali from public.push_tercih where user_id = $1', [user.id]);
        if (t.rows[0] && t.rows[0].kapali.indexOf('saglik') >= 0) return { notifications: 0, kapali: true };
        const keys = items.map((x) => 'oto:' + x.id + ':' + x.sig);
        const ins = await db.query('insert into public.push_log (user_id, dedupe_key, title) select $1, k, $3 from unnest($2::text[]) k on conflict do nothing returning dedupe_key', [user.id, keys, 'oto']);
        const yeni = new Set(ins.rows.map((x) => x.dedupe_key)), fresh = items.filter((x, i) => yeni.has(keys[i]));
        if (!fresh.length) return { notifications: 0 };
        const one = fresh.length === 1;
        const s = await L.sendToUser(db, user.id, { title: one ? '🩺 Kovan hatırlatması' : '🩺 ' + fresh.length + ' kovan hatırlatması', body: fresh.slice(0, 4).map((x) => x.text).join('\n') + (fresh.length > 4 ? '\n+' + (fresh.length - 4) + ' daha' : ''), url: '/gorevler.html', tag: 'superari-oto', cat: 'saglik' });
        return { notifications: 1, delivered: s.ok };
      });
      return L.send(res, 200, Object.assign({ ok: true }, r));
    }
    if (action === 'check') {
      if (!L.vapidReady() || !c.service) return L.send(res, 503, { error: 'yapilandirma eksik' });
      const r = await L.withDb((db) => RUN.runForUser(db, c, user.id, R.istanbulToday(), false, ['health', 'swarm', 'sensor']));
      return L.send(res, 200, Object.assign({ ok: true }, r));
    }
    return L.send(res, 400, { error: 'bilinmeyen islem' });
  } catch (e) {
    return L.send(res, 500, { error: 'sunucu hatasi', detail: String(e && e.message || e).slice(0, 200) });
  }
};
