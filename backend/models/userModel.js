import pool from '../config/db.js';

export const UserModel = {
    findByEmail: async (email) => {
        const [rows] = await pool.query(
            'SELECT id, name, email, password_hash, phone, created_at FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        return rows[0] || null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    create: async (userData) => {
        const { name, email, password_hash, phone } = userData;
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone) 
             VALUES (?, ?, ?, ?)`,
            [name, email.toLowerCase(), password_hash, phone || null]
        );
        return result.insertId;
    },

    exists: async (email) => {
        const [rows] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        return rows.length > 0;
    },

    update: async (id, userData) => {
        const { name, phone } = userData;
        const [result] = await pool.query(
            'UPDATE users SET name = ?, phone = ? WHERE id = ?',
            [name, phone, id]
        );
        return result.affectedRows > 0;
    },

    updatePassword: async (id, hashedPassword) => {
        const [result] = await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    },

    delete: async (id) => {
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
};

export default UserModel;
