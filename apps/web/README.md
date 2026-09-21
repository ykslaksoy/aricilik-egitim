# SüperArı — web panel (demo)

**Kalıcı demo URL:** https://superari.vercel.app/arici.html

- Giriş: https://superari.vercel.app/giris.html
- Kayıt / doğrulama: https://superari.vercel.app/kayit.html · https://superari.vercel.app/onay.html
- Ayarlar (Arıcılık adı): https://superari.vercel.app/ayarlar.html
- Arılıklar (Yandex harita seçici): https://superari.vercel.app/ariliklar.html
- Kovanlar: https://superari.vercel.app/kovanlar.html
- Uyarılar / Görevler: ilgili `.html` sayfalar

Hosting: Vercel proje `superari` (kök: `apps/web`).  
Kaynak: `ykslaksoy/aricilik-egitim`.

## Yandex Maps API anahtarı

Arılık konum seçici **Yandex Maps JavaScript API** kullanır (Leaflet yok).

Ücretsiz anahtar: https://developer.tech.yandex.ru/services/

Nasıl verilir (öncelik sırası):

1. URL: `?ymaps_key=ANAHTAR` (localStorage’a da yazar)
2. `window.YANDEX_MAPS_API_KEY = 'ANAHTAR'`
3. `localStorage.setItem('YANDEX_MAPS_API_KEY', 'ANAHTAR')`
4. `<meta name="yandex-maps-api-key" content="ANAHTAR">`
5. `apps/web/yandex-config.js` → `apiKey: 'ANAHTAR'`

Vercel: Project → Settings → Environment Variables → `YANDEX_MAPS_API_KEY`,  
sonra deploy öncesi `yandex-config.js` içine yazın veya CI ile üretin:

```bash
echo "window.__YANDEX_MAPS_CONFIG__={apiKey:\"$YANDEX_MAPS_API_KEY\"};" > apps/web/yandex-config.js
```

Anahtar yoksa sayfa Türkçe uyarı gösterir; Leaflet’e sessizce düşmez.

**Canlı (static):** anahtar `apps/web/yandex-config.js` içinde deploy edilir (JS API anahtarları domain kısıtlıdır). Yandex Developer Console’da HTTP Referrer / izin verilen domain olarak `https://superari.vercel.app/*` ve `http://localhost:*` ekleyin.

**Not:** Yandex hesabındaki “kayıtlı yerler” için OAuth gerekir (sonra). Şimdilik Yandex arama + harita iğnesi + link yapıştırma + uygulamada kayıtlı arılık yer işaretleri var. İstersen pin Google / Apple / OSM / Bing’te de açılır.


## Kullanıcı yönetimi (ayrı navigasyon)

- Panel: https://superari.vercel.app/kullanicilar.html
- Kendi alt navigasyonu: Kullanıcılar · Bekleyen · Bildirimler · Ayarlar
- Son kullanıcı sekmelerine (Ana · Kovanlar · Uyarılar · Görevler · Ayarlar) karışmaz.
- Yoğunluk / kota: kullanıcıya «Talep yoğunluğundan dolayı lütfen yarın deneyiniz.» — yöneticiye «Kullanıcı yoğunluktan dolayı ekleme yapılamadı».
- Bildirimler localStorage + isteğe bağlı `/api/admin/notify-user-add-failure` (sunucu push).
