import pool from "../config/db.js";

export const getProducts = async (req, res) => {

	try {
		const [products] = await pool.query(
			`SELECT p.id, p.name, p.description, p.detail, p.price, p.image_url,
							p.icon, p.tone, p.stock, p.is_featured, c.slug AS category
			 FROM products p
			 LEFT JOIN categories c ON c.id = p.category_id
			 WHERE p.is_active = TRUE
			 ORDER BY p.id`,
		);

		return res.json({
			success: true,
			products: products.map((product) => ({
				...product,
				price: Number(product.price),
				image: product.image_url,
			})),
		});
	} catch (error) {
		console.error("Get products error:", error);
		return res.status(500).json({ success: false, error: "Failed to get products" });
	}
};
