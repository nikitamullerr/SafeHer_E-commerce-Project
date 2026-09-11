import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import pool from "../config/db.js";
import { verifyGoogleIdentity } from "../services/googleIdentityService.js";

export function createGoogleAuthController({ db = pool, verifyIdentity = verifyGoogleIdentity } = {}) {
  return async function googleAuth(req, res) {
    const { credential, mode } = req.body || {};
    if (typeof credential !== "string" || !credential || credential.length > 10000 || !["login", "registration"].includes(mode)) {
      return res.status(400).json({ success: false, error: "A Google credential and valid sign-in mode are required." });
    }
    if (!process.env.JWT_SECRET) return res.status(503).json({ success: false, error: "Google sign-in is unavailable. Please try again later." });
    let connection;
    try {
      const identity = await verifyIdentity(credential);
      if (!identity?.sub || identity.email_verified !== true || typeof identity.email !== "string") {
        return res.status(401).json({ success: false, error: "Google could not verify your sign-in. Please try again." });
      }
      const email = identity.email.trim().toLowerCase();
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT id, name, email, phone, password_hash, google_sub, CASE WHEN is_admin = 1 THEN 'admin' ELSE 'user' END AS role FROM users WHERE google_sub = ? OR email = ? FOR UPDATE",
        [identity.sub, email],
      );
      let user = rows.find(row => row.google_sub === identity.sub) || rows.find(row => row.email.toLowerCase() === email);
      if (mode === "registration" && user) {
        await connection.rollback();
        return res.status(409).json({ success: false, error: "User already exists" });
      }
      if (mode === "login" && !user) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: "No account was found. Please create an account first." });
      }
      if (user) {
        const authoritativeEmail = email.endsWith("@gmail.com") || Boolean(identity.hd);
        if (user.google_sub !== identity.sub && (user.google_sub || !authoritativeEmail)) {
          await connection.rollback();
          return res.status(401).json({ success: false, error: "Please sign in with your email and password for this account." });
        }
        if (!user.google_sub) await connection.query("UPDATE users SET google_sub = ? WHERE id = ?", [identity.sub, user.id]);
        // Retire the predictable password produced by the previous Google flow.
        if (await bcrypt.compare(`google_oauth_${identity.sub}`, user.password_hash)) {
          await connection.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(randomBytes(48).toString("base64url"), 10), user.id]);
        }
      } else {
        const name = String(identity.name || email.split("@")[0]).slice(0, 100);
        const passwordHash = await bcrypt.hash(randomBytes(48).toString("base64url"), 10);
        const [result] = await connection.query("INSERT INTO users (name, email, password_hash, google_sub) VALUES (?, ?, ?, ?)", [name, email, passwordHash, identity.sub]);
        user = { id: result.insertId, name, email, phone: null, role: "user" };
      }
      const { password_hash, google_sub, ...publicUser } = user;
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
      await connection.commit();
      return res.status(mode === "registration" ? 201 : 200).json({ success: true, user: publicUser, token });
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      if (error.code === "ER_DUP_ENTRY" && mode === "registration") return res.status(409).json({ success: false, error: "User already exists" });
      return res.status(error.status || 500).json({ success: false, error: error.status ? error.message : "Google sign-in could not be completed. Please try again." });
    } finally { connection?.release(); }
  };
}
export const googleAuth = createGoogleAuthController();
