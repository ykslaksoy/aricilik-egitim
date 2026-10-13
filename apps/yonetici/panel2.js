/* Yönetici paneli — ek bölümler. Tümü Supabase'den (yalnız yönetici RLS / RPC). Veri yoksa dürüst boş durum. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  var MAIN = 'https://superari.vercel.app';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dt(iso) { var d = new Date(iso); return !iso || isNaN(d) ? '—' : d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function migMsg(e) { var m = String((e && (e.message || e.code)) || ''); return /PGRST20|42883|42P01|does not exist|schema cache/i.test(m) ? 'Veritabanı güncellemesi gerekli (supabase/migrations/20261013220000_yonetici_panel.sql).' : (/42501|Yalnız yönetici/.test(m) ? 'Yalnız yönetici.' : 'Hata: ' + esc(m || 'bilinmiyor')); }
  function sec(id, title, sub) { var s = document.createElement('section'); s.className = 'card fe'; s.id = id; s.innerHTML = '<h2>' + title + '</h2>' + (sub ? '<p class="fe-sub">' + sub + '</p>' : '') + '<div class="bd"><p class="fe-empty">Yükleniyor…</p></div>'; host.appendChild(s); return s.querySelector('.bd'); }
  function empty(t) { return '<p class="fe-empty">' + t + '</p>'; }
  var C; function q() { return C ? Promise.resolve(C) : B.client().then(function (c) { C = c; return c; }); }
  var nav = document.createElement('nav'); nav.className = 'nav'; nav.style.flexWrap = 'wrap'; host.insertBefore(nav, host.children[1] || null);
  var SECS = [['kul', 'Kullanıcılar'], ['esik', 'Eşikler'], ['fiy', 'Fiyat listesi'], ['yed', 'Yedek durumu'], ['sur', 'Sürüm'], ['ekip', 'Ekip ve görevler'], ['cih', 'Cihaz sağlığı'], ['izn', 'İzinsiz taşınma/açılma'], ['har', 'Arılık haritası'], ['sez', 'Sezon sonu raporu']];
  nav.innerHTML = SECS.map(function (x) { return '<a class="chip" href="#s-' + x[0] + '">' + x[1] + '</a>'; }).join('') + '<a class="chip" href="#osSec">Oğul skorları</a><a class="chip" href="#feH">Fiyatsız kalemler</a>';

  /* 1) Kullanıcılar + kullanıcı detayı */
  var kul = sec('s-kul', 'Kullanıcılar', 'Tüm hesaplar. «Dondur»: giriş ve oturum yenileme engellenir (Supabase banned_until), veriler silinmez.');
  var det = document.createElement('div');
  function loadUsers() {
    q().then(function (c) { return c.rpc('sa_admin_users'); }).then(function (r) {
      if (r.error) { kul.innerHTML = empty(migMsg(r.error)); return; }
      var l = r.data || []; if (!l.length) { kul.innerHTML = empty('Kayıtlı kullanıcı yok.'); return; }
      kul.innerHTML = '<p class="fe-sub">' + l.length + ' kullanıcı · ' + l.filter(function (u) { return u.frozen; }).length + ' dondurulmuş</p><ol class="fe-list">' + l.map(function (u) {
        return '<li><div class="fe-top"><b>' + esc(u.display_name || u.email) + (u.is_admin ? '<span class="fe-tag">yönetici</span>' : '') + (u.frozen ? '<span class="fe-tag dev">donduruldu</span>' : '') + '</b><span>' + u.apiaries + ' arılık · ' + u.hives + ' kovan</span></div>' +
          '<small class="fe-meta">' + esc(u.email) + ' · kayıt ' + esc(dt(u.created_at)) + ' · son giriş ' + esc(dt(u.last_sign_in_at)) + ' · son senkron ' + esc(dt(u.last_sync)) + '</small>' +
          '<div class="ud" data-uid="' + u.id + '"></div><div class="os-acts"><button class="btn secondary" data-det="' + u.id + '">Detayı yenile</button>' + (u.is_admin ? '' : '<button class="btn secondary" data-frz="' + u.id + '" data-v="' + (u.frozen ? '0' : '1') + '" data-em="' + esc(u.email) + '">' + (u.frozen ? 'Dondurmayı kaldır' : 'Dondur') + '</button>') + '</div></li>';
      }).join('') + '</ol>';
    }).catch(function (e) { kul.innerHTML = empty(migMsg(e)); });
  }
  kul.addEventListener('click', function (e) {
    var f = e.target.closest('[data-frz]'), d = e.target.closest('[data-det]');
    if (f) { var on = f.getAttribute('data-v') === '1'; if (!confirm((on ? 'Dondurulsun mu: ' : 'Dondurma kaldırılsın mı: ') + f.getAttribute('data-em') + '?')) return;
      q().then(function (c) { return c.rpc('sa_admin_set_frozen', { p_user: f.getAttribute('data-frz'), p_frozen: on }); }).then(function (r) { if (r.error) alert(migMsg(r.error).replace(/<[^>]+>/g, '')); loadUsers(); }); }
    if (d) userDetail(d.getAttribute('data-det'));
  });
  kul.addEventListener('toggle', function (e) { var dd = e.target; if (!dd.open || !dd.querySelector) return; var u = dd.querySelector(':scope > .tr-body > .ud'); if (u && !u.getAttribute('data-ok')) { u.setAttribute('data-ok', '1'); userDetail(u.getAttribute('data-uid')); } }, true);
  function userDetail(uid) {
    var tgt = kul.querySelector('.ud[data-uid="' + uid + '"]'); if (tgt) det = tgt; det.innerHTML = empty('Yükleniyor…');
    q().then(function (c) {
      return Promise.all([
        c.from('profiles').select('email,display_name,created_at').eq('id', uid).maybeSingle(),
        c.from('apiaries').select('id,local_id,name,data,server_updated_at').eq('owner_id', uid).eq('deleted', false),
        c.from('hives').select('local_id,name,apiary_id,data,server_updated_at').eq('owner_id', uid).eq('deleted', false).limit(500),
        c.from('tasks').select('local_id,kind,due,data,server_updated_at').eq('owner_id', uid).eq('deleted', false).order('due', { ascending: true }).limit(200),
        c.from('push_subscriptions').select('ua,created_at,last_ok_at').eq('user_id', uid),
        c.from('records').select('server_updated_at').eq('owner_id', uid).order('server_updated_at', { ascending: false }).limit(1)
      ]);
    }).then(function (r) {
      var err = r.filter(function (x) { return x.error; })[0]; if (err) { det.innerHTML = empty(migMsg(err.error)); return; }
      var p = r[0].data || {}, A = r[1].data || [], H = r[2].data || [], T = r[3].data || [], P = r[4].data || [];
      var last = [A, H, T, r[5].data || []].reduce(function (m, l) { l.forEach(function (x) { if (x.server_updated_at > m) m = x.server_updated_at; }); return m; }, '');
      var devs = []; A.concat(H).forEach(function (x) { var d = x.data || {}; (d.devices || d.cihazlar || []).forEach(function (v) { devs.push(v); }); });
      var st = (A[0] && A[0].data && (A[0].data.settings || A[0].data.ayarlar)) || null;
      det.innerHTML = '<p class="fe-sub"><b>' + esc(p.display_name || p.email || uid) + '</b> · ' + esc(p.email || '') + ' · son senkron ' + esc(dt(last)) + '</p>' +
        '<fieldset><legend>Arılıklar (' + A.length + ')</legend>' + (A.length ? A.map(function (a) { var hh = H.filter(function (h) { return h.apiary_id === a.id; });
          return '<fieldset><legend>' + esc(a.name) + (a.data && a.data.place ? ' · ' + esc(a.data.place) : '') + ' (' + hh.length + ' kovan)</legend>' + (hh.length ? hh.map(function (h) { var d = h.data || {};
            return '<label><span>' + esc(h.name || h.local_id) + '</span><span class="fe-meta">' + [d.breed && 'ırk ' + esc(d.breed), d.strength && 'güç ' + esc(d.strength), d.health && esc(d.health), d.weightKg != null && esc(d.weightKg) + ' kg', 'güncelleme ' + esc(dt(h.server_updated_at))].filter(Boolean).join(' · ') + '</span></label>'; }).join('') : empty('Kovan yok.')) + '</fieldset>'; }).join('') : empty('Buluta senkronlanmış arılık yok.')) + '</fieldset>' +
        '<fieldset><legend>Cihazlar (' + devs.length + ')</legend>' + (devs.length ? devs.map(function (d) { return '<label><span>' + esc(d.tip || d.type || 'cihaz') + '</span><span class="fe-meta">son veri ' + esc(dt(d.lastSeen || d.last_seen)) + '</span></label>'; }).join('') : empty('Cihaz verisi buluta gelmiyor (cihazlar yalnız telefonda kayıtlı).')) + '</fieldset>' +
        '<fieldset><legend>Görevler (' + T.length + ')</legend>' + (T.length ? T.slice(0, 30).map(function (t) { return '<label><span>' + esc((t.data && (t.data.title || t.data.text)) || t.kind) + '</span><span class="fe-meta">' + esc(t.due || '') + '</span></label>'; }).join('') : empty('Görev yok.')) + '</fieldset>' +
        '<fieldset><legend>Ayarlar / bildirim</legend>' + (st ? '<pre class="fe-meta">' + esc(JSON.stringify(st, null, 1).slice(0, 1500)) + '</pre>' : empty('Ayarlar buluta senkronlanmıyor.')) +
        '<p class="fe-meta">Bildirim aboneliği: ' + (P.length ? P.length + ' cihaz · son başarılı ' + esc(dt(P[0].last_ok_at)) : 'yok') + '</p></fieldset>';
    }).catch(function (e) { det.innerHTML = empty(migMsg(e)); });
  }

  /* 2) Eşikler */
  var ESIK_DEF = { koloniGucu: { zayifMaxCerceve: 4, ortaMaxCerceve: 7 }, bolmeMinCerceve: 9, uyari: { varroaYuzde: 3, dusukPilYuzde: 20, gunlukKiloDususKg: 1, kovanIciMinC: 10, kovanIciMaxC: 38, nemMaxYuzde: 80 } };
  var ESIK_AD = { 'koloniGucu.zayifMaxCerceve': 'Zayıf: en çok dolu çerçeve', 'koloniGucu.ortaMaxCerceve': 'Orta: en çok dolu çerçeve (üstü güçlü)', bolmeMinCerceve: 'Bölme eşiği: en az dolu çerçeve', 'uyari.varroaYuzde': 'Varroa uyarı (%)', 'uyari.dusukPilYuzde': 'Düşük pil (%)', 'uyari.gunlukKiloDususKg': 'Günlük kilo düşüşü (kg)', 'uyari.kovanIciMinC': 'Kovan içi en düşük (°C)', 'uyari.kovanIciMaxC': 'Kovan içi en yüksek (°C)', 'uyari.nemMaxYuzde': 'Nem üst sınırı (%)' };
  var esik = sec('s-esik', 'Eşikler', 'Koloni gücü bantları, bölme eşiği ve uyarı sınırları. Uygulama bu değerleri okur ve cihazda önbelleğe alır (çevrimdışı son değer geçerli).');
  function getP(o, k) { return k.split('.').reduce(function (a, x) { return a && a[x]; }, o); }
  function setP(o, k, v) { var p = k.split('.'), t = o; for (var i = 0; i < p.length - 1; i++) t = t[p[i]] = t[p[i]] || {}; t[p[p.length - 1]] = v; }
  function loadEsik() {
    q().then(function (c) { return c.from('app_esikler').select('data,updated_at').eq('id', 1).maybeSingle(); }).then(function (r) {
      if (r.error) { esik.innerHTML = empty(migMsg(r.error)); return; }
      var d = JSON.parse(JSON.stringify(ESIK_DEF)); Object.keys(ESIK_AD).forEach(function (k) { var v = r.data && getP(r.data.data, k); if (v != null) setP(d, k, v); });
      esik.innerHTML = '<p class="fe-sub">' + (r.data ? 'Son kayıt ' + esc(dt(r.data.updated_at)) : 'Henüz kayıt yok — varsayılanlar gösteriliyor.') + '</p><form class="os-f" id="esF"><fieldset><legend>Eşikler</legend>' +
        Object.keys(ESIK_AD).map(function (k) { return '<label><span>' + ESIK_AD[k] + '</span><input name="' + k + '" type="number" step="any" min="0" value="' + getP(d, k) + '"></label>'; }).join('') + '</fieldset></form><div class="os-acts"><button class="btn" id="esS">Kaydet…</button><span id="esM" class="fe-meta"></span></div>';
    });
  }
  esik.addEventListener('click', function (e) {
    if (e.target.id !== 'esS') return; var o = {}, bad = false;
    [].forEach.call(esik.querySelectorAll('#esF input'), function (i) { var v = Number(i.value); if (!isFinite(v) || v < 0 || i.value === '') bad = true; setP(o, i.name, v); });
    var m = esik.querySelector('#esM'); if (bad) { m.textContent = 'Geçersiz değer.'; return; }
    if (o.koloniGucu.zayifMaxCerceve >= o.koloniGucu.ortaMaxCerceve) { m.textContent = 'Zayıf sınırı orta sınırından küçük olmalı.'; return; }
    if (!confirm('Eşikler tüm kullanıcılar için kaydedilsin mi?')) return;
    q().then(function (c) { return c.rpc('sa_esikler_kaydet', { p_data: o }); }).then(function (r) { m.innerHTML = r.error ? migMsg(r.error) : 'Kaydedildi.'; if (!r.error) loadEsik(); });
  });

  /* 3) Fiyat listesi */
  var fiy = sec('s-fiy', 'Fiyat listesi', 'Referans fiyatlar: dosyadaki (data/fiyat-ref.json) değer + yönetici düzeltmesi. Düzeltme buluta kaydedilir.');
  function loadFiy() {
    Promise.all([fetch('data/fiyat-ref.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; }),
      q().then(function (c) { return c.from('fiyat_ref').select('*'); })]).then(function (a) {
      var over = {}, ov = a[1]; if (ov.error) { fiy.innerHTML = empty(migMsg(ov.error)); return; }
      (ov.data || []).forEach(function (x) { over[x.key] = x; });
      var items = (a[0].items || []).slice(); Object.keys(over).forEach(function (k) { if (!items.some(function (i) { return i.key === k; })) items.push({ key: k, name: over[k].name, unit: over[k].unit }); });
      if (!items.length) { fiy.innerHTML = empty('Fiyat listesi boş.'); return; }
      fiy.innerHTML = '<p class="fe-sub">Kaynak: ' + esc(a[0].updated || '—') + ' · ' + items.length + ' kalem · ' + Object.keys(over).length + ' yönetici düzeltmesi</p><form class="os-f"><fieldset><legend>₺ / birim</legend>' + items.map(function (i) {
        var o = over[i.key], v = o && o.ref != null ? o.ref : i.ref;
        return '<label><span>' + esc(i.name) + ' <small class="fe-meta">' + esc(i.unit || '') + (o ? ' · düzeltildi ' + esc(dt(o.updated_at)) : (i.ref != null ? ' · dosya ' + i.ref : ' · fiyat yok')) + '</small></span><span style="display:flex;gap:.3rem"><input data-k="' + esc(i.key) + '" data-n="' + esc(i.name) + '" data-u="' + esc(i.unit || '') + '" type="number" step="0.01" min="0" value="' + (v != null ? v : '') + '"><button type="button" class="btn secondary" data-fs="1">Kaydet</button></span></label>';
      }).join('') + '</fieldset></form>';
    });
  }
  fiy.addEventListener('click', function (e) {
    if (!e.target.getAttribute('data-fs')) return; var i = e.target.previousElementSibling, v = i.value === '' ? null : Number(i.value);
    if (v != null && (!isFinite(v) || v < 0)) { alert('Geçersiz fiyat'); return; }
    q().then(function (c) { return c.rpc('sa_fiyat_ref_kaydet', { p_key: i.getAttribute('data-k'), p_name: i.getAttribute('data-n'), p_unit: i.getAttribute('data-u') || null, p_ref: v, p_note: null }); })
      .then(function (r) { if (r.error) alert(migMsg(r.error).replace(/<[^>]+>/g, '')); else loadFiy(); });
  });

  /* 4) Yedek durumu */
  var yed = sec('s-yed', 'Yedek durumu', 'superari-yedek reposunun gece yedeği (GitHub Actions). Durumu yedek iş akışı Supabase’e yazar.');
  q().then(function (c) { return c.from('yedek_durum').select('*').eq('id', 1).maybeSingle(); }).then(function (r) {
    if (r.error) { yed.innerHTML = empty(migMsg(r.error)); return; }
    if (!r.data) { yed.innerHTML = empty('Henüz yedek durumu bildirilmedi. Yedek iş akışına «yedek_durum» yazma adımı eklenince son çalışma burada görünür.'); return; }
    var d = r.data, ok = /success/i.test(d.conclusion || ''), old = Date.now() - Date.parse(d.last_run_at) > 36 * 3600e3;
    yed.innerHTML = '<p><b style="color:' + (ok && !old ? 'inherit' : '#b42318') + '">' + esc(d.conclusion || '—') + '</b> · ' + esc(dt(d.last_run_at)) + (old ? ' · <b>36 saatten eski!</b>' : '') + (d.run_url ? ' · <a target="_blank" rel="noopener" href="' + esc(d.run_url) + '">çalışma</a>' : '') + '</p>' + (d.note ? '<p class="fe-meta">' + esc(d.note) + '</p>' : '');
  });

  /* 5) Sürüm */
  var sur = sec('s-sur', 'Sürüm', 'Canlı uygulamanın koloni-N sürümü (' + MAIN + ').');
  fetch(MAIN + '/version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    sur.innerHTML = j && j.version ? '<p>Canlı: <b>' + esc(j.version) + '</b>' + (j.at ? ' · ' + esc(dt(j.at)) : '') + '</p>' : empty('Sürüm okunamadı (version.json yok).');
  }).catch(function () { sur.innerHTML = empty('Canlı uygulamaya ulaşılamadı.'); });
  q().then(function (c) { return c.from('client_errors').select('app_version,created_at').order('created_at', { ascending: false }).limit(200); }).then(function (r) {
    if (r.error || !r.data) return; var by = {}; r.data.forEach(function (x) { by[x.app_version || '?'] = (by[x.app_version || '?'] || 0) + 1; });
    var p = document.createElement('p'); p.className = 'fe-meta'; p.textContent = r.data.length ? 'Son hata kayıtları sürüme göre: ' + Object.keys(by).map(function (k) { return k + ' (' + by[k] + ')'; }).join(', ') : 'Hata kaydı yok.'; sur.appendChild(p);
  });

  /* 6–10: arılık/kovan/görev verisinden */
  var ekip = sec('s-ekip', 'Ekip ve görevler', 'Arılık ekipleri, bekleyen davetler ve açık görevler.'), cih = sec('s-cih', 'Cihaz sağlığı', 'Sensör/tartı son veri zamanı.'),
    izn = sec('s-izn', 'İzinsiz taşınma / açılma uyarıları', 'Titreşim/hareket sensörü olaylarından.'), har = sec('s-har', 'Arılık haritası', 'Konumu girilmiş tüm arılıklar.'), sez = sec('s-sez', 'Sezon sonu raporu', new Date().getFullYear() + ' sezonu, tüm kullanıcılar.');
  q().then(function (c) {
    return Promise.all([c.from('apiaries').select('id,owner_id,name,data').eq('deleted', false).limit(2000), c.from('apiary_members').select('apiary_id,user_id,role'), c.from('apiary_invites').select('apiary_id,email,role,expires_at').is('accepted_at', null),
      c.from('tasks').select('apiary_id,kind,due,data').eq('deleted', false).limit(2000), c.from('hives').select('apiary_id,data').eq('deleted', false).limit(5000),
      c.from('records').select('kind,record_date,data').gte('record_date', new Date().getFullYear() + '-01-01').eq('deleted', false).limit(10000), c.from('profiles').select('id,email,display_name')]);
  }).then(function (r) {
    var err = r.filter(function (x) { return x.error; })[0]; if (err) { [ekip, cih, izn, har, sez].forEach(function (b) { b.innerHTML = empty(migMsg(err.error)); }); return; }
    var A = r[0].data, M = r[1].data, I = r[2].data, T = r[3].data, H = r[4].data, R = r[5].data, P = {}; r[6].data.forEach(function (p) { P[p.id] = p.display_name || p.email; });
    var AN = {}; A.forEach(function (a) { AN[a.id] = a.name; });
    // ekip
    var byAp = {}; M.forEach(function (m) { (byAp[m.apiary_id] = byAp[m.apiary_id] || []).push(esc(P[m.user_id] || m.user_id) + ' (' + esc(m.role) + ')'); });
    var openT = T.filter(function (t) { return !(t.data && (t.data.done || t.data.doneAt)); });
    ekip.innerHTML = (Object.keys(byAp).length ? '<ul>' + Object.keys(byAp).map(function (k) { return '<li><b>' + esc(AN[k] || 'Arılık') + '</b>: ' + byAp[k].join(', ') + '</li>'; }).join('') + '</ul>' : empty('Hiçbir arılıkta ekip üyesi yok.')) +
      '<p class="fe-meta">Bekleyen davet: ' + I.length + ' · Açık görev (buluttaki): ' + openT.length + (openT.length ? ' · atanmış: ' + openT.filter(function (t) { return t.data && (t.data.assignee || t.data.atanan); }).length : '') + '</p>';
    // cihaz
    var devs = []; A.concat(H).forEach(function (x) { var d = x.data || {}; (d.devices || d.cihazlar || []).forEach(function (v) { devs.push({ v: v, ap: AN[x.apiary_id || x.id] }); }); });
    cih.innerHTML = devs.length ? '<ul>' + devs.map(function (d) { return '<li>' + esc(d.ap || '') + ' · ' + esc(d.v.tip || d.v.type || 'cihaz') + ' · son veri ' + esc(dt(d.v.lastSeen || d.v.last_seen)) + '</li>'; }).join('') + '</ul>' : empty('Buluta bildirilmiş cihaz yok. Cihazlar şu an yalnız kullanıcının telefonunda kayıtlı; kullanıcılar sensörsüz çalışıyor.');
    // izinsiz
    var ev = R.filter(function (x) { return /izinsiz|hareket|tasinma|acilma|theft|motion/i.test(x.kind || ''); });
    izn.innerHTML = ev.length ? '<ul>' + ev.slice(0, 50).map(function (x) { return '<li>' + esc(x.record_date) + ' · ' + esc(x.kind) + '</li>'; }).join('') + '</ul>' : empty('Uyarı yok. Hareket sensörü olan kovan bulunmadığı için izinsiz taşınma/açılma algılanamıyor.');
    // harita
    var pins = A.filter(function (a) { var d = a.data || {}; return isFinite(parseFloat(d.lat)) && isFinite(parseFloat(d.lon)); });
    har.innerHTML = pins.length ? '<p class="fe-sub">' + pins.length + ' / ' + A.length + ' arılığın konumu var.</p><ul>' + pins.map(function (a) { var d = a.data; return '<li><b>' + esc(a.name) + '</b> · ' + esc(P[a.owner_id] || '') + ' · <a target="_blank" rel="noopener" href="https://yandex.com.tr/harita/?pt=' + d.lon + ',' + d.lat + '&z=13">' + Number(d.lat).toFixed(4) + ', ' + Number(d.lon).toFixed(4) + '</a></li>'; }).join('') + '</ul>' : empty(A.length ? 'Arılıkların konumu girilmemiş.' : 'Buluta senkronlanmış arılık yok.');
    // sezon
    var kinds = {}; R.forEach(function (x) { kinds[x.kind || 'diğer'] = (kinds[x.kind || 'diğer'] || 0) + 1; });
    sez.innerHTML = !A.length && !R.length ? empty('Bu sezon için buluta gelen kayıt yok.') : '<p>' + A.length + ' arılık · ' + H.length + ' kovan · ' + R.length + ' kayıt (bu yıl) · ' + Object.keys(P).length + ' kullanıcı</p>' +
      (R.length ? '<p class="fe-meta">Kayıt türleri: ' + Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; }).map(function (k) { return esc(k) + ' ' + kinds[k]; }).join(' · ') + '</p>' : '');
  }).catch(function (e) { [ekip, cih, izn, har, sez].forEach(function (b) { b.innerHTML = empty(migMsg(e)); }); });

  loadUsers(); loadEsik(); loadFiy();
})();
