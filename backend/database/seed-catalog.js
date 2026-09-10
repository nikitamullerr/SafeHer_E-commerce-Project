import fs from "node:fs";
import pool from "../config/db.js";

const sql = fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const images = JSON.parse(fs.readFileSync(new URL("./product-images.json", import.meta.url), "utf8"));
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const [[products]] = await connection.query("SELECT COUNT(*) AS count FROM products");
  const [[categories]] = await connection.query("SELECT COUNT(*) AS count FROM categories");
  if (products.count || categories.count) throw new Error("Seed only supports an empty catalogue; existing records were not changed.");
  const categorySeed = sql.match(/INSERT INTO categories[\s\S]*?;/)?.[0];
  let productSeed = sql.match(/INSERT INTO products[\s\S]*?;/)?.[0];
  if (!categorySeed || !productSeed) throw new Error("Catalogue seed statements not found.");
  await connection.query(categorySeed);
  const [categoryRows] = await connection.query("SELECT id, slug FROM categories");
  const slugs = ["personal-safety", "home-security", "travel-safety", "emergency-preparedness"];
  const categoryIds = Object.fromEntries(slugs.map((slug, index) => [index + 1, categoryRows.find((row) => row.slug === slug).id]));
  productSeed = productSeed.replace(/, ([1-4]), (\d+), (TRUE|FALSE), TRUE\)/g, (_, id, stock, featured) => `, ${categoryIds[id]}, ${stock}, ${featured}, TRUE)`);
  await connection.query(productSeed);
  const [inserted] = await connection.query("SELECT id, name FROM products");
  for (const product of inserted) {
    // The schema's local image paths do not exist; reuse the existing shop images.
    await connection.query("UPDATE products SET image_url = ? WHERE id = ?", [images[product.name] || null, product.id]);
  }
  await connection.commit();
  console.log(`Seeded ${categoryRows.length} categories and ${inserted.length} products from the project schema.`);
} catch (error) {
  await connection.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally { connection.release(); await pool.end(); }
