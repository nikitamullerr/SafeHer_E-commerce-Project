<script setup>
import api from "../services/api.js";
import { t, formatDate } from "../languageConfig.js";
import { computed, ref, onMounted } from "vue";

const props = defineProps({ products: { type: Array, default: () => [] }, isAuthenticated: Boolean });
const emit = defineEmits(['navigate', 'review-added']);
const reviewTitle = ref(''), reviewLocation = ref('');
const productId = ref(''), stars = ref(5), reviewText = ref(''), saving = ref(false), reviewNotice = ref('');
async function saveReview() {
  if (saving.value) return;
  saving.value = true; reviewNotice.value = '';
  try {
    await api.post('/reviews', { product_id: productId.value === '' ? null : Number(productId.value), title: reviewTitle.value.trim(), location: reviewLocation.value.trim(), stars: Number(stars.value), text: reviewText.value.trim() });
    reviewText.value = ''; reviewNotice.value = 'Your review has been saved.';
    emit('review-added'); await loadReviews();
  } catch (error) { reviewNotice.value = error.response?.data?.error || 'Unable to save your review. Please try again.'; }
  finally { saving.value = false; }
}
const testimonials = ref([]);
const loadError = ref("");
const loading = ref(true);
async function loadReviews() {
  loading.value = true; loadError.value = "";
  try { const { data } = await api.get("/reviews"); testimonials.value = data.reviews; }
  catch { loadError.value = "Unable to load reviews. Please refresh and try again."; }
  finally { loading.value = false; }
}
onMounted(loadReviews);
const averageRating = computed(() => testimonials.value.length ? (testimonials.value.reduce((sum, review) => sum + Number(review.stars), 0) / testimonials.value.length).toFixed(1) : "?");

const filterOptions = [
  { value: "all", label: "All reviews" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
];

const selectedFilter = ref("all");
const selectedSort = ref("most-recent");

const reviewBreakdown = computed(() => [5, 4, 3, 2, 1].map(stars => ({
  label: `${stars} star${stars === 1 ? "" : "s"}`,
  value: testimonials.value.length ? Math.round(testimonials.value.filter(review => review.stars === stars).length / testimonials.value.length * 100) : 0,
})));

const filteredReviews = computed(() => {
  let items = [...testimonials.value];

  if (selectedFilter.value !== "all") {
    items = items.filter((item) => String(item.stars) === selectedFilter.value);
  }

  if (selectedSort.value === "most-recent") {
    return items;
  }

  return [...items].sort((a, b) => b.helpful - a.helpful);
});

const ratingText = computed(() => "★".repeat(Math.round(Number(averageRating.value) || 0)) + "☆".repeat(5 - Math.round(Number(averageRating.value) || 0)));
</script>

<template>
  <main class="container-fluid px-4 px-xl-5 reviews-page">
    <p v-if="loading" class="request-status" role="status">{{ t("Loading reviews...") }}</p>
    <section class="reviews-header">
      <div class="reviews-header-copy">
        <p class="eyebrow">{{ t("SAFEHER / REVIEWS") }}</p>
        <h1 v-full-stop>{{ t("Customer Reviews") }}</h1>
        <p>{{ t("See what our customers are saying about our products.") }}</p>
      </div>

      <div class="rating-summary-card" :aria-label="t(&quot;Overall rating summary&quot;)">
        <div class="rating-summary-stars">{{ ratingText }}</div>
        <div class="rating-summary-score">
          <strong>{{ averageRating }}</strong>
          <span>{{ t("out of 5") }}</span>
        </div>
        <small>{{ testimonials.length }} {{ t("Customer Reviews") }}</small>
      </div>
    </section>

    <p v-if="loadError" role="alert">{{ loadError }}</p>
    <section class="reviews-toolbar" :aria-label="t(&quot;Review filters and sorting&quot;)">
      <div class="filter-group">
        <button
          v-for="filter in filterOptions"
          :key="filter.value"
          type="button"
          :class="{ active: selectedFilter === filter.value }"
          @click="selectedFilter = filter.value"
        >
          {{ t(filter.label) }}
        </button>
      </div>

      <label class="sort-picker">
        <span>{{ t("Sort by") }}</span>
        <select v-model="selectedSort">
          <option value="most-recent">{{ t("Most Recent") }}</option>
          <option value="most-helpful">{{ t("Most Helpful") }}</option>
        </select>
      </label>
    </section>

    <section class="reviews-layout">
      <aside class="review-summary-panel">
        <h2 v-full-stop>{{ t("Customer Reviews") }}</h2>
        <div class="summary-score-row">
          <strong>{{ averageRating }}</strong>
          <span>/ 5</span>
        </div>
        <div class="summary-stars">{{ ratingText }}</div>
        <p>{{ testimonials.length }} {{ t("Customer Reviews") }}</p>

        <div class="rating-breakdown">
          <div v-for="row in reviewBreakdown" :key="row.label" class="breakdown-row">
            <span>{{ t(row.label) }}</span>
            <div class="bar-track">
              <span :style="{ width: `${row.value}%` }"></span>
            </div>
            <strong>{{ row.value }}%</strong>
          </div>
        </div>
      </aside>

      <div class="reviews-main-column">
    <section class="review-compose">
      <h2 v-full-stop>{{ t('Write a review') }}</h2>
      <form v-if="isAuthenticated" @submit.prevent="saveReview" :aria-busy="saving">
        <fieldset :disabled="saving"><label>{{ t('Review type') }}<select v-model="productId"><option value="">{{ t('SafeHer website') }}</option><option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option></select></label>
        <template v-if="productId === ''"><label>{{ t('Review title') }}<input v-model="reviewTitle" required maxlength="200" /></label><label>{{ t('Location (optional)') }}<input v-model="reviewLocation" maxlength="100" /></label></template>
        <fieldset class="review-star-picker"><legend>{{ t('Rating') }}</legend><div class="review-star-options">
          <label v-for="rating in 5" :key="rating" class="review-star-choice" :class="{ filled: rating <= stars }">
            <input v-model.number="stars" type="radio" name="review-stars" :value="rating" :aria-label="`${rating} / 5`" required />
            <i :class="rating <= stars ? 'bi bi-star-fill' : 'bi bi-star'" aria-hidden="true" />
          </label>
          <span class="review-star-value" aria-live="polite">{{ stars }} / 5</span>
        </div></fieldset>
        <label>{{ t('Your review') }}<textarea v-model="reviewText" required minlength="5" maxlength="2000" rows="3" /></label>
        <button class="btn btn-dark-plum" type="submit">{{ t(saving ? 'Saving review...' : 'Submit review') }}</button></fieldset>
      </form>
      <button v-else class="btn btn-outline-plum" @click="emit('navigate', 'login')">{{ t('Sign in to write a review') }}</button>
      <p v-if="reviewNotice" role="status">{{ t(reviewNotice) }}</p>
    </section>
        <div class="customer-reviews-block">
          <h2 v-full-stop>{{ t("Recent feedback") }}</h2>
          <p v-if="!loading && !loadError && !filteredReviews.length">{{ t(testimonials.length ? "No matching reviews" : "No reviews have been published yet.") }}</p>

          <article v-for="item in filteredReviews" :key="item.name + item.date" class="review-card">
            <div class="review-card-header">
              <div class="avatar">{{ item.initials }}</div>
              <div class="reviewer-meta">
                <h3 v-full-stop>{{ item.name }}</h3>

              </div>
            </div>

            <div class="review-stars">{{ "★".repeat(item.stars) }}</div>
            <h4 v-full-stop>{{ item.title }}</h4>
            <p>“{{ item.quote }}”</p>

            <div class="review-footer">
              <span>{{ t("Purchased:") }} {{ formatDate(item.date, { dateStyle: "long" }) }}</span>
              <button type="button" class="helpful-button"> {{ t("Helpful? Yes (") }}{{ item.helpful }})
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.review-compose { padding: 24px; margin: 24px 0; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--ink); }
.review-compose fieldset { display: grid; gap: 16px; }.review-compose label { display: grid; gap: 8px; }.review-compose :is(select,textarea,input) { width: 100%; padding: 12px; border: 1px solid var(--control-border); border-radius: 8px; background: var(--control-bg); color: var(--control-text); }.review-compose button { justify-self: start; }
</style>

<style scoped>
.review-compose .review-star-picker { display: block; border: 0; padding: 0; margin: 0; }
.review-star-picker legend { float: none; font-size: 14px; margin-bottom: 8px; }
.review-star-options { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.review-compose .review-star-choice { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--control-border); border-radius: 8px; color: var(--control-text); background: var(--control-bg); cursor: pointer; }
.review-star-choice.filled { color: var(--control-active-text); background: var(--control-active); }
.review-star-choice input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.review-star-choice:focus-within { outline: 3px solid var(--control-active); outline-offset: 3px; }
.review-star-choice i { pointer-events: none; font-size: 21px; }
.review-star-value { font-size: 13px; margin-left: 8px; color: var(--ink); }
</style>
