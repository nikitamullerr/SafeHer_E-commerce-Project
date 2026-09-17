import { passwordResetEmail } from '../services/passwordResetEmail.js';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import emailService from '../services/emailService.js';
export async function ensurePasswordResetSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS password_resets (
    user_id INT PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL, password_hash_at_request VARCHAR(255) NOT NULL
  )`);
}
const digest = token => createHash('sha256').update(token).digest('hex');
export async function forgotPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!emailService.isReady()) return res.status(503).json({ error: 'Password reset email is unavailable. Please try again later.' });
  try {
    const [users] = await pool.query('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
    if (users.length) {
      const user = users[0], token = randomBytes(32).toString('hex');
      const url = new URL('/login', (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim());
      url.hash = `reset-token=${token}`;
      await pool.query('INSERT INTO password_resets (user_id, token_hash, expires_at, password_hash_at_request) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), ?) ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), password_hash_at_request = VALUES(password_hash_at_request)', [user.id, digest(token), user.password_hash || '']);
      const message = passwordResetEmail(url.href);
      const sent = await emailService.sendEmail(user.email, 'Reset your SafeHer password', message.html, { text: message.text, templateParams: message.templateParams });
      if (!sent) {
        await pool.query('DELETE FROM password_resets WHERE token_hash = ?', [digest(token)]);
        console.error('Password reset email delivery failed.');
        return res.status(503).json({ error: 'The email service could not deliver the reset email. Please try again shortly.' });
      }
    }
    return res.json({ success: true, message: 'If an account matches that email, you will receive a password reset link.' });
  } catch { return res.status(503).json({ error: 'Unable to request a password reset. Please try again later.' }); }
}
export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' });
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Use at least 8 characters and no more than 72 bytes for your password.' });
  let connection;
  try {
    const hashed = await bcrypt.hash(password, 10);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > NOW() FOR UPDATE', [digest(token)]);
    if (!rows.length) { await connection.rollback(); return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' }); }
    const row = rows[0];
    const [result] = await connection.query("UPDATE users SET password_hash = ? WHERE id = ? AND COALESCE(password_hash, '') = ?", [hashed, row.user_id, row.password_hash_at_request]);
    await connection.query('DELETE FROM password_resets WHERE user_id = ?', [row.user_id]);
    await connection.commit();
    if (!result.affectedRows) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' });
    return res.json({ success: true });
  } catch { if (connection) await connection.rollback(); return res.status(503).json({ error: 'Unable to reset your password. Please try again.' }); }
  finally { connection?.release(); }
}
