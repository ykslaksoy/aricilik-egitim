const membershipAuth = require("../../apps/api/src/services/membershipAuth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  res.status(200).json(membershipAuth.login(req.body || {}));
};
