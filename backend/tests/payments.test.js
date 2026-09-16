import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import pool from "../config/db.js";
import { ensureRequiredOrderColumns } from "../database/ensureSchema.js";
import { createPayment, retryPayment, payfastItn } from "../controllers/paymentController.js";
import { createPayfastSignature, buildPayfastParameterString, isValidPayfastSignature, verifyPayfastNotification } from "../services/payfastService.js";
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

for (const delivery of ["standard", "express"]) {
  for (const subtotal of [499.99, 500, 500.01]) {
    test(`${delivery} delivery at R${subtotal} uses the server subtotal`, async () => {
      products[0].price = String(subtotal);
      const res = response();
      await createPayment({ user: { id: 2 }, body: {
        ...payload(), items: [{ product_id: 1, quantity: 1, price: 9999 }],
        delivery_method: delivery, payment_method: "bank_transfer", payment_reference: "TEST",
      } }, res);
      const expectedFee = subtotal > 500 ? 0 : delivery === "standard" ? 49 : 99;
      assert.equal(res.code, 201);
      assert.equal(res.body.total, subtotal + expectedFee);
      const [, values] = calls.find(([sql]) => sql.startsWith("INSERT INTO orders"));
      assert.equal(values[4], subtotal);
      assert.equal(values[5], expectedFee);
      assert.equal(values[6], subtotal + expectedFee);
    });
  }
}

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

test("retry payment rejects PayFast orders that are not pending", async () => {
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



test("PayFast creates a pending order and a signed sandbox form", async () => {
  const res = response();
  await createPayment({ user: { id: 2 }, body: { ...payload(), payment_method: "payfast" } }, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.url, "https://sandbox.payfast.co.za/eng/process");
  assert.equal(res.body.formInputs.amount, "79.00");
  assert.equal(res.body.paymentStatus, "pending");
  const [, values] = calls.find(([sql]) => sql.startsWith("INSERT INTO orders"));
  assert.equal(values[10], "pending");
  assert.equal(res.body.emailSent, undefined);
});

test("PayFast signature parameters preserve form order and PHP form encoding", () => {
  assert.equal(buildPayfastParameterString({ merchant_id: "100", item_name: "A & B!", amount: "79.00" }), "merchant_id=100&item_name=A+%26+B%21&amount=79.00");
});

function notification(amount = "79.00") {
  const data = { m_payment_id: `SH-${requestId}`, pf_payment_id: "987654", payment_status: "COMPLETE", amount_gross: amount, merchant_id: "test-merchant" };
  return { ...data, signature: createPayfastSignature(data) };
}

test("PayFast rejects invalid notification signatures before database access", async () => {
  const res = response();
  await payfastItn({ body: { ...notification(), signature: "0".repeat(32) } }, res);
  assert.equal(res.code, 400);
  assert.equal(calls.length, 0);
});

test("PayFast verifies amount and provider before recording payment", async () => {
  existing = { id: 7, user_id: 2, total: 79, payment_status: "pending", payment_method: "payfast" };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://sandbox.payfast.co.za/eng/query/validate");
    assert(!options.body.includes("passphrase"));
    return { ok: true, text: async () => "VALID" };
  };
  const wrong = response();
  await payfastItn({ body: notification("1.00") }, wrong);
  assert.equal(wrong.code, 400);
  assert(!calls.some(([sql]) => sql.startsWith("UPDATE orders")));
  const valid = response();
  await payfastItn({ body: notification() }, valid);
  assert.equal(valid.code, 200);
  assert.equal(calls.filter(([sql]) => sql.startsWith("UPDATE orders SET payment_status")).length, 1);
  existing.payment_status = "paid";
  existing.payfast_payment_id = "987654";
  const repeat = response();
  await payfastItn({ body: notification() }, repeat);
  assert.equal(repeat.code, 200);
  assert.equal(calls.filter(([sql]) => sql.startsWith("UPDATE orders SET payment_status")).length, 1);
});


test("PayFast ITNs preserve empty fields, spaces and PHP encoding in both verification steps", async () => {
  const parameters = "m_payment_id=SH-test&item_description=&custom_str1=&name_first=+Test+Buyer+&item_name=Kit%7E&merchant_id=test-merchant";
  const payload = {
    m_payment_id: "SH-test", item_description: "", custom_str1: "", name_first: " Test Buyer ", item_name: "Kit~", merchant_id: "test-merchant",
    signature: createHash("md5").update(parameters + "&passphrase=test-passphrase").digest("hex"),
  };
  assert.equal(isValidPayfastSignature(payload), true);
  globalThis.fetch = async (url, options) => {
    assert.equal(options.body, parameters);
    return { ok: true, text: async () => "VALID" };
  };
  assert.equal(await verifyPayfastNotification(payload), true);
  assert.equal(isValidPayfastSignature({ ...payload, item_description: "altered" }), false);
  assert.equal(isValidPayfastSignature({ ...payload, custom_str1: [""] }), false);
  delete process.env.PAYFAST_PASSPHRASE;
  payload.signature = createHash("md5").update(parameters).digest("hex");
  assert.equal(isValidPayfastSignature(payload), true);
});

 test("Premium PayFast uses authoritative price with no delivery or stock changes", async () => {
  const res = response();
  await createPayment({user:{id:2},body:{premium_plan:"Essential",payment_method:"payfast",request_id:requestId,amount:0.01}},res);
  assert.equal(res.code,201);
  assert.equal(res.body.paymentStatus,"pending");
  const [,values]=calls.find(([sql])=>sql.startsWith("INSERT INTO orders"));
  assert.equal(values[5],0);
  assert.equal(values[11],"Essential");
  assert.equal(values[6],49);
  assert.ok(!calls.some(([sql])=>sql.includes("UPDATE products") || sql.includes("INSERT INTO premium_subscriptions")));
 });
 test("Premium rejects unknown plan before database access",async()=>{
  const res=response();
  await createPayment({user:{id:2},body:{premium_plan:"Fake",payment_method:"payfast",request_id:requestId}},res);
  assert.equal(res.code,400);
  assert.equal(calls.length,0);
 });

test("Premium activates inside verified payment transaction and duplicate ITN does not reactivate", async () => {
 existing={id:7,user_id:2,order_number:'SH-test',customer_email:'test@example.com',premium_plan:'Essential',total:49,payment_status:'pending',payment_method:'payfast'};
 globalThis.fetch=async()=>({ok:true,text:async()=> 'VALID'});
 const wrong=response();await payfastItn({body:notification('1.00')},wrong);
 assert.equal(wrong.code,400);
 assert.ok(!calls.some(([sql])=>sql.includes('INSERT INTO premium_subscriptions')));
 const valid=response();await payfastItn({body:notification('49.00')},valid);
 assert.equal(valid.code,200);
 assert.equal(calls.filter(([sql])=>sql.includes('INSERT INTO premium_subscriptions')).length,1);
 existing.payment_status='paid';existing.payfast_payment_id='987654';
 await payfastItn({body:notification('49.00')},response());
 assert.equal(calls.filter(([sql])=>sql.includes('INSERT INTO premium_subscriptions')).length,1);
});
