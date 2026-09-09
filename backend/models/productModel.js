import db from '../config/db.js';

// Get all active products
const getAllProducts = async () => {
    const [rows] = await db.query(`
        SELECT 
            p.id,
            p.name,
            p.slug,
            p.description,
            p.detail,
            p.price,
            p.image_url,
            p.icon,
            p.tone,
            p.category_id,
            c.name AS category_name,
            p.stock,
            p.is_featured,
            p.is_active,
            p.created_at,
            p.updated_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = TRUE
        ORDER BY p.created_at DESC
    `);

    return rows;
};

// Get one product by ID
const getProductById = async (id) => {
    const [rows] = await db.query(`
        SELECT 
            p.id,
            p.name,
            p.slug,
            p.description,
            p.detail,
            p.price,
            p.image_url,
            p.icon,
            p.tone,
            p.category_id,
            c.name AS category_name,
            p.stock,
            p.is_featured,
            p.is_active,
            p.created_at,
            p.updated_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    `, [id]);

    return rows[0];
};

// Create a new product
const createProduct = async (product) => {
    const {
        name,
        slug,
        description,
        detail,
        price,
        image_url,
        icon,
        tone,
        category_id,
        stock,
        is_featured,
        is_active
    } = product;

    const [result] = await db.query(`
        INSERT INTO products
        (name, slug, description, detail, price, image_url, icon, tone,
         category_id, stock, is_featured, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        name,
        slug,
        description,
        detail,
        price,
        image_url,
        icon,
        tone,
        category_id,
        stock,
        is_featured,
        is_active
    ]);

    return {
        id: result.insertId,
        ...product
    };
};

// Update a product
const updateProduct = async (id, product) => {
    const {
        name,
        slug,
        description,
        detail,
        price,
        image_url,
        icon,
        tone,
        category_id,
        stock,
        is_featured,
        is_active
    } = product;

    const [result] = await db.query(`
        UPDATE products
        SET
            name = ?,
            slug = ?,
            description = ?,
            detail = ?,
            price = ?,
            image_url = ?,
            icon = ?,
            tone = ?,
            category_id = ?,
            stock = ?,
            is_featured = ?,
            is_active = ?
        WHERE id = ?
    `, [
        name,
        slug,
        description,
        detail,
        price,
        image_url,
        icon,
        tone,
        category_id,
        stock,
        is_featured,
        is_active,
        id
    ]);

    return result;
};

// Delete a product
const deleteProduct = async (id) => {
    const [result] = await db.query(
        'DELETE FROM products WHERE id = ?',
        [id]
    );

    return result;
};

export {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};