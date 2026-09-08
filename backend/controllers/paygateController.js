import { paygateService } from '../services/paygateService.js';
import pool from '../config/db.js';

export const createPayment = async (req, res) => {
    try {
        const { amount, email, reference } = req.body;

        if (!amount || !email) {
            return res.status(400).json({
                success: false,
                error: 'Amount and email are required',
            });
        }

        const paymentData = {
            amount: amount,
            reference: reference || `ORD-${Date.now()}`,
            email: email,
        };

        const result = await paygateService.createPayment(paymentData);

        // PayGate redirects to their hosted page
        if (result.status === 'success') {
            const paygateRedirectUrl =
                'https://secure.paygate.co.za/payweb3/process.trans';
            res.json({
                success: true,
                redirectUrl: paygateRedirectUrl,
                paygateId: result.PAYGATE_ID,
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.message || 'Payment initiation failed',
            });
        }
    } catch (error) {
        console.error('PayGate error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate payment',
        });
    }
};

export const handleReturn = async (req, res) => {
    // PayGate redirects here after payment (frontend handles this)
    const { PAYGATE_ID, REFERENCE, AMOUNT, STATUS, CHECKSUM } = req.query;

    // Verify checksum (optional but recommended)
    // Then update order status in database

    res.redirect(
        `${process.env.FRONTEND_URL}/payment-success?order=${REFERENCE}&status=${STATUS}`
    );
};

export const handleCancel = async (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/payment-cancel`);
};