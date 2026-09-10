import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
const router = express.Router();
router.use(verifyToken);
router.get("/", async (req, res) => {
  try {
    const [addresses] = await pool.query("SELECT id, label, address FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", [req.user.id]);
    res.json({ success: true, addresses });
  } catch { res.status(500).json({ success: false, error: "Unable to load saved addresses." }); }
});
router.post("/", async (req, res) => {
  let connection;
  try {
    const value = req.body?.address;
    if (typeof value !== "string" || !value.trim() || value.trim().length > 1000) return res.status(400).json({ success: false, error: "Enter an address (maximum 1000 characters)." });
    const address = value.trim().replace(/\s+/g, " ");
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user.id]);
    const [existing] = await connection.query("SELECT id, label, address FROM addresses WHERE user_id = ?", [req.user.id]);
    const duplicate = existing.find((item) => item.address.trim().replace(/\s+/g, " ").toLowerCase() === address.toLowerCase());
    if (duplicate) { await connection.commit(); return res.json({ success: true, address: duplicate }); }
    const label = address.slice(0, 100);
    const [result] = await connection.query("INSERT INTO addresses (user_id, label, address) VALUES (?, ?, ?)", [req.user.id, label, address]);
    await connection.commit();
    res.status(201).json({ success: true, address: { id: result.insertId, label, address } });
  } catch {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, error: "Unable to save this address. Please try again." });
  } finally { connection?.release(); }
});
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: "Saved address not found." });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, error: "Unable to remove this address." }); }
});
export default router;
