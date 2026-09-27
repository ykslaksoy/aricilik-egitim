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

function safeEq(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
async function rest(c, path) {
  const r = await fetch(c.url + '/rest/v1/' + path, { headers: { apikey: c.service, Authorization: 'Bearer ' + c.service, Accept: 'application/json' } });
  if (!r.ok) throw new Error('rest ' + r.status + ' ' + path.split('?')[0]);
  return r.json();
}
async function userData(c, uid, today) {
  const mem = await rest(c, 'apiary_members?select=apiary_id&user_id=eq.' + uid);
  const aps = mem.map((m) => m.apiary_id).filter(Boolean);
  const scope = aps.length ? 'or=(apiary_id.in.(' + aps.join(',') + '),owner_id.eq.' + uid + ')' : 'owner_id=eq.' + uid;
  const since = R.addDays(today, -150);
  const [hives, tasks, records] = await Promise.all([
    aps.length ? rest(c, 'hives?select=key,local_id,name,data,deleted&deleted=eq.false&apiary_id=in.(' + aps.join(',') + ')') : [],
    rest(c, 'tasks?select=key,local_id,kind,due,data,deleted&deleted=eq.false&' + scope),
    rest(c, 'records?select=key,local_id,hive_key,kind,record_date,data,deleted&deleted=eq.false&kind=in.(disease,colony_event)&record_date=gte.' + since + '&' + scope)
  ]);
  return { hives, tasks, records };
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
          const data = await userData(c, uid, today);
          const all = R.items(data, today);
          let fresh = all;
          if (all.length) {
            const keys = all.map((x) => x.key);
            const seen = new Set((await db.query('select dedupe_key from public.push_log where user_id = $1 and dedupe_key = any($2)', [uid, keys])).rows.map((r) => r.dedupe_key));
            fresh = all.filter((x) => !seen.has(x.key));
          }
          const notes = R.group(fresh);
          if (dry) { (report.preview = report.preview || []).push({ user: uid.slice(0, 8), items: all.length, fresh: fresh.length, notes: notes.map((n) => ({ title: n.title, body: n.body })) }); continue; }
          for (const n of notes) {
            /* önce günlüğe yaz (en çok bir kez), sonra gönder */
            const ins = await db.query(
              'insert into public.push_log (user_id, dedupe_key, title) select $1, k, $3 from unnest($2::text[]) k on conflict do nothing returning dedupe_key', [uid, n.keys, n.title]);
            if (!ins.rowCount) continue;
            const r = await L.sendToUser(db, uid, { title: n.title, body: n.body, url: n.url, tag: n.tag, urgent: n.urgent });
            report.notifications++; report.delivered += r.ok;
          }
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
