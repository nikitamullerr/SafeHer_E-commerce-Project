import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../config/db.js";
import { ensureRequiredOrderColumns } from "../database/ensureSchema.js";
import { createPayment, retryPayment } from "../controllers/paymentController.js";
import { EmailService } from "../services/emailService.js";
import { validateDemoCard } from "../../src/services/cardValidation.js";

const originalConnection = pool.getConnection, originalQuery = pool.query, originalFetch = globalThis.fetch;
let calls, connection, products, existing, existingItems;
const requestId = "12345678-1234-4234-8234-123456789abc";
const payload = () => ({ items: [{ product_id: 1, quantity: 2, price: 0.01 }, { product_id: 1, quantity: 1 }], delivery_method: "standard", delivery_address: "Test address", request_id: requestId });
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, sendStatus(code) { this.code = code; return this; } });

beforeEach(() => {
  process.env.PAYFAST_MERCHANT_ID = "test-merchant";
  process.env.PAYFAST_MERCHANT_KEY = "test-key";
  process.env.PAYFAST_NOTIFY_URL = "https://merchant.example/api/payments/payfast/itn";
  process.env.PAYFAST_SANDBOX = "true";
  process.env.PAYFAST_PASSPHRASE = "test-passphrase";
  process.env.CARD_DEMO_ENABLED = "true";
  calls = []; products = [{ id: 1, name: "Alarm", price: "10.00", stock: 5 }]; existing = null; existingItems = [{ product_id: 1, quantity: 3 }];
  connection = {
    beginTransaction: async () => calls.push(["begin"]),
    commit: async () => calls.push(["commit"]),
    rollback: async () => calls.push(["rollback"]),
    release: () => calls.push(["release"]),
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

test("email credentials tolerate Gmail app-password formatting and prefer the authenticated Gmail sender", () => {
  process.env.EMAIL_SERVICE = "smtp";
  process.env.EMAIL_HOST = "smtp.gmail.com";
  process.env.EMAIL_PORT = "587";
  process.env.EMAIL_SECURE = "false";
  process.env.EMAIL_USER = "safeher.orders@gmail.com";
  process.env.EMAIL_PASSWORD = " abcd efgh ijkl mnop ";
  process.env.EMAIL_FROM = "SafeHer <orders@safeher.co.za>";

  const service = new EmailService();
  assert.equal(service.transporter.options.auth.user, "safeher.orders@gmail.com");
  assert.equal(service.transporter.options.auth.pass, "abcdefghijklmnop");
  assert.equal(service.fromEmail, "safeher.orders@gmail.com");
});

test("supported checkout methods include card, EFT, bank transfer and wallet", async () => {
  for (const [method, reference] of [["card", { cardNumber: "4242 4242 4242 4242", cardHolder: "Test", expiryMonth: "12", expiryYear: "2030", cvv: "123" }], ["instant_eft", "EFT-123"], ["bank_transfer", "BANK-456"], ["wallet", "wallet-789"]]) {
    const res = response();
    await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: method, payment_reference: reference, card_details: method === "card" ? reference : undefined } }, res);
    assert.equal(res.code, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.paymentMethod, method);
  }
});

test("card validation accepts valid real cards and rejects malformed data", async () => {
  const now = new Date(2026, 8, 10);
  const valid = { cardNumber: "4111 1111 1111 1111", cardHolder: "Test User", expiryMonth: "12", expiryYear: "2030", cvv: "123" };
  assert.equal(validateDemoCard(valid, now), "");

  const bad = response();
  await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "card", card_details: { cardNumber: "123", cardHolder: "Test", expiryMonth: "12", expiryYear: "2019", cvv: "12" } } }, bad);
  assert.equal(bad.code, 400);

  const good = response();
  await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "card", card_details: valid } }, good);
  assert.equal(good.code, 201);
  assert.equal(good.body.paymentMethod, "card");
});

test("unknown payment method and raw card details are rejected before database access", async () => {
  const start = calls.length;
  for (const body of [{ ...payload(), payment_method: "other" }, { ...payload(), payment_method: "card", card_details: { cvv: "123" } }]) {
    const res = response();
    await createPayment({ user: { id: 2 }, body }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(calls.length, start);
});

test("insufficient stock rolls back before inserting an order", async () => {
  products[0].stock = 2;
  const res = response();
  await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "card", card_details: { cardNumber: "4242 4242 4242 4242", cardHolder: "Test", expiryMonth: "12", expiryYear: "2030", cvv: "123" } } }, res);
  assert.equal(res.code, 409);
  assert(calls.some(([sql]) => sql === "rollback"));
  assert(!calls.some(([sql]) => sql.startsWith("INSERT")));
});

test("duplicate checkout returns the same order without another stock reservation", async () => {
  existing = { id: 7, user_id: 2, order_number: `SH-${requestId}`, payment_method: "card", payment_status: "paid", delivery_method: "Standard delivery", delivery_address: "Test address", total: 79, customer_name: "Test", customer_email: "test@example.com" };
  const res = response();
  await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "card", card_details: { cardNumber: "4242 4242 4242 4242", cardHolder: "Test", expiryMonth: "12", expiryYear: "2030", cvv: "123" } } }, res);
  assert.equal(res.code, 409);
  assert.equal(calls.length > 0, true);
});

test("retry payment rejects the legacy PayFast flow and keeps the new methods in place", async () => {
  existing = { payment_status: "paid", payment_method: "payfast" };
  const res = response();
  await retryPayment({ user: { id: 2 }, params: { orderNumber: "SH-test" } }, res);
  assert.equal(res.code, 409);
  assert.deepEqual(calls[0][1], ["SH-test", 2]);
});

test("manual payment methods reserve stock once and confirm the order as paid", async () => {
  const res = response();
  await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "instant_eft", payment_reference: "EFT-123" } }, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.paymentMethod, "instant_eft");
  assert.equal(res.body.paymentStatus, "paid");
  assert.equal(calls.filter(([sql]) => sql.startsWith("INSERT INTO order_items")).length, 1);
  assert.deepEqual(calls.find(([sql]) => sql.startsWith("UPDATE products"))[1], [3, 1]);
});

test("order schema repair adds the required checkout columns if they are missing", async () => {
  const originalQuery = pool.query;
  const expected = [
    "customer_name",
    "customer_email",
    "subtotal",
    "delivery_fee",
    "confirmation_email_error",
    "payfast_payment_id",
  ];
  const present = new Set([
    "customer_name",
    "customer_email",
    "subtotal",
    "delivery_fee",
    "confirmation_email_sent",
    "confirmation_email_sent_at",
    "confirmation_email_error",
    "payfast_payment_id",
  ]);

  pool.query = async (sql) => {
    if (sql.startsWith("SELECT COLUMN_NAME FROM information_schema.columns")) {
      return [Array.from(present).map((column) => ({ COLUMN_NAME: column }))];
    }
    if (sql.startsWith("ALTER TABLE orders ADD COLUMN")) {
      const columnName = sql.match(/ADD COLUMN ([A-Za-z_]+)/)?.[1];
      if (columnName) present.add(columnName);
      return [{ affectedRows: 1 }];
    }
    return [[{ ok: true }]];
  };

  try {
    await ensureRequiredOrderColumns();
    expected.forEach((columnName) => assert.ok(present.has(columnName)));
  } finally {
    pool.query = originalQuery;
  }
});

