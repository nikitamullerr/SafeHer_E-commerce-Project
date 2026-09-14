import { test, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../config/db.js";
import routes from "../routes/index.js";
import { getProducts } from "../controllers/productController.js";

const originalQuery = pool.query;
after(async () => { pool.query = originalQuery; await pool.end(); });

test("backend routes import successfully", () => {
  assert.equal(typeof routes, "function");
});

test("catalog uses database prices and only attaches matching approved reviews", async () => {
  pool.query = async sql => {
    if (sql.includes("FROM product_reviews")) {
      assert.match(sql, /is_approved = TRUE/);
      return [[{ product_id: 8, name: "Customer", stars: 4, text: "Review" }]];
    }
    return [[{ id: 8, price: "75.50", image_url: "/images/example.png" }, { id: 9, price: "40.00" }]];
  };
  const res = { json(body) { this.body = body; } };
  await getProducts({}, res);
  assert.equal(res.body.products[0].price, 75.5);
  assert.equal(res.body.products[0].image, "/images/example.png");
  assert.equal(res.body.products[0].reviews.length, 1);
  assert.deepEqual(res.body.products[1].reviews, []);
});
