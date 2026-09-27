/**
 * SüperArı — Web Push ortak yardımcıları (Vercel sunucusu; «_» ile başlayan dosya rota değildir).
 * push_subscriptions / push_log tabloları ilk kullanımda (idempotent) oluşturulur; Supabase Postgres bağlantısı
 * Vercel ↔ Supabase entegrasyonunun ortam değişkeninden okunur (Repo_POSTGRES_URL…). Anahtarlar asla yanıta konmaz.
 */
const webpush = require('web-push');
const { Client } = require('pg');

function pickSuffix(env, names, suffixes) {
  for (const n of names) { const v = env[n]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  const keys = Object.keys(env).sort();
  for (const sfx of suffixes) for (const k of keys) {
    if (k === sfx || k.endsWith('_' + sfx)) { const v = env[k]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  }
  return '';
}
function conf() {
  const env = process.env || {};
  return {
    url: pickSuffix(env, ['SUPABASE_URL', 'Repo_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'], ['SUPABASE_URL']).replace(/\/+$/, ''),
    service: pickSuffix(env, ['SUPABASE_SERVICE_ROLE_KEY', 'Repo_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'], ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY']),
    anon: pickSuffix(env, ['SUPABASE_ANON_KEY', 'Repo_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_Repo_SUPABASE_ANON_KEY'], ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY']),
    pg: pickSuffix(env, ['POSTGRES_URL_NON_POOLING', 'Repo_POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'Repo_POSTGRES_URL'], ['POSTGRES_URL_NON_POOLING', 'POSTGRES_URL']),
    vapidPublic: String(env.VAPID_PUBLIC_KEY || '').trim(),
    vapidPrivate: String(env.VAPID_PRIVATE_KEY || '').trim(),
    vapidSubject: String(env.VAPID_SUBJECT || 'https://superari.vercel.app').trim(),
    cronSecret: String(env.CRON_SECRET || '').trim()
  };
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(obj));
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

const SCHEMA_SQL = `
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  keys jsonb not null,
  ua text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fail_count integer not null default 0
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create table if not exists public.push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  title text,
  sent_at timestamptz not null default now(),
  primary key (user_id, dedupe_key)
);
alter table public.push_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'push_subscriptions_own') then
    create policy push_subscriptions_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_log' and policyname = 'push_log_own_read') then
    create policy push_log_own_read on public.push_log for select to authenticated using (user_id = auth.uid());
  end if;
end $$;
`;
let schemaDone = false;
async function withDb(fn) {
  const c = conf();
  if (!c.pg) throw new Error('veritabani baglantisi yok');
  let cs = c.pg;
  try { const u = new URL(cs); u.searchParams.delete('sslmode'); u.searchParams.delete('supa'); cs = u.toString(); } catch (e) { /* ignore */ }
  const db = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, statement_timeout: 15000, connectionTimeoutMillis: 10000 });
  await db.connect();
  try {
    if (!schemaDone) { await db.query(SCHEMA_SQL); schemaDone = true; }
    return await fn(db);
  } finally { try { await db.end(); } catch (e) { /* ignore */ } }
}
/** Supabase erişim belirteci → kullanıcı { id, email } (geçersizse null). */
async function userFromToken(token) {
  const c = conf();
  if (!token || !c.url) return null;
  const r = await fetch(c.url + '/auth/v1/user', { headers: { apikey: c.anon || c.service, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? { id: u.id, email: u.email } : null;
}
function vapidReady() {
  const c = conf();
  if (!c.vapidPublic || !c.vapidPrivate) return false;
  webpush.setVapidDetails(c.vapidSubject.indexOf('mailto:') === 0 || /^https?:/.test(c.vapidSubject) ? c.vapidSubject : 'mailto:' + c.vapidSubject, c.vapidPublic, c.vapidPrivate);
  return true;
}
/** Kullanıcının tüm aboneliklerine gönder; 404/410 dönen (süresi dolmuş) abonelik silinir. */
async function sendToUser(db, userId, payload) {
  const subs = (await db.query('select endpoint, keys from public.push_subscriptions where user_id = $1', [userId])).rows;
  let ok = 0, gone = 0, fail = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 60 * 60 * 20, urgency: 'normal', topic: payload.tag ? String(payload.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) : undefined });
      ok++; await db.query('update public.push_subscriptions set last_ok_at = now(), fail_count = 0 where endpoint = $1', [s.endpoint]);
    } catch (e) {
      const sc = e && e.statusCode;
      if (sc === 404 || sc === 410) { gone++; await db.query('delete from public.push_subscriptions where endpoint = $1', [s.endpoint]); }
      else { fail++; await db.query('update public.push_subscriptions set fail_count = fail_count + 1 where endpoint = $1', [s.endpoint]); }
    }
  }
  return { subs: subs.length, ok, gone, fail };
}
module.exports = { conf, send, readBody, withDb, userFromToken, vapidReady, sendToUser, SCHEMA_SQL };
