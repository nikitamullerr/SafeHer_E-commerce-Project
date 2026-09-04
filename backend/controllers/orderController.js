import pool from "../config/db.js";

const ORDER_STATUSES = ["Confirmed", "Packed", "Out for delivery", "Delivered"];
const DELIVERY_FEES = {
	"Standard delivery": 49,
	"Express delivery": 99,
	"Click & collect": 0,
};

const mapOrder = (order, items) => ({
	id: order.id,
	orderNumber: order.order_number,
	total: Number(order.total),
	status: order.status,
	deliveryAddress: order.delivery_address,
	deliveryMethod: order.delivery_method,
	paymentMethod: order.payment_method,
	paymentStatus: order.payment_status,
	notes: order.notes,
	createdAt: order.created_at,
	updatedAt: order.updated_at,
	items,
});

const getOrderWithItems = async (connection, orderId, userId) => {
	const [rows] = await connection.query(
		`SELECT id, order_number, total, status, delivery_address,
						delivery_method, payment_method, payment_status, notes,
						created_at, updated_at
		 FROM orders
		 WHERE id = ? AND user_id = ?`,
		[orderId, userId],
	);

	if (!rows.length) return null;

	const [items] = await connection.query(
		`SELECT id, product_id, product_name, quantity, price_at_purchase
		 FROM order_items
		 WHERE order_id = ?
		 ORDER BY id`,
		[orderId],
	);

	return mapOrder(rows[0], items.map((item) => ({
		id: item.id,
		productId: item.product_id,
		name: item.product_name,
		quantity: item.quantity,
		price: Number(item.price_at_purchase),
	})));
};

export const createOrder = async (req, res) => {
	const connection = await pool.getConnection();

	try {
		const {
			items,
			deliveryAddress,
			deliveryMethod,
			paymentMethod,
			notes,
		} = req.body || {};

		if (!Array.isArray(items) || !items.length) {
			return res.status(400).json({ success: false, error: "At least one order item is required" });
		}

		if (!deliveryAddress || typeof deliveryAddress !== "string" || !deliveryAddress.trim()) {
			return res.status(400).json({ success: false, error: "Delivery address is required" });
		}

		const requestedItems = new Map();
		for (const item of items) {
			if (!item || typeof item !== "object") {
				return res.status(400).json({ success: false, error: "Each order item must be an object" });
			}

			const productId = Number(item.productId ?? item.product_id ?? item.id);
			const quantity = Number(item.quantity);

			if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
				return res.status(400).json({ success: false, error: "Each item needs a valid productId and positive quantity" });
			}

			requestedItems.set(productId, (requestedItems.get(productId) || 0) + quantity);
		}

		await connection.beginTransaction();

		const productIds = [...requestedItems.keys()];
		const placeholders = productIds.map(() => "?").join(",");
		const [products] = await connection.query(
			`SELECT id, name, price, stock
			 FROM products
			 WHERE id IN (${placeholders}) AND is_active = TRUE
			 FOR UPDATE`,
			productIds,
		);
		const productsById = new Map(products.map((product) => [product.id, product]));

		if (products.length !== productIds.length) {
			await connection.rollback();
			return res.status(400).json({ success: false, error: "One or more products are unavailable" });
		}

		let total = DELIVERY_FEES[deliveryMethod] || 0;
		for (const [productId, quantity] of requestedItems) {
			const product = productsById.get(productId);
			if (product.stock < quantity) {
				await connection.rollback();
				return res.status(409).json({ success: false, error: `${product.name} does not have enough stock` });
			}
			total += Number(product.price) * quantity;
		}

		const orderNumber = `SH-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
		const [orderResult] = await connection.query(
			`INSERT INTO orders
				(user_id, order_number, total, delivery_address, delivery_method, payment_method, notes)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				req.user.id,
				orderNumber,
				total.toFixed(2),
				deliveryAddress.trim(),
				deliveryMethod || null,
				paymentMethod || null,
				notes || null,
			],
		);

		for (const [productId, quantity] of requestedItems) {
			const product = productsById.get(productId);
			await connection.query(
				`INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
				 VALUES (?, ?, ?, ?, ?)`,
				[orderResult.insertId, product.id, product.name, quantity, product.price],
			);
			await connection.query(
				"UPDATE products SET stock = stock - ? WHERE id = ?",
				[quantity, product.id],
			);
		}

		const order = await getOrderWithItems(connection, orderResult.insertId, req.user.id);
		await connection.commit();
		return res.status(201).json({ success: true, order });
	} catch (error) {
		await connection.rollback();
		console.error("Create order error:", error);
		return res.status(500).json({ success: false, error: "Failed to create order" });
	} finally {
		connection.release();
	}
};

export const getOrders = async (req, res) => {
	try {
		const [orders] = await pool.query(
			`SELECT id, order_number, total, status, delivery_address,
							delivery_method, payment_method, payment_status, notes,
							created_at, updated_at
			 FROM orders
			 WHERE user_id = ?
			 ORDER BY created_at DESC`,
			[req.user.id],
		);

		const orderIds = orders.map((order) => order.id);
		let items = [];
		if (orderIds.length) {
			const placeholders = orderIds.map(() => "?").join(",");
			const [itemRows] = await pool.query(
				`SELECT id, order_id, product_id, product_name, quantity, price_at_purchase
				 FROM order_items
				 WHERE order_id IN (${placeholders})
				 ORDER BY id`,
				orderIds,
			);
			items = itemRows;
		}

		const itemsByOrder = new Map();
		for (const item of items) {
			if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
			itemsByOrder.get(item.order_id).push({
				id: item.id,
				productId: item.product_id,
				name: item.product_name,
				quantity: item.quantity,
				price: Number(item.price_at_purchase),
			});
		}

		return res.json({
			success: true,
			orders: orders.map((order) => mapOrder(order, itemsByOrder.get(order.id) || [])),
		});
	} catch (error) {
		console.error("Get orders error:", error);
		return res.status(500).json({ success: false, error: "Failed to get orders" });
	}
};

export const updateOrderStatus = async (req, res) => {
	try {
		const { status } = req.body || {};
		if (!ORDER_STATUSES.includes(status)) {
			return res.status(400).json({ success: false, error: "Invalid order status" });
		}

		const [existing] = await pool.query(
			"SELECT status FROM orders WHERE id = ? AND user_id = ?",
			[req.params.id, req.user.id],
		);
		if (!existing.length) {
			return res.status(404).json({ success: false, error: "Order not found" });
		}

		const currentIndex = ORDER_STATUSES.indexOf(existing[0].status);
		const nextIndex = ORDER_STATUSES.indexOf(status);
		if (nextIndex < currentIndex) {
			return res.status(400).json({ success: false, error: "Order status cannot move backwards" });
		}

		await pool.query("UPDATE orders SET status = ? WHERE id = ? AND user_id = ?", [status, req.params.id, req.user.id]);
		const order = await getOrderWithItems(pool, req.params.id, req.user.id);
		return res.json({ success: true, order });
	} catch (error) {
		console.error("Update order status error:", error);
		return res.status(500).json({ success: false, error: "Failed to update order status" });
	}
};
