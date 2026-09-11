import pool from "../config/db.js";
import { ensureRequiredOrderColumns } from "../database/ensureSchema.js";
import { sendOrderConfirmationEmail } from "../utils/orderEmailService.js";

const fees = { standard: 49, express: 99 };
const labels = { standard: "Standard delivery", express: "Express delivery" };
const supportedMethods = new Set(["card", "instant_eft", "bank_transfer", "wallet"]);
const demoEnabled = () => process.env.CARD_DEMO_ENABLED === "true";
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

function normalizeCardNumber(value) {
  return String(value || "").replace(/\s+/g, "");
}

function validateCardDetails(details = {}) {
  const number = normalizeCardNumber(details.cardNumber);
  if (!/^\d{12,19}$/.test(number)) throw fail("Enter a valid card number.");
  if (!details.cardHolder || !String(details.cardHolder).trim()) throw fail("Enter the cardholder name.");
  const expiryMonth = Number(details.expiryMonth);
  const expiryYear = Number(details.expiryYear);
  if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) throw fail("Select a valid expiry month.");
  if (!Number.isInteger(expiryYear) || expiryYear < new Date().getFullYear()) throw fail("Use a valid expiry year.");
  const cvv = String(details.cvv || "").trim();
  if (!/^\d{3,4}$/.test(cvv)) throw fail("Enter a valid CVV.");
}

function validateManualReference(paymentMethod, reference) {
  const cleaned = String(reference || "").trim();
  if (paymentMethod === "card") return validateCardDetails(reference);
  if (!cleaned) throw fail("Add the payment reference for this method.");
}

export function getPaymentConfig(req, res) {
  res.json({ payfastAvailable: false, cardDemoAvailable: demoEnabled(), sandbox: false, methods: ["card", "instant_eft", "bank_transfer", "wallet"] });
}

function paymentResponse(order) {
  if (order.payment_method === "payfast") {
    return { success: true, orderNumber: order.order_number, total: Number(order.total), paymentMethod: "payfast" };
  }
  return {
    success: true,
    orderNumber: order.order_number,
    total: Number(order.total),
    paymentMethod: order.payment_method,
    paymentStatus: "paid",
    manualPayment: true,
    message: "Payment received successfully. Your order has been confirmed.",
  };
}

export async function createPayment(req, res) {
  let connection;
  try {
    const { items, delivery_method, delivery_address, payment_method = "card", request_id, demo_token, payment_reference, card_details } = req.body || {};
    if (payment_method === "payfast") throw fail("PayFast has been removed. Please use card, EFT, bank transfer or wallet.");
    if (!supportedMethods.has(payment_method) && payment_method !== "payfast") throw fail("Choose a valid payment method.");
    if (req.body?.card_details && payment_method !== "card") throw fail("Card details are only valid for the card payment method.");
    if (!Array.isArray(items) || !items.length || items.length > 100) throw fail("Choose at least one item (maximum 100 lines).");
    if (!Object.hasOwn(fees, delivery_method)) throw fail("Choose a valid delivery method.");
    if (typeof delivery_address !== "string" || !delivery_address.trim() || delivery_address.length > 1000) throw fail("Enter a delivery address (maximum 1000 characters).");
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(request_id || "")) throw fail("A checkout request ID is required.");

    if (payment_method === "card") validateCardDetails(card_details || {});
    else validateManualReference(payment_method, payment_reference);

    await ensureRequiredOrderColumns();

    const quantities = new Map();
    for (const item of items) {
      const id = Number(item?.product_id), quantity = Number(item?.quantity);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) throw fail("Invalid order items.");
      quantities.set(id, (quantities.get(id) || 0) + quantity);
      if (quantities.get(id) > 100) throw fail("Maximum quantity is 100 per product.");
    }
    const number = `SH-${request_id}`;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [[user]] = await connection.query("SELECT name, email FROM users WHERE id = ? FOR UPDATE", [req.user.id]);
    if (!user) throw fail("Account not found.", 404);
    const [[existing]] = await connection.query("SELECT * FROM orders WHERE order_number = ?", [number]);
    if (existing) {
      if (existing.user_id !== req.user.id || existing.payment_method !== payment_method || existing.delivery_address !== delivery_address.trim() || existing.delivery_method !== labels[delivery_method]) throw fail("Checkout request already used. Start a new checkout.", 409);
      const [existingItems] = await connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [existing.id]);
      if (existingItems.length !== quantities.size || existingItems.some((item) => quantities.get(item.product_id) !== item.quantity)) throw fail("Checkout contents changed. Start a new checkout.", 409);
      if (existing.payment_status === "paid") throw fail("This order has already been paid.", 409);
      await connection.commit();
      const response = paymentResponse(existing);
      return res.json(response);
    }
    const [products] = await connection.query("SELECT id, name, price, stock FROM products WHERE id IN (?) AND is_active = TRUE ORDER BY id FOR UPDATE", [[...quantities.keys()]]);
    if (products.length !== quantities.size) throw fail("One or more products are unavailable.");
    let subtotalCents = 0;
    for (const product of products) {
      if (product.stock < quantities.get(product.id)) throw fail(`${product.name} does not have enough stock.`, 409);
      subtotalCents += Math.round(Number(product.price) * 100) * quantities.get(product.id);
    }
    const order = { order_number: number, customer_name: user.name, customer_email: user.email, total: subtotalCents / 100 + fees[delivery_method], payment_method };
    const [result] = await connection.query(`INSERT INTO orders
      (user_id, order_number, customer_name, customer_email, subtotal, delivery_fee, total, delivery_address, delivery_method, payment_method, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')`,
      [req.user.id, number, user.name, user.email, subtotalCents / 100, fees[delivery_method], order.total, delivery_address.trim(), labels[delivery_method], payment_method]);
    for (const product of products) {
      const quantity = quantities.get(product.id);
      await connection.query("INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)", [result.insertId, product.id, product.name, quantity, product.price]);
      await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product.id]);
    }
    const response = paymentResponse(order);
    await connection.commit();
    response.emailSent = (await sendOrderConfirmationEmail(result.insertId, req.user.id)).emailSent;
    return res.status(201).json(response);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Payment creation failed:", error.code || error.status || "internal error");
    return res.status(error.status || 500).json({ success: false, error: error.status ? error.message : "Unable to create payment. Please retry." });
  } finally { connection?.release(); }
}

export async function retryPayment(req, res) {
  try {
    const [[order]] = await pool.query("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", [req.params.orderNumber, req.user.id]);
    if (!order) throw fail("Order not found.", 404);
    if (order.payment_method === "payfast") throw fail("This order cannot be paid again through the old PayFast flow.", 409);
    if (!supportedMethods.has(order.payment_method)) throw fail("This order cannot be paid again.", 409);
    res.json(paymentResponse(order));
  } catch (error) { res.status(error.status || 500).json({ success: false, error: error.status ? error.message : "Unable to retry payment." }); }
}

export async function payfastItn(req, res) {
  return res.status(410).send("PayFast has been removed from this application.");
}

export async function getPaymentStatus(req, res) {
  try {
    const [[order]] = await pool.query("SELECT order_number, total, status, payment_status, payment_method, confirmation_email_sent FROM orders WHERE order_number = ? AND user_id = ?", [req.params.orderNumber, req.user.id]);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch { res.status(500).json({ success: false, error: "Unable to check payment status." }); }
}
