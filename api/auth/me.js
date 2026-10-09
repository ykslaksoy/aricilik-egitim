const membershipAuth = require("../../apps/api/src/services/membershipAuth");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const token = req.headers["x-session-token"] || "";
  const data = membershipAuth.me(token);
  res.status(data.ok ? 200 : 401).json(data);
};
