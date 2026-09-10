import api from "./api.js";

export async function createPayfastPayment(orderData) {
  const { data } = await api.post("/payments/create", { ...orderData, payment_method: "payfast" });
  return data;
}
export async function createCardPayment(orderData) {
  const { data } = await api.post("/payments/create", { ...orderData, payment_method: "card_demo", demo_token: "test_card" }, { timeout: 60000 });
  return data;
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
export function submitPayfastForm(payment) {
  const allowed = ["https://sandbox.payfast.co.za/eng/process", "https://www.payfast.co.za/eng/process"];
  if (!allowed.includes(payment.paymentUrl) || !payment.formInputs?.signature) throw new Error("Invalid payment response. Please retry from your orders.");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payment.paymentUrl;
  for (const [name, value] of Object.entries(payment.formInputs)) {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = name; input.value = String(value);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
export const paymentService = { createPayfastPayment, createCardPayment, getPaymentStatus };
export default paymentService;
