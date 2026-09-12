/**
 * E-posta / şifre üyeliği — yalnızca giriş (kayıt bu PR'de yok).
 * Canlı demo hesabı: demo@superari.com / demo1234
 */

const DEMO = {
  id: "usr-demo",
  email: "demo@superari.com",
  password: "demo1234",
  ad: "Demo Patron",
  mode: "patron",
  modeLabel: "Patron",
  token: "mem-demo-static-superari",
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    ad: user.ad,
    verified: true,
    mode: user.mode,
    modeLabel: user.modeLabel,
  };
}

function loginPayload(user) {
  return {
    ok: true,
    session: {
      token: user.token,
      userId: user.id,
      email: user.email,
      ad: user.ad,
      mode: user.mode,
    },
    user: publicUser(user),
    setupRequired: false,
    panel: "/arici.html",
  };
}

function login({ email, password } = {}) {
  const e = normalizeEmail(email);
  const p = String(password ?? "");
  if (e === DEMO.email && p === DEMO.password) return loginPayload(DEMO);
  return { ok: false, error: "invalid_credentials" };
}

function me(token) {
  if (!token || token !== DEMO.token) return { error: "no_session" };
  return {
    ok: true,
    session: { token: DEMO.token, mode: DEMO.mode },
    user: publicUser(DEMO),
    setupRequired: false,
    panel: "/arici.html",
  };
}

function logout() {
  return { ok: true };
}

module.exports = { login, me, logout };
