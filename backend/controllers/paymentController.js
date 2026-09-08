import pool from "../config/db.js";
import { createPayfastPaymentUrl, isValidPayfastSignature } from "../services/payfastService.js";

const deliveryFees = { standard: 49, express: 99, pickup: 0 };
const deliveryLabels = { standard: "Standard delivery", express: "Express delivery", pickup: "Click & collect" };
const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

function orderNumberFor(year, sequence) {
  return `SH-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function createPayment(req, res) {
  console.log('createPayment called with body:', req.body);
  const { items, delivery_method, delivery_address } = req.body;

  // --- Validation ---
  if (!Array.isArray(items) || !items.length || !Object.hasOwn(deliveryFees, delivery_method) || !String(delivery_address || "").trim()) {
    return res.status(400).json({ success: false, error: "Valid items, delivery method, and delivery address are required" });
  }
  if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) {
    return res.status(503).json({ success: false, error: "Payments are not configured" });
  }

  const normalizedItems = items.map((item) => ({ productId: Number(item.product_id), quantity: Number(item.quantity) }));
  if (normalizedItems.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    return res.status(400).json({ success: false, error: "Invalid order items" });
  }

  const connection = await pool.getConnection();
  let order;
  try {
    await connection.beginTransaction();
    console.log('Transaction started');

    // Get user
    const [[user]] = await connection.query("SELECT name, email FROM users WHERE id = ?", [req.user.id]);
    console.log('User found:', user);

    // Get products
    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const [products] = await connection.query(
      "SELECT id, name, price FROM products WHERE id IN (?) AND is_active = TRUE",
      [productIds]
    );
    console.log('Products found:', products);

    if (!user || products.length !== productIds.length) {
      console.error('User or products missing');
      throw Object.assign(new Error("One or more products are unavailable"), { status: 400 });
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const lineItems = normalizedItems.map((item) => ({ ...item, product: productById.get(item.productId) }));
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const deliveryFee = deliveryFees[delivery_method];
    const year = new Date().getFullYear();

    // Generate order number
    const [[lastOrder]] = await connection.query(
      "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [`SH-${year}-%`]
    );
    const orderNumber = orderNumberFor(year, lastOrder ? Number(lastOrder.order_number.split("-").pop()) + 1 : 1);
    console.log('Order number generated:', orderNumber);

    // Insert order
    const [result] = await connection.query(
      `INSERT INTO orders (
        user_id, order_number, customer_name, customer_email, subtotal, delivery_fee, total,
        status, delivery_address, delivery_method, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, 'payfast', 'pending')`,
      [
        req.user.id,
        orderNumber,
        user.name,
        user.email,
        subtotal,
        deliveryFee,
        subtotal + deliveryFee,
        String(delivery_address).trim(),
        deliveryLabels[delivery_method]
      ]
    );
    console.log('Order inserted, ID:', result.insertId);

    // Insert order items
    for (const item of lineItems) {
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)",
        [result.insertId, item.product.id, item.product.name, item.quantity, item.product.price]
      );
    }
    console.log('Order items inserted');

    await connection.commit();
    console.log('Transaction committed');

    order = {
      id: result.insertId,
      orderNumber,
      total: subtotal + deliveryFee,
      customer: user,
      itemCount: lineItems.reduce((count, item) => count + item.quantity, 0)
    };
    console.log('Order object created:', order);

  } catch (error) {
    console.error('Payment creation error:', error);  // <-- NOW LOGS THE REAL ERROR
    await connection.rollback();
    return res.status(error.status || 500).json({
      success: false,
      error: error.status ? error.message : "Unable to create payment"
    });
  } finally {
    connection.release();
  }

  // --- Generate PayFast URL ---
  const base = frontendUrl();
  const paymentUrl = createPayfastPaymentUrl({
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `${base}/payment-success?order=${encodeURIComponent(order.orderNumber)}`,
    cancel_url: `${base}/payment-cancel?order=${encodeURIComponent(order.orderNumber)}`,
    notify_url: `${process.env.PAYFAST_NOTIFY_URL}/api/payments/payfast/itn`,
    name_first: order.customer.name.split(" ")[0],
    name_last: order.customer.name.split(" ").slice(1).join(" "),
    email_address: order.customer.email,
    m_payment_id: order.orderNumber,
    amount: Number(order.total).toFixed(2),
    item_name: `SafeHer order ${order.orderNumber}`,
    item_description: `${order.itemCount} SafeHer item${order.itemCount === 1 ? "" : "s"}`,
  });
  console.log('Payment URL generated:', paymentUrl);

  res.status(201).json({
    success: true,
    orderNumber: order.orderNumber,
    paymentUrl
  });
}

export async function payfastItn(req, res) {
  try {
    if (!isValidPayfastSignature(req.body) || req.body.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      console.warn("Rejected invalid PayFast ITN");
      return res.status(400).send("Invalid ITN");
    }
    const [[order]] = await pool.query("SELECT id, total, payment_status FROM orders WHERE order_number = ?", [req.body.m_payment_id]);
    if (!order || Number(req.body.amount_gross).toFixed(2) !== Number(order.total).toFixed(2)) {
      console.error("PayFast ITN order or amount validation failed", req.body.m_payment_id);
      return res.sendStatus(200);
    }
    if (req.body.payment_status === "COMPLETE" && order.payment_status !== "paid") {
      await pool.query("UPDATE orders SET payment_status = 'paid', status = 'Confirmed', payfast_payment_id = ? WHERE id = ?", [req.body.pf_payment_id || null, order.id]);
      console.info(`PayFast payment confirmed: ${req.body.m_payment_id}`);
    }
  } catch (error) {
    console.error("PayFast ITN handling failed:", error.message);
  }
  return res.sendStatus(200);
}

export async function getPaymentStatus(req, res) {
  const [[order]] = await pool.query("SELECT order_number, total, status, payment_status FROM orders WHERE order_number = ? AND user_id = ?", [req.params.orderNumber, req.user.id]);
  if (!order) return res.status(404).json({ success: false, error: "Order not found" });
  res.json({ success: true, order });
}