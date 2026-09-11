import { test, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { createGoogleAuthController } from "../controllers/googleAuthController.js";
import { verifyGoogleIdentity } from "../services/googleIdentityService.js";
import { login } from "../controllers/authControllers.js";
import pool from "../config/db.js";
const oldSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "test-google-auth-secret";
after(async () => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; await pool.end(); });
const identity = { sub: "google-test-sub", email: "existing@gmail.com", email_verified: true, name: "Test User" };
const passwordHash = await bcrypt.hash("existing-account-password", 4);
const account = { id: 7, name: "Existing", email: identity.email, role: "user", phone: null, password_hash: passwordHash, google_sub: null };
function fixture(rows = [account], verifyIdentity = async () => identity) {
  const calls = [];
  const connection = { beginTransaction: async () => calls.push(["begin"]), commit: async () => calls.push(["commit"]), rollback: async () => calls.push(["rollback"]), release: () => calls.push(["release"]), query: async (sql, args) => { calls.push([sql, args]); return sql.startsWith("SELECT") ? [rows.map(row => ({ ...row }))] : [{ insertId: 8, affectedRows: 1 }]; } };
  const handler = createGoogleAuthController({ db: { getConnection: async () => connection }, verifyIdentity });
  const response = { code: 200, body: null, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } };
  return { calls, response, run: (mode = "login", credential = "verified-test-token") => handler({ body: { credential, mode } }, response) };
}
test("Google login signs into an existing password account without registering or changing its password", async () => {
  const f = fixture(); await f.run(); assert.equal(f.response.code, 200); assert.equal(f.response.body.user.id, 7);
  assert.equal(jwt.verify(f.response.body.token, process.env.JWT_SECRET).id, 7);
  assert.equal(f.response.body.user.password_hash, undefined);
  assert.ok(!f.calls.some(([sql]) => sql.startsWith("INSERT") || sql.startsWith("UPDATE users SET password_hash")));
  assert.ok(f.calls.some(([sql]) => sql.startsWith("UPDATE users SET google_sub")));
});
test("only registration returns already exists for an existing Google identity", async () => {
  const f = fixture(); await f.run("registration"); assert.equal(f.response.code, 409); assert.equal(f.response.body.error, "User already exists");
  assert.ok(!f.calls.some(([sql]) => sql.startsWith("INSERT") || sql.startsWith("UPDATE")));
});
test("Google login for an unknown user does not silently register", async () => {
  const f = fixture([]); await f.run(); assert.equal(f.response.code, 404); assert.ok(!f.calls.some(([sql]) => sql.startsWith("INSERT")));
});
test("explicit Google registration creates an account bound to the verified subject", async () => {
  const f = fixture([]); await f.run("registration"); assert.equal(f.response.code, 201);
  const [,values] = f.calls.find(([sql]) => sql.startsWith("INSERT")); assert.equal(values[1], identity.email); assert.equal(values[3], identity.sub);
  assert.equal(await bcrypt.compare(`google_oauth_${identity.sub}`, values[2]), false);
});
test("invalid or unverified Google identities never access the database", async () => {
  for (const verify of [async () => { throw Object.assign(new Error("Invalid token"), { status: 401 }); }, async () => ({ ...identity, email_verified: false })]) {
    const f = fixture([], verify); await f.run(); assert.equal(f.response.code, 401); assert.equal(f.calls.length, 0);
  }
  const f = fixture(); await f.run("unexpected"); assert.equal(f.response.code, 400); assert.equal(f.calls.length, 0);
});
test("an unlinked third-party email cannot take over an existing password account", async () => {
  const f = fixture([{ ...account, email: "existing@example.com" }], async () => ({ ...identity, email: "existing@example.com" }));
  await f.run(); assert.equal(f.response.code, 401); assert.ok(!f.calls.some(([sql]) => sql.startsWith("UPDATE")));
});
test("a previously linked Google subject can sign in after its email changes", async () => {
  const f = fixture([{ ...account, google_sub: identity.sub }], async () => ({ ...identity, email: "changed@example.com" }));
  await f.run(); assert.equal(f.response.code, 200); assert.equal(f.response.body.user.id, account.id);
});
test("the previous predictable Google password is retired on verified sign-in", async () => {
  const f = fixture([{ ...account, password_hash: await bcrypt.hash(`google_oauth_${identity.sub}`, 4) }]);
  await f.run(); assert.equal(f.response.code, 200); assert.ok(f.calls.some(([sql]) => sql.startsWith("UPDATE users SET password_hash")));
  const response = { status(value) { this.code=value;return this; }, json(value) { this.body=value;return this; } };
  await login({ body: { email: identity.email, password: `google_oauth_${identity.sub}` } }, response); assert.equal(response.code, 401);
});
test("Google verification delegates audience and signature checking to Google's library", async () => {
  const original = OAuth2Client.prototype.verifyIdToken, oldClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
  try {
    OAuth2Client.prototype.verifyIdToken = async options => { assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID); assert.equal(options.idToken, "signed-id-token"); return { getPayload: () => identity }; };
    assert.deepEqual(await verifyGoogleIdentity("signed-id-token"), identity);
    OAuth2Client.prototype.verifyIdToken = async () => { throw new Error("Wrong audience, expired or invalid signature"); };
    await assert.rejects(verifyGoogleIdentity("invalid"), error => error.status === 401);
  } finally { OAuth2Client.prototype.verifyIdToken = original; if (oldClientId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID=oldClientId; }
});
