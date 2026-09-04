import express from 'express';
import authRoutes from './authRoutes.js';
import premiumRoutes from './premiumRoutes.js';

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

// Premium routes
router.use('/premium', premiumRoutes);

export default router;
