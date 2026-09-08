import pool from "../config/db.js";

const deliveryFees = { standard: 49, express: 99, pickup: 0 };
const deliveryLabels = { standard: "Standard delivery", express: "Express delivery", pickup: "Click & collect" };

async function getOrderDetails(orderId) {
  const [[order]] = await pool.query(
    `SELECT o.*, o.order_number AS orderNumber, o.created_at AS createdAt,
     o.customer_name AS customerName, o.customer_email AS customerEmail, 
     o.delivery_fee AS deliveryFee, o.payment_status AS paymentStatus, 
     o.delivery_address AS deliveryAddress 
     FROM orders o WHERE o.id = ?`,
    [orderId]
  );
  const [items] = await pool.query(
    "SELECT product_name AS name, quantity, price_at_purchase AS price FROM order_items WHERE order_id = ?",
    [orderId]
  );
  return { 
    ...order, 
    items, 
    subtotal: Number(order.subtotal), 
    deliveryFee: Number(order.deliveryFee), 
    total: Number(order.total) 
  };
}

export async function confirmOrder(req, res) {
  const { items, delivery_method, delivery_address, payment_method } = req.body;
  
  if (!Array.isArray(items) || !items.length || !deliveryFees.hasOwnProperty(delivery_method) || !String(delivery_address || "").trim()) {
    return res.status(400).json({ 
      success: false, 
      error: "Valid items, delivery method, and delivery address are required" 
    });
  }

  const normalizedItems = items.map((item) => ({ 
    productId: Number(item.product_id), 
    quantity: Number(item.quantity) 
  }));
  
  if (normalizedItems.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid order items" 
    });
  }

  const connection = await pool.getConnection();
  let orderId;
  
  try {
    await connection.beginTransaction();
    
    const [[user]] = await connection.query(
      "SELECT name, email FROM users WHERE id = ?",
      [req.user.id]
    );
    
    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const [products] = await connection.query(
      "SELECT id, name, price FROM products WHERE id IN (?) AND is_active = TRUE",
      [productIds]
    );
    
    if (!user || products.length !== productIds.length) {
      throw Object.assign(new Error("One or more products are unavailable"), { status: 400 });
    }
    
    const productById = new Map(products.map((product) => [product.id, product]));
    const lineItems = normalizedItems.map((item) => ({ 
      ...item, 
      product: productById.get(item.productId) 
    }));
    
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const deliveryFee = deliveryFees[delivery_method];
    
    const year = new Date().getFullYear();
    const [[lastOrder]] = await connection.query(
      "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [`SH-${year}-%`]
    );
    const sequence = lastOrder ? Number(lastOrder.order_number.split("-").pop()) + 1 : 1;
    const orderNumber = `SH-${year}-${String(sequence).padStart(6, "0")}`;
    
    const [result] = await connection.query(
      `INSERT INTO orders (
        user_id, order_number, customer_name, customer_email, 
        subtotal, delivery_fee, total, status, 
        delivery_address, delivery_method, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, ?, 'paid')`,
      [
        req.user.id, 
        orderNumber, 
        user.name, 
        user.email, 
        subtotal, 
        deliveryFee, 
        subtotal + deliveryFee, 
        String(delivery_address).trim(), 
        deliveryLabels[delivery_method], 
        payment_method || "card"
      ]
    );
    
    orderId = result.insertId;
    
    for (const item of lineItems) {
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)",
        [orderId, item.product.id, item.product.name, item.quantity, item.product.price]
      );
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return res.status(error.status || 500).json({ 
      success: false, 
      error: error.status ? error.message : "Unable to confirm order" 
    });
  } finally { 
    connection.release(); 
  }

  const order = await getOrderDetails(orderId);
  res.status(201).json({ 
    success: true, 
    order 
  });
}