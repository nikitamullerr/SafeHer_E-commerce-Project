import pool from "../config/db.js";

export const PremiumService = {
  getLessons: async () => {
    const [rows] = await pool.query(
      "SELECT * FROM lessons ORDER BY order_number ASC",
    );
    return rows;
  },

  getLessonById: async (lessonId) => {
    const [rows] = await pool.query("SELECT * FROM lessons WHERE id = ?", [
      lessonId,
    ]);
    return rows[0] || null;
  },

  getUserProgress: async (userId) => {
    const [rows] = await pool.query(
      `SELECT lp.*, l.title, l.slug, l.duration, l.icon 
             FROM lesson_progress lp
             JOIN lessons l ON lp.lesson_id = l.id
             WHERE lp.user_id = ?`,
      [userId],
    );
    return rows;
  },

  getCompletedCount: async (userId) => {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as completed FROM lesson_progress WHERE user_id = ? AND completed = TRUE",
      [userId],
    );
    return rows[0]?.completed || 0;
  },

  getTotalLessons: async () => {
    const [rows] = await pool.query("SELECT COUNT(*) as total FROM lessons");
    return rows[0]?.total || 0;
  },

  markLessonComplete: async (userId, lessonId) => {
    const [existing] = await pool.query(
      "SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
      [userId, lessonId],
    );

    if (existing.length > 0) {
      const [result] = await pool.query(
        `UPDATE lesson_progress 
                 SET completed = TRUE, completed_at = NOW() 
                 WHERE user_id = ? AND lesson_id = ?`,
        [userId, lessonId],
      );
      return result.affectedRows > 0;
    } else {
      const [result] = await pool.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) 
                 VALUES (?, ?, TRUE, NOW())`,
        [userId, lessonId],
      );
      return result.affectedRows > 0;
    }
  },

  getSubscription: async (userId) => {
    const [rows] = await pool.query(
      `SELECT * FROM premium_subscriptions 
             WHERE user_id = ? AND active = TRUE 
             ORDER BY started_at DESC LIMIT 1`,
      [userId],
    );
    return rows[0] || null;
  },

  upsertSubscription: async (userId, planData) => {
    const { plan, amount, method, receipt_email, reference } = planData;

    const [existing] = await pool.query(
      "SELECT * FROM premium_subscriptions WHERE user_id = ?",
      [userId],
    );

    const expiresAt = new Date();
    if (plan === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    if (existing.length > 0) {
      const [result] = await pool.query(
        `UPDATE premium_subscriptions 
                 SET plan = ?, amount = ?, method = ?, receipt_email = ?, 
                     reference = ?, active = TRUE, expires_at = ?
                 WHERE user_id = ?`,
        [plan, amount, method, receipt_email, reference, expiresAt, userId],
      );
      return result.affectedRows > 0;
    } else {
      const [result] = await pool.query(
        `INSERT INTO premium_subscriptions 
                 (user_id, plan, amount, method, receipt_email, reference, expires_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, plan, amount, method, receipt_email, reference, expiresAt],
      );
      return result.affectedRows > 0;
    }
  },

  cancelSubscription: async (userId) => {
    const [result] = await pool.query(
      "UPDATE premium_subscriptions SET active = FALSE WHERE user_id = ?",
      [userId],
    );
    return result.affectedRows > 0;
  },
};
