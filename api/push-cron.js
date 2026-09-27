/**
 * SüperArı — zamanlanmış arka plan bildirimleri (Vercel Cron: 07:00 ve 19:00 İstanbul).
 * Yetki: «Authorization: Bearer <CRON_SECRET>» (Vercel Cron bunu kendisi ekler).
 * Aboneliği olan her kullanıcı için buluttaki (yalnız Canlı) görev/kayıtları okur, kuralları uygular (_push-rules.js),
 * push_log ile tekrar önler (aynı uyarı ikinci kez gönderilmez) ve Web Push gönderir.
 * ?dry=1 → göndermeden ve günlüğe yazmadan önizleme.
 */
const crypto = require('crypto');
const L = require('./_push-lib');
const R = require('./_push-rules');
const RUN = require('./_push-run');

function safeEq(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
module.exports = async function handler(req, res) {
  const c = L.conf();
  if (!c.cronSecret || c.cronSecret.length < 16) return L.send(res, 404, { error: 'kapali' });
  const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''));
  if (!m || !safeEq(m[1].trim(), c.cronSecret)) return L.send(res, 401, { error: 'yetkisiz' });
  if (!c.url || !c.service || !L.vapidReady()) return L.send(res, 503, { error: 'yapilandirma eksik' });
  const q = new URL(req.url, 'http://x').searchParams;
  const dry = q.get('dry') === '1';
  const today = /^\d{4}-\d{2}-\d{2}$/.test(q.get('today') || '') ? q.get('today') : R.istanbulToday();
  const report = { today, dry, users: 0, notifications: 0, delivered: 0, errors: [] };
  try {
    await L.withDb(async (db) => {
      const users = (await db.query('select distinct user_id from public.push_subscriptions')).rows.map((r) => r.user_id);
      report.users = users.length;
      for (const uid of users) {
        try {
          const r = await RUN.runForUser(db, c, uid, today, dry);
          if (dry) (report.preview = report.preview || []).push(r.preview);
          report.notifications += r.notifications; report.delivered += r.delivered;
        } catch (e) { report.errors.push(String(e && e.message || e).slice(0, 120)); }
      }
      /* eski günlükleri temizle (120 gün) */
      if (!dry) await db.query("delete from public.push_log where sent_at < now() - interval '120 days'");
    });
  } catch (e) {
    report.errors.push(String(e && e.message || e).slice(0, 160));
    return L.send(res, 500, report);
  }
  return L.send(res, 200, report);
};
