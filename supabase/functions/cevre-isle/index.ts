// koloni-166: çevre iş kuyruğu işçisi. pg_cron 10 dk'da bir çağırır.
// arilik: Overpass (3 sunucu) en yakın su + Open-Meteo rakım → arilik_cevre (ortu = WorldCover betiği, korunur).
// bal_ormani_sync: Bakanlık Arıcılık Haritası, sayfalama ile ne dönerse hepsi (üst sınır yok) → bal_ormanlari.
// Hata/5xx/zaman aşımı: deneme++, sonraki = şimdi + 2^deneme dk (en çok 24 saat). Uygulama yalnız kayıtlı sonucu okur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// overpass-api.de bulut IP'lerine 406 dönüyor (k180 canlı deneme) → ana private.coffee, yedek kumi.systems
const OVERPASS = ["https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]; // ana + yedek
const UA = "SuperAri/1.0 (aricilik; superari.vercel.app)";
const BAKANLIK = "https://aricilikharitasi.tarimorman.gov.tr";

export function bekleme(deneme: number): number { return Math.min(24 * 60, Math.pow(2, Math.max(1, deneme))) * 60_000; } // 2,4,8… dk, en çok 24 saat

async function zf(url: string, init: RequestInit = {}, ms = 25_000): Promise<Response> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...init, signal: c.signal, headers: { "User-Agent": UA, ...(init.headers || {}) } }); } finally { clearTimeout(t); }
}
function mesafe(a: number, b: number, c: number, d: number) {
  const R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h));
}
// k180: su sorgusu hafifletildi + önbellek. Hücre = koordinat 2 ondalık (~1 km). Hücre merkezinden YARICAP+800 m içindeki su noktaları
// (yalnız konum/tür/ad) su_onbellek'e 30 gün yazılır; mesafe her zaman arılığın gerçek koordinatından hesaplanır (uydurma yok).
// Etiketler daraltıldı (çeşme/sulak alan çıkarıldı); rota riski 1500 m'de doyar → 2000 m yeter. [timeout:25], 2 sunucu (ana + yedek).
export const YARICAP = 2000, ONBELLEK_GUN = 30, SUNUCU_MS = 30_000;
export function hucre(lat: number, lon: number) { const la = Math.round(lat * 100) / 100, lo = Math.round(lon * 100) / 100; return { anahtar: la.toFixed(2) + "_" + lo.toFixed(2), lat: la, lon: lo }; }
export function kutu(lat: number, lon: number, r: number) { const dla = r / 111_320, dlo = r / (111_320 * Math.cos(lat * Math.PI / 180)); const f = (x: number) => Math.round(x * 1e5) / 1e5; return [f(lat - dla), f(lon - dlo), f(lat + dla), f(lon + dlo)]; }
// Yollar (dere/kanal/göl kıyısı) kutuya kırpılmış geometriyle gelir: mesafe en yakın kenara (merkeze değil).
export function suSorgu(lat: number, lon: number, r = YARICAP + 800) {
  const a = `(around:${r},${lat},${lon})`;
  // k184: deniz kıyısı (natural=coastline) + büyük göl/baraj multipolygon ilişkileri (relation natural=water); üyelerin geometrisi kenar olarak sayılır
  return `[out:json][timeout:25];(way${a}[waterway~"^(river|stream|canal)$"];way${a}[natural=water];way${a}[natural=coastline];relation${a}[natural=water][type=multipolygon];node${a}[natural=spring];node${a}[amenity=drinking_water];node${a}[man_made=water_well];);out tags geom(${kutu(lat, lon, r).join(",")}) qt 300;`;
}
export type Nokta = { g: number[][]; tur: string; ad: string | null };
const f5 = (x: number) => Math.round(x * 1e5) / 1e5;
export function noktalar(j: any): Nokta[] {
  const L: Nokta[] = [];
  for (const e of j?.elements || []) { const t = e.tags || {};
    const tur = t.waterway || t.natural || t.amenity || t.man_made || "su", ad = t.name || null;
    const yol = (geo: any[]) => (geo || []).filter((p: any) => p && p.lat != null).map((p: any) => [f5(p.lat), f5(p.lon)]);
    if (e.type === "relation") { for (const m of e.members || []) { const g = yol(m.geometry); if (g.length) L.push({ g, tur, ad }); } continue; } // k184: göl/baraj kenarı
    const g: number[][] = e.type === "node" ? (e.lat != null ? [[f5(e.lat), f5(e.lon)]] : []) : yol(e.geometry);
    if (!g.length) continue;
    L.push({ g, tur, ad }); }
  return L;
}
// Nokta–parça mesafesi (yerel düzlem; 3 km'de hata ihmal edilir)
function parca(lat: number, lon: number, a: number[], b: number[]) {
  const k = 111_320, c = Math.cos(lat * Math.PI / 180), ax = (a[1] - lon) * k * c, ay = (a[0] - lat) * k, bx = (b[1] - lon) * k * c, by = (b[0] - lat) * k;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
  return Math.hypot(ax + u * dx, ay + u * dy);
}
export function enYakin(lat: number, lon: number, L: Nokta[]) {
  let best: { m: number; tur: string; ad: string | null } | null = null;
  for (const p of L) { const g = p.g || []; let d = Infinity;
    if (g.length === 1) d = mesafe(lat, lon, g[0][0], g[0][1]); else for (let i = 0; i + 1 < g.length; i++) d = Math.min(d, parca(lat, lon, g[i], g[i + 1]));
    const m = Math.round(d); if (m <= YARICAP && (!best || m < best.m)) best = { m, tur: p.tur, ad: p.ad }; }
  return best; // null = YARICAP içinde su yok (gerçek sonuç)
}
// Sunucular yoğunken hızlı 5xx döner: en çok 6 tur (ana → yedek → ana → yedek), aralarda kısa bekleme; toplam süre TOPLAM_MS ile sınırlı.
export const TOPLAM_MS = 60_000;
export async function overpass(q: string, fetcher: F = zf, bekle = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  const bitis = Date.now() + TOPLAM_MS, iz: string[] = [];
  const ad = (u: string) => new URL(u).hostname.replace(/^overpass[.-]/, "");
  for (let tur = 0; tur < 6; tur++) for (const u of OVERPASS) {
    const kalan = bitis - Date.now(); if (kalan < 3000) break;
    try {
      const r = await fetcher(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, Math.min(SUNUCU_MS, kalan));
      if (!r.ok) { iz.push(ad(u) + " " + r.status); await bekle(Math.min(6000, 2000 * (tur + 1))); continue; }
      const j = await r.json(); if (j?.remark && /runtime error|timed out/i.test(String(j.remark))) { iz.push(ad(u) + " zaman aşımı"); continue; }
      return j;
    } catch (e) { iz.push(ad(u) + " " + ((e as Error)?.name === "AbortError" ? "zaman aşımı" : String((e as Error)?.message || e).slice(0, 60))); }
  }
  throw new Error("overpass: " + (iz.join(" · ") || "süre doldu"));
}
async function su(db: any, lat: number, lon: number) {
  const h = hucre(lat, lon), sinir = new Date(Date.now() - ONBELLEK_GUN * 86400_000).toISOString();
  const { data: c } = await db.from("su_onbellek").select("noktalar").eq("anahtar", h.anahtar).gte("hesaplandi", sinir).maybeSingle();
  if (c && Array.isArray(c.noktalar) && c.noktalar.every((p: any) => Array.isArray(p?.g))) return { s: enYakin(lat, lon, c.noktalar), onbellek: true };
  const L = noktalar(await overpass(suSorgu(h.lat, h.lon)));
  await db.from("su_onbellek").upsert({ anahtar: h.anahtar, lat: h.lat, lon: h.lon, yaricap_m: YARICAP + 800, noktalar: L, hesaplandi: new Date().toISOString() });
  return { s: enYakin(lat, lon, L), onbellek: false };
}
async function rakim(lat: number, lon: number) {
  const r = await zf(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
  if (!r.ok) throw new Error("elevation " + r.status);
  const j = await r.json(); const e = j?.elevation?.[0]; return Number.isFinite(e) ? Math.round(e) : null;
}
// Bakanlık (site JS'inden): POST /BalHaritasi/GetData/ veriTuru=6 → il listesi (Plaka, ToplamKapasite);
// her il için POST /BalHaritasi/GetBalOrmanlariByPlaka/ plaka=N → [ { SehirAdi, Features:[{ properties:{ ADI, KAPASITE, ILCE? }, geometry }] } ].
// Sabit üst sınır/sayı yok: liste ne dönerse hepsi. 5xx/zaman aşımı → hata fırlat (kuyruk üstel bekler).
type F = (u: string, i?: RequestInit, ms?: number) => Promise<Response>;
async function post(fetcher: F, yol: string, govde: string) {
  const r = await fetcher(BAKANLIK + yol, { method: "POST", body: govde, headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 30_000);
  if (r.status >= 500) throw new Error("bakanlik " + r.status);
  if (!r.ok) throw new Error("bakanlik " + r.status);
  const t = await r.text(); if (!t) return []; try { return JSON.parse(t); } catch { throw new Error("bakanlik json"); }
}
function merkez(g: { type?: string; coordinates?: unknown } | undefined): [number | null, number | null] {
  const pts: number[][] = []; const gez = (c: unknown) => { if (Array.isArray(c) && typeof c[0] === "number") pts.push(c as number[]); else if (Array.isArray(c)) c.forEach(gez); };
  gez(g?.coordinates); if (!pts.length) return [null, null];
  let x = 0, y = 0; pts.forEach((p) => { x += p[0]; y += p[1]; }); x /= pts.length; y /= pts.length;
  if (Math.abs(x) > 180) { const lon = x / 20037508.34 * 180; const lat = Math.atan(Math.exp(y / 20037508.34 * Math.PI)) * 360 / Math.PI - 90; return [lat, lon]; } // EPSG:3857
  return [y, x];
}
export async function balOrmanlari(fetcher: F = zf) {
  const iller = await post(fetcher, "/BalHaritasi/GetData/", "veriTuru=6");
  const tum: Record<string, unknown>[] = [];
  for (const il of (Array.isArray(iller) ? iller : [])) {
    const plaka = il.Plaka ?? il.plaka; if (plaka == null) continue;
    const r = await post(fetcher, "/BalHaritasi/GetBalOrmanlariByPlaka/", "plaka=" + encodeURIComponent(String(plaka)));
    for (const sehir of (Array.isArray(r) ? r : [])) for (const [k, f] of ((sehir.Features || []) as Record<string, any>[]).entries()) {
      const p = f.properties || {}; const [lat, lon] = merkez(f.geometry);
      tum.push({ id: `${plaka}-${p.ID ?? p.OBJECTID ?? k}`, ad: String(p.ADI ?? "Bal ormanı"), il: sehir.SehirAdi ?? il.IlAdi ?? null, ilce: p.ILCE ?? p.ILCE_ADI ?? null,
        lat, lon, kovan_kapasitesi: Number(String(p.KAPASITE ?? "").replace(/\D/g, "")) || null, kaynak: "T.C. Tarım ve Orman Bakanlığı · Türkiye Arıcılık Haritası", guncellendi: new Date().toISOString() });
    }
  }
  return tum;
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") || "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!auth.includes(Deno.env.get("CEVRE_GIZLI") || "\u0000yok")) return new Response("yetki yok", { status: 401 });
  const { data: isler } = await db.from("cevre_kuyruk").select("*").in("durum", ["bekliyor", "hata"]).lte("sonraki", new Date().toISOString()).order("sonraki").limit(2);
  // takılı kalan (işçi düştü) işler 15 dk sonra yeniden denenir
  await db.from("cevre_kuyruk").update({ durum: "hata", hata: "zaman aşımı" }).eq("durum", "isleniyor").lt("sonraki", new Date(Date.now() - 15 * 60_000).toISOString());
  const sonuc: unknown[] = [];
  for (const is of isler || []) {
    await db.from("cevre_kuyruk").update({ durum: "isleniyor" }).eq("id", is.id);
    try {
      if (is.hedef_tur === "arilik") {
        const [sr, rk] = await Promise.all([su(db, is.lat, is.lon), rakim(is.lat, is.lon).catch(() => null)]); const s = sr.s;
        const { data: eski } = await db.from("arilik_cevre").select("ortu,toplama_alani_guvenli").eq("arilik_id", is.hedef_id).maybeSingle();
        await db.from("arilik_cevre").upsert({ arilik_id: is.hedef_id, lat: is.lat, lon: is.lon, su_kaynagi_mesafe_metre: s ? s.m : YARICAP + 1, su_kaynagi_turu: s ? s.tur : "yok", su_kaynagi_adi: s?.ad ?? null,
          rakim_m: rk, ortu: eski?.ortu ?? null, toplama_alani_guvenli: eski?.toplama_alani_guvenli ?? null, kaynak: "OpenStreetMap Overpass" + (sr.onbellek ? " (önbellek)" : "") + " · Open-Meteo elevation", hesaplandi: new Date().toISOString() });
      } else if (is.hedef_tur === "bal_ormani_sync") {
        const L = await balOrmanlari();
        if (L.length) await db.from("bal_ormanlari").upsert(L);
      }
      await db.from("cevre_kuyruk").update({ durum: "tamam", hata: null, bitti: new Date().toISOString() }).eq("id", is.id);
      sonuc.push({ id: is.id, ok: true });
    } catch (e) {
      const d = (is.deneme || 0) + 1;
      // k180: sonuç yoksa uydurma yok — konum değiştiyse eski mesafe silinir (uygulama «Veri yok» gösterir)
      if (is.hedef_tur === "arilik") { try { const { data: es } = await db.from("arilik_cevre").select("lat,lon").eq("arilik_id", is.hedef_id).maybeSingle();
        if (es && (es.lat !== is.lat || es.lon !== is.lon)) await db.from("arilik_cevre").update({ lat: is.lat, lon: is.lon, su_kaynagi_mesafe_metre: null, su_kaynagi_turu: null, su_kaynagi_adi: null, hesaplandi: new Date().toISOString() }).eq("arilik_id", is.hedef_id); } catch { /* */ } }
      await db.from("cevre_kuyruk").update({ durum: "hata", deneme: d, hata: String((e as Error).message || e).slice(0, 300), sonraki: new Date(Date.now() + bekleme(d)).toISOString() }).eq("id", is.id);
      sonuc.push({ id: is.id, ok: false, deneme: d });
    }
  }
  return Response.json({ islenen: sonuc.length, sonuc });
});
