import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
    createPayment,
    handleReturn,
    handleCancel,
} from '../controllers/paygateController.js';

const router = express.Router();

// Protected route to initiate payment
router.post('/create', verifyToken, createPayment);

// PayGate redirects here (public)
router.get('/return', handleReturn);
router.get('/cancel', handleCancel);

export default router;