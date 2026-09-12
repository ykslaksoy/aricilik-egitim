const membershipAuth = require("../../apps/api/src/services/membershipAuth");

module.exports = async (req, res) => {
  const action = String(req.query.action || "").replace(/^\//, "");
  if (action === "login" && req.method === "POST") {
    res.status(200).json(membershipAuth.login(req.body || {}));
    return;
  }
  if (action === "me") {
    const token = req.headers["x-session-token"] || "";
    const data = membershipAuth.me(token);
    res.status(data.ok ? 200 : 401).json(data);
    return;
  }
  if (action === "logout" && req.method === "POST") {
    res.status(200).json(membershipAuth.logout());
    return;
  }
  res.status(404).json({ error: "not_found", path: `/api/auth/${action}` });
};
