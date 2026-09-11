import pool from "../config/db.js";

const EmergencyContact = {
    async getAllByUser(userId) {
        const [rows] = await pool.query(
            `SELECT *
             FROM emergency_contacts
             WHERE user_id = ?
             ORDER BY is_primary DESC, created_at DESC`,
            [userId]
        );

        return rows;
    },

    async getById(id, userId) {
        const [rows] = await pool.query(
            `SELECT *
             FROM emergency_contacts
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        return rows[0];
    },

    async create(userId, contact) {
        const {
            name,
            phone,
            relationship,
            is_primary
        } = contact;

        const [result] = await pool.query(
            `INSERT INTO emergency_contacts
             (user_id, name, phone, relationship, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                name,
                phone,
                relationship || null,
                is_primary || false
            ]
        );

        return result.insertId;
    },

    async update(id, userId, contact) {
        const {
            name,
            phone,
            relationship,
            is_primary
        } = contact;

        const [result] = await pool.query(
            `UPDATE emergency_contacts
             SET name = ?,
                 phone = ?,
                 relationship = ?,
                 is_primary = ?
             WHERE id = ? AND user_id = ?`,
            [
                name,
                phone,
                relationship || null,
                is_primary || false,
                id,
                userId
            ]
        );

        return result.affectedRows;
    },

    async delete(id, userId) {
        const [result] = await pool.query(
            `DELETE FROM emergency_contacts
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        return result.affectedRows;
    }
};

export default EmergencyContact;