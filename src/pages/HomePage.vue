<script setup>
import { computed } from "vue";
import LiveMap from "../components/LiveMap.vue";
import { t, formatMoney } from "../languageConfig.js";
const props = defineProps({
  products: { type: Array, default: () => [] },
  locationReady: Boolean,
  nearest: String,
  userLocation: Object,
  locationLoading: Boolean,
  locationError: String,
});
const emit = defineEmits(["navigate", "track"]);
const featuredProducts = computed(() => [...props.products].sort((a, b) => Number(b.is_featured) - Number(a.is_featured)).slice(0, 3));
</script>
<template>
  <main class="home-page">
    <section class="hero container-fluid px-4 px-xl-5">
      <div class="hero-copy">
        <p class="eyebrow">{{ t("SOUTH AFRICA'S TRUSTED SAFETY ECOSYSTEM") }}</p>
        <h1 v-full-stop>{{ t("hero") }}</h1>
        <p class="hero-lead">{{ t("heroLead") }}</p>
        <div class="hero-actions">
          <button class="btn btn-sos" @click="emit('navigate', 'products')"><i class="bi bi-bag-heart"></i> {{ t("shop") }}</button>
          <button class="btn btn-outline-plum" @click="emit('navigate', 'safetyhub')">{{ t("MY SAFETY HUB") }} <i class="bi bi-arrow-right"></i></button>
        </div>
        <p class="home-intro-note">{{ t("YOUR SAFETY. YOUR PEOPLE. YOUR CHOICE.") }}</p>
      </div>
      <div class="hero-visual">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="phone">
          <div class="phone-notch"></div>
          <div class="phone-screen">
            <div class="mini-brand">
              <i class="bi bi-shield-fill"></i> SafeHer
            </div>
            <div class="phone-card">
              <small>{{ t("YOUR SAFETY.") }}<br />{{ t("YOUR PEOPLE.") }}<br />{{ t("YOUR CHOICE.") }}</small>
              <p>{{ t("Protection and trusted support, right when you need it.") }}</p>
            </div>
            <button class="mini-sos" @click="emit('navigate', 'safetyhub')">
              {{ t("MY SAFETY HUB") }}
            </button>
            <div class="mini-title">{{ t("MY SAFETY NETWORK") }}</div>
            <div class="mini-grid">
              <span><i class="bi bi-telephone-fill"></i>SOS</span
              ><span><i class="bi bi-send-fill"></i>{{ t("Location") }}</span
              ><span><i class="bi bi-question-circle"></i>{{ t("Nearby") }}</span
              ><span><i class="bi bi-person-vcard"></i>{{ t("Contacts") }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    <LiveMap
      :location="userLocation"
      :nearest="nearest"
      :loading="locationLoading"
      :error="locationError"
      @locate="emit('track')"
    />
    <section v-if="featuredProducts.length" class="home-store container-fluid px-4 px-xl-5">
      <div class="home-section-heading">
        <div><p class="eyebrow">{{ t("SAFEHER STORE") }}</p><h2 v-full-stop>{{ t("Safety essentials for everyday life") }}</h2></div>
        <button class="btn btn-outline-plum" @click="emit('navigate', 'products')">{{ t("Browse store") }} <i class="bi bi-arrow-up-right"></i></button>
      </div>
      <div class="home-product-grid">
        <button v-for="product in featuredProducts" :key="product.id" class="home-product-card" @click="emit('navigate', 'products')">
          <div class="home-product-image"><img v-if="product.image" :src="product.image" :alt="product.name" loading="lazy" /><i v-else :class="`bi ${product.icon}`"></i></div>
          <div class="home-product-copy"><h3 v-full-stop>{{ product.name }}</h3><p>{{ product.detail }}</p><strong>{{ formatMoney(product.price) }}</strong><i class="bi bi-arrow-up-right" aria-hidden="true"></i></div>
        </button>
      </div>
    </section>
    <section class="quick-section container-fluid px-4 px-xl-5">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ t("YOUR SAFETY, YOUR WAY") }}</p>
          <h2 v-full-stop>{{ t("Everything you need to feel") }} <em>{{ t("ready.") }}</em></h2>
        </div>
      </div>
      <div class="feature-grid">
        <button class="feature-card card-purple" @click="emit('navigate', 'safetyhub')">
          <i class="bi bi-broadcast-pin"></i
          ><span
            ><strong>{{ t("help") }}</strong
            ><small>{{ t("MY SAFETY HUB") }}</small></span
          ></button
        ><button class="feature-card card-pink" @click="emit('navigate', 'services')">
          <i class="bi bi-geo-alt-fill"></i
          ><span
            ><strong>{{ t("guide") }}</strong
            ><small>{{ t("Explore your safety tools") }}</small></span
          ></button
        ><button
          class="feature-card card-cream"
          @click="emit('navigate', 'safetyhub')"
        >
          <i class="bi bi-people-fill"></i
          ><span
            ><strong>{{ t("Safety circle") }}</strong
            ><small>{{ t("Keep trusted people close") }}</small></span
          ></button
        ><button
          class="feature-card card-red"
          @click="emit('navigate', 'packages')"
        >
          <i class="bi bi-play-circle-fill"></i
          ><span
            ><strong>{{ t("hub") }}</strong
            ><small>{{ t("Videos, tips and local advice") }}</small></span
          >
        </button>
      </div>
    </section>
    <section class="home-next-step container-fluid px-4 px-xl-5">
      <div><p class="eyebrow">{{ t("YOUR SAFETY, YOUR WAY") }}</p><h2 v-full-stop>{{ t("Make safety part of your everyday") }}</h2><p>{{ t("Explore your safety tools") }}</p></div>
      <button class="btn btn-dark-plum" @click="emit('navigate', 'safetyhub')">{{ t("MY SAFETY HUB") }} <i class="bi bi-arrow-right"></i></button>
    </section>
  </main>
</template>

<style scoped>
.home-intro-note { margin-top: 24px; color: var(--muted); font-size: 12px; letter-spacing: .08em; }
.home-store { padding-block: 48px 64px; background: var(--surface); }
.home-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.home-section-heading h2, .home-next-step h2 { font: 700 clamp(26px, 3vw, 42px)/1.15 "Syne", sans-serif; color: var(--ink); max-width: 650px; }
.home-product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.home-product-card { padding: 0; overflow: hidden; text-align: left; border: 1px solid var(--line); border-radius: 18px; background: var(--blush); color: var(--ink); transition: transform .2s; }
.home-product-card:hover { transform: translateY(-4px); }
.home-product-image { aspect-ratio: 4 / 3; display: grid; place-items: center; overflow: hidden; background: var(--surface); }
.home-product-image img { width: 100%; height: 100%; object-fit: cover; }
.home-product-image > i { font-size: 64px; color: var(--plum); }
.home-product-copy { position: relative; padding: 22px; }
.home-product-copy h3 { font-size: 20px; color: var(--ink); }
.home-product-copy p { color: var(--muted); font-size: 14px; }
.home-product-copy > i { position: absolute; right: 22px; bottom: 22px; }
.home-next-step { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding-block: 48px 64px; background: var(--surface); }
.home-next-step p { color: var(--muted); }
@media (max-width: 767px) {
  .home-product-grid { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .home-section-heading, .home-next-step { align-items: start; flex-direction: column; }
  .home-store { padding-block: 32px; }
}
</style>
