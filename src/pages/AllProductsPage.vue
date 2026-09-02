<script setup>
import { computed, ref } from "vue";
import { t } from "../languageConfig.js";

const props = defineProps({ products: Array });
const emit = defineEmits(["add", "navigate"]);

const filters = [
  { value: "all", label: t("allAccessories") || "All Accessories" },
  { value: "personal-safety", label: "Personal safety" },
  { value: "home", label: "For your home" },
  { value: "travel", label: "Travel-ready" },
];

const selectedFilter = ref("all");
const showModal = ref(false);
const selectedProduct = ref(null);

const productReviews = {
  1: [
    {
      name: "Sarah M.",
      stars: 5,
      text: "Absolutely reliable. Gave me peace of mind immediately.",
    },
    {
      name: "James K.",
      stars: 5,
      text: "Fast delivery and excellent build quality. Highly recommended.",
    },
    {
      name: "Amara N.",
      stars: 4,
      text: "Works great, though the battery life could be longer.",
    },
  ],
  2: [
    {
      name: "Thandi L.",
      stars: 5,
      text: "Powerful and discreet. Exactly what I needed.",
    },
    {
      name: "Maria G.",
      stars: 5,
      text: "Very easy to carry and deploy. Great safety tool.",
    },
    {
      name: "Sophie T.",
      stars: 4,
      text: "Good product, took a bit to get used to it.",
    },
  ],
  3: [
    {
      name: "Zoe P.",
      stars: 5,
      text: "Incredibly loud and attention-grabbing. Perfect for emergencies.",
    },
    {
      name: "Leah B.",
      stars: 5,
      text: "Lightweight and portable. Every woman should have one.",
    },
  ],
  4: [
    { name: "Nina H.", stars: 5, text: "Medical info is always with me now." },
    {
      name: "Alex R.",
      stars: 4,
      text: "Nice design, good quality card stock.",
    },
  ],
  5: [
    {
      name: "Elena K.",
      stars: 5,
      text: "Smart installation and brilliant app integration.",
    },
    {
      name: "Lisa M.",
      stars: 5,
      text: "Feels secure knowing doors are monitored.",
    },
  ],
  6: [
    {
      name: "Jade S.",
      stars: 5,
      text: "Everything essential in one compact bag.",
    },
    {
      name: "Carmen L.",
      stars: 5,
      text: "Perfect for business trips and vacations.",
    },
  ],
  7: [
    {
      name: "Ruby T.",
      stars: 5,
      text: "Bright LED and emergency whistle—great combo.",
    },
    { name: "Iris D.", stars: 5, text: "Durable and always ready to grab." },
  ],
  8: [
    {
      name: "Nora C.",
      stars: 5,
      text: "Highly secure and difficult to tamper with.",
    },
    {
      name: "Sophia W.",
      stars: 4,
      text: "Installation took 30 minutes, very satisfied.",
    },
  ],
  9: [
    {
      name: "Vera L.",
      stars: 5,
      text: "Fast charging and reliable backup power.",
    },
    {
      name: "Diana M.",
      stars: 5,
      text: "Essential emergency backup on every trip.",
    },
  ],
};

const getReviews = (productId) => {
  return (
    productReviews[productId] || [
      {
        name: "Verified buyer",
        stars: 5,
        text: "A reliable SafeHer essential for everyday confidence.",
      },
      {
        name: "Happy customer",
        stars: 4,
        text: "Practical, easy to use, and designed with real-life safety in mind.",
      },
    ]
  );
};

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

function formatPrice(value) {
  return `R${Number(value).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
      <h1>All products</h1>
      <p>Our complete range of safety accessories</p>
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
            <h3>{{ product.name }}</h3>
            <p>{{ product.detail }}</p>
            <div class="product-buy">
              <strong>{{ formatPrice(product.price) }}</strong>
              <div class="product-buy-actions">
                <button class="btn btn-dark-plum" @click="emit('add', product)">
                  <i class="bi bi-bag-plus"></i> {{ t("add") }}
                </button>
                <button class="btn btn-light-plum" @click="openModal(product)">
                  <i class="bi bi-info-circle"></i> Details
                </button>
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
        <i class="bi bi-arrow-left"></i> Back to store
      </button>
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
              <h2>{{ selectedProduct.name }}</h2>

              <div class="product-rating-row">
                <span class="rating-stars">★★★★★</span>
                <span>4.8</span>
                <span class="rating-count"
                  >({{ getReviews(selectedProduct.id).length }} reviews)</span
                >
              </div>

              <div class="product-price-row">
                <strong>{{ formatPrice(selectedProduct.price) }}</strong>
                <span>In stock</span>
              </div>

              <p class="modal-description">
                {{ selectedProduct.detail }}
              </p>

              <button
                class="btn btn-dark-plum"
                @click="
                  emit('add', selectedProduct);
                  closeModal();
                "
              >
                <i class="bi bi-bag-plus"></i> Add to bag
              </button>
            </div>
          </div>

          <div class="modal-reviews-section">
            <h3>Customer reviews</h3>
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
  color: #f2b6c6;
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
