<script setup>
import { t } from "../languageConfig.js";
import { computed, onMounted, ref } from "vue";
import api from "../services/api.js";
import { retryPayment, submitPayfastForm } from "../services/paymentClient.js";
const emit = defineEmits(["navigate"]);
const orders = ref([]), loading = ref(false), error = ref("");
const search = ref(""), filter = ref("all"), sort = ref("newest");
const busy = ref({}), messages = ref({});
const statuses = ["Confirmed", "Packed", "Out for delivery", "Delivered"];
const money = (amount) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(amount) || 0);
const isDemo = (order) => order.paymentMethod === "card_demo";
const isPaid = (order) => order.paymentStatus === "paid" && !isDemo(order);
const canPay = (order) => order.paymentMethod === "payfast" && ["pending", "failed"].includes(order.paymentStatus);
const paymentLabel = (order) => isDemo(order) ? "Demo - no charge" : ({ paid: "Paid", pending: "Awaiting payment", failed: "Payment not completed", refunded: "Refunded" }[order.paymentStatus] || "Payment unconfirmed");
const visibleOrders = computed(() => {
  const term = search.value.trim().toLowerCase();
  return orders.value.filter((order) => {
    const matches = !term || [order.orderNumber, ...order.items.map((item) => item.name)].some((value) => String(value || "").toLowerCase().includes(term));
    return matches && (filter.value === "all" || (filter.value === "demo" ? isDemo(order) : !isDemo(order) && order.paymentStatus === filter.value));
  }).sort((a, b) => sort.value === "total" ? Number(b.total) - Number(a.total) : sort.value === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt));
});
const paidTotal = computed(() => orders.value.filter(isPaid).reduce((sum, order) => sum + Number(order.total), 0));
const awaiting = computed(() => orders.value.filter(canPay).length);
async function loadOrders() {
  if (loading.value) return;
  loading.value = true; error.value = "";
  try { const { data } = await api.get("/orders"); orders.value = (data.orders || []).map((order) => ({ ...order, items: order.items || [] })); }
  catch (failure) { error.value = failure.response?.data?.error || "Could not load your orders. Please try again."; }
  finally { loading.value = false; }
}
async function pay(order) {
  if (busy.value[order.id]) return;
  busy.value[order.id] = true; messages.value[order.id] = "";
  try { submitPayfastForm(await retryPayment(order.orderNumber)); }
  catch (failure) { messages.value[order.id] = failure.response?.data?.error || failure.message || "Could not start payment."; }
  finally { busy.value[order.id] = false; }
}
async function resend(order) {
  if (busy.value[order.id]) return;
  busy.value[order.id] = true; messages.value[order.id] = "";
  try {
    await api.post(`/orders/${order.id}/resend-confirmation-email`);
    order.emailSent = true;
    messages.value[order.id] = "Confirmation accepted for sending. Check your account email inbox and spam folder.";
  } catch (failure) { messages.value[order.id] = failure.response?.data?.error || "Receipt could not be sent. Please try again."; }
  finally { busy.value[order.id] = false; }
}
function subtotal(order) { return order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0); }
onMounted(loadOrders);
</script>
<template>
  <main class="inner-page container-fluid px-4 px-xl-5 orders-page">
    <div class="orders-header"><p class="eyebrow">{{ t("SAFEHER / Orders") }}</p><h1>{{ t("Your orders") }}</h1><p>{{ t("Track payment, delivery and receipts in one place.") }}</p></div>
    <section class="order-tools" :aria-label="t(&quot;Order filters&quot;)">
      <label>{{ t("Search orders") }}<input v-model="search" type="search" :placeholder="t(&quot;Order number or product&quot;)" /></label>
      <label>{{ t("Payment status") }}<select v-model="filter" :aria-label="t(&quot;Payment status&quot;)"><option value="all">{{ t("All orders") }}</option><option value="pending">{{ t("Awaiting payment") }}</option><option value="paid">{{ t("Paid") }}</option><option value="failed">{{ t("Payment not completed") }}</option><option value="refunded">{{ t("Refunded") }}</option><option value="demo">{{ t("Demo orders") }}</option></select></label>
      <label>{{ t("Sort by") }}<select v-model="sort" :aria-label="t(&quot;Sort by&quot;)"><option value="newest">{{ t("Newest first") }}</option><option value="oldest">{{ t("Oldest first") }}</option><option value="total">{{ t("Highest total") }}</option></select></label>
      <button class="btn btn-outline-plum" :disabled="loading" @click="loadOrders">{{ t(loading ? 'Refreshing...' : 'Refresh orders') }}</button>
    </section>
    <p v-if="error" class="checkout-error" role="alert">{{ t(error) }}</p>
    <p v-if="loading && !orders.length" role="status">{{ t("Loading your orders...") }}</p>
    <div v-if="orders.length" class="order-metrics"><span>{{ orders.length }} {{ t("orders") }}</span><span>{{ awaiting }} {{ t("awaiting payment") }}</span><strong>{{ t("Paid total:") }} {{ money(paidTotal) }}</strong></div>
    <section v-if="visibleOrders.length" class="orders-list" :aria-busy="loading">
      <article v-for="order in visibleOrders" :key="order.id" class="order-card">
        <div class="order-header-row"><div class="order-id-info"><strong>{{ order.orderNumber || `Order #${order.id}` }}</strong><small>{{ new Date(order.createdAt).toLocaleString('en-ZA') }}</small></div><strong class="order-total-amount">{{ money(order.total) }}</strong></div>
        <p class="order-payment-label">{{ t(paymentLabel(order)) }} <span>- {{ t(order.paymentMethod === 'payfast' ? 'PayFast' : isDemo(order) ? 'Card demo' : order.paymentMethod || 'Unspecified method') }}</span></p>
        <template v-if="isPaid(order)">
          <ol class="order-timeline" :aria-label="t(&quot;Delivery progress&quot;)"><li v-for="(status, index) in statuses" :key="status" :class="{ reached: statuses.indexOf(order.status) >= index }" :aria-current="order.status === status ? 'step' : undefined">{{ t(status) }}</li></ol>
          <p>{{ t("Delivery:") }} <strong>{{ t(order.status) }}</strong></p>
        </template>
        <p v-else-if="isDemo(order)">{{ t("This is a demonstration order. No charge, stock reservation or delivery will take place.") }}</p>
        <p v-else-if="order.paymentStatus === 'refunded'">{{ t("This order has been refunded.") }}</p>
        <p v-else>{{ t("Delivery begins after payment is confirmed. If you just paid, refresh to check the latest status.") }}</p>
        <ul class="order-items-list"><li v-for="item in order.items" :key="item.id" class="order-item"><span class="item-name">{{ item.name }} <small>? {{ item.quantity }} {{ t("at") }} {{ money(item.price) }}</small></span><strong>{{ money(Number(item.price) * item.quantity) }}</strong></li></ul>
        <dl class="order-breakdown"><div><dt>{{ t("Items subtotal") }}</dt><dd>{{ money(subtotal(order)) }}</dd></div><div><dt>{{ t("Delivery") }}</dt><dd>{{ money(Math.max(0, Number(order.total) - subtotal(order))) }}</dd></div></dl>
        <div class="order-delivery-section"><strong>{{ order.deliveryMethod || 'Delivery' }}</strong><p class="delivery-address">{{ order.deliveryAddress }}</p></div>
        <div class="order-actions"><button v-if="canPay(order)" class="btn btn-dark-plum" :disabled="busy[order.id]" @click="pay(order)">{{ t(busy[order.id] ? 'Please wait...' : 'Continue payment') }}</button><button v-if="isPaid(order) || isDemo(order)" class="btn btn-outline-plum" :disabled="busy[order.id]" @click="resend(order)">{{ t(busy[order.id] ? 'Sending...' : isDemo(order) ? (order.emailSent ? 'Resend demo confirmation' : 'Send demo confirmation') : (order.emailSent ? 'Resend receipt' : 'Send receipt')) }}</button><span v-if="isPaid(order) || isDemo(order)">{{ t(order.emailSent ? 'Confirmation sent to your account email' : 'Confirmation not sent yet') }}</span></div>
        <p v-if="messages[order.id]" class="order-action-message" role="status">{{ t(messages[order.id]) }}</p>
      </article>
    </section>
    <section v-else-if="!loading && !error" class="empty-orders"><i class="bi bi-bag"></i><h2>{{ t(orders.length ? 'No matching orders' : 'No orders yet') }}</h2><p>{{ t(orders.length ? 'Try another search or payment filter.' : 'Your orders will appear here after checkout.') }}</p><button v-if="!orders.length" class="btn btn-dark-plum mt-3" @click="emit('navigate', 'products')">{{ t("Browse products") }}</button></section>
  </main>
</template>
<style scoped>
.order-tools { display: flex; gap: 14px; flex-wrap: wrap; align-items: end; padding: 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 20px; }
.order-tools label { flex: 1; min-width: 150px; font-size: 13px; font-weight: 600; }
.order-tools input, .order-tools select { display: block; width: 100%; padding: 10px; margin-top: 6px; border: 1px solid var(--muted); border-radius: 8px; background: var(--surface); color: var(--ink); }
.order-metrics, .order-actions { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin: 18px 0; }
.order-metrics { justify-content: space-between; }
.order-id-info { min-width: 0; overflow-wrap: anywhere; }
.order-payment-label { font-weight: 700; margin-top: 16px; color: var(--ink); }
.order-payment-label span, .order-item small { color: var(--muted); font-weight: 400; }
.order-item small { display: block; }
.order-timeline { display: flex; list-style: none; padding: 0; gap: 8px; flex-wrap: wrap; }
.order-timeline li { flex: 1; min-width: 100px; padding: 10px; border: 1px solid var(--muted); border-radius: 8px; color: var(--muted); }
.order-timeline li.reached { background: #351536; color: white; }
.order-breakdown { display: grid; gap: 8px; margin-top: 18px; }
.order-breakdown > div { display: flex; justify-content: space-between; }
.order-breakdown dd { margin: 0; }
.order-action-message { padding: 12px; background: var(--surface); color: var(--ink); border: 1px solid var(--muted); border-radius: 8px; }
</style>
