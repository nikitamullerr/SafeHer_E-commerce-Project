import express from 'express';
import authRoutes from './authRoutes.js';
import orderRoutes from './orderRoutes.js';
import productRoutes from './productRoutes.js';

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
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);

export default router;
