<script setup>
import LiveMap from "../components/LiveMap.vue";
import { t } from "../languageConfig.js";
defineProps({ locationReady: Boolean, nearest: String, userLocation: Object });
const emit = defineEmits(["sos", "track", "navigate"]);
</script>
<template>
  <main>
    <section class="hero container-fluid px-4 px-xl-5">
      <div class="hero-copy">
        <p class="eyebrow">SOUTH AFRICA'S TRUSTED SAFETY ECOSYSTEM</p>
        <h1>{{ t("hero") }}</h1>
        <p class="hero-lead">{{ t("heroLead") }}</p>
        <div class="hero-actions">
          <button class="btn btn-sos" @click="emit('sos')">
            <i class="bi bi-exclamation-lg"></i> {{ t("help") }}</button
          ><button
            class="btn btn-outline-plum"
            @click="emit('navigate', 'products')"
          >
            <i class="bi bi-bag-heart"></i> {{ t("shop") }}
          </button>
        </div>
        <div class="tracking-control">
          <div>
            <i class="bi bi-crosshair2"></i
            ><span
              ><strong>{{ t("liveLocation") }}</strong
              ><small>{{
                locationReady
                  ? "Tracking your exact position"
                  : "Only shared when you choose"
              }}</small></span
            >
          </div>
          <button class="btn btn-track" @click="emit('track')">
            {{ locationReady ? "Stop tracking" : t("locate") }}
          </button>
        </div>
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
              <small>YOUR SAFETY.<br />YOUR PEOPLE.<br />YOUR CHOICE.</small>
              <p>Protection and trusted support, right when you need it.</p>
            </div>
            <button class="mini-sos" @click="emit('sos')">
              [ ! ] {{ t("help") }}
            </button>
            <div class="mini-title">MY SAFETY NETWORK</div>
            <div class="mini-grid">
              <span><i class="bi bi-telephone-fill"></i>SOS</span
              ><span><i class="bi bi-send-fill"></i>Location</span
              ><span><i class="bi bi-question-circle"></i>Nearby</span
              ><span><i class="bi bi-person-vcard"></i>Contacts</span>
            </div>
          </div>
        </div>
        <div class="location-pin">
          <i class="bi bi-geo-alt-fill"></i
          ><span
            ><strong>{{ t("nearby") }}</strong
            ><br />{{ nearest }}</span
          >
        </div>
      </div>
    </section>
    <LiveMap :location="userLocation" :nearest="nearest" />
    <section class="quick-section container-fluid px-4 px-xl-5">
      <div class="section-heading">
        <div>
          <p class="eyebrow">YOUR SAFETY, YOUR WAY</p>
          <h2>Everything you need to feel <em>ready.</em></h2>
        </div>
      </div>
      <div class="feature-grid">
        <button class="feature-card card-purple" @click="emit('sos')">
          <i class="bi bi-broadcast-pin"></i
          ><span
            ><strong>{{ t("help") }}</strong
            ><small>Get help in one tap</small></span
          ></button
        ><button class="feature-card card-pink" @click="emit('track')">
          <i class="bi bi-geo-alt-fill"></i
          ><span
            ><strong>{{ t("nearby") }}</strong
            ><small>{{ nearest }}</small></span
          ></button
        ><button
          class="feature-card card-cream"
          @click="emit('navigate', 'safetyhub')"
        >
          <i class="bi bi-people-fill"></i
          ><span
            ><strong>Safety circle</strong
            ><small>Keep trusted people close</small></span
          ></button
        ><button
          class="feature-card card-red"
          @click="emit('navigate', 'safetyhub')"
        >
          <i class="bi bi-play-circle-fill"></i
          ><span
            ><strong>{{ t("hub") }}</strong
            ><small>Videos, tips and local advice</small></span
          >
        </button>
      </div>
    </section>
  </main>
</template>
