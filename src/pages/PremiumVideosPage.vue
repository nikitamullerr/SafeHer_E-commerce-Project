<script setup>
import { t } from "../languageConfig.js";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Swal from "../services/localizedSwal.js";
import { getLessons, markLessonComplete } from "../services/premiumClient";
const emit = defineEmits(["navigate"]);
const props = defineProps({ premiumMembership: Object });
const videos = ref([]);
const progress = ref({ completed: 0, total: 0 });
const isLoading = ref(false);
const loadError = ref("");
const activeVideo = ref(null);
const videoPlayer = ref(null);
const isSavingProgress = ref(false);

const hasPremiumAccess = computed(() =>
  Boolean(
    props.premiumMembership?.expiresAt &&
    new Date(props.premiumMembership.expiresAt) > new Date(),
  ),
);

async function loadLessons() {
  isLoading.value = true;
  loadError.value = "";

  try {
    const data = await getLessons();
    videos.value = data.lessons || [];
    progress.value = data.progress || {
      completed: 0,
      total: videos.value.length,
    };
  } catch (error) {
    loadError.value =
      error.response?.data?.error ||
      "Unable to load premium videos. Please try again.";
  } finally {
    isLoading.value = false;
  }
}

const playerUrl = computed(() => {
  if (!activeVideo.value?.youtube_id) return "";

  return `https://www.youtube.com/embed/${activeVideo.value.youtube_id}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
});

async function markActiveVideoComplete() {
  const video = activeVideo.value;
  if (!video || video.completed || isSavingProgress.value) return;

  isSavingProgress.value = true;
  try {
    const data = await markLessonComplete(video.id);
    
    // Update the video's completed status locally
    video.completed = true;
    
    // Update progress from backend response
    if (data.progress) {
      progress.value = data.progress;
    }
    
    // Refresh the lessons list to get updated completed statuses
    await loadLessons();
    
    // Show a success message
    Swal.fire({
      icon: "success",
      title: "Lesson completed!",
      text: "You've completed this lesson.",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Unable to update progress",
      text: error.response?.data?.error || "Please try again.",
      confirmButtonColor: "#351536",
    });
  } finally {
    isSavingProgress.value = false;
  }
}

function onPlayerLoaded() {
  const playerWindow = videoPlayer.value?.contentWindow;
  if (!playerWindow) return;

  playerWindow.postMessage(JSON.stringify({ event: "listening" }), "https://www.youtube.com");
  playerWindow.postMessage(
    JSON.stringify({
      event: "command",
      func: "addEventListener",
      args: ["onStateChange"],
    }),
    "https://www.youtube.com",
  );
}

function onPlayerMessage(event) {
  if (event.origin !== "https://www.youtube.com" || event.source !== videoPlayer.value?.contentWindow) return;

  try {
    const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    
    // Handle state change events
    if (data.event === "onStateChange") {
      console.log('Video state changed:', data.info);
      
      // State 0 = video ended
      if (data.info === 0) {
        console.log('Video ended, marking complete...');
        markActiveVideoComplete();
      }
    }
  } catch {
    // Ignore YouTube iframe messages that are not player events.
  }
}

onMounted(() => {
  loadLessons();
  window.addEventListener("message", onPlayerMessage);
});

onBeforeUnmount(() => window.removeEventListener("message", onPlayerMessage));

function openVideo(video) {
  console.log('🎬 Video clicked:', video);
  
  // Check if Swal is available
  if (typeof Swal === 'undefined') {
    console.warn('SweetAlert2 not loaded, using fallback alert');
    alert('Premium access required. Please subscribe to watch this video.');
    return;
  }
  
  if (!hasPremiumAccess.value) {
    Swal.fire({
      icon: "info",
      title: "Premium access required",
      text: "These safety videos are included in the SafeHer Premium package.",
      confirmButtonColor: "#351536",
    });
    return;
  }
  
  // Has premium access - open the video
  activeVideo.value = video;
}

function closePlayer() {
  activeVideo.value = null;
}
</script>
<template>
  <main class="premium-page container-fluid px-4 px-xl-5">
    <section class="premium-heading">
      <div class="guide-heading">
        <p class="eyebrow">{{ t("SAFEHER / PREMIUM LIBRARY") }}</p>
        <h1>{{ t("Learn skills that help you feel") }} <em>{{ t("ready.") }}</em></h1>
        <p> {{ t("Expert-led safety lessons for your everyday routines, available with SafeHer Premium.") }} </p>
      </div>
      <div class="premium-badge">
        <i
          :class="
            hasPremiumAccess ? 'bi bi-patch-check-fill' : 'bi bi-lock-fill'
          "
        ></i>
        <span
          ><strong>{{ t(hasPremiumAccess ? "ACTIVE" : "PREMIUM") }}</strong
          ><small>{{
            t(hasPremiumAccess ? "Member access enabled" : "Member access")
          }}</small></span
        >
      </div>
    </section>
    <section class="premium-banner">
      <div>
        <i class="bi bi-play-btn-fill"></i>
        <div>
          <p class="eyebrow">{{ t("YOUR NEXT STEP") }}</p>
          <h2>
            {{
              t(hasPremiumAccess
                ? "Your full safety video library is ready."
                : "Unlock the full safety video library.")
            }}
          </h2>
          <p>
            {{
              t(hasPremiumAccess
                ? "Choose a lesson below and track your progress as you go."
                : "Premium gives you guided lessons you can revisit whenever you need them.")
            }}
          </p>
        </div>
      </div>
      <button
        v-if="!hasPremiumAccess"
        class="btn btn-sos"
        @click="emit('navigate', 'packages')"
      >
        <i class="bi bi-stars"></i> {{ t("Explore Premium") }} </button>
      <span v-else class="btn btn-outline-plum disabled" aria-disabled="true">
        <i class="bi bi-check2-circle"></i> {{ progress.completed }}/{{
          progress.total
        }} {{ t("completed") }} </span>
    </section>
    <p v-if="isLoading" class="premium-videos-status">{{ t("Loading premium videos...") }}</p>
    <div v-else-if="loadError" class="premium-videos-status">
      <p>{{ t(loadError) }}</p>
      <button class="btn btn-sos" @click="loadLessons">{{ t("Try again") }}</button>
    </div>
    <p v-else-if="!videos.length" class="premium-videos-status"> {{ t("No premium videos are available yet.") }} </p>
    <section v-else class="video-grid">
      <article v-for="video in videos" :key="video.id" class="video-card">
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
          <p class="eyebrow">{{ t("PREMIUM LESSON") }}</p>
          <h2>{{ t(video.title) }}</h2>
          <p>{{ t(video.detail || video.description) }}</p>
          <button class="video-action" @click="openVideo(video)">
            <i
              :class="
                hasPremiumAccess ? 'bi bi-play-circle-fill' : 'bi bi-lock-fill'
              "
            ></i>
            {{
              t(hasPremiumAccess
                ? video.completed
                  ? "Watch again"
                  : "Play lesson"
                : "Unlock video")
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
          :aria-label="t(activeVideo.title)"
        >
          <button
            class="video-player-close"
            :aria-label="t(&quot;Close video&quot;)"
            @click="closePlayer"
          >
            <i class="bi bi-x-lg"></i>
          </button>
          <div class="video-player-frame">
            <iframe
              ref="videoPlayer"
              :src="playerUrl"
              :title="t(activeVideo.title)"
              @load="onPlayerLoaded"
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
          <div class="video-player-actions" style="padding-top: 12px; display: flex; gap: 12px;">
  <button 
    class="btn btn-sos" 
    @click="markActiveVideoComplete" 
    :disabled="isSavingProgress || activeVideo?.completed"
    style="font-size: 12px; padding: 8px 16px;"
  >
    <i class="bi bi-check2-circle"></i>
    {{ t(isSavingProgress ? 'Saving...' : activeVideo?.completed ? 'Completed ✓' : 'Mark as Complete') }}
  </button>
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
.premium-videos-status {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--ink);
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
  background: var(--surface);
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
  color: var(--ink);
}
.video-player-meta > p:last-child {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
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
