<script setup>
import { t } from "../languageConfig.js";
const emit = defineEmits(["navigate"]);
</script>

<template>
  <main class="inner-page container py-5 text-center">
    <i class="bi bi-x-circle display-3 text-danger"></i>
    <h1 class="mt-3">{{ t("Payment not completed") }}</h1>
    <p>{{ t("Checkout was interrupted. Check your order's payment status before trying again; you can continue payment on the same order.") }}</p>
    <button class="btn btn-sos mt-3" @click="emit('navigate', 'orders')">{{ t("View orders") }}</button>
  </main>
</template>