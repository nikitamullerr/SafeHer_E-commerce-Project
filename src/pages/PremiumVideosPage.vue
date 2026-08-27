<script setup>
import Swal from "sweetalert2";
const emit = defineEmits(["navigate"]);

const videos = [
  {
    title: "Build your personal safety plan",
    detail: "A practical walkthrough for preparing before you leave home.",
    duration: "08:24",
    icon: "bi-journal-check",
  },
  {
    title: "Move with confidence",
    detail: "Simple awareness habits for everyday travel and new places.",
    duration: "06:10",
    icon: "bi-person-walking",
  },
  {
    title: "Use your SafeHer tools",
    detail: "Learn how to practise with your panic button, spray and whistle.",
    duration: "10:42",
    icon: "bi-shield-check",
  },
  {
    title: "Create a stronger safety circle",
    detail: "Make check-ins and emergency contacts part of your routine.",
    duration: "07:18",
    icon: "bi-people-fill",
  },
];

function showPremiumMessage() {
  Swal.fire({
    icon: "info",
    title: "Premium access required",
    text: "These safety videos are included in the SafeHer Premium package.",
    confirmButtonColor: "#351536",
  });
}
</script>
<template>
  <main class="premium-page container-fluid px-4 px-xl-5">
    <section class="premium-heading">
      <div>
        <p class="eyebrow">SAFEHER / PREMIUM LIBRARY</p>
        <h1>Learn skills that help you feel <em>ready.</em></h1>
        <p>
          Expert-led safety lessons for your everyday routines, available with
          SafeHer Premium.
        </p>
      </div>
      <div class="premium-badge">
        <i class="bi bi-lock-fill"></i>
        <span><strong>PREMIUM</strong><small>Member access</small></span>
      </div>
    </section>
    <section class="premium-banner">
      <div>
        <i class="bi bi-play-btn-fill"></i>
        <div>
          <p class="eyebrow">YOUR NEXT STEP</p>
          <h2>Unlock the full safety video library.</h2>
          <p>Premium gives you guided lessons you can revisit whenever you need them.</p>
        </div>
      </div>
      <button class="btn btn-sos" @click="emit('navigate', 'packages')">
        <i class="bi bi-stars"></i> Explore Premium
      </button>
    </section>
    <section class="video-grid">
      <article v-for="video in videos" :key="video.title" class="video-card">
        <div class="video-art">
          <i :class="`bi ${video.icon}`"></i>
          <span class="video-duration">{{ video.duration }}</span>
          <span class="video-lock"><i class="bi bi-lock-fill"></i></span>
        </div>
        <div class="video-card-copy">
          <p class="eyebrow">PREMIUM LESSON</p>
          <h2>{{ video.title }}</h2>
          <p>{{ video.detail }}</p>
          <button class="video-action" @click="showPremiumMessage">
            <i class="bi bi-lock-fill"></i> Unlock video
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
