import { UserModel } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

export const register = async (req, res) => {
    try {
        console.log('📝 Register request received');

        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email and password are required'
            });
        }

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("Creating user...");
    const userId = await UserModel.create({
      name,
      email,
      password_hash: hashedPassword,
      phone,
    });

    console.log("Getting user...");
    const user = await UserModel.findById(userId);

    console.log("Generating token...");
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

        res.status(201).json({
            success: true,
            user,
            token
        });

    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Registration failed'
        });
    }
};

export const login = async (req, res) => {
    try {
        console.log('📝 Login request received');

        // Check if body exists
        if (!req.body) {
            console.log('❌ Request body is undefined');
            return res.status(400).json({
                success: false,
                error: 'Request body is missing. Make sure to send JSON with Content-Type: application/json'
            });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Google authentication must use a verified Google credential, never the old generated password.
        if (typeof password === 'string' && password.startsWith('google_oauth_')) {
            return res.status(401).json({ success: false, error: 'Please use Google to sign in to this account.' });
        }

        const [rows] = await pool.query(
            "SELECT id, name, email, password_hash, phone, CASE WHEN is_admin = 1 THEN 'admin' ELSE 'user' END AS role FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        delete user.password_hash;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

        res.json({
            success: true,
            user,
            token
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Login failed'
        });
    }
};

export const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: rows[0]
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const userId = req.user.id;

        if (!name && !phone) {
            return res.status(400).json({
                success: false,
                error: 'At least one field to update is required'
            });
        }

        await pool.query(
            'UPDATE users SET name = ?, phone = ? WHERE id = ?',
            [name, phone, userId]
        );

        const [user] = await pool.query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            user: user[0]
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        const [rows] = await pool.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('❌ Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
};
