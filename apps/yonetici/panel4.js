/* k150: Yönetici · Kural kaynakları — ağaç: Ses sınıfları (KİLİTLİ) · Oğul skoru · Muayene kuralları. Tıklayınca detay. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SEV = { kritik: 'Kritik', yuksek: 'Yüksek', erken: 'Erken uyarı', bilgi: 'Bilgi', kayit: 'Sadece kayıt' };
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-kural';
  s.innerHTML = '<h2>Kural kaynakları</h2><p class="fe-sub">Kurallar, eşikler, kaynaklar ve doğrulama durumu. Bu bilgiler yalnız burada görünür; uygulamada kullanıcı sadece uyarıyı görür.</p><div class="bd"><p class="fe-empty">Yükleniyor…</p></div>';
  host.appendChild(s);
  var nav = host.querySelector('nav.nav'); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-kural">Kural kaynakları</a>');
  var bd = s.querySelector('.bd');
  /* koloni-205: {s:anahtar} → ogul_skor_ayar.sensor değeri (tek kaynak) */
  function bag(v) { var S = {}; try { S = window.SuperAriDemo.colony.ogulSkor().sensor || {}; } catch (e) { S = {}; } return String(v).replace(/\{s:(\w+)\}/g, function (_, k) { return S[k] != null ? String(S[k]).replace('.', ',') : '—'; }); }
  function row(k, v) { return v == null || v === '' ? '' : '<div style="margin:.15rem 0"><b>' + k + ':</b> ' + esc(bag(v)) + '</div>'; }
  function item(o) {
    return '<details class="kk" style="border-top:1px solid #eee;padding:.35rem 0"><summary style="cursor:pointer"><b>' + esc(o.ad) + '</b> <span class="fe-tag' + (/teyitsiz|zayıf|uzman/.test(o.durum) ? ' dev' : '') + '">' + esc(o.durum || '') + '</span></summary>' +
      '<div style="font-size:.85rem;padding:.3rem 0 .2rem .6rem">' + row('Değerler', o.degerler) + row('Uyarı seviyesi', SEV[o.seviye] || o.seviye) + row('Açıklama', o.aciklama) + row('Kaynak', o.kaynak) + row('Doğrulama', o.durum) + '</div></details>';
  }
  function group(t, list, open) { return '<details class="kg"' + (open ? ' open' : '') + ' style="margin:.3rem 0"><summary style="cursor:pointer;font-weight:700">📁 ' + esc(t) + ' (' + list.length + ')</summary><div style="padding-left:.8rem">' + list.map(item).join('') + '</div></details>'; }
  B.client().then(function (c) { return Promise.all([c.from('ses_siniflari').select('*').order('sira'), c.from('kural_kaynaklari').select('*').order('sira')]); }).then(function (rs) {
    if (rs[1].error) { bd.innerHTML = '<p class="fe-empty">Veritabanı güncellemesi gerekli (supabase/migrations/20261014233000_kural_kaynaklari.sql) veya yetki yok.</p>'; return; }
    var ses = (rs[0].data || []).map(function (x) { return { ad: x.ad_tr + (x.ad_en ? ' (' + x.ad_en + ')' : ''), degerler: (x.hz_min != null ? x.hz_min + '–' + x.hz_max + ' Hz · ' : 'Hz: Veri yok · ') + (x.yapi || ''), seviye: x.seviye, aciklama: x.anlam, kaynak: x.kaynak || 'Doğrulanmış hakemli kaynak bulunamadı', durum: x.durum || (x.kaynak_zayif ? 'kaynak zayıf · KİLİTLİ' : 'teyitli · KİLİTLİ') }; });
    var K = rs[1].data || [], by = function (g) { return K.filter(function (x) { return x.grup === g; }); };
    bd.innerHTML = group('Ses sınıfları (KİLİTLİ protokol)', ses) + group('Oğul skoru bileşenleri', by('oğul skoru')) + group('Sağlık kuralları', by('sağlık')) + group('Muayene kuralları', by('muayene'));
  }).catch(function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
})();
