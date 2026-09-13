import { test, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../config/db.js";
import { PremiumService } from "../services/premiumService.js";
import { subscribe } from "../controllers/premiumController.js";

const originalQuery = pool.query;
after(async () => { pool.query = originalQuery; await pool.end(); });

test("subscription checkout inserts the signed-in user's plan with the server price and annual expiry", async () => {
  let inserted;
  pool.query = async (sql, args) => {
    if (sql.includes("INSERT INTO")) { inserted = args; return [{ affectedRows: 1 }]; }
    if (sql.includes("active = TRUE")) return [[{ user_id: 12, plan: "Annual", amount: 899, active: 1, expires_at: inserted[6] }]];
    return [[]];
  };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await subscribe({ user: { id: 12, email: "test@example.com" }, body: { plan: "Annual", amount: 1, method: "bank_transfer", reference: "TEST" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.subscription.plan, "Annual");
  assert.deepEqual(inserted.slice(0, 6), [12, "Annual", 899, "bank_transfer", "test@example.com", "TEST"]);
  const days = (inserted[6] - new Date()) / 86400000;
  assert(days > 364 && days < 367);
});

test("repeat subscription purchases update the existing user's row", async () => {
  let update;
  pool.query = async (sql, args) => {
    if (sql.includes("UPDATE")) { update = args; return [{ affectedRows: 1 }]; }
    return [[{ user_id: 12 }]];
  };
  assert.equal(await PremiumService.upsertSubscription(12, { plan: "Circle", amount: 89, method: "wallet", receipt_email: "test@example.com", reference: "TEST" }), true);
  assert.equal(update[0], "Circle");
  assert.equal(update.at(-1), 12);
  const days = (update[5] - new Date()) / 86400000;
  assert(days > 27 && days < 32);
});

test("cancellation persists an inactive subscription for its owner", async () => {
  pool.query = async (sql, args) => {
    assert.match(sql, /SET active = FALSE WHERE user_id = \?/);
    assert.deepEqual(args, [12]);
    return [{ affectedRows: 1 }];
  };
  assert.equal(await PremiumService.cancelSubscription(12), true);
});
