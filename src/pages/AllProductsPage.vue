<script setup>
import { computed, ref } from "vue";
import { t, formatMoney } from "../languageConfig.js";

const props = defineProps({ products: Array });
const emit = defineEmits(["add", "navigate"]);

const filters = [
  { value: "all", label: "allAccessories" },
  { value: "personal-safety", label: "Personal safety" },
  { value: "home-security", label: "For your home" },
  { value: "travel-safety", label: "Travel-ready" },
];

const selectedFilter = ref("all");
const showModal = ref(false);
const selectedProduct = ref(null);

const averageRating = product => {
  const reviews = product?.reviews || [];
  return reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.stars), 0) / reviews.length).toFixed(1) : "?";
};
const ratingStars = product => {
  const rating = Math.round(Number(averageRating(product)) || 0);
  return "?".repeat(rating) + "?".repeat(5 - rating);
};
const getReviews = (productId) => props.products?.find(product => product.id === productId)?.reviews || [];

const filteredProducts = computed(() => {
  if (!props.products) return [];
  if (selectedFilter.value === "all") return props.products;
  return props.products.filter(
    (product) => product.category === selectedFilter.value,
  );
});

const displayedProducts = computed(() => {
  return filteredProducts.value;
});

const formatPrice = formatMoney;

function openModal(product) {
  selectedProduct.value = product;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  setTimeout(() => {
    selectedProduct.value = null;
  }, 300);
}
</script>

<template>
  <main class="inner-page container-fluid px-4 px-xl-5 all-products-page">
    <div class="inner-heading">
      <p class="eyebrow">SAFEHER / {{ t("store") }}</p>
      <h1 v-full-stop>{{ t("All products") }}</h1>
      <p>{{ t("Our complete range of safety accessories") }}</p>
    </div>

    <div class="store-layout">
      <div class="product-filter">
        <span>{{ t("FILTER PRODUCTS") }}</span>
        <button
          v-for="filter in filters"
          :key="filter.value"
          :class="{ selected: selectedFilter === filter.value }"
          @click="selectedFilter = filter.value"
        >
          {{ t(filter.label) }}
        </button>
      </div>

      <div class="product-list">
        <article
          v-for="product in displayedProducts"
          :key="product.id"
          class="product-card"
        >
          <div class="product-art" :class="product.tone">
            <img
              v-if="product.image"
              class="product-image"
              :src="product.image"
              :alt="product.name"
            />
            <i v-else :class="`bi ${product.icon}`"></i>
            <span>SAFEHER</span>
          </div>
          <div class="product-info">
            <p class="eyebrow">{{ t("safetyAccessory") }}</p>
            <h3 v-full-stop>{{ product.name }}</h3>
            <p>{{ t(product.detail) }}</p>
            <div class="product-buy">
              <strong>{{ formatPrice(product.price) }}</strong>
              <div class="product-buy-actions">
                <button class="btn btn-dark-plum" :disabled="product.stock <= 0" @click="emit('add', product)">
                  <i class="bi bi-bag-plus"></i> {{ t("add") }}
                </button>
                <button class="btn btn-light-plum" @click="openModal(product)">
                  <i class="bi bi-info-circle"></i> {{ t("Details") }} </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Back button -->
    <div class="back-to-store">
      <button
        class="btn btn-outline-plum"
        @click="emit('navigate', 'products')"
      >
        <i class="bi bi-arrow-left"></i> {{ t("Back to store") }} </button>
    </div>

    <!-- Product Detail Modal -->
    <div v-if="showModal" class="product-modal-backdrop" @click="closeModal">
      <div class="product-modal" @click.stop>
        <button class="modal-close" @click="closeModal">
          <i class="bi bi-x-lg"></i>
        </button>

        <div v-if="selectedProduct" class="modal-content">
          <div class="modal-product-section">
            <div class="modal-product-art" :class="selectedProduct.tone">
              <img
                v-if="selectedProduct.image"
                class="product-image"
                :src="selectedProduct.image"
                :alt="selectedProduct.name"
              />
              <i v-else :class="`bi ${selectedProduct.icon}`"></i>
              <span>SAFEHER</span>
            </div>

            <div class="modal-product-info">
              <p class="eyebrow">{{ t("safetyAccessory") }}</p>
              <h2 v-full-stop>{{ selectedProduct.name }}</h2>

              <div class="product-rating-row">
                <span class="rating-stars">★★★★★</span>
                <span>{{ averageRating(selectedProduct) }}</span>
                <span class="rating-count"
                  >({{ getReviews(selectedProduct.id).length }} {{ t("reviews)") }}</span
                >
              </div>

              <div class="product-price-row">
                <strong>{{ formatPrice(selectedProduct.price) }}</strong>
                <span>{{ t(selectedProduct.stock > 0 ? "In stock" : "Out of stock") }}</span>
              </div>

              <p class="modal-description">
                {{ t(selectedProduct.detail) }}
              </p>

              <button
                class="btn btn-dark-plum"
                @click="
                  emit('add', selectedProduct);
                  closeModal();
                "
              >
                <i class="bi bi-bag-plus"></i> {{ t("Add to bag") }} </button>
            </div>
          </div>

          <div class="modal-reviews-section">
            <h3 v-full-stop>{{ t("Customer reviews") }}</h3>
            <div class="reviews-list">
              <article
                v-for="(review, idx) in getReviews(selectedProduct.id)"
                :key="idx"
                class="review-card"
              >
                <div class="review-header">
                  <strong>{{ review.name }}</strong>
                  <span class="review-stars">{{
                    "★".repeat(review.stars)
                  }}</span>
                </div>
                <p class="review-text">{{ review.text }}</p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.all-products-page {
  background: var(--blush);
  min-height: 100vh;
  padding-top: 75px;
  padding-bottom: 100px;
}

.inner-heading h1 {
  color: var(--plum);
  font-family: "Syne", sans-serif;
  font-weight: 700;
  font-size: clamp(28px, 4vw, 48px);
}

.back-to-store {
  display: flex;
  justify-content: center;
  padding: 28px 0;
}

.back-to-store .btn {
  min-width: 260px;
}

@media (max-width: 768px) {
  .all-products-page {
    padding-top: 60px;
    padding-bottom: 60px;
  }

  .back-to-store {
    padding: 20px 0;
  }

  .back-to-store .btn {
    min-width: 200px;
  }
}
</style>
