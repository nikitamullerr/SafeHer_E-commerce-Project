import api from './api.js';

export async function createPayfastPayment(orderData) {
    const response = await api.post('/payments/payfast/create', orderData);
    return response.data;
}

export async function getPaymentStatus(orderNumber) {
    const response = await api.get(`/payments/${orderNumber}/status`);
    return response.data;
}