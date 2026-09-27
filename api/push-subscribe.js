/**
 * SüperArı — Web Push aboneliği.
 * GET  /api/push-subscribe            → { enabled, publicKey }
 * POST /api/push-subscribe            başlık «Authorization: Bearer <Supabase erişim belirteci>» (yalnız giriş yapmış kullanıcı)
 *   { action:'subscribe', subscription }   → aboneliği kaydet (kendi satırı)
 *   { action:'unsubscribe', endpoint }     → sil
 *   { action:'test' }                      → kullanıcının cihazlarına deneme bildirimi
 */
const L = require('./_push-lib');

module.exports = async function handler(req, res) {
  const c = L.conf();
  const enabled = !!(c.vapidPublic && c.vapidPrivate && c.pg && c.url);
  if (req.method === 'GET') return L.send(res, 200, { enabled, publicKey: enabled ? c.vapidPublic : null });
  if (req.method !== 'POST') return L.send(res, 405, { error: 'yalniz GET/POST' });
  if (!enabled) return L.send(res, 503, { error: 'bildirim sunucusu kapali' });
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
      const r = await L.withDb((db) => L.sendToUser(db, user.id, { title: 'SüperArı · deneme bildirimi', body: 'Bildirimler çalışıyor 🐝 Uygulama kapalıyken de görev ve uyarılar gelecek.', url: '/hesap.html', tag: 'deneme' }));
      return L.send(res, 200, Object.assign({ ok: r.ok > 0 }, r));
    }
    return L.send(res, 400, { error: 'bilinmeyen islem' });
  } catch (e) {
    return L.send(res, 500, { error: 'sunucu hatasi', detail: String(e && e.message || e).slice(0, 200) });
  }
};
