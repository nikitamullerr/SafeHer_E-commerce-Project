import express from "express";
import pool from "../config/db.js";
const router = express.Router();
router.get("/", async (req, res, next) => {
  try {
    const [reviews] = await pool.query("SELECT id, name, location, title, quote, stars, date, helpful, initials FROM testimonials WHERE is_approved = TRUE ORDER BY date DESC, id DESC");
    res.json({ success: true, reviews });
  } catch (error) { next(error); }
});
export default router;
