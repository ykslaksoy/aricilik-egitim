/**
 * SüperArı — arka plan bildirim kuralları (saf fonksiyonlar; node testi: apps/web/tests/push-rules.test.js).
 * Girdi: kullanıcının buluttaki satırları (yalnız Canlı veriler buluta yüklenir; demo hiç gelmez).
 * items(): tekil uyarılar { cat, key (tekrar önleme), hiveId, text, url } ; group(): kategori başına tek bildirim.
 */
const DAY = 86400000;
function addDays(iso, n) { const d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z'); if (isNaN(d)) return null; return new Date(d.getTime() + n * DAY).toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / DAY); }
function istanbulToday(now) { return new Date((now || Date.now()) + 3 * 3600 * 1000).toISOString().slice(0, 10); }
function fmt(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
function localOf(ref) { const s = String(ref == null ? '' : ref); const i = s.lastIndexOf(':'); return i >= 0 ? s.slice(i + 1) : s; }
function hkOf(ref) { const s = String(ref == null ? '' : ref); return s.indexOf('hk:') === 0 ? s.slice(3) : s; }
function isoWeek(iso) { const d = new Date(iso + 'T00:00:00Z'); const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - (d.getUTCDay() || 7))); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + 'W' + Math.ceil(((t - y0) / DAY + 1) / 7); }

/**
 * @param {{hives:Array, tasks:Array, records:Array}} d
 * @param {string} today YYYY-MM-DD (İstanbul)
 */
function items(d, today) {
  const out = [], hives = {}, byLocal = {};
  (d.hives || []).forEach((h) => { if (!h || h.deleted) return; hives[h.key] = h; byLocal[String(h.local_id)] = h; });
  const hiveName = (ref) => { const h = hives[hkOf(ref)] || byLocal[localOf(ref)]; return h ? (h.name || ('Kovan ' + h.local_id)) : ''; };
  const hiveUrl = (ref) => { const l = localOf(ref); return l ? '/kovan.html?id=' + encodeURIComponent(l) : '/kovanlar.html'; };
  const live = (x) => x && !x.deleted && !(x.data && x.data.demo);

  /* 1) Görevler: tarihi gelmiş / gecikmiş açık görevler */
  const done = {};
  (d.tasks || []).forEach((t) => { if (live(t) && t.kind === 'tamamlama') done[String(t.local_id).replace(/^done:/, '')] = 1; });
  (d.tasks || []).forEach((t) => {
    if (!live(t) || t.kind !== 'gorev') return;
    const x = t.data || {}, id = String(t.local_id), due = String(t.due || x.due || '').slice(0, 10);
    if (done[id] || x.done || x.completed || !due || due > today) return;
    if (/^kr-(bekleme-bitti|ana-yenile)-/.test(id)) return; /* aşağıdaki kurallar karşılar */
    const late = diffDays(today, due);
    if (late > 30) return;
    const hn = x.hiveId != null ? hiveName(x.hiveId) : '';
    const title = String(x.title || 'Görev');
    out.push({ cat: 'task', key: 'task:' + t.key + ':' + due, text: title + (hn && title.indexOf(hn) < 0 ? ' · ' + hn : '') + (late > 0 ? ' (' + late + ' gün gecikti)' : ' (bugün)'), url: '/gorevler.html' });
    if (late >= 3) out.push({ cat: 'task', key: 'task:' + t.key + ':' + due + ':r3', text: title + ' (' + late + ' gün gecikti)', url: '/gorevler.html', reminder: true });
  });

  const recs = (d.records || []).filter(live);
  /* 2) İlaç bekleme süresi bitişi */
  recs.forEach((r) => {
    if (r.kind !== 'disease') return;
    const x = r.data || {}, days = Number(x.withdrawalDays);
    if (!(days > 0)) return;
    const until = addDays(x.date || r.record_date, days);
    if (!until || until > today || diffDays(today, until) > 3) return;
    const ref = r.hive_key || x.hiveId, hn = hiveName(ref);
    out.push({ cat: 'withdrawal', key: 'wd:' + r.key, hiveId: localOf(ref), text: (hn || 'Kovan') + ': ' + (x.treatment ? x.treatment + ' ' : '') + 'bekleme süresi ' + fmt(until) + ' bitti, bal hasadı yapılabilir', url: hiveUrl(ref) });
  });
  /* 3) Oğul verdi → 21. gün yumurta kontrolü (kaynak kovan yeni ana yetiştiriyor) */
  recs.forEach((r) => {
    if (r.kind !== 'colony_event') return;
    const x = r.data || {};
    if (x.type !== 'ogul' || x.fromHiveId == null) return;
    const d21 = addDays(x.date || r.record_date, 21);
    if (!d21 || d21 > today || diffDays(today, d21) > 5) return;
    const hn = hiveName(x.fromHiveId);
    out.push({ cat: 'egg', key: 'egg:' + r.key, hiveId: localOf(x.fromHiveId), text: (hn || 'Kovan') + ': oğuldan 21 gün geçti, yeni ana yumurtluyor mu bakın', url: hiveUrl(x.fromHiveId) });
  });
  /* 4) Ana arı yenileme (2 yaş ve üstü; Mart–Eylül; yılda bir kez) */
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));
  if (month >= 3 && month <= 9) {
    Object.keys(hives).forEach((k) => {
      const h = hives[k], x = h.data || {}, qy = Number(x.queenYear);
      if (!(qy > 1990) || year - qy < 2 || x.queenless) return;
      out.push({ cat: 'queen', key: 'requeen:' + k + ':' + year, hiveId: String(h.local_id), text: (h.name || 'Kovan ' + h.local_id) + ' · ana ' + qy + ' yılından (' + (year - qy) + ' yaş)', url: '/gorevler.html#queenTasks' });
    });
  }
  /* 5) Sağlık skoru (skor geçmişi kayıtları) ve oğul riski */
  const snaps = recs.filter((r) => r.kind === 'colony_event' && r.data && r.data.type === 'saglik')
    .sort((a, b) => String(a.data.at || a.record_date).localeCompare(String(b.data.at || b.record_date)));
  const byHive = {};
  snaps.forEach((r) => { const ref = hkOf(r.hive_key || r.data.hiveId); (byHive[ref] = byHive[ref] || []).push(r); });
  Object.keys(byHive).forEach((ref) => {
    const list = byHive[ref], last = list[list.length - 1], prev = list.length > 1 ? list[list.length - 2] : null, x = last.data;
    const date = String(x.at || last.record_date).slice(0, 10);
    if (diffDays(today, date) > 3) return;
    const hn = hiveName(ref) || x.hiveName || 'Kovan';
    const bad = x.status === 'Kontrol' || x.status === 'Müdahale';
    if (bad && (!prev || prev.data.status !== x.status)) {
      out.push({ cat: 'health', key: 'health:' + last.key, hiveId: localOf(ref), text: hn + ': sağlık ' + x.status + ' (' + x.score + ')' + (x.reasons && x.reasons[0] ? ' · ' + x.reasons[0] : ''), url: hiveUrl(ref), urgent: x.status === 'Müdahale' });
    }
    if (x.swarm === 'Yüksek' || x.swarm === 'Acil') {
      out.push({ cat: 'swarm', key: 'swarm:' + ref + ':' + isoWeek(today), hiveId: localOf(ref), text: hn + ': oğul riski ' + x.swarm.toLocaleLowerCase('tr'), url: hiveUrl(ref) });
    }
  });
  /* 6) Sensör uyarıları (ileride cihazdan gelen colony_event type 'sensor_alert') */
  recs.forEach((r) => {
    if (r.kind !== 'colony_event' || !r.data || r.data.type !== 'sensor_alert') return;
    const date = String(r.data.at || r.record_date).slice(0, 10);
    if (diffDays(today, date) > 1) return;
    const ref = r.hive_key || r.data.hiveId;
    out.push({ cat: 'sensor', key: 'sensor:' + r.key, hiveId: localOf(ref), text: (hiveName(ref) || 'Kovan') + ': ' + (r.data.text || 'sensör uyarısı'), url: hiveUrl(ref) });
  });
  return out;
}

const CAT = {
  task: { one: '📋 Görev zamanı', many: (n) => '📋 ' + n + ' görev bekliyor', url: '/gorevler.html' },
  withdrawal: { one: '💊 İlaç bekleme süresi bitti', many: (n) => '💊 ' + n + ' kovanda bekleme süresi bitti', url: '/gorevler.html' },
  egg: { one: '🥚 Yumurta kontrolü zamanı', many: (n) => '🥚 ' + n + ' kovanda yumurta kontrolü', url: '/bakim.html' },
  queen: { one: '👑 Ana arı yenileme', many: (n) => '👑 ' + n + ' kovanda ana arı yenilenmeli', url: '/gorevler.html#queenTasks' },
  health: { one: '🩺 Sağlık uyarısı', many: (n) => '🩺 ' + n + ' kovanda sağlık uyarısı', url: '/saglik.html' },
  swarm: { one: '🐝 Oğul riski yüksek', many: (n) => '🐝 ' + n + ' kovanda oğul riski yüksek', url: '/kovanlar.html' },
  sensor: { one: '📡 Sensör uyarısı', many: (n) => '📡 ' + n + ' sensör uyarısı', url: '/kovanlar.html' }
};
/** Yeni (daha önce gönderilmemiş) uyarıları kategori başına tek bildirimde toplar. */
function group(list) {
  const by = {};
  list.forEach((it) => { (by[it.cat] = by[it.cat] || []).push(it); });
  return Object.keys(by).map((cat) => {
    const xs = by[cat], c = CAT[cat] || CAT.task;
    const uniq = []; const seen = {};
    xs.forEach((x) => { const k = x.text; if (!seen[k]) { seen[k] = 1; uniq.push(x); } });
    const one = uniq.length === 1;
    return {
      title: one ? c.one : c.many(uniq.length),
      body: uniq.slice(0, 4).map((x) => x.text).join('\n') + (uniq.length > 4 ? '\n+' + (uniq.length - 4) + ' daha' : ''),
      url: one ? uniq[0].url : c.url,
      tag: 'superari-' + cat,
      urgent: xs.some((x) => x.urgent),
      keys: xs.map((x) => x.key)
    };
  });
}
module.exports = { items, group, istanbulToday, addDays };
