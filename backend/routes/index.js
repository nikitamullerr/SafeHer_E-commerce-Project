import express from 'express';
import authRoutes from './authRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString() 
    });
});

// Auth routes
router.use('/auth', authRoutes);

export default router;
