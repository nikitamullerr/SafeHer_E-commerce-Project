import { rateLimit } from 'express-rate-limit';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController.js';
import express from 'express';
import { googleAuth } from '../controllers/googleAuthController.js';
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

const resetLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Please try again in 15 minutes.' } });
router.post('/forgot-password', resetLimit, forgotPassword);
router.post('/reset-password', resetLimit, resetPassword);
// PUBLIC ROUTES
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// PROTECTED ROUTES
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.delete('/me', verifyToken, deleteAccount);

export default router;