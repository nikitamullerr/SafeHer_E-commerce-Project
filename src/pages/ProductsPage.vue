<script setup>
import { computed, ref } from "vue";
import { t } from "../languageConfig.js";

const props = defineProps({ products: Array });
const emit = defineEmits(["add"]);

const filters = [
  { value: "all", label: t("allAccessories") || "All accessories" },
  { value: "personal-safety", label: "Personal safety" },
  { value: "home", label: "For your home" },
  { value: "travel", label: "Travel-ready" },
];

const selectedFilter = ref("all");

const filteredProducts = computed(() => {
  if (!props.products) return [];
  if (selectedFilter.value === "all") return props.products;
  return props.products.filter((product) => product.category === selectedFilter.value);
});
</script>
<template>
  <main class="inner-page container-fluid px-4 px-xl-5">
    <div class="inner-heading">
      <p class="eyebrow">SAFEHER / {{ t("store") }}</p>
      <h1>{{ t("storeTitle") }}</h1>
      <p>{{ t("storeLead") }}</p>
    </div>
    <div class="store-layout">
      <div class="product-filter">
        <span>FILTER PRODUCTS</span>
        <button
          v-for="filter in filters"
          :key="filter.value"
          :class="{ selected: selectedFilter === filter.value }"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
      <div class="product-list">
        <article
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card"
        >
          <div class="product-art" :class="product.tone">
            <i :class="`bi ${product.icon}`"></i><span>SAFEHER</span>
          </div>
          <div class="product-info">
            <p class="eyebrow">{{ t("safetyAccessory") }}</p>
            <h3>{{ product.name }}</h3>
            <p>{{ product.detail }}</p>
            <div class="product-buy">
              <strong>R{{ product.price }}</strong
              ><button class="btn btn-dark-plum" @click="emit('add', product)">
                <i class="bi bi-bag-plus"></i> {{ t("add") }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
