import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../config/db.js";
import { createPayment, retryPayment, payfastItn } from "../controllers/paymentController.js";
import { createPayfastSignature, isValidPayfastSignature } from "../services/payfastService.js";
import { validateDemoCard } from "../../src/services/cardValidation.js";

const originalConnection = pool.getConnection, originalQuery = pool.query, originalFetch = globalThis.fetch;
let calls, connection, products, existing, existingItems;
const requestId = "12345678-1234-4234-8234-123456789abc";
const payload = () => ({ items: [{ product_id: 1, quantity: 2, price: 0.01 }, { product_id: 1, quantity: 1 }], delivery_method: "standard", delivery_address: "Test address", request_id: requestId });
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, sendStatus(code) { this.code = code; return this; } });
beforeEach(() => {
  process.env.PAYFAST_MERCHANT_ID = "test-merchant"; process.env.PAYFAST_MERCHANT_KEY = "test-key"; process.env.PAYFAST_NOTIFY_URL = "https://merchant.example/api/payments/payfast/itn";
  process.env.PAYFAST_SANDBOX = "true"; process.env.PAYFAST_PASSPHRASE = "test-passphrase"; process.env.CARD_DEMO_ENABLED = "true";
  calls = []; products = [{ id: 1, name: "Alarm", price: "10.00", stock: 5 }]; existing = null; existingItems = [{ product_id: 1, quantity: 3 }];
  connection = {
    beginTransaction: async () => calls.push(["begin"]), commit: async () => calls.push(["commit"]), rollback: async () => calls.push(["rollback"]), release: () => calls.push(["release"]),
    query: async (sql, args) => {
      calls.push([sql, args]);
      if (sql.startsWith("SELECT name")) return [[{ name: "Test Customer", email: "test@example.com" }]];
      if (sql.startsWith("SELECT * FROM orders")) return [[existing].filter(Boolean)];
      if (sql.startsWith("SELECT product_id")) return [existingItems];
      if (sql.startsWith("SELECT id, name")) return [products];
      if (sql.startsWith("INSERT INTO orders")) return [{ insertId: 7 }];
      return [{ affectedRows: 1 }];
    },
  };
  pool.getConnection = async () => connection;
  pool.query = async (sql, args) => { calls.push([sql, args]); return [[existing].filter(Boolean)]; };
  globalThis.fetch = async () => { throw new Error("Unexpected external request"); };
});
after(async () => { pool.getConnection = originalConnection; pool.query = originalQuery; globalThis.fetch = originalFetch; await pool.end(); });

test("card demo checks number, expiry, CVV and test-card restriction", () => {
  const card = { cardNumber: "4242 4242 4242 4242", cardHolder: "Test", expiryMonth: "12", expiryYear: "2030", cvv: "123" };
  const now = new Date(2026, 8, 10);
  assert.equal(validateDemoCard(card, now), "");
  assert.match(validateDemoCard({ ...card, cardNumber: "4242424242424241" }, now), /number/);
  assert.match(validateDemoCard({ ...card, expiryYear: "2025" }, now), /expiry/);
  assert.match(validateDemoCard({ ...card, cvv: "abc" }, now), /CVV/);
  assert.match(validateDemoCard({ ...card, cardHolder: " " }, now), /name/);
  assert.match(validateDemoCard({ ...card, cardNumber: "4000000000000002" }, now), /demo/);
});
test("unknown payment method and raw card details are rejected before database access", async () => {
  for (const extra of [{ payment_method: "other" }, { card_details: { cvv: "123" } }]) {
    const res = response(); await createPayment({ user: { id: 2 }, body: { ...payload(), ...extra } }, res); assert.equal(res.code, 400);
  }
  assert.equal(calls.length, 0);
});
test("missing PayFast configuration returns 503 without creating an order", async () => {
  delete process.env.PAYFAST_MERCHANT_ID;
  const res = response(); await createPayment({ user: { id: 2 }, body: payload() }, res);
  assert.equal(res.code, 503); assert.equal(calls.length, 0);
});
test("PayFast combines duplicate lines, uses database prices and reserves stock once", async () => {
  const res = response(); await createPayment({ user: { id: 2 }, body: payload() }, res);
  assert.equal(res.code, 201); assert.equal(res.body.total, 79); assert.equal(res.body.formInputs.amount, "79.00");
  assert.equal(res.body.paymentUrl, "https://sandbox.payfast.co.za/eng/process");
  assert(isValidPayfastSignature(res.body.formInputs));
  assert.equal(calls.filter(([sql]) => sql.startsWith("INSERT INTO order_items")).length, 1);
  assert.deepEqual(calls.find(([sql]) => sql.startsWith("UPDATE products"))[1], [3, 1]);
});
test("demo creates an explicitly unpaid demo order without reserving stock", async () => {
  const res = response(); await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "card_demo", demo_token: "test_card" } }, res);
  assert.equal(res.code, 201); assert.equal(res.body.simulated, true); assert.equal(res.body.paymentMethod, "card_demo");
  assert(calls.some(([sql]) => sql.includes("'pending'")));
  assert(!calls.some(([sql]) => sql.startsWith("UPDATE products")));
});
test("insufficient stock rolls back before inserting an order", async () => {
  products[0].stock = 2; const res = response(); await createPayment({ user: { id: 2 }, body: payload() }, res);
  assert.equal(res.code, 409); assert(calls.some(([sql]) => sql === "rollback")); assert(!calls.some(([sql]) => sql.startsWith("INSERT")));
});
test("duplicate checkout returns the same order without another stock reservation", async () => {
  existing = { id: 7, user_id: 2, order_number: `SH-${requestId}`, payment_method: "payfast", payment_status: "pending", delivery_method: "Standard delivery", delivery_address: "Test address", total: 79, customer_name: "Test", customer_email: "test@example.com" };
  const res = response(); await createPayment({ user: { id: 2 }, body: payload() }, res);
  assert.equal(res.code, 200); assert.equal(res.body.orderNumber, existing.order_number); assert(!calls.some(([sql]) => /^(INSERT|UPDATE)/.test(sql)));
  existingItems = [{ product_id: 1, quantity: 1 }]; const changed = response(); await createPayment({ user: { id: 2 }, body: payload() }, changed); assert.equal(changed.code, 409);
});
test("retry is scoped to the owner and refuses paid orders", async () => {
  existing = { payment_status: "paid", payment_method: "payfast" };
  const res = response(); await retryPayment({ user: { id: 2 }, params: { orderNumber: "SH-test" } }, res);
  assert.equal(res.code, 409); assert.deepEqual(calls[0][1], ["SH-test", 2]);
});
test("invalid ITN signature cannot change payment state", async () => {
  const res = response(); await payfastItn({ body: { merchant_id: "test-merchant", signature: "0".repeat(32) } }, res);
  assert.equal(res.code, 400); assert.equal(calls.length, 0);
});
test("ITN requires provider verification and amount agreement", async () => {
  const body = { merchant_id: "test-merchant", m_payment_id: "SH-test", amount_gross: "79.00", payment_status: "COMPLETE", pf_payment_id: "123" }; body.signature = createPayfastSignature(body);
  globalThis.fetch = async () => ({ ok: true, text: async () => "INVALID" });
  const invalid = response(); await payfastItn({ body }, invalid); assert.equal(invalid.code, 400); assert.equal(calls.length, 0);
  globalThis.fetch = async () => ({ ok: true, text: async () => "VALID" }); existing = { id: 7, user_id: 2, payment_method: "payfast", total: 80 };
  const mismatch = response(); await payfastItn({ body }, mismatch); assert.equal(mismatch.code, 400); assert(!calls.some(([sql]) => sql.startsWith("UPDATE")));
});

test("collection is rejected even when requested directly from the API", async () => {
  const res = response(); await createPayment({ user: { id: 2 }, body: { ...payload(), delivery_method: "pickup" } }, res);
  assert.equal(res.code, 400); assert.equal(calls.length, 0);
});
test("valid verified notification marks payment paid only once and keeps delivery status", async () => {
  const body = { merchant_id: "test-merchant", m_payment_id: "SH-test", amount_gross: "79.00", payment_status: "COMPLETE", pf_payment_id: "123" }; body.signature = createPayfastSignature(body);
  globalThis.fetch = async () => ({ ok: true, text: async () => "VALID" });
  let paid = false, receiptLookups = 0;
  pool.query = async (sql, args) => {
    calls.push([sql, args]);
    if (sql.startsWith("SELECT")) return [[{ id: 7, user_id: 2, payment_method: "payfast", total: 79 }]];
    const affectedRows = paid ? 0 : 1; paid = true; return [{ affectedRows }];
  };
  pool.getConnection = async () => ({ query: async () => { receiptLookups++; return [[{ confirmation_email_sent: true, order_number: "SH-test" }]]; }, release() {} });
  for (let i = 0; i < 2; i++) { const res = response(); await payfastItn({ body }, res); assert.equal(res.code, 200); }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(receiptLookups, 1); assert.equal(paid, true);
  assert(calls.filter(([sql]) => sql.startsWith("UPDATE")).every(([sql]) => !sql.includes("status = 'Confirmed'")));
});
