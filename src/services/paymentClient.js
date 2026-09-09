import api from './api.js';

// PayFast
export async function createPayfastPayment(orderData) {
    const response = await api.post('/payments/payfast/create', orderData);
    return response.data;
}

// Card Payment (simulation)
export async function createCardPayment(orderData) {
    const response = await api.post('/payments/create', {
        ...orderData,
        payment_method: 'payfast'
    });
    return response.data;
}

export async function getPaymentStatus(orderNumber) {
    const response = await api.get(`/payments/${orderNumber}/status`);
    return response.data;
}

export const paymentService = {
    createPayfastPayment,
    createCardPayment,
    getPaymentStatus
};

export default paymentService;