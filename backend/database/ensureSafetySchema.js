import pool from "../config/db.js";

export async function ensureSafetySchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS safety_hub_state (
    user_id INT PRIMARY KEY,
    selected_plan VARCHAR(30) NOT NULL DEFAULT 'Home mode',
    night_checklist JSON NULL,
    trip JSON NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS safety_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
}
