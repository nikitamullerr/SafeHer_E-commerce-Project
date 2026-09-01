<script setup>
const testimonials = [
  {
    name: "Lerato M.",
    location: "Johannesburg",
    quote:
      "The SOS tools are simple and calm when you need them most. I feel safer every time I leave the house.",
    stars: "★★★★★",
  },
  {
    name: "Daniel K.",
    location: "Pretoria",
    quote:
      "I love how easy it is to share my location with my family. It gives me peace of mind without being complicated.",
    stars: "★★★★★",
  },
  {
    name: "Nandi S.",
    location: "Cape Town",
    quote:
      "The safety videos and checked-in routines helped my whole family feel more prepared. It feels practical and supportive.",
    stars: "★★★★★",
  },
  {
    name: "Aisha P.",
    location: "Durban",
    quote:
      "Everything is straightforward, reassuring, and fast. It feels like a digital safety net that actually works for daily life.",
    stars: "★★★★★",
  },
];
</script>

<template>
  <main class="container-fluid px-4 px-xl-5 reviews-page">
    <div class="guide-heading">
      <p class="eyebrow">SAFEHER / REVIEWS</p>
      <h1>People trust SafeHer when it matters most.</h1>
      <p>
        Real stories from users who wanted a calmer, safer way to feel prepared,
        connected and supported.
      </p>
    </div>

    <section class="reviews-grid">
      <article
        v-for="item in testimonials"
        :key="item.name"
        class="review-card"
      >
        <div class="stars">{{ item.stars }}</div>
        <p>“{{ item.quote }}”</p>
        <div class="review-user">
          <strong>{{ item.name }}</strong>
          <span>{{ item.location }}</span>
        </div>
      </article>
    </section>
  </main>
</template>
