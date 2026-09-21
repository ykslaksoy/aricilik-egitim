/**
 * İşletme panelleri — yönetici / arıcı / bakıcı
 * Aynı işletmede birden fazla arıcı ve bakıcı oturumu açılabilir.
 */

const ROLES = ["yonetici", "arici", "bakici", "isci"]; // isci = legacy alias for bakici

function normalizeRol(rol) {
  const r = String(rol || "").toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
  if (r === "isci" || r === "bakici" || r === "worker" || r === "caretaker") return "bakici";
  if (r === "yonetici" || r === "admin" || r === "manager") return "yonetici";
  if (r === "arici" || r === "beekeeper") return "arici";
  return r || "bakici";
}

/** @type {Map<string, object>} */
const orgs = new Map();
/** @type {Map<string, object>} */
const sessions = new Map();

function seedDefaults() {
  if (orgs.has("koloni-demo")) return;
  orgs.set("koloni-demo", {
    id: "koloni-demo",
    ad: "SüperArı Demo İşletme",
    createdAt: new Date().toISOString(),
    uyeler: [
      { id: "yon-1", ad: "Yönetici Ali", rol: "yonetici", pin: "1234" },
      { id: "ari-1", ad: "Arıcı Ayşe", rol: "arici", pin: "1111" },
      { id: "ari-2", ad: "Arıcı Mehmet", rol: "arici", pin: "2222" },
      { id: "isc-1", ad: "Bakıcı Hasan", rol: "bakici", pin: "3333" },
      { id: "isc-2", ad: "Bakıcı Zeynep", rol: "bakici", pin: "4444" },
    ],
    hiveIds: null, // null = tüm filo
  });
}

function listOrgs() {
  return [...orgs.values()].map((o) => ({
    id: o.id,
    ad: o.ad,
    uyeSayisi: o.uyeler.length,
    roller: {
      yonetici: o.uyeler.filter((u) => u.rol === "yonetici").length,
      arici: o.uyeler.filter((u) => u.rol === "arici").length,
      bakici: o.uyeler.filter((u) => u.rol === "bakici" || u.rol === "isci").length,
    },
  }));
}

function getOrg(orgId) {
  return orgs.get(orgId) || null;
}

function createOrg(body = {}) {
  const id =
    body.id ||
    String(body.ad || "isletme")
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/gi, "-")
      .replace(/^-|-$/g, "") ||
    `org-${Date.now()}`;
  if (orgs.has(id)) return { error: "org_exists" };
  const org = {
    id,
    ad: body.ad || id,
    createdAt: new Date().toISOString(),
    uyeler: [
      {
        id: `yon-${Date.now()}`,
        ad: body.yoneticiAd || "Yönetici",
        rol: "yonetici",
        pin: body.pin || "1234",
      },
    ],
    hiveIds: Array.isArray(body.hiveIds) ? body.hiveIds.map(Number) : null,
  };
  orgs.set(id, org);
  return { ok: true, org: publicOrg(org) };
}

function addMember(orgId, body = {}) {
  const org = orgs.get(orgId);
  if (!org) return { error: "org_not_found" };
  const rol = normalizeRol(body.rol);
  const member = {
    id: `${rol.slice(0, 3)}-${Date.now()}`,
    ad: body.ad || `${rol} ${org.uyeler.length + 1}`,
    rol,
    pin: String(body.pin || "0000"),
  };
  org.uyeler.push(member);
  return { ok: true, member: { id: member.id, ad: member.ad, rol: member.rol }, org: publicOrg(org) };
}

function publicOrg(org) {
  if (!org) return null;
  return {
    id: org.id,
    ad: org.ad,
    uyeler: org.uyeler.map((u) => ({ id: u.id, ad: u.ad, rol: u.rol })),
    hiveIds: org.hiveIds,
  };
}

function roleMatches(stored, want) {
  const a = normalizeRol(stored);
  const b = normalizeRol(want);
  return a === b;
}

function login({ orgId, rol, uyeId, ad, pin } = {}) {
  const org = orgs.get(orgId);
  if (!org) return { error: "org_not_found" };
  const rolNorm = normalizeRol(rol);
  if (!["yonetici", "arici", "bakici"].includes(rolNorm)) return { error: "invalid_role" };

  let uye = null;
  if (uyeId) {
    uye = org.uyeler.find((u) => u.id === uyeId && roleMatches(u.rol, rolNorm));
  } else if (ad) {
    uye = org.uyeler.find(
      (u) => roleMatches(u.rol, rolNorm) && u.ad.toLowerCase() === String(ad).toLowerCase()
    );
  }
  // Yeni arıcı/bakıcı oturumu — aynı işletmede ek panel
  if (!uye && (rolNorm === "arici" || rolNorm === "bakici") && ad) {
    uye = {
      id: `${rolNorm.slice(0, 3)}-${Date.now()}`,
      ad: String(ad),
      rol: rolNorm,
      pin: String(pin || "0000"),
    };
    org.uyeler.push(uye);
  }
  if (!uye) {
    uye = org.uyeler.find((u) => roleMatches(u.rol, rolNorm));
  }
  if (!uye) return { error: "member_not_found" };
  if (pin != null && uye.pin && String(pin) !== String(uye.pin)) {
    return { error: "bad_pin" };
  }

  const token = `sess-${rolNorm}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    token,
    orgId: org.id,
    orgAd: org.ad,
    uyeId: uye.id,
    ad: uye.ad,
    rol: normalizeRol(uye.rol),
    hiveIds: org.hiveIds,
    createdAt: new Date().toISOString(),
  };
  sessions.set(token, session);
  return {
    ok: true,
    session,
    org: publicOrg(org),
    panels: {
      yonetici: `/yonetici.html?org=${org.id}`,
      arici: `/arici.html?org=${org.id}`,
      bakici: `/bakici.html?org=${org.id}`,
      isci: `/isci.html?org=${org.id}`, // legacy redirect → bakici
    },
  };
}

function getSession(token) {
  if (!token) return null;
  return sessions.get(token) || null;
}

function listSessions(orgId) {
  return [...sessions.values()]
    .filter((s) => !orgId || s.orgId === orgId)
    .map((s) => ({
      token: s.token,
      orgId: s.orgId,
      ad: s.ad,
      rol: s.rol,
      createdAt: s.createdAt,
    }));
}

function panelLinks(baseUrl = "") {
  const root = String(baseUrl || "").replace(/\/$/, "");
  return {
    yonetici: `${root}/yonetici.html?org=koloni-demo`,
    arici: `${root}/arici.html?org=koloni-demo`,
    bakici: `${root}/bakici.html?org=koloni-demo`,
    isci: `${root}/isci.html?org=koloni-demo`, // legacy → bakici
    note: "Aynı işletmede birden fazla arıcı/bakıcı: farklı ad ile giriş yap",
  };
}

seedDefaults();

module.exports = {
  ROLES,
  seedDefaults,
  listOrgs,
  getOrg,
  createOrg,
  addMember,
  login,
  getSession,
  listSessions,
  panelLinks,
  publicOrg,
  orgs,
};
