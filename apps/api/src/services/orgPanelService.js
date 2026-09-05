/**
 * İşletme panelleri — yönetici / arıcı / işçi
 * Aynı işletmede birden fazla arıcı ve işçi oturumu açılabilir.
 */

const ROLES = ["yonetici", "arici", "isci"];

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
      { id: "isc-1", ad: "Çalışan Hasan", rol: "isci", pin: "3333" },
      { id: "isc-2", ad: "Çalışan Zeynep", rol: "isci", pin: "4444" },
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
      isci: o.uyeler.filter((u) => u.rol === "isci").length,
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
  const rol = ROLES.includes(body.rol) ? body.rol : "isci";
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

function login({ orgId, rol, uyeId, ad, pin } = {}) {
  const org = orgs.get(orgId);
  if (!org) return { error: "org_not_found" };
  if (!ROLES.includes(rol)) return { error: "invalid_role" };

  let uye = null;
  if (uyeId) {
    uye = org.uyeler.find((u) => u.id === uyeId && u.rol === rol);
  } else if (ad) {
    uye = org.uyeler.find(
      (u) => u.rol === rol && u.ad.toLowerCase() === String(ad).toLowerCase()
    );
  }
  // Yeni arıcı/işçi oturumu — aynı işletmede ek panel
  if (!uye && (rol === "arici" || rol === "isci") && ad) {
    uye = {
      id: `${rol.slice(0, 3)}-${Date.now()}`,
      ad: String(ad),
      rol,
      pin: String(pin || "0000"),
    };
    org.uyeler.push(uye);
  }
  if (!uye) {
    uye = org.uyeler.find((u) => u.rol === rol);
  }
  if (!uye) return { error: "member_not_found" };
  if (pin != null && uye.pin && String(pin) !== String(uye.pin)) {
    return { error: "bad_pin" };
  }

  const token = `sess-${rol}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    token,
    orgId: org.id,
    orgAd: org.ad,
    uyeId: uye.id,
    ad: uye.ad,
    rol: uye.rol,
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
      isci: `/isci.html?org=${org.id}`,
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
    isci: `${root}/isci.html?org=koloni-demo`,
    note: "Aynı işletmede birden fazla arıcı/işçi: farklı ad ile giriş yap",
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
