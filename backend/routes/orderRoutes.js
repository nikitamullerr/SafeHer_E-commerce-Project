import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { confirmOrder } from '../controllers/orderController.js';

const router = express.Router();

// All order routes require authentication
router.use(verifyToken);

// Confirm/Create an order (used for direct checkout without PayFast)
router.post('/confirm', confirmOrder);

// You can add other order routes here (e.g., GET /orders, GET /orders/:id)
// But for the payment flow, we only need the confirm endpoint.

export default router;