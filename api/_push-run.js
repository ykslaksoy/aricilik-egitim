/** SüperArı — tek kullanıcı için bildirim kurallarını çalıştır (cron ve «hemen denetle» ortak). */
const L = require('./_push-lib');
const R = require('./_push-rules');

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

async function runForUser(db, c, uid, today, dry, onlyCats) {
  const data = await userData(c, uid, today);
  const all = R.items(data, today).filter((x) => !onlyCats || onlyCats.indexOf(x.cat) >= 0);
  let fresh = all;
  if (all.length) {
    const keys = all.map((x) => x.key);
    const seen = new Set((await db.query('select dedupe_key from public.push_log where user_id = $1 and dedupe_key = any($2)', [uid, keys])).rows.map((r) => r.dedupe_key));
    fresh = all.filter((x) => !seen.has(x.key));
  }
  const notes = R.group(fresh);
  const out = { notifications: 0, delivered: 0 };
  if (dry) { out.preview = { user: String(uid).slice(0, 8), items: all.length, fresh: fresh.length, notes: notes.map((n) => ({ title: n.title, body: n.body })) }; return out; }
  for (const n of notes) {
    /* önce günlüğe yaz (en çok bir kez), sonra gönder */
    const ins = await db.query(
      'insert into public.push_log (user_id, dedupe_key, title) select $1, k, $3 from unnest($2::text[]) k on conflict do nothing returning dedupe_key', [uid, n.keys, n.title]);
    if (!ins.rowCount) continue;
    const r = await L.sendToUser(db, uid, { title: n.title, body: n.body, url: n.url, tag: n.tag, urgent: n.urgent });
    out.notifications++; out.delivered += r.ok;
  }
  return out;
}
module.exports = { runForUser, userData };
