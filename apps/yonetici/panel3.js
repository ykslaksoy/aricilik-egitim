/* k146: Yönetici · Ses sınıfları (public.ses_siniflari) — düzenlenebilir; ses olayları (public.ses_olaylari) özeti. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SEV = [['kritik', 'Kritik'], ['yuksek', 'Yüksek'], ['ayri', 'Ayrı uyarı'], ['erken', 'Erken uyarı'], ['bilgi', 'Bilgi'], ['kayit', 'Sadece kayıt']];
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-ses';
  s.innerHTML = '<h2>Ses sınıfları</h2><p class="fe-sub">Kovan ses sınıfları (kaynaklı). Frekans, seviye ve etkinlik buradan düzenlenir; ötme / Vakvaklama (Quacking) / anasızlık eşikleri «Oğul skorları → Sensörlü mod» bölümündedir. <span id="sesStat"></span></p><div class="bd"><p class="fe-empty">Yükleniyor…</p></div>';
  host.appendChild(s);
  var nav = host.querySelector('nav.nav'); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-ses">Ses sınıfları</a>');
  var bd = s.querySelector('.bd'), C;
  function st(t) { document.getElementById('sesStat').textContent = t; }
  function load() {
    B.client().then(function (c) { C = c; return Promise.all([c.from('ses_siniflari').select('*').order('sira'), c.from('ses_olaylari').select('sinif', { count: 'exact', head: true })]); }).then(function (rs) {
      var r = rs[0]; if (r.error) { bd.innerHTML = '<p class="fe-empty">Veritabanı güncellemesi gerekli (supabase/migrations/20261014200000_ses_siniflari.sql).</p>'; return; }
      var n = rs[1] && rs[1].count != null ? rs[1].count : 0;
      bd.innerHTML = '<p class="fe-sub">' + (n ? n + ' ses olayı kaydı var.' : 'Henüz ses olayı yok — ses sensörü bağlanınca etiketli kayıtlar burada sayılır.') + '</p><ol class="fe-list">' + (r.data || []).map(function (x) {
        return '<li data-id="' + esc(x.id) + '"><div class="fe-top"><b>' + esc(x.ad_tr) + (/\(/.test(x.ad_tr || '') ? '' : ' <small>(' + esc(x.ad_en || '') + ')</small>') + (x.kaynak_zayif ? '<span class="fe-tag dev">kaynak zayıf</span>' : '') + '</b></div>' +
          '<small class="fe-meta">' + esc(x.yapi || '') + ' · ' + esc(x.anlam || '') + '</small><small class="fe-meta"><b>Kaynak:</b> ' + esc(x.kaynak || '—') + '</small>' +
          '<span style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-top:.3rem"><label>Hz <input name="hz_min" type="number" min="0" max="20000" value="' + (x.hz_min == null ? '' : x.hz_min) + '" style="width:5.5em"> – <input name="hz_max" type="number" min="0" max="20000" value="' + (x.hz_max == null ? '' : x.hz_max) + '" style="width:5.5em"></label>' +
          '<select name="seviye">' + SEV.map(function (v) { return '<option value="' + v[0] + '"' + (v[0] === x.seviye ? ' selected' : '') + '>' + v[1] + '</option>'; }).join('') + '</select>' +
          '<label><input name="aktif" type="checkbox"' + (x.aktif ? ' checked' : '') + '> etkin</label><button type="button" class="btn secondary" data-save>Kaydet</button></span></li>';
      }).join('') + '</ol>';
    }).catch(function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  }
  s.addEventListener('click', function (e) {
    var b = e.target.closest('[data-save]'); if (!b || !C) return;
    var li = b.closest('li'), g = function (n) { return li.querySelector('[name=' + n + ']'); };
    var mn = g('hz_min').value === '' ? null : Number(g('hz_min').value), mx = g('hz_max').value === '' ? null : Number(g('hz_max').value);
    if ((mn != null && !isFinite(mn)) || (mx != null && !isFinite(mx)) || (mn != null && mx != null && mn > mx)) { st('Geçersiz frekans aralığı.'); return; }
    C.from('ses_siniflari').update({ hz_min: mn, hz_max: mx, seviye: g('seviye').value, aktif: g('aktif').checked, updated_at: new Date().toISOString() }).eq('id', li.getAttribute('data-id')).then(function (r) {
      st(r.error ? 'Kaydedilemedi: yetki yok veya bağlantı hatası.' : 'Kaydedildi.');
    });
  });
  load();
})();
