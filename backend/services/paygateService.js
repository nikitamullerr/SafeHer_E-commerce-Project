import crypto from 'crypto';
import axios from 'axios';

export const paygateService = {
    // Generate checksum (PayGate's signature requirement)
    generateChecksum(data, encryptionKey) {
        // PayGate expects fields in this exact order
        const payload = [
            data.PAYGATE_ID,
            data.REFERENCE,
            data.AMOUNT,
            data.CURRENCY,
            data.RETURN_URL,
            data.CANCEL_URL,
            data.TRANSACTION_DATE,
            data.DESCRIPTION,
            data.EMAIL,
        ].join('');

        console.log('🔐 Checksum payload:', payload);

        return crypto
            .createHash('md5')
            .update(payload + encryptionKey)
            .digest('hex');
    },

    // Create payment request
    async createPayment(paymentData) {
        const {
            amount,
            reference,
            currency = 'ZAR',
            email,
            description = 'SafeHer Order',
        } = paymentData;

        // Ensure email is a string
        const emailStr = typeof email === 'string' ? email : String(email);

        const transactionDate = new Date().toISOString().slice(0, 19);

        const data = {
            PAYGATE_ID: process.env.PAYGATE_ID,
            REFERENCE: reference,
            AMOUNT: amount.toFixed(2),
            CURRENCY: currency,
            RETURN_URL: process.env.PAYGATE_RETURN_URL,
            CANCEL_URL: process.env.PAYGATE_CANCEL_URL,
            TRANSACTION_DATE: transactionDate,
            DESCRIPTION: description,
            EMAIL: emailStr,
        };

        console.log('📤 PayGate data before checksum:', data);

        // Generate checksum – call the method correctly
        data.CHECKSUM = this.generateChecksum(data, process.env.PAYGATE_ENCRYPTION_KEY);

        console.log('✅ Final PayGate request:', data);

        try {
            const response = await axios.post(process.env.PAYGATE_URL, data, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            console.log('✅ PayGate response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ PayGate request failed:', error.response?.data || error.message);
            throw error;
        }
    },

    // Query transaction status (optional)
    async queryTransaction(paygateId) {
        const response = await axios.post(
            'https://secure.paygate.co.za/payweb3/query.trans',
            {
                PAYGATE_ID: process.env.PAYGATE_ID,
                PAYGATE_REFERENCE: paygateId,
                CHECKSUM: crypto
                    .createHash('md5')
                    .update(
                        process.env.PAYGATE_ID +
                            paygateId +
                            process.env.PAYGATE_ENCRYPTION_KEY
                    )
                    .digest('hex'),
            }
        );
        return response.data;
    },
};