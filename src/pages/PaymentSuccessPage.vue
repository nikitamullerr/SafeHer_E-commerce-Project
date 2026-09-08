<script setup>
import { onMounted, ref } from "vue";
import { getPaymentStatus } from "../services/paymentClient";

const emit = defineEmits(["navigate"]);
const orderNumber = new URLSearchParams(window.location.search).get("order");
const status = ref("checking");
const order = ref(null);

onMounted(async () => {
  if (!orderNumber) return (status.value = "missing");
  try {
    const data = await getPaymentStatus(orderNumber);
    order.value = data.order;
    status.value = data.order.payment_status === "paid" ? "paid" : "pending";
  } catch {
    status.value = "pending";
  }
});
</script>

<template>
  <main class="inner-page container py-5 text-center">
    <i class="bi bi-check2-circle display-3 text-success"></i>
    <h1 class="mt-3">Payment received</h1>
    <p v-if="status === 'checking'">Confirming your SafeHer payment…</p>
    <template v-else>
      <p v-if="status === 'paid'">Your order <strong>{{ orderNumber }}</strong> is confirmed. A receipt has been sent to your email.</p>
      <p v-else>Your payment is being confirmed. Please check back shortly; do not submit another payment.</p>
    </template>
    <button class="btn btn-sos mt-3" @click="emit('navigate', 'orders')">View orders</button>
  </main>
</template>