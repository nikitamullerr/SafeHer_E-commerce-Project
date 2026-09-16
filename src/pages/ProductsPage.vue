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
  return "\u2605".repeat(rating || 0) + "\u2606".repeat(5 - (rating || 0));
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
  const filtered = filteredProducts.value;
  return filtered.filter(product => product.id !== featuredProduct.value?.id).slice(0, 6);
});

const featuredProduct = computed(() => {
  const list = filteredProducts.value;
  return list.find(product => product.is_featured) || list[0] || null;
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
  <main class="inner-page container-fluid px-4 px-xl-5 products-page">
    <div class="inner-heading">
      <p class="eyebrow">SAFEHER / {{ t("store") }}</p>
      <h1 v-full-stop>{{ t("storeTitle") }}</h1>
      <p>{{ t("storeLead") }}</p>
    </div>

    <section v-if="featuredProduct" class="featured-product-card">
      <div class="featured-product-visual" :class="featuredProduct.tone">
        <div class="featured-product-badge">{{ t("Best seller") }}</div>
        <img
          v-if="featuredProduct.image"
          class="product-image"
          :src="featuredProduct.image"
          :alt="featuredProduct.name"
        />
        <i v-else :class="`bi ${featuredProduct.icon}`"></i>
        <span>SAFEHER</span>
      </div>

      <div class="featured-product-copy">
        <p class="eyebrow">{{ t("Bestselling safety pick") }}</p>
        <h2 v-full-stop>{{ featuredProduct.name }}</h2>

        <div class="product-rating-row">
          <span class="rating-stars">★★★★★</span>
          <span>{{ averageRating(featuredProduct) }}</span>
          <span class="rating-count">{{ getReviews(featuredProduct.id).length }} {{ t("Customer Reviews") }}</span>
        </div>

        <div class="product-price-row">
          <strong>{{ formatPrice(featuredProduct.price) }}</strong>
          <span>{{ t(featuredProduct.stock > 0 ? "In stock" : "Out of stock") }}</span>
        </div>

        <p class="product-summary">
          {{ t(featuredProduct.detail) }} {{ t("— designed for everyday confidence, quick access, and calm in the moments that matter most.") }} </p>

        <div class="feature-actions">
          <button
            class="btn btn-dark-plum"
            :disabled="featuredProduct.stock <= 0" @click="emit('add', featuredProduct)"
          >
            <i class="bi bi-bag-plus"></i> {{ t("add") }}
          </button>
          <button
            class="btn btn-light-plum"
            @click="openModal(featuredProduct)"
          > {{ t("View details") }} </button>
        </div>
      </div>
    </section>

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

      <!-- More button -->
      <div v-if="filteredProducts.length > 7" class="products-more-section">
        <button
          class="btn btn-outline-plum"
          @click="emit('navigate', 'store-all')"
        >
          <i class="bi bi-arrow-right"></i> {{ t("View all products (") }}{{
            filteredProducts.length - 7
          }} {{ t("more)") }} </button>
      </div>
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
