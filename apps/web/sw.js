/* SüperArı service worker — tam çevrimdışı açılış.
 * Sürüm, kayıt adresindeki ?v= değerinden gelir (pwa.js: sw.js?v=<sayfa sürümü>).
 * Kurulum ATOMİK: tüm uygulama kabuğu (SHELL: tüm sayfalar, JS, CSS, simgeler, sesler, Ana görselleri;
 *   scripts/gen-sw-shell.js üretir) yeni sürüm önbelleğine eksiksiz inmeden yeni SW etkinleşmez; eksik kalırsa eski sürüm çalışmaya devam eder.
 * Etkinleşince eski sürüm önbellekleri silinir (veri önbelleği «superari-data» korunur).
 * HTML: bayat-iken-yenile (önbellekten anında açılır, arka planda güncellenir).
 * JS / CSS / görsel / ses / yazı tipi: önce önbellek (sürüm değişince yeni önbellek). Sayfa başka bir ?v= isterse önce ağ.
 * /api/ (canlı fiyat /api/fiyat dahil) ve Supabase: yalnız ağ, asla önbelleğe alınmaz (SW karışmaz; uygulama çevrimdışını kendisi yönetir, kayıtlar outbox'ta bekler).
 * Hava durumu (open-meteo) ve Google yazı tipleri: ağ yoksa son alınan yanıt («superari-data»).
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = "superari-shell-" + VERSION;
const RUNTIME = "superari-runtime-" + VERSION;
const DATA = "superari-data";
const SHELL = [
  "/",
  "/admin-notify.js",
  "/admin.css",
  "/admin.html",
  "/admin.js",
  "/ana-ipucu.js",
  "/ana.css",
  "/ana.html",
  "/ana.js",
  "/app.js",
  "/arici.html",
  "/arilik.html",
  "/ariliklar.html",
  "/assets/bees/anadolu-buzz.wav",
  "/assets/bees/anadolu-flip.png",
  "/assets/bees/anadolu-front-flip.png",
  "/assets/bees/anadolu-front.png",
  "/assets/bees/anadolu-sheet.png",
  "/assets/bees/anadolu-top45-flip.png",
  "/assets/bees/anadolu-top45.png",
  "/assets/bees/anadolu.png",
  "/assets/bees/buckfast-buzz.wav",
  "/assets/bees/buckfast-flip.png",
  "/assets/bees/buckfast-front-flip.png",
  "/assets/bees/buckfast-front.png",
  "/assets/bees/buckfast-sheet.png",
  "/assets/bees/buckfast-top45-flip.png",
  "/assets/bees/buckfast-top45.png",
  "/assets/bees/buckfast.png",
  "/assets/bees/italyan-buzz.wav",
  "/assets/bees/italyan-flip.png",
  "/assets/bees/italyan-front-flip.png",
  "/assets/bees/italyan-front.png",
  "/assets/bees/italyan-sheet.png",
  "/assets/bees/italyan-top45-flip.png",
  "/assets/bees/italyan-top45.png",
  "/assets/bees/italyan.png",
  "/assets/bees/kafkas-buzz.wav",
  "/assets/bees/kafkas-flip.png",
  "/assets/bees/kafkas-front-flip.png",
  "/assets/bees/kafkas-front.png",
  "/assets/bees/kafkas-sheet.png",
  "/assets/bees/kafkas-top45-flip.png",
  "/assets/bees/kafkas-top45.png",
  "/assets/bees/kafkas.png",
  "/assets/bees/kafkas_karniyol-buzz.wav",
  "/assets/bees/kafkas_karniyol-flip.png",
  "/assets/bees/kafkas_karniyol-front-flip.png",
  "/assets/bees/kafkas_karniyol-front.png",
  "/assets/bees/kafkas_karniyol-sheet.png",
  "/assets/bees/kafkas_karniyol-top45-flip.png",
  "/assets/bees/kafkas_karniyol-top45.png",
  "/assets/bees/kafkas_karniyol.png",
  "/assets/bees/karniyol-buzz.wav",
  "/assets/bees/karniyol-flip.png",
  "/assets/bees/karniyol-front-flip.png",
  "/assets/bees/karniyol-front.png",
  "/assets/bees/karniyol-sheet.png",
  "/assets/bees/karniyol-top45-flip.png",
  "/assets/bees/karniyol-top45.png",
  "/assets/bees/karniyol.png",
  "/assets/bees/karniyol_kafkas-buzz.wav",
  "/assets/bees/karniyol_kafkas-flip.png",
  "/assets/bees/karniyol_kafkas-front-flip.png",
  "/assets/bees/karniyol_kafkas-front.png",
  "/assets/bees/karniyol_kafkas-sheet.png",
  "/assets/bees/karniyol_kafkas-top45-flip.png",
  "/assets/bees/karniyol_kafkas-top45.png",
  "/assets/bees/karniyol_kafkas.png",
  "/assets/emblems/ariliklar.png",
  "/assets/emblems/gorevler.png",
  "/assets/emblems/koloni.png",
  "/assets/emblems/kovanlar.png",
  "/assets/emblems/ogul.png",
  "/assets/emblems/raporlar.png",
  "/assets/emblems/saglik.png",
  "/assets/emblems/tarti.png",
  "/assets/emblems/uyarilar.png",
  "/assets/hive-clean.jpg",
  "/assets/logos/hardal-italyan-bee.png",
  "/ayarlar.html",
  "/bakici.html",
  "/bakim-akis.html",
  "/bakim-akis.js",
  "/bakim-plan.html",
  "/bakim-plan.js",
  "/bakim-yap.html",
  "/bakim.html",
  "/bk-kabuk.css",
  "/bk-kabuk.js",
  "/bugun.html",
  "/bulut-config.json",
  "/bulut.js",
  "/cihazlar.html",
  "/components/hive-row.js",
  "/components/score-badge.js",
  "/components/sensor-chart.js",
  "/demo-data.js",
  "/device-runtime.js",
  "/ekipman-store.js",
  "/ekipman.html",
  "/favicon.ico",
  "/fiyat-live.js",
  "/forage-analysis.js",
  "/forage-yield-estimate.js",
  "/foto.js",
  "/gider-store.js",
  "/giderler.html",
  "/giris.html",
  "/goc.html",
  "/gorevler.html",
  "/harita-offline.js",
  "/hastalik-tahmin.js",
  "/hava-gecmis.html",
  "/hava-kayit.js",
  "/hava-raporu.html",
  "/hesap.html",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/ilac-katalog.js",
  "/index.html",
  "/irk-tahmin.js",
  "/isci.html",
  "/kamera.html",
  "/kapsam.css",
  "/kapsam.js",
  "/kayit.html",
  "/kolay-muayene.js",
  "/koloni-ek.html",
  "/koloni-ek.js",
  "/koloni-islem.html",
  "/koloni.js",
  "/kovan-ara.js",
  "/kovan.html",
  "/kovanlar.html",
  "/ks-sayfa.js",
  "/kullanicilar.html",
  "/kullanicilar.js",
  "/kurulum.html",
  "/landcover-sync.js",
  "/logo-sec.html",
  "/logos/hardal-bees.js",
  "/manifest.json",
  "/mic-session.js",
  "/nav.js",
  "/offline-sync.js",
  "/ogul-verdi.js",
  "/ogul.js",
  "/onay.html",
  "/pages/alerts.js",
  "/pages/calibrate.js",
  "/pages/dashboard.js",
  "/pages/hive-detail.js",
  "/pages/transport.js",
  "/panels.css",
  "/panels.js",
  "/petek-tarama.css",
  "/petek-tarama.html",
  "/petek-tarama.js",
  "/push.js",
  "/pwa.js",
  "/qr-etiket.html",
  "/rapor-bal.html",
  "/rapor-common.css",
  "/rapor-donem.html",
  "/rapor-export.html",
  "/rapor-kar-zarar.html",
  "/rapor-muayene.html",
  "/rapor-saglik.html",
  "/rapor-store.js",
  "/rapor-uyari-gorev.html",
  "/raporlar.html",
  "/saglik-canli.js",
  "/saglik-detay.html",
  "/saglik.html",
  "/sartlar.html",
  "/sartlar.js",
  "/satis-store.js",
  "/satis.html",
  "/sensor-health.js",
  "/sensorler.html",
  "/sesle-muayene.js",
  "/stok-talep.js",
  "/stok.html",
  "/styles.css",
  "/tarti-muayene-sync.js",
  "/tarti-bakim-delta.js",
  "/tarti-elle.js",
  "/uyarilar.html",
  "/vendor/jsqr.js",
  "/vendor/qrcode.js",
  "/vendor/supabase.js",
  "/vercel.json",
  "/yandex-config.js",
  "/yandex-map.js",
  "/yedek.js",
  "/yonetici.html"
];
const NET_TIMEOUT_MS = 6000;
/* Çevrimdışı harita (harita-offline.js indirir): OpenFreeMap vektör + EOX uydu karoları, MapLibre. Sürümden bağımsız, silinmez. */
const MAPS = "superari-maps";
function mapKey(url) {
  const m = /^\/planet\/[^/]+\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url.pathname);
  return url.hostname === "tiles.openfreemap.org" && m ? "https://tiles.openfreemap.org/__ofm/" + m[1] + "/" + m[2] + "/" + m[3] + ".pbf" : url.href;
}
function mapRequest(req, url) {
  const key = mapKey(url);
  return caches.open(MAPS).then((c) => c.match(key).then((hit) => {
    /* TileJSON: çevrimiçiyken güncel sürüm (indirilmişse önbellekteki de yenilenir), çevrimdışı önbellek */
    if (url.hostname === "tiles.openfreemap.org" && url.pathname === "/planet") {
      return fetch(req).then((res) => { if (res.ok && hit) c.put(key, res.clone()).catch(() => {}); return res; })
        .catch(() => hit || new Response("", { status: 504, statusText: "offline" }));
    }
    if (hit) return hit;
    return fetch(req).catch(() => new Response("", { status: 504, statusText: "offline" }));
  }));
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try {
      /* küçük gruplar hâlinde, hepsi inmeli (biri bile inmezse kurulum başarısız → eski sürüm kalır) */
      for (let i = 0; i < SHELL.length; i += 12) {
        await Promise.all(SHELL.slice(i, i + 12).map((u) => c.match(u).then((hit) => hit || c.add(new Request(u, { cache: "reload" })))));
      }
    } catch (err) {
      await caches.delete(CACHE);
      throw err;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => (k.indexOf("superari-") === 0 || k.indexOf("koloni-v") === 0) && k !== CACHE && k !== RUNTIME && k !== DATA && k !== MAPS)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromCache(req) {
  return caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }))
    .then((hit) => hit || caches.open(RUNTIME).then((c) => c.match(req)))
    .then((hit) => hit || caches.match(req, { ignoreSearch: true }));
}
function putIn(name, req, res) {
  if (!res || !(res.ok || res.type === "opaque")) return;
  const copy = res.clone();
  caches.open(name).then((c) => c.put(req, copy)).catch(() => {});
}
function offlinePage() {
  return new Response(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Çevrimdışı</title><body style='font-family:system-ui;padding:2rem'><h1>Çevrimdışı</h1><p>Bu sayfa henüz cihaza kaydedilmedi. İnternete bağlanınca tekrar deneyin.</p><p><a href='/ana.html'>Ana sayfa</a></p>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
/* HTML: bayat-iken-yenile. Önbellekte varsa anında döner; ağdan gelen yeni sürüm önbelleğe yazılır. */
function staleWhileRevalidate(e, req) {
  const url = new URL(req.url);
  const key = new Request(url.pathname === "/" ? "/" : url.pathname);
  const net = fetch(req).then((res) => {
    if (res && res.ok && res.type === "basic" && !res.redirected) putIn(CACHE, key, res);
    return res;
  });
  return fromCache(key).then((hit) => {
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => fromCache(new Request("/ana.html")).then((a) => a || offlinePage()));
  });
}
function networkFirst(req, store) {
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => (store === DATA ? caches.open(DATA).then((c) => c.match(req)) : fromCache(req));
    const timer = setTimeout(() => { fallback().then((hit) => { if (hit && !done) { done = true; resolve(hit); } }); }, NET_TIMEOUT_MS);
    fetch(req).then((res) => {
      putIn(store || RUNTIME, req, res);
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fallback().then((hit) => { if (done) return; done = true; resolve(hit || new Response("", { status: 504, statusText: "offline" })); });
    });
  });
}
function cacheFirst(req, store) {
  const lookup = store === DATA ? caches.open(DATA).then((c) => c.match(req)) : fromCache(req);
  return lookup.then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => { putIn(store || RUNTIME, req, res); return res; })
      .catch(() => new Response("", { status: 504, statusText: "offline" }));
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  /* Dış kaynaklar: hava durumu ve yazı tipleri (son yanıt çevrimdışı), indirilen harita karoları; geri kalanı (Supabase, Yandex…) yalnız ağ. */
  if (url.origin !== self.location.origin) {
    if (/(^|\.)open-meteo\.com$/.test(url.hostname)) { e.respondWith(networkFirst(req, DATA)); return; }
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") { e.respondWith(cacheFirst(req, DATA)); return; }
    if (url.hostname === "tiles.openfreemap.org" || url.hostname === "tiles.maps.eox.at") { e.respondWith(mapRequest(req, url)); return; }
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  /* Fiyat referansı her zaman ağdan (önbelleğe alınmaz, bayat fiyat gösterilmez) */
  if (url.pathname === "/data/fiyat-ref.json") return;
  const isNav = req.mode === "navigate";
  if (isNav || /\.html$/i.test(url.pathname) || url.pathname === "/") {
    e.respondWith(staleWhileRevalidate(e, req));
    return;
  }
  if (/\.(js|css|json|png|jpe?g|gif|webp|svg|ico|woff2?|wav|mp3|ogg)$/i.test(url.pathname)) {
    const v = url.searchParams.get("v");
    /* sayfa bu SW'den farklı bir sürüm istiyorsa (yayın geçişi): önce ağ, yoksa önbellek */
    if (v && v !== VERSION && VERSION !== "dev") { e.respondWith(networkFirst(req)); return; }
    e.respondWith(cacheFirst(req));
  }
});

/* Arka planda eşitleme (Background Sync, destekleyen tarayıcılarda): açık sayfalara outbox'ı göndermelerini söyle. */
self.addEventListener("sync", (e) => {
  if (e.tag !== "superari-outbox") return;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    list.forEach((c) => c.postMessage({ type: "sync-outbox" }));
  }));
});
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "skip-waiting") self.skipWaiting();
});

/* Bildirime dokununca ilgili sayfayı aç / öne getir. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/gorevler.html", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === target && "focus" in c) return c.focus();
      }
      for (const c of list) {
        if ("navigate" in c && "focus" in c) return c.navigate(target).then((w) => (w || c).focus());
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : null;
    })
  );
});

/* Arka plan bildirimi (Web Push, /api/push-cron): uygulama kapalıyken de gösterilir. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "SüperArı";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    requireInteraction: !!d.urgent,
    lang: "tr",
    data: { url: d.url || "/gorevler.html" }
  }));
});
self.addEventListener("pushsubscriptionchange", (e) => {
  /* tarayıcı aboneliği yenilediyse: uygulama bir sonraki açılışta «Hesap ve bulut»ta yeniden kaydeder */
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((list) => list.forEach((c) => c.postMessage({ type: "push-resubscribe" }))));
});
