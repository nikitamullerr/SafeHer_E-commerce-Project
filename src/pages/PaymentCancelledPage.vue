<script setup>
const emit = defineEmits(["navigate"]);
</script>

<template>
  <main class="inner-page container py-5 text-center">
    <i class="bi bi-x-circle display-3 text-danger"></i>
    <h1 class="mt-3">Payment not completed</h1>
    <p>Your SafeHer order has not been paid for. Your bag is still available if you would like to try again.</p>
    <button class="btn btn-sos mt-3" @click="emit('navigate', 'store-all')">Return to shop</button>
  </main>
</template>