import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../config/db.js";
import router from "../routes/addressRoutes.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
const originals = { query: pool.query, getConnection: pool.getConnection };
const handler = (method, path = "/") => router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
let calls, existing;
beforeEach(() => {
  calls = []; existing = [];
  pool.query = async (sql, args) => { calls.push([sql, args]); return [existing]; };
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql, args) => { calls.push([sql, args]); if (sql.startsWith("SELECT id, label")) return [existing]; return [{ insertId: 5 }]; },
  });
});
after(async () => { Object.assign(pool, originals); await pool.end(); });
test("saved addresses are loaded for the signed-in user only", async () => {
  const res = response(); await handler("get")({ user: { id: 7 } }, res);
  assert.equal(res.code, 200); assert.match(calls[0][0], /WHERE user_id = \?/); assert.deepEqual(calls[0][1], [7]);
});
test("save normalizes whitespace and binds the address to its owner", async () => {
  const res = response(); await handler("post")({ user: { id: 7 }, body: { address: "  42   Test Street\nCape Town  " } }, res);
  assert.equal(res.code, 201); assert.equal(res.body.address.address, "42 Test Street Cape Town");
  assert.deepEqual(calls.find(([sql]) => sql.startsWith("INSERT"))[1], [7, "42 Test Street Cape Town", "42 Test Street Cape Town"]);
});
test("repeat saves reuse the same address without duplicates", async () => {
  existing = [{ id: 5, label: "Home", address: "42 Test Street" }];
  const res = response(); await handler("post")({ user: { id: 7 }, body: { address: "42 test   street" } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.address.id, 5); assert(!calls.some(([sql]) => sql.startsWith("INSERT")));
});
test("empty addresses are rejected", async () => {
  const res = response(); await handler("post")({ user: { id: 7 }, body: { address: " " } }, res); assert.equal(res.code, 400); assert.equal(calls.length, 0);
});
test("deletion cannot remove another account's saved address", async () => {
  pool.query = async (sql, args) => { calls.push([sql, args]); return [{ affectedRows: 0 }]; };
  const res = response(); await handler("delete", "/:id")({ user: { id: 7 }, params: { id: "99" } }, res);
  assert.equal(res.code, 404); assert.match(calls[0][0], /AND user_id = \?/); assert.deepEqual(calls[0][1], ["99", 7]);
});
test("customers cannot advance delivery status even with an admin role in the request token", async () => {
  existing = [{ id: 7, role: "user" }]; let next = false; const res = response();
  await verifyAdmin({ user: { id: 7, role: "admin" } }, res, () => { next = true; });
  assert.equal(res.code, 403); assert.equal(next, false);
});
