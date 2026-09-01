<script setup>
import { computed, ref } from "vue";

const testimonials = [
  {
    name: "Lerato M.",
    location: "Johannesburg",
    title: "A reassuring everyday essential",
    quote:
      "The SOS tools are simple and calm when you need them most. I feel safer every time I leave the house.",
    stars: 5,
    date: "28 August 2026",
    helpful: 12,
    initials: "LM",
  },
  {
    name: "Daniel K.",
    location: "Pretoria",
    title: "Easy to share and trust",
    quote:
      "I love how easy it is to share my location with my family. It gives me peace of mind without being complicated.",
    stars: 5,
    date: "11 August 2026",
    helpful: 8,
    initials: "DK",
  },
  {
    name: "Nandi S.",
    location: "Cape Town",
    title: "Practical support for my family",
    quote:
      "The safety videos and checked-in routines helped my whole family feel more prepared. It feels practical and supportive.",
    stars: 4,
    date: "03 August 2026",
    helpful: 5,
    initials: "NS",
  },
  {
    name: "Thandi M.",
    location: "Soweto",
    title: "Good features but could be simpler",
    quote:
      "The app has really useful safety features and the emergency response is quick. However, the menu navigation could be more intuitive for first-time users.",
    stars: 3,
    date: "25 July 2026",
    helpful: 4,
    initials: "TM",
  },
  {
    name: "Aisha P.",
    location: "Durban",
    title: "Clean, calming and effective",
    quote:
      "Everything is straightforward, reassuring, and fast. It feels like a digital safety net that actually works for daily life.",
    stars: 5,
    date: "19 July 2026",
    helpful: 15,
    initials: "AP",
  },
  {
    name: "James L.",
    location: "Bloemfontein",
    title: "Reliable safety companion",
    quote:
      "Been using SafeHer for 6 months now and I trust it completely. The location sharing with my trusted circle works seamlessly and the support team is responsive.",
    stars: 4,
    date: "16 July 2026",
    helpful: 9,
    initials: "JL",
  },
  {
    name: "Nomvula R.",
    location: "Pietermaritzburg",
    title: "Helpful but interface needs work",
    quote:
      "The safety hub content is informative and the SOS feature works well. The app could use better visual organization - some buttons are hard to find when you need them quickly.",
    stars: 3,
    date: "08 July 2026",
    helpful: 6,
    initials: "NR",
  },
];

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

const reviewBreakdown = [
  { label: "5 stars", value: 85 },
  { label: "4 stars", value: 10 },
  { label: "3 stars", value: 3 },
  { label: "2 stars", value: 1 },
  { label: "1 star", value: 1 },
];

const filteredReviews = computed(() => {
  let items = [...testimonials];

  if (selectedFilter.value !== "all") {
    items = items.filter((item) => String(item.stars) === selectedFilter.value);
  }

  if (selectedSort.value === "most-recent") {
    return items;
  }

  return [...items].sort((a, b) => b.helpful - a.helpful);
});

const ratingText = computed(() => Array.from({ length: 5 }, (_, index) => index < 5).join(""));
</script>

<template>
  <main class="container-fluid px-4 px-xl-5 reviews-page">
    <section class="reviews-header">
      <div class="reviews-header-copy">
        <p class="eyebrow">SAFEHER / REVIEWS</p>
        <h1>Customer Reviews</h1>
        <p>See what our customers are saying about our products.</p>
      </div>

      <div class="rating-summary-card" aria-label="Overall rating summary">
        <div class="rating-summary-stars">★★★★★</div>
        <div class="rating-summary-score">
          <strong>4.8</strong>
          <span>out of 5</span>
        </div>
        <small>Based on 126 reviews</small>
      </div>
    </section>

    <section class="reviews-toolbar" aria-label="Review filters and sorting">
      <div class="filter-group">
        <button
          v-for="filter in filterOptions"
          :key="filter.value"
          type="button"
          :class="{ active: selectedFilter === filter.value }"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <label class="sort-picker">
        <span>Sort by</span>
        <select v-model="selectedSort">
          <option value="most-recent">Most Recent</option>
          <option value="most-helpful">Most Helpful</option>
        </select>
      </label>
    </section>

    <section class="reviews-layout">
      <aside class="review-summary-panel">
        <h2>Customer Reviews</h2>
        <div class="summary-score-row">
          <strong>4.8</strong>
          <span>/ 5</span>
        </div>
        <div class="summary-stars">★★★★★</div>
        <p>126 reviews</p>

        <div class="rating-breakdown">
          <div v-for="row in reviewBreakdown" :key="row.label" class="breakdown-row">
            <span>{{ row.label }}</span>
            <div class="bar-track">
              <span :style="{ width: `${row.value}%` }"></span>
            </div>
            <strong>{{ row.value }}%</strong>
          </div>
        </div>
      </aside>

      <div class="reviews-main-column">
        <article class="write-review-card">
          <h2>Write a Review</h2>

          <form class="review-form" @submit.prevent>
            <div class="form-group">
              <label for="review-rating">Rating</label>
              <div id="review-rating" class="interactive-stars" aria-label="Choose rating">
                <span>☆</span><span>☆</span><span>☆</span><span>☆</span><span>☆</span>
              </div>
            </div>

            <div class="form-group">
              <label for="review-title">Review title</label>
              <input id="review-title" type="text" placeholder="Add a short title" />
            </div>

            <div class="form-group">
              <label for="review-text">Your review</label>
              <textarea id="review-text" rows="5" placeholder="Tell us about your experience..."></textarea>
            </div>

            <button type="submit" class="btn btn-dark-plum review-submit">Submit review</button>
          </form>
        </article>

        <div class="customer-reviews-block">
          <h2>Recent feedback</h2>

          <article v-for="item in filteredReviews" :key="item.name + item.date" class="review-card">
            <div class="review-card-header">
              <div class="avatar">{{ item.initials }}</div>
              <div class="reviewer-meta">
                <h3>{{ item.name }}</h3>
                <span>Verified Purchase</span>
              </div>
            </div>

            <div class="review-stars">{{ "★".repeat(item.stars) }}</div>
            <h4>{{ item.title }}</h4>
            <p>“{{ item.quote }}”</p>

            <div class="review-footer">
              <span>Purchased: {{ item.date }}</span>
              <button type="button" class="helpful-button">
                Helpful? Yes ({{ item.helpful }})
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>
