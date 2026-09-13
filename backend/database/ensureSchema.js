import pool from "../config/db.js";

const REQUIRED_COLUMNS = [
  ["customer_name", "VARCHAR(100) NULL DEFAULT NULL"],
  ["customer_email", "VARCHAR(150) NULL DEFAULT NULL"],
  ["subtotal", "DECIMAL(10,2) NOT NULL DEFAULT 0"],
  ["delivery_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0"],
  ["confirmation_email_sent", "BOOLEAN NOT NULL DEFAULT FALSE"],
  ["confirmation_email_sent_at", "TIMESTAMP NULL DEFAULT NULL"],
  ["confirmation_email_error", "VARCHAR(255) NULL DEFAULT NULL"],
  ["payfast_payment_id", "VARCHAR(100) NULL DEFAULT NULL"],
];

async function hasColumn(tableName, columnName) {
  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
  );
  return Array.isArray(rows) && rows.some((row) => row.COLUMN_NAME === columnName);
}

export async function ensureRequiredOrderColumns() {
  const connection = await pool.getConnection();
  try {
    for (const [columnName, definition] of REQUIRED_COLUMNS) {
      if (!(await hasColumn("orders", columnName))) {
        await connection.query(`ALTER TABLE orders ADD COLUMN ${columnName} ${definition}`);
      }
    }
    return true;
  } finally {
    connection.release();
  }
}

export default ensureRequiredOrderColumns;
