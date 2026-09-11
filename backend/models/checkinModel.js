import pool from "../config/db.js";

export const createCheckin = async (userId, durationMinutes) => {
    const [result] = await pool.query(
        `INSERT INTO checkins
         (user_id, duration_minutes, status)
         VALUES (?, ?, 'active')`,
        [userId, durationMinutes]
    );

    const [rows] = await pool.query(
        `SELECT *
         FROM checkins
         WHERE id = ?`,
        [result.insertId]
    );

    return rows[0];
};

export const getCheckinsByUser = async (userId) => {
    const [rows] = await pool.query(
        `SELECT *
         FROM checkins
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
    );

    return rows;
};

export const updateCheckinStatus = async (
    checkinId,
    userId,
    status
) => {
    const completedAt =
        status === "completed" ? new Date() : null;

    const [result] = await pool.query(
        `UPDATE checkins
         SET status = ?, completed_at = ?
         WHERE id = ? AND user_id = ?`,
        [status, completedAt, checkinId, userId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    const [rows] = await pool.query(
        `SELECT *
         FROM checkins
         WHERE id = ? AND user_id = ?`,
        [checkinId, userId]
    );

    return rows[0];
};
