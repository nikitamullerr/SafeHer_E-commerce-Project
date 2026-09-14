<script setup>
import api from "../services/api.js";
import { t, formatDate } from "../languageConfig.js";
import { computed, ref, onMounted } from "vue";

const testimonials = ref([]);
const loadError = ref("");
onMounted(async () => {
  try { const { data } = await api.get("/reviews"); testimonials.value = data.reviews; }
  catch { loadError.value = "Unable to load reviews. Please refresh and try again."; }
});
const averageRating = computed(() => testimonials.value.length ? (testimonials.value.reduce((sum, review) => sum + review.stars, 0) / testimonials.value.length).toFixed(1) : "?");

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
    <section class="reviews-header">
      <div class="reviews-header-copy">
        <p class="eyebrow">{{ t("SAFEHER / REVIEWS") }}</p>
        <h1>{{ t("Customer Reviews") }}</h1>
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
        <h2>{{ t("Customer Reviews") }}</h2>
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
        <article class="write-review-card">
          <h2>{{ t("Write a Review") }}</h2>

          <form class="review-form" @submit.prevent>
            <div class="form-group">
              <label for="review-rating">{{ t("Rating") }}</label>
              <div id="review-rating" class="interactive-stars" :aria-label="t(&quot;Choose rating&quot;)">
                <span>☆</span><span>☆</span><span>☆</span><span>☆</span><span>☆</span>
              </div>
            </div>

            <div class="form-group">
              <label for="review-title">{{ t("Review title") }}</label>
              <input id="review-title" type="text" :placeholder="t(&quot;Add a short title&quot;)" />
            </div>

            <div class="form-group">
              <label for="review-text">{{ t("Your review") }}</label>
              <textarea id="review-text" rows="5" :placeholder="t(&quot;Tell us about your experience...&quot;)"></textarea>
            </div>

            <button type="submit" class="btn btn-dark-plum review-submit">{{ t("Submit review") }}</button>
          </form>
        </article>

        <div class="customer-reviews-block">
          <h2>{{ t("Recent feedback") }}</h2>
          <p v-if="!loadError && !filteredReviews.length">{{ t("No reviews yet") }}</p>

          <article v-for="item in filteredReviews" :key="item.name + item.date" class="review-card">
            <div class="review-card-header">
              <div class="avatar">{{ item.initials }}</div>
              <div class="reviewer-meta">
                <h3>{{ item.name }}</h3>

              </div>
            </div>

            <div class="review-stars">{{ "★".repeat(item.stars) }}</div>
            <h4>{{ item.title }}</h4>
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
