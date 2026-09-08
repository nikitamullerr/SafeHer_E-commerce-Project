import express from 'express';
import authRoutes from './authRoutes.js';
import premiumRoutes from './premiumRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import paygateRoutes from './paygateRoutes.js'; 

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
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);

// PayGate routes
router.use('/paygate', paygateRoutes);

export default router;
