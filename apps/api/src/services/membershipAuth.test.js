const test = require("node:test");
const assert = require("node:assert/strict");
const { login, me, logout } = require("./membershipAuth");

test("demo girişi başarılı", () => {
  const data = login({ email: "Demo@SuperAri.com", password: "demo1234" });
  assert.equal(data.ok, true);
  assert.equal(data.user.email, "demo@superari.com");
  assert.equal(data.session.token, "mem-demo-static-superari");
  assert.equal(data.panel, "/arici.html");
  assert.equal(data.setupRequired, false);
});

test("yanlış şifre ham kod döner (UI Türkçeler)", () => {
  const data = login({ email: "demo@superari.com", password: "yanlis" });
  assert.equal(data.ok, false);
  assert.equal(data.error, "invalid_credentials");
});

test("boş kimlik bilgisi reddedilir", () => {
  const data = login({ email: "", password: "" });
  assert.equal(data.ok, false);
  assert.equal(data.error, "invalid_credentials");
});

test("oturum token ile me", () => {
  const data = me("mem-demo-static-superari");
  assert.equal(data.ok, true);
  assert.equal(data.user.mode, "patron");
});

test("tokensiz me", () => {
  assert.equal(me(null).error, "no_session");
});

test("logout", () => {
  assert.equal(logout().ok, true);
});
