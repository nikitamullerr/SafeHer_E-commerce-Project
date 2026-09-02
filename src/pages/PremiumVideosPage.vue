<script setup>
import { computed, ref } from "vue";
import Swal from "sweetalert2";
const emit = defineEmits(["navigate"]);
const props = defineProps({ premiumMembership: Object });
const completedVideos = ref(readCompletedVideos());
const activeVideo = ref(null);

const hasPremiumAccess = computed(() =>
  Boolean(
    props.premiumMembership?.expiresAt &&
    new Date(props.premiumMembership.expiresAt) > new Date(),
  ),
);

function completedKey() {
  return `safeher-premium-video-progress:${props.premiumMembership?.email || "guest"}`;
}

function readCompletedVideos() {
  try {
    return JSON.parse(localStorage.getItem(completedKey()) || "[]");
  } catch {
    return [];
  }
}

const videos = [
  {
    title: "Self-Defense Myths You Need to Know",
    detail:
      "A must-watch for every woman — separate fact from fiction and learn what really keeps you safe.",
    duration: "05:59",
    icon: "bi-journal-check",
    youtubeId: "q7YpyV3UBss",
  },
  {
    title: "Personal Safety Tips for Women",
    detail:
      "Practical, everyday safety habits to help you move through the world with confidence.",
    duration: "07:16",
    icon: "bi-person-walking",
    youtubeId: "N4hWOp9Hvg4",
  },
  {
    title: "Safety Tips for Women Part 1",
    detail:
      "Foundational safety guidance and awareness techniques every woman should know.",
    duration: "08:59",
    icon: "bi-shield-check",
    youtubeId: "9_7voAJOLQs",
  },
  {
    title: "5 Self-Defense Moves Every Woman Should Know",
    detail:
      "HER Network walks you through five essential self-defense moves to help you break free and get to safety.",
    duration: "10:37",
    icon: "bi-people-fill",
    youtubeId: "KVpxP3ZZtAc",
  },
];

function openVideo(video) {
  if (hasPremiumAccess.value) {
    if (!completedVideos.value.includes(video.title)) {
      completedVideos.value = [...completedVideos.value, video.title];
      localStorage.setItem(
        completedKey(),
        JSON.stringify(completedVideos.value),
      );
    }
    activeVideo.value = video;
    return;
  }
  Swal.fire({
    icon: "info",
    title: "Premium access required",
    text: "These safety videos are included in the SafeHer Premium package.",
    confirmButtonColor: "#351536",
  });
}

function closePlayer() {
  activeVideo.value = null;
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
        <i
          :class="
            hasPremiumAccess ? 'bi bi-patch-check-fill' : 'bi bi-lock-fill'
          "
        ></i>
        <span
          ><strong>{{ hasPremiumAccess ? "ACTIVE" : "PREMIUM" }}</strong
          ><small>{{
            hasPremiumAccess ? "Member access enabled" : "Member access"
          }}</small></span
        >
      </div>
    </section>
    <section class="premium-banner">
      <div>
        <i class="bi bi-play-btn-fill"></i>
        <div>
          <p class="eyebrow">YOUR NEXT STEP</p>
          <h2>
            {{
              hasPremiumAccess
                ? "Your full safety video library is ready."
                : "Unlock the full safety video library."
            }}
          </h2>
          <p>
            {{
              hasPremiumAccess
                ? "Choose a lesson below and track your progress as you go."
                : "Premium gives you guided lessons you can revisit whenever you need them."
            }}
          </p>
        </div>
      </div>
      <button
        v-if="!hasPremiumAccess"
        class="btn btn-sos"
        @click="emit('navigate', 'packages')"
      >
        <i class="bi bi-stars"></i> Explore Premium
      </button>
      <span v-else class="btn btn-outline-plum disabled" aria-disabled="true">
        <i class="bi bi-check2-circle"></i> {{ completedVideos.length }}/{{
          videos.length
        }}
        completed
      </span>
    </section>
    <section class="video-grid">
      <article v-for="video in videos" :key="video.title" class="video-card">
        <div
          class="video-art"
          :class="{ 'video-art-clickable': hasPremiumAccess }"
          @click="openVideo(video)"
        >
          <i :class="`bi ${video.icon}`"></i>
          <span class="video-duration">{{ video.duration }}</span>
          <span class="video-lock"
            ><i
              :class="hasPremiumAccess ? 'bi bi-play-fill' : 'bi bi-lock-fill'"
            ></i
          ></span>
        </div>
        <div class="video-card-copy">
          <p class="eyebrow">PREMIUM LESSON</p>
          <h2>{{ video.title }}</h2>
          <p>{{ video.detail }}</p>
          <button class="video-action" @click="openVideo(video)">
            <i
              :class="
                hasPremiumAccess ? 'bi bi-play-circle-fill' : 'bi bi-lock-fill'
              "
            ></i>
            {{
              hasPremiumAccess
                ? completedVideos.includes(video.title)
                  ? "Watch again"
                  : "Play lesson"
                : "Unlock video"
            }}
          </button>
        </div>
      </article>
    </section>

    <!-- YouTube video player modal -->
    <Transition name="player-fade">
      <div
        v-if="activeVideo"
        class="video-player-overlay"
        @click.self="closePlayer"
      >
        <div
          class="video-player-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="activeVideo.title"
        >
          <button
            class="video-player-close"
            aria-label="Close video"
            @click="closePlayer"
          >
            <i class="bi bi-x-lg"></i>
          </button>
          <div class="video-player-frame">
            <iframe
              :src="`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`"
              :title="activeVideo.title"
              frameborder="0"
              allow="
                accelerometer;
                autoplay;
                clipboard-write;
                encrypted-media;
                gyroscope;
                picture-in-picture;
                web-share;
              "
              allowfullscreen
            ></iframe>
          </div>
          <div class="video-player-meta">
            <p class="eyebrow">NOW PLAYING</p>
            <h3>{{ activeVideo.title }}</h3>
            <p>{{ activeVideo.detail }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.video-art-clickable {
  cursor: pointer;
}
.video-player-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 8, 21, 0.82);
  backdrop-filter: blur(6px);
}
.video-player-modal {
  width: min(880px, 100%);
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.6);
  position: relative;
}
.video-player-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(53, 21, 54, 0.85);
  color: #fff;
  font-size: 15px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.2s ease;
}
.video-player-close:hover {
  transform: rotate(90deg);
  background: #d92d36;
}
.video-player-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}
.video-player-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.video-player-meta {
  padding: 18px 22px 22px;
  text-align: left;
}
.video-player-meta h3 {
  margin: 4px 0 6px;
  font:
    700 20px "Syne",
    sans-serif;
  color: #351536;
}
.video-player-meta > p:last-child {
  margin: 0;
  font-size: 13px;
  color: #5a4d5c;
  line-height: 1.5;
}
.player-fade-enter-active,
.player-fade-leave-active {
  transition: opacity 0.25s ease;
}
.player-fade-enter-from,
.player-fave-leave-to {
  opacity: 0;
}
</style>
