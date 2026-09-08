import api from "./api";

export async function createPayfastPayment(order) {
  const { data } = await api.post("/payments/payfast/create", order);
  return data;
}

export async function getPaymentStatus(orderNumber) {
  const { data } = await api.get(`/payments/${encodeURIComponent(orderNumber)}/status`);
  return data;
}
