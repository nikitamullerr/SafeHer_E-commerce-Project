import pool from "../config/db.js";
try {
  const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'google_sub'");
  if (!columns.length) await pool.query("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER password_hash");
  console.log(columns.length ? "Google account identity column already exists." : "Added nullable, unique Google account identity column; existing accounts preserved.");
} finally { await pool.end(); }
