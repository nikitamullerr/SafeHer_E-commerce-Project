import bcrypt from 'bcrypt';
import pool from '../config/db.js';

// Credentials arrive through stdin, never through command arguments or .env.
try {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error('Input is too long.');
  }
  const { email, password } = JSON.parse(input.replace(/^\uFEFF/, ''));
  input = '';
  if (typeof email !== 'string' || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid admin email.');
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Use at least 12 characters and no more than 72 UTF-8 bytes.');
  const normalizedEmail = email.trim().toLowerCase();
  const [[user]] = await pool.query('SELECT id, is_admin FROM users WHERE email = ?', [normalizedEmail]);
  if (user && !user.is_admin) throw new Error('This is a customer account. This command does not promote existing customers.');
  const hash = await bcrypt.hash(password, 12);
  if (user) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ? AND is_admin = 1', [hash, user.id]);
  } else {
    await pool.query('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)', ['SafeHer Admin', normalizedEmail, hash]);
  }
  console.log(`Admin password saved for ${normalizedEmail}. Sign in at http://localhost:5173/admin`);
} catch (error) {
  console.error(error.code ? `Database setup failed (${error.code}). Check MySQL and backend/.env.` : error instanceof SyntaxError ? 'Run npm.cmd run setup:admin in an interactive PowerShell terminal.' : error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
