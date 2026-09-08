import api from './api.js';

export const paygateService = {
    createPayment: async (data) => {
        console.log('Sending PayGate request:', data);  // ← Add logging
        const response = await api.post('/paygate/create', data);
        return response.data;
    },
};