import pool from "../config/db.js";
import { createPayfastPaymentUrl, verifyPayfastNotification } from "../services/payfastService.js";
import { sendOrderConfirmationEmail } from "../utils/orderEmailService.js";

const fees = { standard: 49, express: 99 };
const labels = { standard: "Standard delivery", express: "Express delivery" };
const demoEnabled = () => process.env.CARD_DEMO_ENABLED === "true" || (process.env.NODE_ENV !== "production" && process.env.CARD_DEMO_ENABLED !== "false");
const payfastReady = () => Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY && process.env.PAYFAST_NOTIFY_URL);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

export function getPaymentConfig(req, res) {
  res.json({ payfastAvailable: payfastReady(), cardDemoAvailable: demoEnabled(), sandbox: process.env.PAYFAST_SANDBOX !== "false" });
}

function paymentResponse(order) {
  if (order.payment_method === "card_demo") return {
    success: true, orderNumber: order.order_number, total: Number(order.total),
    paymentMethod: "card_demo", simulated: true, message: "Demo order created. No money was charged.",
  };
  const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const payment = createPayfastPaymentUrl({
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `${frontend}/payment-success?order=${encodeURIComponent(order.order_number)}`,
    cancel_url: `${frontend}/payment-cancel?order=${encodeURIComponent(order.order_number)}`,
    notify_url: process.env.PAYFAST_NOTIFY_URL,
    name_first: order.customer_name.split(" ")[0],
    name_last: order.customer_name.split(" ").slice(1).join(" "),
    email_address: order.customer_email,
    m_payment_id: order.order_number,
    amount: Number(order.total).toFixed(2),
    item_name: `SafeHer ${order.order_number}`,
  });
  return { success: true, orderNumber: order.order_number, total: Number(order.total), paymentMethod: "payfast", paymentUrl: payment.url, formInputs: payment.formInputs };
}

export async function createPayment(req, res) {
  let connection;
  try {
    const { items, delivery_method, delivery_address, payment_method = "payfast", request_id, demo_token } = req.body || {};
    if (!["payfast", "card_demo"].includes(payment_method)) throw fail("Choose PayFast or the card demo.");
    if (req.body?.card_details) throw fail("Do not submit card details to this endpoint.");
    if (payment_method === "payfast" && !payfastReady()) throw fail("PayFast is not configured. Add merchant credentials and the full notification URL to backend/.env.", 503);
    if (payment_method === "card_demo" && (!demoEnabled() || demo_token !== "test_card")) throw fail("Card demo is unavailable.", 403);
    if (!Array.isArray(items) || !items.length || items.length > 100) throw fail("Choose at least one item (maximum 100 lines).");
    if (!Object.hasOwn(fees, delivery_method)) throw fail("Choose a valid delivery method.");
    if (typeof delivery_address !== "string" || !delivery_address.trim() || delivery_address.length > 1000) throw fail("Enter a delivery address (maximum 1000 characters).");
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(request_id || "")) throw fail("A checkout request ID is required.");
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
    // Lock the customer to serialize duplicate submissions from the same checkout.
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
      if (payment_method === "card_demo") {
        connection.release(); connection = null;
        response.emailSent = (await sendOrderConfirmationEmail(existing.id, req.user.id)).emailSent;
      }
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, number, user.name, user.email, subtotalCents / 100, fees[delivery_method], order.total, delivery_address.trim(), labels[delivery_method], payment_method]);
    for (const product of products) {
      const quantity = quantities.get(product.id);
      await connection.query("INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)", [result.insertId, product.id, product.name, quantity, product.price]);
      if (payment_method === "payfast") await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product.id]);
    }
    const response = paymentResponse(order);
    await connection.commit();
    if (payment_method === "card_demo") {
      connection.release(); connection = null;
      response.emailSent = (await sendOrderConfirmationEmail(result.insertId, req.user.id)).emailSent;
    }
    return res.status(201).json(response);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Payment creation failed:", error.code || error.status || "internal error");
    return res.status(error.status || 500).json({ success: false, error: error.status ? error.message : "Unable to create payment. Please retry." });
  } finally { connection?.release(); }
}

export async function retryPayment(req, res) {
  try {
    if (!payfastReady()) throw fail("PayFast is not configured yet.", 503);
    const [[order]] = await pool.query("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", [req.params.orderNumber, req.user.id]);
    if (!order) throw fail("Order not found.", 404);
    if (order.payment_method !== "payfast" || !["pending", "failed"].includes(order.payment_status)) throw fail("This order cannot be paid again.", 409);
    res.json(paymentResponse(order));
  } catch (error) { res.status(error.status || 500).json({ success: false, error: error.status ? error.message : "Unable to retry payment." }); }
}

export async function payfastItn(req, res) {
  try {
    if (!payfastReady() || req.body?.merchant_id !== process.env.PAYFAST_MERCHANT_ID || !(await verifyPayfastNotification(req.body))) return res.status(400).send("Invalid notification");
    const [[order]] = await pool.query("SELECT id, user_id, total, payment_status, payment_method FROM orders WHERE order_number = ?", [req.body.m_payment_id]);
    if (!order || order.payment_method !== "payfast" || !Number.isFinite(Number(req.body.amount_gross)) || Math.round(Number(req.body.amount_gross) * 100) !== Math.round(Number(order.total) * 100)) return res.status(400).send("Invalid order or amount");
    if (req.body.payment_status === "COMPLETE") {
      if (typeof req.body.pf_payment_id !== "string" || !req.body.pf_payment_id || req.body.pf_payment_id.length > 100) return res.status(400).send("Missing payment reference");
      const [result] = await pool.query("UPDATE orders SET payment_status = 'paid', payfast_payment_id = ? WHERE id = ? AND payment_status IN ('pending', 'failed')", [req.body.pf_payment_id, order.id]);
      if (result.affectedRows) sendOrderConfirmationEmail(order.id, order.user_id).catch(() => console.error("Payment receipt could not be sent"));
    } else if (["FAILED", "CANCELLED"].includes(req.body.payment_status)) {
      await pool.query("UPDATE orders SET payment_status = 'failed' WHERE id = ? AND payment_status = 'pending'", [order.id]);
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error("Payment notification failed:", error.code || "validation error");
    return res.sendStatus(500);
  }
}

export async function getPaymentStatus(req, res) {
  try {
    const [[order]] = await pool.query("SELECT order_number, total, status, payment_status, payment_method, confirmation_email_sent FROM orders WHERE order_number = ? AND user_id = ?", [req.params.orderNumber, req.user.id]);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch { res.status(500).json({ success: false, error: "Unable to check payment status." }); }
}
