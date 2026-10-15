/* SüperArı · Yeniden hesap + değişikliğe özel bildirim (koloni-165 EK10 ek, EK11 ek, EK12) → window.SuperAriYenidenHesap
 * Ayar sürümü değişince ya da taşınmadan sonra: arılık koşulları yeniden değerlendirilir; uyarı listesi önceki imzayla karşılaştırılır.
 * Genel "yeni ayarlar" bildirimi YOK. Yalnız arıcının gördüğü bir şey değiştiyse o değişikliğin kısa bildirimi + uyarı geçmişi. Birim yok. */
(function (global) {
  'use strict';
  var IMZA = 'superari.uyari.imza.v1', KAYNAK = 'superari.arilik.kaynak.v1', SON = 'superari.arilik.degerlendirme.v1';
  function rj(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function D() { return global.SuperAriDemo; }
  function K() { return global.SuperAriKritik; }
  /* Arılık kaynağı: 'onerilen' (rota motorundan onaylanarak seçildi) | 'kullanici' (varsayılan) */
  function kaynak(apId) { return rj(KAYNAK, {})[apId] === 'onerilen' ? 'onerilen' : 'kullanici'; }
  function kaynakAyarla(apId, k) { var M = rj(KAYNAK, {}); M[apId] = k === 'onerilen' ? 'onerilen' : 'kullanici'; wj(KAYNAK, M); }
  var IZLENEN = /^(ALARM_|ogul-|kra-|bat|pil|varroa)/i;
  function sev(s) { return { critical: 4, high: 3, medium: 2, low: 1 }[s] || 0; }
  function imza(alerts) { var o = {}; (alerts || []).forEach(function (a) { if (a && a.id && IZLENEN.test(String(a.code || a.id))) o[a.id] = { s: a.severity || '', t: a.title || '' }; }); return o; }
  function bildir(o) {
    var Kr = K(); if (Kr && Kr.gecmisEkle) Kr.gecmisEkle({ olay: 'bildirim', kod: o.kod, baslik: o.baslik, metin: o.metin, apiaryId: o.apiaryId || null, at: new Date().toISOString() });
    try { global.dispatchEvent(new CustomEvent('superari-bildirim', { detail: o })); } catch (e) { /* */ }
    toast(o.metin); return o;
  }
  function toast(t) {
    var d = global.document; if (!d || !d.body) return;
    var el = d.getElementById('saBildirimToast');
    if (!el) { el = d.createElement('div'); el.id = 'saBildirimToast'; el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:9999;background:#2b2116;color:#fff;border-radius:12px;padding:10px 14px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none;'; d.body.appendChild(el); }
    el.textContent = t; el.hidden = false; clearTimeout(el.__t); el.__t = setTimeout(function () { el.hidden = true; }, 5000);
  }
  /** Uyarı listesi farkı → kısa, değişikliğe özel bildirimler. Dönen: bildirim listesi. */
  function uyariFarki(alerts) {
    var eski = rj(IMZA, null), yeni = imza(alerts), out = []; wj(IMZA, yeni);
    if (!eski) return out;
    Object.keys(yeni).forEach(function (id) {
      var a = yeni[id], b = eski[id];
      if (!b) out.push(bildir({ kod: 'uyari_yeni', baslik: a.t, metin: 'Yeni uyarı: ' + a.t }));
      else if (sev(a.s) > sev(b.s)) out.push(bildir({ kod: 'uyari_artti', baslik: a.t, metin: 'Uyarı seviyesi yükseldi: ' + a.t }));
      else if (sev(a.s) < sev(b.s)) out.push(bildir({ kod: 'uyari_azaldi', baslik: a.t, metin: 'Uyarı seviyesi düştü: ' + a.t }));
    });
    Object.keys(eski).forEach(function (id) { if (!yeni[id]) out.push(bildir({ kod: 'uyari_kalkti', baslik: eski[id].t, metin: 'Durum düzeldi: ' + eski[id].t })); });
    return out;
  }
  /** Arılık yeniden değerlendirme (EK11 ek): sonuç ya da güven belirgin değişirse kaynağa göre metin. kosul: rota-motoru kosulDegerlendir girdisi; guven: 0–1 | null */
  function arilikDegerlendir(ap, kosul, guven, th) {
    var R = global.SuperAriRota; if (!R || !R.kosulDegerlendir || !ap) return null;
    var S = rj(SON, {}), eski = S[ap.id] || null, r = R.kosulDegerlendir(ap.id, kosul, th);
    var n = r.durum === 'veri_yok' ? null : r.acik.length, g = guven == null ? null : Math.round(guven * 100);
    S[ap.id] = { n: n, g: g, at: new Date().toISOString() }; wj(SON, S);
    if (!eski || n == null || eski.n == null) return { sonuc: r, bildirim: null };
    var neden = null, kotu = false;
    if (n > eski.n) { kotu = true; neden = r.acik.indexOf('su') >= 0 && (r.uyari && r.uyari.nedenler.indexOf('su') >= 0) ? 'Su riski arttı' : (r.acik.indexOf('flora') >= 0 ? 'Flora beklenenden düşük' : 'Toplama alanı güvenli değil'); }
    else if (n < eski.n) neden = 'Daha güncel veriyle hesaplandı, durum iyileşti';
    else if (g != null && eski.g != null && Math.abs(g - eski.g) >= 10) { kotu = g < eski.g; neden = kotu ? 'Güven azaldı' : 'Daha güncel veriyle hesaplandı, durum iyileşti'; }
    if (!neden) return { sonuc: r, bildirim: null };
    var kay = kaynak(ap.id), ad = ap.name || 'Arılık';
    var metin = (kay === 'onerilen' ? 'Önerdiğimiz ' + ad + ' için hesaplama güncellendi: ' : ad + ' için koşullar yeniden değerlendirildi: ') + neden + '.' + (r.uyari && r.uyari.aksiyon ? ' ' + r.uyari.aksiyon : '');
    var b = { kod: kay === 'onerilen' && kotu ? 'onerilen_risk' : 'arilik_degerlendirme', baslik: kay === 'onerilen' ? 'Önerilen arılıkta değişiklik' : 'Arılık yeniden değerlendirildi', metin: metin, apiaryId: ap.id, onay: r.uyari && r.uyari.onay };
    if (b.kod === 'onerilen_risk' && K()) K().ac({ kod: 'onerilen_risk', anahtar: ap.id, apiaryId: ap.id, metin: metin, onay: b.onay });
    bildir(b); return { sonuc: r, bildirim: b };
  }
  function kosulTopla(ap) {
    var C = global.SuperAriCevre, S = global.SuperAriSaglikTakvimi, Ck = global.SuperAriCicek, ay = new Date().getMonth() + 1;
    var cu = C ? C.satir(ap) : null, dn = null; try { dn = Ck ? Ck.donem({ il: ap.il, ilce: ap.ilce }, ay) : null; } catch (e) { dn = null; }
    var ilac = S && S.aktifIlaclama ? S.aktifIlaclama(ap.id) : false, R = global.SuperAriRota;
    return { su_m: cu ? cu.su_kaynagi_mesafe_metre : null, alan: cu && R ? R.toplamaAlaniGuvenli(cu.ortu, ilac) : null, floraAktif: dn && dn.durum === 'var' ? !!dn.aktif : null, ilaclama: ilac };
  }
  /** Tam yeniden hesap: tüm arılıklar + uyarı farkı. */
  function hepsi() {
    var d = D(); if (!d) return [];
    var out = [];
    try { (d.loadApiaries ? d.loadApiaries() : []).forEach(function (ap) { var r = arilikDegerlendir(ap, kosulTopla(ap), null); if (r && r.bildirim) out.push(r.bildirim); }); } catch (e) { /* */ }
    try { var dv = d.derived ? d.derived() : null; out = out.concat(uyariFarki(dv && dv.alerts)); } catch (e) { /* */ }
    return out;
  }
  if (global.addEventListener) {
    global.addEventListener('superari-ayar-guncel', function () { hepsi(); });
    global.addEventListener('superari-tasindi', function () { hepsi(); });
    global.addEventListener('superari-tasinma-onay', function (e) { var v = e && e.detail; if (v && v.apiaryId) kaynakAyarla(v.apiaryId, 'onerilen'); });
    /* ilk imza (sessiz): bir sonraki farkın tabanı */
    if (global.setTimeout) global.setTimeout(function () { try { var d = D(); if (d && d.derived && !rj(IMZA, null)) wj(IMZA, imza(d.derived().alerts)); } catch (e) { /* */ } }, 4000);
  }
  global.SuperAriYenidenHesap = { hepsi: hepsi, uyariFarki: uyariFarki, arilikDegerlendir: arilikDegerlendir, kaynak: kaynak, kaynakAyarla: kaynakAyarla, kosulTopla: kosulTopla, imza: imza };
})(typeof window !== 'undefined' ? window : globalThis);
