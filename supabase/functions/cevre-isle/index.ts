// koloni-166: çevre iş kuyruğu işçisi. pg_cron 10 dk'da bir çağırır.
// arilik: Overpass (3 sunucu) en yakın su + Open-Meteo rakım → arilik_cevre (ortu = WorldCover betiği, korunur).
// bal_ormani_sync: Bakanlık Arıcılık Haritası, sayfalama ile ne dönerse hepsi (üst sınır yok) → bal_ormanlari.
// Hata/5xx/zaman aşımı: deneme++, sonraki = şimdi + 2^deneme dk (en çok 24 saat). Uygulama yalnız kayıtlı sonucu okur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const UA = "SuperAri/1.0 (aricilik; superari.vercel.app)";
const BAKANLIK = "https://aricilikharitasi.tarimorman.gov.tr";

export function bekleme(deneme: number): number { return Math.min(24 * 60, Math.pow(2, Math.max(1, deneme))) * 60_000; }

async function zf(url: string, init: RequestInit = {}, ms = 25_000): Promise<Response> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...init, signal: c.signal, headers: { "User-Agent": UA, ...(init.headers || {}) } }); } finally { clearTimeout(t); }
}
function mesafe(a: number, b: number, c: number, d: number) {
  const R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h));
}
async function su(lat: number, lon: number) {
  const a = `(around:3000,${lat},${lon})`;
  const q = `[out:json][timeout:25];(way${a}[waterway~"^(river|stream|canal)$"];node${a}[natural=spring];way${a}[natural~"^(water|wetland)$"];node${a}[amenity~"^(drinking_water|fountain)$"];node${a}[man_made=water_well];);out center 100;`;
  let son: unknown = null;
  for (const u of OVERPASS) {
    try {
      const r = await zf(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 40_000);
      if (!r.ok) { son = new Error("overpass " + r.status); continue; }
      const j = await r.json(); let best: { m: number; tur: string; ad: string | null } | null = null;
      for (const e of j.elements || []) {
        const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon; if (la == null) continue;
        const m = Math.round(mesafe(lat, lon, la, lo)), t = e.tags || {};
        const tur = t.waterway || t.natural || t.amenity || t.man_made || "su";
        if (!best || m < best.m) best = { m, tur, ad: t.name || null };
      }
      return best; // null = 3 km içinde su yok
    } catch (e) { son = e; }
  }
  throw son || new Error("overpass");
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
        const [s, rk] = await Promise.all([su(is.lat, is.lon), rakim(is.lat, is.lon).catch(() => null)]);
        const { data: eski } = await db.from("arilik_cevre").select("ortu,toplama_alani_guvenli").eq("arilik_id", is.hedef_id).maybeSingle();
        await db.from("arilik_cevre").upsert({ arilik_id: is.hedef_id, lat: is.lat, lon: is.lon, su_kaynagi_mesafe_metre: s ? s.m : 3001, su_kaynagi_turu: s ? s.tur : "yok", su_kaynagi_adi: s?.ad ?? null,
          rakim_m: rk, ortu: eski?.ortu ?? null, toplama_alani_guvenli: eski?.toplama_alani_guvenli ?? null, kaynak: "OpenStreetMap Overpass · Open-Meteo elevation", hesaplandi: new Date().toISOString() });
      } else if (is.hedef_tur === "bal_ormani_sync") {
        const L = await balOrmanlari();
        if (L.length) await db.from("bal_ormanlari").upsert(L);
      }
      await db.from("cevre_kuyruk").update({ durum: "tamam", hata: null, bitti: new Date().toISOString() }).eq("id", is.id);
      sonuc.push({ id: is.id, ok: true });
    } catch (e) {
      const d = (is.deneme || 0) + 1;
      await db.from("cevre_kuyruk").update({ durum: "hata", deneme: d, hata: String((e as Error).message || e).slice(0, 300), sonraki: new Date(Date.now() + bekleme(d)).toISOString() }).eq("id", is.id);
      sonuc.push({ id: is.id, ok: false, deneme: d });
    }
  }
  return Response.json({ islenen: sonuc.length, sonuc });
});
