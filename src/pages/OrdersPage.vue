<script setup>
import { computed, onMounted, ref } from "vue";

const orders = ref([]);
const statuses = ["Confirmed", "Packed", "Out for delivery", "Delivered"];

function loadOrders() {
  try {
    orders.value = JSON.parse(localStorage.getItem("safeher-orders") || "[]");
  } catch {
    orders.value = [];
  }
}

function nextStatus(order) {
  const currentIndex = statuses.indexOf(order.status || "Confirmed");
  if (currentIndex < 0) return;
  const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);
  order.status = statuses[nextIndex];
  localStorage.setItem("safeher-orders", JSON.stringify(orders.value));
}

onMounted(() => {
  loadOrders();
});

const orderTotal = computed(() =>
  orders.value.reduce((sum, order) => sum + Number(order.total || 0), 0),
);
</script>

<template>
  <main class="container-fluid px-4 px-xl-5 orders-page">
    <section class="orders-header">
      <p class="eyebrow">SAFEHER / ORDERS</p>
      <h1>Your recent orders.</h1>
      <p>Track your delivery progress and keep a clear record of recent purchases.</p>
    </section>

    <section v-if="orders.length" class="orders-list">
      <article v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-topline">
          <strong>Order #{{ order.id }}</strong>
          <span class="order-status">{{ order.status || "Confirmed" }}</span>
        </div>
        <div class="order-meta">
          <span>{{ new Date(order.createdAt).toLocaleDateString() }}</span>
          <span>R{{ Number(order.total || 0).toLocaleString() }}</span>
        </div>
        <ul class="order-items">
          <li v-for="item in order.items || []" :key="`${order.id}-${item.id}`">
            {{ item.name }} × {{ item.quantity }}
          </li>
        </ul>
        <button class="btn btn-dark-plum" @click="nextStatus(order)">Advance status</button>
      </article>
    </section>

    <section v-else class="empty-orders">
      <i class="bi bi-bag"></i>
      <h2>No orders yet</h2>
      <p>Your confirmed purchases will show up here once you check out.</p>
    </section>

    <section class="orders-summary" v-if="orders.length">
      <div>
        <span>Total spent</span>
        <strong>R{{ orderTotal.toLocaleString() }}</strong>
      </div>
    </section>
  </main>
</template>
