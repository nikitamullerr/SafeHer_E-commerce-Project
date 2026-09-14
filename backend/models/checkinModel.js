import pool from "../config/db.js";

export async function expireCheckins(userId, db = pool) {
  await db.query("UPDATE checkins SET status = 'missed' WHERE user_id = ? AND status = 'active' AND TIMESTAMPADD(MINUTE, duration_minutes, created_at) <= NOW()", [userId]);
}

export async function createCheckin(userId, durationMinutes, db = null) {
  const connection = db || await pool.getConnection();
  try {
    if (!db) await connection.beginTransaction();
    await connection.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
    await expireCheckins(userId, connection);
    const [active] = await connection.query("SELECT id FROM checkins WHERE user_id = ? AND status = 'active'", [userId]);
    if (active.length) throw Object.assign(new Error("Complete your active check-in before starting another."), { status: 409 });
    const [result] = await connection.query("INSERT INTO checkins (user_id, duration_minutes, status) VALUES (?, ?, 'active')", [userId, durationMinutes]);
    const [rows] = await connection.query("SELECT *, TIMESTAMPADD(MINUTE, duration_minutes, created_at) AS expires_at FROM checkins WHERE id = ? AND user_id = ?", [result.insertId, userId]);
    if (!db) await connection.commit();
    return rows[0];
  } catch (error) { if (!db) await connection.rollback(); throw error; }
  finally { if (!db) connection.release(); }
}

export async function getCheckinsByUser(userId) {
  await expireCheckins(userId);
  const [rows] = await pool.query("SELECT *, TIMESTAMPADD(MINUTE, duration_minutes, created_at) AS expires_at FROM checkins WHERE user_id = ? ORDER BY created_at DESC, id DESC", [userId]);
  return rows;
}

export async function updateCheckinStatus(checkinId, userId, status) {
  await expireCheckins(userId);
  // A missed check-in can be acknowledged later, but never marked missed early.
  const [result] = await pool.query(`UPDATE checkins SET status = ?, completed_at = ?
    WHERE id = ? AND user_id = ? AND status IN ('active', 'missed')
    AND (? = 'completed' OR TIMESTAMPADD(MINUTE, duration_minutes, created_at) <= NOW())`,
    [status, status === "completed" ? new Date() : null, checkinId, userId, status]);
  if (!result.affectedRows) return null;
  const [rows] = await pool.query("SELECT * FROM checkins WHERE id = ? AND user_id = ?", [checkinId, userId]);
  return rows[0];
}
