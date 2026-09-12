/**
 * Vercel önizleme — giriş uçları (kayıt yok).
 * Şifre dosyası statik /lib altında yayınlanmaz.
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

function login({ email, password } = {}) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password ?? "");
  if (e !== DEMO.email || p !== DEMO.password) {
    return { ok: false, error: "invalid_credentials" };
  }
  return {
    ok: true,
    session: {
      token: DEMO.token,
      userId: DEMO.id,
      email: DEMO.email,
      ad: DEMO.ad,
      mode: DEMO.mode,
    },
    user: {
      id: DEMO.id,
      email: DEMO.email,
      ad: DEMO.ad,
      verified: true,
      mode: DEMO.mode,
      modeLabel: DEMO.modeLabel,
    },
    setupRequired: false,
    panel: "/arici.html",
  };
}

function me(token) {
  if (!token || token !== DEMO.token) return { error: "no_session" };
  return {
    ok: true,
    session: { token: DEMO.token, mode: DEMO.mode },
    user: {
      id: DEMO.id,
      email: DEMO.email,
      ad: DEMO.ad,
      verified: true,
      mode: DEMO.mode,
      modeLabel: DEMO.modeLabel,
    },
    setupRequired: false,
    panel: "/arici.html",
  };
}

module.exports = async (req, res) => {
  const action = String(req.query.action || "").replace(/^\//, "");
  if (action === "login" && req.method === "POST") {
    res.status(200).json(login(req.body || {}));
    return;
  }
  if (action === "me") {
    const token = req.headers["x-session-token"] || "";
    const data = me(token);
    res.status(data.ok ? 200 : 401).json(data);
    return;
  }
  if (action === "logout" && req.method === "POST") {
    res.status(200).json({ ok: true });
    return;
  }
  res.status(404).json({ error: "not_found", path: `/api/auth/${action}` });
};
