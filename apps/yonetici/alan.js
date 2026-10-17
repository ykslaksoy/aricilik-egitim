/* koloni-240: Yönetici · Alan kullanımı (Supabase kotası) + uyarı.
 * Veritabanı boyutu (pg_database_size), Storage kova toplamları (storage.objects metadata.size), sunucu yedekleri (sa_yedek tablosu, veritabanı içinde),
 * veri çıkışı (egress; veritabanından okunamaz → «Veri yok»). Plan sınırları ayarda (varsayılan Free; kaynak supabase.com/pricing, 17.10.2026), Pro hazır değerleri.
 * Uyarı %80, kritik %95 (uzman tahmini, yönetici değiştirir). Eğilim: son 30 günlük ölçümün en küçük kareler eğimi → «yaklaşık X gün sonra dolar» (uzman tahmini).
 * Günlük ölçüm + yönetici bildirimi: sa_alan_gunluk() (pg_cron 03:30 TSİ). Yalnız yönetici (RPC'ler sa_is_admin kontrol eder). */
(function (g) {
  'use strict';
  var MB = 1048576, GB = 1073741824;
  var PLAN = {
    Free: { plan: 'Free', db_limit_mb: 500, storage_limit_mb: 1024, egress_limit_gb: 5, dosya_limit_mb: 50 },
    Pro: { plan: 'Pro', db_limit_mb: 8192, storage_limit_mb: 102400, egress_limit_gb: 250, dosya_limit_mb: 512000 }
  };
  var VARSAYILAN = Object.assign({}, PLAN.Free, { uyari_yuzde: 80, kritik_yuzde: 95, kaynak: 'supabase.com/pricing (17.10.2026)', esik_kaynak: 'uzman tahmini' });
  var KOVA = { 'telefon-yedek': 'Telefon yedekleri', 'sensor-ham': 'Ham sensör verisi', photos: 'Fotoğraflar' };
  var TABLO = { sa_yedek: 'Sunucu yedekleri (günlük/aylık)', sa_telefon_yedek: 'Telefon yedeği kayıtları', sa_degisiklik: 'Değişiklik kaydı', sensor_okumalari: 'Sensör okumaları', records: 'Kayıtlar', photos: 'Fotoğraf bilgileri', client_errors: 'Hata kayıtları' };

  function sayi(x) { return typeof x === 'number' && isFinite(x) ? x : (x != null && x !== '' && isFinite(+x) ? +x : null); }
  function boyut(b) {
    b = sayi(b); if (b == null) return 'Veri yok';
    var u = [['GB', GB], ['MB', MB], ['KB', 1024]];
    for (var i = 0; i < u.length; i++) if (b >= u[i][1]) return (b / u[i][1]).toLocaleString('tr-TR', { maximumFractionDigits: b / u[i][1] < 10 ? 1 : 0 }) + ' ' + u[i][0];
    return Math.round(b) + ' B';
  }
  function yuzde(kul, lim) { kul = sayi(kul); lim = sayi(lim); if (kul == null || !lim) return null; return Math.round(1000 * kul / lim) / 10; }
  /** null → Veri yok; 'normal' | 'uyari' | 'kritik' */
  function seviye(yz, a) { if (yz == null) return null; a = a || VARSAYILAN; return yz >= a.kritik_yuzde ? 'kritik' : yz >= a.uyari_yuzde ? 'uyari' : 'normal'; }
  /** En küçük kareler eğimi (bayt/gün). gecmis: [{gun:'YYYY-MM-DD', v:bytes}] — en az 2 farklı gün gerekir. */
  function egim(gecmis) {
    var p = (gecmis || []).map(function (r) { return [Date.parse(r.gun + 'T00:00:00Z') / 864e5, sayi(r.v)]; }).filter(function (q) { return isFinite(q[0]) && q[1] != null; });
    if (p.length < 2) return null;
    var n = p.length, sx = 0, sy = 0; p.forEach(function (q) { sx += q[0]; sy += q[1]; });
    var mx = sx / n, my = sy / n, nu = 0, de = 0; p.forEach(function (q) { nu += (q[0] - mx) * (q[1] - my); de += (q[0] - mx) * (q[0] - mx); });
    return de ? nu / de : null;
  }
  /** Kaç gün sonra dolar: eğim ≤ 0 → Infinity (artmıyor), veri yetersiz → null. */
  function dolmaGun(gecmis, simdi, lim) {
    var e = egim(gecmis); simdi = sayi(simdi); lim = sayi(lim);
    if (e == null || simdi == null || !lim) return null;
    if (e <= 0) return Infinity;
    return Math.max(0, Math.floor((lim - simdi) / e));
  }
  function egilimMetin(gun, n) {
    if (gun == null) return 'Eğilim: Veri yok (en az 2 günlük ölçüm gerekir' + (n != null ? ', şu an ' + n : '') + ')';
    if (gun === Infinity) return 'Eğilim: artış yok';
    if (gun === 0) return 'Bu hızla şimdiden dolu (uzman tahmini)';
    return 'Bu hızla yaklaşık ' + gun.toLocaleString('tr-TR') + ' gün sonra dolar (uzman tahmini)';
  }
  /** Ölçüm + ayar → satırlar (db, storage, egress). */
  function satirlar(d) {
    var a = Object.assign({}, VARSAYILAN, (d && d.ayar) || {}), G = (d && d.gecmis) || [];
    function sat(kod, ad, kul, lim, sutun) {
      var yz = yuzde(kul, lim), gun = sutun ? dolmaGun(G.map(function (r) { return { gun: r.gun, v: r[sutun] }; }), kul, lim) : null;
      return { kod: kod, ad: ad, kullanim: sayi(kul), limit: lim, yuzde: yz, seviye: seviye(yz, a), gun: gun, egilim: sutun ? egilimMetin(gun, G.length) : null };
    }
    return [
      sat('alan_db', 'Veritabanı', d && d.db_bytes, a.db_limit_mb * MB, 'db_bytes'),
      sat('alan_storage', 'Dosya alanı (Storage)', d && d.storage_bytes, a.storage_limit_mb * MB, 'storage_bytes'),
      sat('alan_egress', 'Veri çıkışı (egress, aylık)', d && d.egress_bytes, a.egress_limit_gb * GB, null)
    ];
  }
  function enKotu(rows) { return rows.some(function (r) { return r.seviye === 'kritik'; }) ? 'kritik' : rows.some(function (r) { return r.seviye === 'uyari'; }) ? 'uyari' : null; }
  function ayarDogrula(a) {
    var h = [];
    ['db_limit_mb', 'storage_limit_mb', 'egress_limit_gb', 'dosya_limit_mb'].forEach(function (k) { if (!(sayi(a[k]) > 0)) h.push(k); });
    var u = sayi(a.uyari_yuzde), k = sayi(a.kritik_yuzde);
    if (!(u >= 1 && u <= 99)) h.push('uyari_yuzde');
    if (!(k >= 2 && k <= 100) || !(k > u)) h.push('kritik_yuzde');
    return h;
  }
  var API = { PLAN: PLAN, VARSAYILAN: VARSAYILAN, KOVA: KOVA, TABLO: TABLO, boyut: boyut, yuzde: yuzde, seviye: seviye, egim: egim, dolmaGun: dolmaGun, egilimMetin: egilimMetin, satirlar: satirlar, enKotu: enKotu, ayarDogrula: ayarDogrula };
  g.SuperAriAlan = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  /* ---------------- Panel ---------------- */
  var doc = g.document, host = doc && doc.getElementById && doc.getElementById('panel');
  if (!host || !host.querySelector) return;
  var B = g.SuperAriBulut;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tf(iso) { var d = new Date(iso); return isFinite(d) ? d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (TSİ)' : '—'; }
  var SV = { normal: ['Normal', '#2f9e44', '#eef6ee'], uyari: ['Uyarı', '#9a6700', '#fff5d6'], kritik: ['Kritik', '#b42318', '#fde8e7'] };
  var nav = host.querySelector('.nav');
  var ban = doc.createElement('div'); ban.id = 'alanBanner'; ban.setAttribute('role', 'alert'); ban.hidden = true;
  ban.style.cssText = 'margin:.6rem 0;padding:.6rem .8rem;border-radius:12px;border:1px solid;font-size:.92rem;line-height:1.4';
  if (nav && nav.nextSibling) host.insertBefore(ban, nav.nextSibling); else host.insertBefore(ban, host.firstChild);
  var s = doc.createElement('section'); s.className = 'card fe'; s.id = 's-alan';
  s.innerHTML = '<h2>Alan kullanımı</h2><p class="fe-sub">Supabase kotası: veritabanı, dosya alanı (Storage) ve veri çıkışı. Plan sınırları <a href="https://supabase.com/pricing" target="_blank" rel="noopener">supabase.com/pricing</a> kaynağından (varsayılan Free). Uyarı ve kritik eşikleri <b>uzman tahmini</b>, buradan değiştirilir. Her gece 03:30 (TSİ) ölçülür; eşik aşılırsa yönetici bildirimi yazılır.</p>'
    + '<p class="fe-meta" data-al-meta style="min-height:1.2em"></p><div data-al-bars>Yükleniyor…</div>'
    + '<h3 style="margin:.8rem 0 .3rem;font-size:1rem">Dosya alanı – kovalar</h3><div data-al-kova>—</div>'
    + '<h3 style="margin:.8rem 0 .3rem;font-size:1rem">Veritabanında öne çıkan tablolar</h3><div data-al-tablo>—</div>'
    + '<h3 style="margin:.8rem 0 .3rem;font-size:1rem">Yönetici bildirimleri</h3><div data-al-bil>—</div>'
    + '<h3 style="margin:.8rem 0 .3rem;font-size:1rem">Plan sınırları ve eşikler</h3><form data-al-form class="os-f" autocomplete="off"></form>'
    + '<div class="os-acts"><button type="button" class="btn secondary" data-al-plan="Free" style="width:auto">Free değerleri</button><button type="button" class="btn secondary" data-al-plan="Pro" style="width:auto">Pro değerleri</button><button type="button" class="btn" data-al-kaydet style="width:auto">Kaydet</button><button type="button" class="btn secondary" data-al-olc style="width:auto">Şimdi ölç</button></div>'
    + '<p class="fe-meta" data-al-stat style="min-height:1.2em"></p>'
    + '<style>.al-r{padding:.45rem 0;border-bottom:1px dashed var(--border);min-height:3.6rem}.al-h{display:flex;justify-content:space-between;gap:.5rem;align-items:baseline;flex-wrap:wrap}.al-b{height:12px;border-radius:999px;background:#f3efe4;overflow:hidden;margin:.3rem 0;position:relative}.al-b i{display:block;height:100%}.al-b u{position:absolute;top:0;bottom:0;width:2px;background:#9a6700}.al-b u.k{background:#b42318}.al-t{font-size:.72rem;font-weight:700;border-radius:999px;padding:0 .5rem}.al-tb{width:100%;border-collapse:collapse;font-size:.88rem}.al-tb td{padding:.25rem .3rem;border-bottom:1px solid #f0e6cf}.al-tb td:last-child{text-align:right;white-space:nowrap}.al-f{display:grid;grid-template-columns:1fr auto;gap:.35rem .6rem;align-items:center;font-size:.9rem}.al-f span{border-bottom:1px dashed var(--border);padding:.25rem 0}.al-n{padding:.45rem .6rem;border-radius:10px;margin:.3rem 0;border:1px solid var(--border)}</style>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-alan">Alan kullanımı</a>');
  var q = function (a) { return s.querySelector('[' + a + ']'); };
  var ORNEK = new URLSearchParams(g.location.search).get('demo') === '1' || !B, CL = null, D = null, A = null, BIL = [];
  function stat(t) { q('data-al-stat').textContent = t || ''; }
  function ornek() {
    var bugun = new Date(), G = [];
    for (var i = 13; i >= 0; i--) { var d = new Date(bugun - i * 864e5).toISOString().slice(0, 10); G.push({ gun: d, db_bytes: Math.round((330 + (13 - i) * 6.5) * MB), storage_bytes: Math.round((780 + (13 - i) * 4) * MB) }); }
    var son = G[G.length - 1];
    return { at: bugun.toISOString(), db_bytes: son.db_bytes, storage_bytes: son.storage_bytes, egress_bytes: null, ayar: Object.assign({}, VARSAYILAN),
      kovalar: { 'telefon-yedek': { bytes: 512 * MB, adet: 210 }, 'sensor-ham': { bytes: 238 * MB, adet: 1450 }, photos: { bytes: 82 * MB, adet: 96 } },
      tablolar: { sa_yedek: 96 * MB, sensor_okumalari: 160 * MB, sa_degisiklik: 34 * MB, records: 21 * MB, sa_telefon_yedek: 2 * MB }, gecmis: G };
  }
  function cubuk(r, a) {
    var sv = SV[r.seviye] || ['Veri yok', '#6b7280', '#f3efe4'], w = r.yuzde == null ? 0 : Math.min(100, r.yuzde);
    return '<div class="al-r" data-al-satir="' + r.kod + '"><div class="al-h"><b>' + esc(r.ad) + '</b><span>' + (r.kullanim == null ? '<span class="mk-vy">Veri yok</span>' : esc(boyut(r.kullanim)) + ' / ' + esc(boyut(r.limit)) + ' · <b>%' + esc(String(r.yuzde).replace('.', ',')) + '</b>') + (r.seviye ? ' <span class="al-t" style="color:' + sv[1] + ';background:' + sv[2] + '">' + sv[0] + '</span>' : '') + '</span></div>'
      + '<div class="al-b" aria-hidden="true"><i style="width:' + w + '%;background:' + sv[1] + '"></i><u style="left:' + a.uyari_yuzde + '%"></u><u class="k" style="left:' + a.kritik_yuzde + '%"></u></div>'
      + '<small class="muted">' + esc(r.kod === 'alan_egress' ? ((D && D.egress_not) || 'Veri yok — veri çıkışı veritabanından okunamaz (Supabase panosu › Usage)') : r.egilim) + '</small></div>';
  }
  function banner(rows) {
    var k = enKotu(rows); if (!k) { ban.hidden = true; ban.innerHTML = ''; return; }
    var sv = SV[k], L = rows.filter(function (r) { return r.seviye === 'uyari' || r.seviye === 'kritik'; });
    ban.style.borderColor = sv[1]; ban.style.background = sv[2]; ban.style.color = sv[1];
    ban.innerHTML = '<b>' + (k === 'kritik' ? '⚠ Alan dolmak üzere' : '⚠ Alan doluyor') + '</b> — ' + L.map(function (r) { return esc(r.ad) + ' %' + esc(String(r.yuzde).replace('.', ',')) + (r.gun != null && r.gun !== Infinity ? ' (yaklaşık ' + r.gun + ' gün sonra dolar, uzman tahmini)' : ''); }).join(' · ')
      + '. ' + (k === 'kritik' ? 'Pro plana geçin ya da eski verileri temizleyin.' : 'Pro plana geçişi planlayın.') + ' <a href="#s-alan" style="color:inherit;text-decoration:underline">Ayrıntı</a>';
    ban.hidden = false;
  }
  var FF = [['plan', 'Plan adı', 'text'], ['db_limit_mb', 'Veritabanı sınırı (MB)'], ['storage_limit_mb', 'Dosya alanı sınırı (MB)'], ['egress_limit_gb', 'Veri çıkışı sınırı (GB/ay)'], ['dosya_limit_mb', 'En büyük dosya (MB)'], ['uyari_yuzde', 'Uyarı eşiği (%) — uzman tahmini'], ['kritik_yuzde', 'Kritik eşiği (%) — uzman tahmini'], ['kaynak', 'Sınırların kaynağı', 'text']];
  function form() {
    q('data-al-form').innerHTML = '<div class="al-f">' + FF.map(function (f) { return '<span>' + esc(f[1]) + '</span><input name="' + f[0] + '" aria-label="' + esc(f[1]) + '" type="' + (f[2] || 'number') + '" ' + (f[2] ? 'style="width:14rem;text-align:left"' : 'step="any" min="0"') + ' value="' + esc(A[f[0]]) + '">'; }).join('') + '</div>';
  }
  function paint() {
    A = Object.assign({}, VARSAYILAN, D.ayar || {});
    var rows = satirlar(D);
    q('data-al-meta').textContent = (ORNEK ? 'Demo verisi · ' : '') + 'Ölçüm: ' + tf(D.at) + ' · Plan: ' + A.plan + ' · Kaynak: ' + A.kaynak + (A.degistiren_email && A.degistiren_email !== 'sistem' ? ' · Son değiştiren: ' + A.degistiren_email : '');
    q('data-al-bars').innerHTML = rows.map(function (r) { return cubuk(r, A); }).join('');
    var kv = D.kovalar || {}, kk = Object.keys(kv);
    q('data-al-kova').innerHTML = kk.length ? '<table class="al-tb">' + kk.map(function (k) { return '<tr><td>' + esc(KOVA[k] || k) + ' <small class="muted">(' + esc(k) + ', ' + (kv[k].adet || 0) + ' dosya)</small></td><td>' + esc(boyut(kv[k].bytes)) + '</td></tr>'; }).join('') + '<tr><td><b>Toplam</b></td><td><b>' + esc(boyut(D.storage_bytes)) + '</b></td></tr></table>' : '<p class="mk-vy">Veri yok</p>';
    var tb = D.tablolar || {}, tk = Object.keys(tb).sort(function (x, y) { return tb[y] - tb[x]; });
    q('data-al-tablo').innerHTML = tk.length ? '<table class="al-tb">' + tk.map(function (k) { return '<tr><td>' + esc(TABLO[k] || k) + '</td><td>' + esc(boyut(tb[k])) + '</td></tr>'; }).join('') + '</table><small class="muted">Sunucu yedekleri veritabanının içinde tutulur, veritabanı sınırına sayılır.</small>' : '<p class="mk-vy">Veri yok</p>';
    q('data-al-bil').innerHTML = BIL.length ? BIL.map(function (b) { var sv = SV[b.seviye] || SV.uyari; return '<div class="al-n" style="background:' + (b.okundu_at ? '#fff' : sv[2]) + '"><b style="color:' + sv[1] + '">' + esc(b.baslik) + '</b> <small class="muted">' + esc(tf(b.at)) + '</small><br><small>' + esc(b.metin) + '</small>' + (b.okundu_at ? '<br><small class="muted">Okundu · ' + esc(b.okuyan_email || '') + '</small>' : ' <button type="button" class="btn secondary" data-al-okundu="' + b.id + '" style="width:auto;padding:.1rem .6rem;min-height:0">Okundu</button>') + '</div>'; }).join('') : '<p class="mk-vy">Bildirim yok</p>';
    form(); banner(rows);
  }
  function load() {
    if (ORNEK) {
      D = ornek();
      BIL = satirlar(D).filter(function (r) { return r.seviye === 'uyari' || r.seviye === 'kritik'; }).map(function (r, i) { return { id: i + 1, at: D.at, seviye: r.seviye, baslik: r.ad + (r.seviye === 'kritik' ? ' dolmak üzere' : ' doluyor') + ' (%' + String(r.yuzde).replace('.', ',') + ')', metin: r.ad + ': ' + boyut(r.kullanim) + ' / ' + boyut(r.limit) + ' (Free planı). ' + r.egilim + '. Pro plana geçişi planlayın.' }; });
      paint(); return Promise.resolve();
    }
    return B.client().then(function (c) { CL = c; return Promise.all([c.rpc('sa_alan_kullanimi'), c.from('sa_yonetici_bildirim').select('id,at,kod,seviye,baslik,metin,okundu_at,okuyan_email').order('at', { ascending: false }).limit(20)]); })
      .then(function (r) { if (r[0].error) throw r[0].error; D = r[0].data || {}; BIL = (r[1] && r[1].data) || []; paint(); })
      .catch(function (e) { q('data-al-bars').innerHTML = '<p class="mk-vy">Veri yok – yüklenemedi (' + esc((e && e.message) || 'bağlantı') + ')</p>'; });
  }
  function oku() { var o = {}; [].forEach.call(q('data-al-form').querySelectorAll('input'), function (i) { o[i.name] = i.type === 'number' ? (i.value === '' ? null : +i.value) : i.value.trim(); }); return o; }
  s.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-al-plan]'))) { var p = PLAN[b.getAttribute('data-al-plan')]; A = Object.assign({}, oku(), p, { kaynak: 'supabase.com/pricing (17.10.2026)' }); form(); stat(p.plan + ' değerleri yüklendi — Kaydet\'e basınca geçerli olur.'); return; }
    if (e.target.closest('[data-al-kaydet]')) {
      var o = oku(), h = ayarDogrula(o); if (h.length) return stat('Geçersiz değer: ' + h.join(', ') + ' (kritik eşik uyarı eşiğinden büyük olmalı).');
      if (ORNEK) { D.ayar = Object.assign({}, A, o); paint(); return stat('Demo: kaydedilmez.'); }
      stat('Kaydediliyor…');
      return CL.rpc('sa_alan_ayar_kaydet', { p: o }).then(function (r) { if (r.error) throw r.error; stat('Kaydedildi (değişiklik kaydına yazıldı).'); return load(); }).catch(function (er) { stat('Kaydedilemedi: ' + ((er && er.message) || '')); });
    }
    if (e.target.closest('[data-al-olc]')) {
      if (ORNEK) return stat('Demo: ölçüm yapılmaz.');
      stat('Ölçülüyor…');
      return CL.rpc('sa_alan_gunluk').then(function (r) { if (r.error) throw r.error; stat('Ölçüldü.'); return load(); }).catch(function (er) { stat('Ölçülemedi: ' + ((er && er.message) || '')); });
    }
    if ((b = e.target.closest('[data-al-okundu]'))) {
      if (ORNEK) { BIL.forEach(function (x) { if (String(x.id) === b.getAttribute('data-al-okundu')) { x.okundu_at = new Date().toISOString(); x.okuyan_email = 'demo'; } }); return paint(); }
      return CL.rpc('sa_yonetici_bildirim_okundu', { p_id: +b.getAttribute('data-al-okundu') }).then(function (r) { if (r.error) throw r.error; return load(); }).catch(function (er) { stat('İşaretlenemedi: ' + ((er && er.message) || '')); });
    }
  });
  load();
})(typeof window !== 'undefined' ? window : globalThis);
