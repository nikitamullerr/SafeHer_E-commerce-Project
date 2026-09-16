import Swal from "./localizedSwal.js";
import api from "./api.js";

export function redirectToPayfast(payment) {
  if (!["https://sandbox.payfast.co.za/eng/process", "https://www.payfast.co.za/eng/process"].includes(payment.url)) throw new Error("Invalid PayFast checkout URL.");
  const form = document.createElement("form");
  form.method = "POST"; form.action = payment.url; form.hidden = true;
  for (const [name, value] of Object.entries(payment.formInputs)) {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = name; input.value = String(value); form.appendChild(input);
  }
  document.body.appendChild(form);
  Swal.fire({ title: 'Opening PayFast', text: 'Please wait while we take you to PayFast to complete payment.', showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
  const timer = window.setTimeout(() => {
    Swal.fire({ icon: 'info', title: 'Still waiting for PayFast?', text: 'If PayFast did not open, check your connection and return to your orders. Check the payment status before trying again.' });
    form.remove();
  }, 15000);
  window.addEventListener('pagehide', () => { clearTimeout(timer); form.remove(); Swal.close(); }, { once: true });
  try { form.submit(); } catch (error) { clearTimeout(timer); form.remove(); Swal.close(); throw error; }
}

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
