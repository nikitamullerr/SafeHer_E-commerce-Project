import { verifyToken } from '../middleware/verifyToken.js';
import { rateLimit } from 'express-rate-limit';
import express from "express";
import pool from "../config/db.js";
const router = express.Router();
router.get("/", async (req, res, next) => {
  try {
    const [reviews] = await pool.query("SELECT id, name, location, title, quote, stars, date, helpful, initials FROM testimonials WHERE is_approved = TRUE ORDER BY date DESC, id DESC");
    const [productReviews] = await pool.query(`SELECT CONCAT('product-', r.id) AS id, r.name, p.name AS location, p.name AS title, r.text AS quote, r.stars, r.created_at AS date, 0 AS helpful, UPPER(LEFT(r.name, 1)) AS initials FROM product_reviews r JOIN products p ON p.id = r.product_id WHERE r.is_approved = TRUE ORDER BY r.created_at DESC, r.id DESC`);
    res.json({ success: true, reviews: [...reviews, ...productReviews].sort((a,b) => new Date(b.date) - new Date(a.date)) });
  } catch (error) { next(error); }
});
router.post('/', verifyToken, rateLimit({ windowMs: 60000, limit: 5, legacyHeaders: false, message: { error: 'Please wait a minute before submitting another review.' } }), async (req, res, next) => {
  const { product_id, stars, text } = req.body || {};
  if ((product_id != null && (!Number.isInteger(product_id) || product_id < 1)) || !Number.isInteger(stars) || stars < 1 || stars > 5 || typeof text !== 'string' || text.trim().length < 5 || text.trim().length > 2000) return res.status(400).json({ error: 'Choose a product, a rating from 1 to 5, and write 5 to 2000 characters.' });
  try {

    const [[user]] = await pool.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ error: 'Please sign in again.' });
    if (product_id == null) {
      const title = req.body.title, location = req.body.location;
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 200 || typeof location !== 'string' || location.trim().length > 100) return res.status(400).json({ error: 'Add a title of up to 200 characters and a location of up to 100 characters.' });
      const initials = user.name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 5).toUpperCase();
      const [[existing]] = await pool.query('SELECT id FROM testimonials WHERE name=? AND title=? AND quote=? AND stars=? AND date=CURRENT_DATE()', [user.name, title.trim(), text.trim(), stars]);
      if (existing) return res.json({ success: true, id: existing.id, type: 'testimonial' });
      const [result] = await pool.query('INSERT INTO testimonials (name,location,title,quote,stars,date,helpful,initials,is_approved) VALUES (?,?,?,?,?,CURRENT_DATE(),0,?,TRUE)', [user.name, location.trim(), title.trim(), text.trim(), stars, initials]);
      return res.status(201).json({ success: true, id: result.insertId, type: 'testimonial' });
    }
    const [[product]] = await pool.query('SELECT id FROM products WHERE id = ? AND is_active = TRUE', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const [[existing]] = await pool.query('SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ? AND text = ? AND stars = ?', [req.user.id, product_id, text.trim(), stars]);
    if (existing) return res.json({ success: true, id: existing.id });
    const [result] = await pool.query('INSERT INTO product_reviews (product_id, user_id, name, stars, text, is_approved) VALUES (?, ?, ?, ?, ?, TRUE)', [product_id, req.user.id, user.name, stars, text.trim()]);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});
export default router;
