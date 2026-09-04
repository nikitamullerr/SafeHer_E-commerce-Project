import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    deleteAccount
} from '../controllers/authControllers.js';

const router = express.Router();

// PUBLIC ROUTES (No token required)
router.post('/register', register);
router.post('/login', login);

// PROTECTED ROUTES (Token required)
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.delete('/me', verifyToken, deleteAccount);

export default router;