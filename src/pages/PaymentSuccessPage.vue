<script setup>
import { t } from "../languageConfig.js";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { getPaymentStatus } from "../services/paymentClient.js";
const emit = defineEmits(["navigate"]);
const number = new URLSearchParams(window.location.search).get("order");
const status = ref("checking"), error = ref(""), order = ref(null), busy = ref(false);
let timer, attempts = 0, stopped = false;
async function refresh() {
  if (busy.value) return;
  clearTimeout(timer); error.value = "";
  if (!number) { status.value = "missing"; return; }
  busy.value = true;
  try {
    const data = await getPaymentStatus(number);
    if (stopped) return;
    order.value = data.order; status.value = data.order.payment_status;
    if (status.value === "pending" && ++attempts < 12) timer = setTimeout(refresh, 5000);
  } catch (failure) { if (!stopped) { status.value = "unknown"; error.value = failure.response?.data?.error || "Unable to check payment. Please refresh."; } }
  finally { busy.value = false; }
}
onMounted(refresh);
onBeforeUnmount(() => { stopped = true; clearTimeout(timer); });
</script>
<template>
  <main class="inner-page container py-5 text-center">
    <h1>{{ t(status === 'paid' ? 'Payment confirmed' : status === 'failed' ? 'Payment not completed' : 'Checking payment') }}</h1>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <p v-else-if="status === 'paid'">{{ t("Payment for") }} <strong>{{ number }}</strong> {{ t("is confirmed.") }} {{ t(order.confirmation_email_sent ? 'Your receipt has been sent.' : 'You can check or resend your receipt from your orders.') }}</p>
    <p v-else-if="status === 'missing'">{{ t("No order number was provided. Open your orders to check payment.") }}</p>
    <p v-else-if="status === 'failed'">{{ t("Payment was not completed. You can retry the same order from your orders.") }}</p>
    <p v-else>{{ t("Waiting for the payment provider to confirm your payment. Returning here does not confirm payment. Do not pay again if your payment is still processing.") }}</p>
    <button v-if="status !== 'paid' && status !== 'missing'" class="btn btn-outline-plum me-2" :disabled="busy" @click="refresh">{{ t(busy ? 'Checking...' : 'Refresh status') }}</button>
    <button class="btn btn-sos" @click="emit('navigate', 'orders')">{{ t("View orders") }}</button>
  </main>
</template>
