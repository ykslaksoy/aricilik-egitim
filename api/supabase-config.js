/**
 * SüperArı — bulut (Supabase) istemci ayarı.
 * Yalnız herkese açık değerleri döndürür: proje adresi + anon (publishable) anahtar.
 * Vercel ortam değişkenleri (Supabase Marketplace entegrasyonu bunları otomatik ekler):
 *   SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_ANON_KEY | NEXT_PUBLIC_SUPABASE_ANON_KEY | SUPABASE_PUBLISHABLE_KEY | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   (önekli de olabilir: Repo_SUPABASE_URL, NEXT_PUBLIC_Repo_SUPABASE_ANON_KEY …)
 * Gizli anahtarlar (service_role / sb_secret_) asla döndürülmez.
 * Değerler yoksa { enabled:false } döner ve uygulama bulut olmadan (bugünkü gibi) çalışır.
 */
function pick(env, names) {
  for (const n of names) {
    const v = env[n];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}
function isSecretKey(key) {
  if (/^sb_secret_/i.test(key)) return true;
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (payload && payload.role && payload.role !== 'anon') return true;
    } catch (e) { /* çözülemedi: aşağıdaki denetimlere bırak */ }
  }
  return false;
}
/* Marketplace entegrasyonu özel önekle kurulabilir (ör. «Repo_SUPABASE_URL», «NEXT_PUBLIC_Repo_SUPABASE_ANON_KEY»).
 * Önce bilinen adlar, sonra «…SUPABASE_URL» / «…SUPABASE_ANON_KEY» / «…SUPABASE_PUBLISHABLE_KEY» ile biten herhangi bir ad. */
function pickSuffix(env, suffixes) {
  const keys = Object.keys(env).sort();
  for (const sfx of suffixes) {
    for (const k of keys) {
      if (k === sfx || k.endsWith('_' + sfx)) {
        const v = env[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
    }
  }
  return '';
}
function config(env) {
  const url = (pick(env, ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'Repo_SUPABASE_URL', 'NEXT_PUBLIC_Repo_SUPABASE_URL']) ||
    pickSuffix(env, ['SUPABASE_URL'])).replace(/\/+$/, '');
  const key = pick(env, ['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'Repo_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_Repo_SUPABASE_ANON_KEY', 'Repo_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_Repo_SUPABASE_PUBLISHABLE_KEY']) ||
    pickSuffix(env, ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY']);
  const urlOk = /^https:\/\/[^\s/]+$/i.test(url);
  const keyOk = key.length >= 20 && !isSecretKey(key);
  if (urlOk && keyOk) return { enabled: true, url: url, anonKey: key, source: 'vercel-env' };
  return { enabled: false, hasUrl: !!url, hasKey: !!key, reason: !url || !key ? 'eksik' : (!urlOk ? 'adres' : 'anahtar') };
}
module.exports = function handler(req, res) {
  const body = JSON.stringify(config(process.env || {}));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
};
module.exports.config = config;
