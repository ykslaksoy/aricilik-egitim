/* koloni-220: Yönetici · Devre dışı cihazlar — kullanıcıların kovan bazında kapattığı cihazlar (public.cihaz_devre_disi). Yönetici açar/kapatır; uygulama açılışta alır. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  var nav = host.querySelector('nav.nav');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tf(iso) { var d = new Date(iso); return isFinite(d) ? d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-cihaz-dd';
  s.innerHTML = '<h2>Devre dışı cihazlar</h2><p class="fe-sub">Kullanıcıların kovan bazında kapattığı cihazlar. Kapalı cihaz uyarı, bildirim ve görev üretmez; okumaları hesaba girmez. Değişiklik ekipteki herkese hemen geçer ve ekibe (Sahip + üyeler) bildirim gider.</p><label style="display:block;margin:.3rem 0"><input type="checkbox" data-dd-hepsi> Yeniden açılanları da göster</label><div class="bd" style="min-height:8rem">Yükleniyor…</div><p class="fe-meta" data-dd-stat style="min-height:1.2em"></p>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-cihaz-dd">Devre dışı cihazlar</a>');
  var ROWS = [];
  function paint() {
    var hepsi = s.querySelector('[data-dd-hepsi]').checked, L = ROWS.filter(function (r) { return hepsi || r.devre_disi; });
    s.querySelector('.bd').innerHTML = !L.length ? '<p class="mk-vy">Devre dışı cihaz yok.</p>' : '<div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:.9rem"><thead><tr><th>Kullanıcı</th><th>Arılık</th><th>Kovan</th><th>Cihaz</th><th>Durum</th><th>Kim / ne zaman</th><th></th></tr></thead><tbody>' + L.map(function (r) {
      return '<tr><td>' + esc(r.email || '—') + '</td><td>' + esc(r.arilik_ad || '—') + '</td><td>' + esc(r.kovan_ad || (r.kovan_id != null ? 'Kovan ' + r.kovan_id : '—')) + '</td><td>' + esc(r.cihaz_ad || r.tip || r.device_id) + '</td><td>' + (r.devre_disi ? '<b>Devre dışı</b>' : 'Açık') + '</td><td>' + esc((r.degistiren === 'yonetici' ? 'Yönetici' : 'Kullanıcı') + (r.degistiren_email ? ' · ' + r.degistiren_email : '')) + '<br><small>' + esc(tf(r.updated_at)) + '</small></td><td><button class="btn" data-dd-u="' + esc(r.user_id) + '" data-dd-d="' + esc(r.device_id) + '" data-dd-v="' + (r.devre_disi ? '0' : '1') + '">' + (r.devre_disi ? 'Etkinleştir' : 'Devre dışı bırak') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function stat(t) { s.querySelector('[data-dd-stat]').textContent = t || ''; }
  function load() {
    return B.client().then(function (c) { return c.rpc('sa_admin_cihaz_devre_disi'); }).then(function (r) { if (r.error) throw r.error; ROWS = r.data || []; paint(); stat(''); })
      .catch(function (e) { s.querySelector('.bd').innerHTML = '<p class="mk-vy">Veri yok – yüklenemedi (' + esc((e && e.message) || 'bağlantı') + ')</p>'; });
  }
  s.addEventListener('change', function (e) { if (e.target.matches('[data-dd-hepsi]')) paint(); });
  s.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dd-u]'); if (!b) return;
    var on = b.getAttribute('data-dd-v') === '1';
    if (on && !confirm('Bu cihaz kullanıcı için devre dışı bırakılsın mı?')) return;
    b.disabled = true;
    B.client().then(function (c) { return c.auth.getUser().then(function (u) { var us = u && u.data && u.data.user; return c.from('cihaz_devre_disi').update({ devre_disi: on, degistiren: 'yonetici', degistiren_email: us ? us.email : null, updated_at: new Date().toISOString() }).eq('user_id', b.getAttribute('data-dd-u')).eq('device_id', b.getAttribute('data-dd-d')); }); })
      .then(function (r) { if (r.error) throw r.error; stat((on ? 'Devre dışı bırakıldı.' : 'Etkinleştirildi.') + ' Ekibe bildirildi.'); ekibePush(); return load(); })
      .catch(function (er) { b.disabled = false; stat('Kaydedilemedi: ' + ((er && er.message) || 'bağlantı')); });
  });
  /* koloni-222: yönetici değişikliği → ekip_bildirim (tetikleyici) + ekibe push (Sahip ve üyeler) */
  function ekibePush() {
    B.client().then(function (c) { return c.auth.getSession().then(function (s) { var ss = s && s.data && s.data.session; if (!ss) return;
      return c.from('ekip_bildirim').select('id').eq('kod', 'cihaz_devre_disi').eq('kim', ss.user.id).gte('at', new Date(Date.now() - 120000).toISOString()).order('id', { ascending: false }).limit(5)
        .then(function (r) { var ids = (r && r.data || []).map(function (x) { return x.id; }); if (!ids.length) return;
          return fetch('/api/push-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ss.access_token }, body: JSON.stringify({ action: 'ekip_cihaz', ids: ids }) }); }); }); }).catch(function () {});
  }
  load();
})();
