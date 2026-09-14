import { readFile, access } from "node:fs/promises";
import pool from "../config/db.js";

// One-time catalog update. Names, descriptions, IDs and stock stay unchanged.
const prices = JSON.parse(await readFile(new URL("./product-price-update.json", import.meta.url), "utf8"));
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const [products] = await connection.query("SELECT id, name, slug FROM products FOR UPDATE");
  const matched = [], missing = [];
  for (const update of prices) {
    const product = products.find(item => item.name.toLowerCase() === update.name.toLowerCase());
    if (!product) { missing.push(update.name); continue; }
    const image = `/images/products/${product.slug}.png`;
    await access(new URL(`../../public${image}`, import.meta.url));
    await connection.query("UPDATE products SET price = ?, image_url = ? WHERE id = ?", [update.price, image, product.id]);
    matched.push(product.name);
  }
  await connection.commit();
  console.log(JSON.stringify({ updated: matched.length, missing }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally { connection.release(); await pool.end(); }
