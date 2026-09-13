import api from "./api.js";

export async function createPayment(orderData) {
  const { data } = await api.post("/payments/create", orderData);
  return data;
}

export async function createCardPayment(orderData) {
  return createPayment({ ...orderData, payment_method: "card" });
}

export async function getPaymentStatus(orderNumber) {
  const { data } = await api.get(`/payments/${encodeURIComponent(orderNumber)}/status`);
  return data;
}

export async function getPaymentConfig() {
  const { data } = await api.get("/payments/config");
  return data;
}

export async function retryPayment(orderNumber) {
  const { data } = await api.post(`/payments/${encodeURIComponent(orderNumber)}/retry`);
  return data;
}

export const paymentService = { createPayment, createCardPayment, getPaymentStatus };
export default paymentService;
