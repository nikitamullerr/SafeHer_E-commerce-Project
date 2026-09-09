<script setup>
import { t } from "../languageConfig.js";
import { computed, onMounted, ref } from "vue";
import api from "../services/api.js";

const orders = ref([]);
const statuses = ["Confirmed", "Packed", "Out for delivery", "Delivered"];

async function loadOrders() {
  try {
    const { data } = await api.get("/orders");
    orders.value = data.orders || [];
  } catch (error) {
    orders.value = [];
    console.error("Could not load orders from API:", error);
  }
}

async function nextStatus(order) {
  const currentIndex = statuses.indexOf(order.status || "Confirmed");
  if (currentIndex < 0) return;
  const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);
  try {
    const { data } = await api.patch(`/orders/${order.id}/status`, {
      status: statuses[nextIndex],
    });
    if (data.success && data.order) {
      const index = orders.value.findIndex((item) => item.id === order.id);
      if (index >= 0) orders.value[index] = data.order;
    }
  } catch (error) {
    console.error("Could not update order status:", error);
  }
}

function getStatusProgress(order) {
  const index = statuses.indexOf(order.status || "Confirmed");
  return ((index + 1) / statuses.length) * 100;
}

function getStatusIcon(status) {
  const icons = {
    "Confirmed": "bi-check-circle",
    "Packed": "bi-box",
    "Out for delivery": "bi-truck",
    "Delivered": "bi-check-lg"
  };
  return icons[status] || "bi-check-circle";
}

onMounted(() => {
  loadOrders();
});

const orderTotal = computed(() =>
  orders.value.reduce((sum, order) => sum + Number(order.total || 0), 0),
);
</script>

<template>
  <main class="inner-page container-fluid px-4 px-xl-5 orders-page">
    <div class="orders-header">
      <p class="eyebrow">SAFEHER / {{ t('orders') }}</p>
      <h1>{{ t('recentOrders') }}</h1>
      <p>{{ t('trackDelivery') }}</p>
    </div>

    <section v-if="orders.length" class="orders-list">
      <article v-for="order in orders" :key="order.id" class="order-card">
        <!-- Order header -->
        <div class="order-header-row">
          <div class="order-id-info">
            <strong>{{ t('orderLabel') }} #{{ String(order.id).slice(-6) }}</strong>
            <small>{{ new Date(order.createdAt).toLocaleDateString() }}</small>
          </div>
          <div class="order-total-info">
            <span class="order-total-label">Total</span>
            <strong class="order-total-amount">R{{ Number(order.total || 0).toLocaleString() }}</strong>
          </div>
        </div>

        <!-- Status progress bar -->
        <div class="order-status-section">
          <div class="status-bar">
            <div class="status-progress" :style="{ width: getStatusProgress(order) + '%' }"></div>
            <div class="status-labels">
              <span v-for="(status, idx) in statuses" :key="idx" class="status-label" :class="{ active: statuses.indexOf(order.status || 'Confirmed') >= idx }">
                <i :class="`bi ${getStatusIcon(status)}`"></i>
                <span class="status-text">{{ status }}</span>
              </span>
            </div>
          </div>
          <div class="current-status">
            <i :class="`bi ${getStatusIcon(order.status || 'Confirmed')}`"></i>
            <span>{{ order.status || "Confirmed" }}</span>
          </div>
        </div>

        <!-- Items list -->
        <div class="order-items-section">
          <div class="items-header">
            <span class="items-label">Items ordered</span>
            <span class="items-count">{{ order.items?.length || 0 }} item{{ (order.items?.length || 0) !== 1 ? 's' : '' }}</span>
          </div>
          <ul class="order-items-list">
            <li v-for="item in order.items || []" :key="`${order.id}-${item.id}`" class="order-item">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-qty">×{{ item.quantity }}</span>
            </li>
          </ul>
        </div>

        <!-- Delivery info -->
        <div class="order-delivery-section">
          <div class="delivery-label">Delivery address</div>
          <p class="delivery-address">{{ order.deliveryAddress }}</p>
          <div class="delivery-method">
            <i class="bi bi-truck"></i>
            <span>{{ order.deliveryMethod }}</span>
          </div>
        </div>

        <!-- Action -->
        <button v-if="statuses.indexOf(order.status || 'Confirmed') < statuses.length - 1" class="btn btn-outline-plum advance-btn" @click="nextStatus(order)">
          Next status
        </button>
        <div v-else class="delivered-badge">
          <i class="bi bi-check-circle-fill"></i> Delivered
        </div>
      </article>
    </section>

    <section v-else class="empty-orders">
      <i class="bi bi-bag"></i>
      <h2>{{ t("noOrders") }}</h2>
      <p>{{ t("ordersHere") }}</p>
    </section>

    <section v-if="orders.length" class="orders-summary">
      <div class="summary-card">
        <span>{{ t('totalSpent') }}</span>
        <strong>R{{ orderTotal.toLocaleString() }}</strong>
      </div>
    </section>
  </main>
</template>
