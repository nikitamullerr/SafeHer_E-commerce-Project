import pool from "../config/db.js";
import { createPayfastPaymentUrl, isValidPayfastSignature } from "../services/payfastService.js";

const deliveryFees = { standard: 49, express: 99, pickup: 0 };
const deliveryLabels = { standard: "Standard delivery", express: "Express delivery", pickup: "Click & collect" };
const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

function orderNumberFor(year, sequence) {
  return `SH-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function createPayment(req, res) {
  console.log('📝 createPayment called');
  console.log('📦 Received body:', req.body);

  // Destructure and set a default payment_method
  const { items, delivery_method, delivery_address, payment_method: pm, card_details } = req.body;
  const payment_method = pm || 'payfast';   // ✅ Default to PayFast if missing

  // --- Validation ---
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, error: "Valid items are required" });
  }

  if (!Object.hasOwn(deliveryFees, delivery_method)) {
    return res.status(400).json({ success: false, error: "Valid delivery method is required" });
  }

  if (!String(delivery_address || "").trim()) {
    return res.status(400).json({ success: false, error: "Delivery address is required" });
  }

  // --- Card validation (if method is 'card') ---
  if (payment_method === 'card') {
    const { card_number, card_holder, expiry_month, expiry_year, cvv } = card_details || {};
    if (!card_number || card_number.replace(/\s/g, '').length < 16) {
      return res.status(400).json({ success: false, error: "Invalid card number" });
    }
    if (!card_holder) {
      return res.status(400).json({ success: false, error: "Card holder name is required" });
    }
    if (!expiry_month || !expiry_year) {
      return res.status(400).json({ success: false, error: "Expiry date is required" });
    }
    if (!cvv || cvv.length < 3) {
      return res.status(400).json({ success: false, error: "CVV is required" });
    }
  }

  // --- PayFast validation (if method is 'payfast') ---
  if (payment_method === 'payfast') {
    if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) {
      return res.status(503).json({ success: false, error: "PayFast is not configured" });
    }
  }

  const normalizedItems = items.map((item) => ({ 
    productId: Number(item.product_id), 
    quantity: Number(item.quantity) 
  }));

  if (normalizedItems.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    return res.status(400).json({ success: false, error: "Invalid order items" });
  }

  const connection = await pool.getConnection();
  let order;

  try {
    await connection.beginTransaction();

    const [[user]] = await connection.query("SELECT name, email FROM users WHERE id = ?", [req.user.id]);

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const [products] = await connection.query(
      "SELECT id, name, price FROM products WHERE id IN (?) AND is_active = TRUE",
      [productIds]
    );

    if (!user || products.length !== productIds.length) {
      throw Object.assign(new Error("One or more products are unavailable"), { status: 400 });
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const lineItems = normalizedItems.map((item) => ({ ...item, product: productById.get(item.productId) }));
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const deliveryFee = deliveryFees[delivery_method];
    const year = new Date().getFullYear();

    const [[lastOrder]] = await connection.query(
      "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [`SH-${year}-%`]
    );
    const orderNumber = orderNumberFor(year, lastOrder ? Number(lastOrder.order_number.split("-").pop()) + 1 : 1);

    // ✅ Valid ENUM status: 'Confirmed' only (not 'pending')
    const orderStatus = 'Confirmed';
    const paymentStatus = payment_method === 'card' ? 'paid' : 'pending';

    const [result] = await connection.query(
      `INSERT INTO orders (
        user_id, order_number, customer_name, customer_email, subtotal, delivery_fee, total,
        status, delivery_address, delivery_method, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        orderNumber,
        user.name,
        user.email,
        subtotal,
        deliveryFee,
        subtotal + deliveryFee,
        orderStatus,
        String(delivery_address).trim(),
        deliveryLabels[delivery_method],
        payment_method,
        paymentStatus
      ]
    );

    for (const item of lineItems) {
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)",
        [result.insertId, item.product.id, item.product.name, item.quantity, item.product.price]
      );
    }

    await connection.commit();

    order = {
      id: result.insertId,
      orderNumber,
      total: subtotal + deliveryFee,
      customer: user,
      itemCount: lineItems.reduce((count, item) => count + item.quantity, 0)
    };

  } catch (error) {
    console.error('❌ Payment creation error:', error);
    await connection.rollback();
    return res.status(error.status || 500).json({
      success: false,
      error: error.status ? error.message : "Unable to create payment"
    });
  } finally {
    connection.release();
  }

  // --- Handle PayFast Payment ---
  if (payment_method === 'payfast') {
    const base = frontendUrl();
    const paymentResult = createPayfastPaymentUrl({
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `${base}/payment-success?order=${encodeURIComponent(order.orderNumber)}`,
      cancel_url: `${base}/payment-cancel?order=${encodeURIComponent(order.orderNumber)}`,
      notify_url: `${process.env.PAYFAST_NOTIFY_URL || base}/api/payments/payfast/itn`,
      name_first: order.customer.name.split(" ")[0],
      name_last: order.customer.name.split(" ").slice(1).join(" "),
      email_address: order.customer.email,
      m_payment_id: order.orderNumber,
      amount: Number(order.total).toFixed(2),
      item_name: `SafeHer order ${order.orderNumber}`,
      item_description: `${order.itemCount} SafeHer item${order.itemCount === 1 ? "" : "s"}`,
    });

    return res.status(201).json({
      success: true,
      orderNumber: order.orderNumber,
      total: order.total,
      paymentMethod: 'payfast',
      paymentUrl: paymentResult.url,
      formInputs: paymentResult.formInputs
    });
  }

  // --- Handle Card Payment (Simulation) ---
  if (payment_method === 'card') {
    const cardNumberClean = card_details.card_number.replace(/\s/g, '');
    let cardType = 'Unknown';
    if (cardNumberClean.startsWith('4')) cardType = 'Visa';
    else if (cardNumberClean.startsWith('5')) cardType = 'Mastercard';
    else if (cardNumberClean.startsWith('3')) cardType = 'Amex';
    else if (cardNumberClean.startsWith('6')) cardType = 'Discover';

    const transactionId = `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    return res.status(201).json({
      success: true,
      orderNumber: order.orderNumber,
      total: order.total,
      paymentMethod: 'card',
      cardType: cardType,
      transactionId: transactionId,
      message: `Payment successful with ${cardType}`
    });
  }

  // Fallback – should never reach here
  return res.status(400).json({ success: false, error: "Invalid payment method" });
}

// PayFast ITN (Instant Transaction Notification)
export async function payfastItn(req, res) {
  try {
    if (!isValidPayfastSignature(req.body) || req.body.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      console.warn("⚠️ Rejected invalid PayFast ITN");
      return res.status(400).send("Invalid ITN");
    }

    const [[order]] = await pool.query(
      "SELECT id, total, payment_status FROM orders WHERE order_number = ?",
      [req.body.m_payment_id]
    );

    if (!order || Number(req.body.amount_gross).toFixed(2) !== Number(order.total).toFixed(2)) {
      console.error("❌ PayFast ITN order or amount validation failed", req.body.m_payment_id);
      return res.sendStatus(200);
    }

    if (req.body.payment_status === "COMPLETE" && order.payment_status !== "paid") {
      await pool.query(
        "UPDATE orders SET payment_status = 'paid', status = 'Confirmed' WHERE id = ?",
        [order.id]
      );
      console.info(`✅ PayFast payment confirmed: ${req.body.m_payment_id}`);
    }

  } catch (error) {
    console.error("❌ PayFast ITN handling failed:", error.message);
  }
  return res.sendStatus(200);
}

export async function getPaymentStatus(req, res) {
  try {
    const [[order]] = await pool.query(
      "SELECT order_number, total, status, payment_status, payment_method FROM orders WHERE order_number = ? AND user_id = ?",
      [req.params.orderNumber, req.user.id]
    );
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    console.error('❌ Get payment status error:', error);
    res.status(500).json({ success: false, error: "Failed to get payment status" });
  }
}

export async function getOrders(req, res) {
  try {
    const [orders] = await pool.query(
      `SELECT id, order_number, total, status, delivery_address, delivery_method, payment_method, payment_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({ success: false, error: "Failed to get orders" });
  }
}