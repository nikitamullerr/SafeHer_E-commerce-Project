<script setup>
import { onBeforeUnmount, ref } from "vue";
import LiveMap from "../components/LiveMap.vue";
import { t } from "../languageConfig.js";

const props = defineProps({
  contacts: Array,
  locationReady: Boolean,
  userLocation: Object,
});
const emit = defineEmits([
  "add-contact",
  "remove-contact",
  "share",
  "track",
  "sos",
]);
const checkInMinutes = ref(0);
const checkInSeconds = ref(0);
let timer;

// Each selected duration resets the active check-in countdown.
function startTimer(minutes) {
  clearInterval(timer);
  checkInMinutes.value = minutes;
  checkInSeconds.value = 0;
  timer = setInterval(() => {
    if (checkInSeconds.value === 0 && checkInMinutes.value === 0)
      return clearInterval(timer);
    if (checkInSeconds.value === 0) {
      checkInMinutes.value -= 1;
      checkInSeconds.value = 59;
    } else checkInSeconds.value -= 1;
  }, 1000);
}
onBeforeUnmount(() => clearInterval(timer));
</script>
<template>
  <main class="hub-page container-fluid px-4 px-xl-5">
    <div class="hub-header">
      <div>
        <p class="eyebrow">MY SAFETY HUB</p>
        <h1>{{ t("welcome") }}</h1>
        <p>{{ t("hubLead") }}</p>
      </div>
      <div class="hub-plan">
        <small>SAFEHER PLAN</small><strong>Community</strong
        ><span>Always protected</span>
      </div>
    </div>
    <section class="hub-metrics">
      <article class="hub-sos-card">
        <div class="hub-card-title">
          <strong>{{ t("oneTap") }}</strong
          ><i class="bi bi-broadcast-pin"></i>
        </div>
        <p>
          Press to instantly share your location with your emergency circle.
        </p>
        <button class="hub-sos-button" @click="emit('sos')">SOS</button
        ><small>Tap to activate</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-people-fill"></i><strong>{{ contacts.length }}</strong
        ><b>{{ t("emergencyContacts") }}</b
        ><small>{{
          contacts.length ? "Ready to receive alerts" : t("contactPrompt")
        }}</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-send-fill"></i
        ><strong>{{ locationReady ? "1" : "0" }}</strong
        ><b>{{ t("liveRoute") }}</b
        ><small>{{
          locationReady ? "Location sharing ready" : "Not active yet"
        }}</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-check-square-fill"></i
        ><strong>{{ checkInMinutes || "0" }}</strong
        ><b>{{ t("checkins") }}</b
        ><small>This session</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-shield-fill"></i><strong>24/7</strong
        ><b>Safe Hours Logged</b><small>Since joining SafeHer</small>
      </article>
    </section>
    <section class="hub-main-grid">
      <article class="hub-panel location-panel">
        <LiveMap :location="props.userLocation" compact />
        <div class="hub-map-footer">
          <span
            ><i class="bi bi-crosshair2"></i
            >{{
              locationReady
                ? "Live GPS tracking active"
                : "Location sharing is private"
            }}</span
          ><button @click="emit('track')">
            {{ locationReady ? "Stop tracking" : "Locate me" }}
          </button>
        </div>
      </article>
      <article class="hub-panel contacts-panel">
        <div class="hub-panel-heading">
          <h2>Emergency Contacts</h2>
          <span class="hub-add">{{ contacts.length }} saved</span>
        </div>
        <div v-if="contacts.length" class="hub-contact-list">
          <div v-for="contact in contacts" :key="contact.id">
            <span class="hub-contact-avatar">{{ contact.name.charAt(0) }}</span
            ><span
              ><strong>{{ contact.name }}</strong
              ><small
                >{{ contact.relationship }} · {{ contact.phone }}</small
              ></span
            ><i class="bi bi-circle-fill"></i
            ><button
              class="hub-remove"
              @click="emit('remove-contact', contact.id)"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
        <div v-else class="hub-empty-contacts">
          <i class="bi bi-person-plus"></i>
          <p>Add someone you trust below.</p>
        </div>
        <form
          class="contact-form hub-contact-form"
          @submit.prevent="emit('add-contact', $event)"
        >
          <input name="name" required placeholder="Contact name" /><input
            name="phone"
            required
            type="tel"
            placeholder="Cellphone number"
          /><select name="relationship">
            <option>Trusted contact</option>
            <option>Family</option>
            <option>Friend</option></select
          ><button class="btn btn-dark-plum" type="submit">Save contact</button>
        </form>
      </article>
    </section>
    <section class="hub-panel checkin-panel">
      <div>
        <h2>{{ t("checkinTimer") }}</h2>
        <p>If you do not check in, your contacts are automatically alerted.</p>
      </div>
      <div class="timer-display" v-if="checkInMinutes || checkInSeconds">
        <i class="bi bi-stopwatch"></i
        >{{ String(checkInMinutes).padStart(2, "0") }}:{{
          String(checkInSeconds).padStart(2, "0")
        }}
      </div>
      <div class="checkin-actions">
        <button
          v-for="minutes in [15, 30, 60, 90]"
          :key="minutes"
          @click="startTimer(minutes)"
        >
          {{ minutes }} min</button
        ><button class="btn btn-dark-plum" @click="emit('share')">
          <i class="bi bi-send"></i> {{ t("shareRoute") }}
        </button>
      </div>
    </section>
  </main>
</template>
