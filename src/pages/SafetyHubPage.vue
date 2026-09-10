<script setup>
import { onBeforeUnmount, ref } from "vue";
import LiveMap from "../components/LiveMap.vue";
import { t } from "../languageConfig.js";

const props = defineProps({
  contacts: Array,
  locationReady: Boolean,
  userLocation: Object,
  locationLoading: Boolean,
  locationError: String,
});
const emit = defineEmits([
  "add-contact",
  "remove-contact",
  "share",
  "track",
  "sos",
  "call-contact",
  "message-contact",
]);
const checkInMinutes = ref(0);
const checkInSeconds = ref(0);
const checkInStatus = ref(localStorage.getItem("safeher-checkin-status") || "Not checked in yet");
let timer;

function startTimer(minutes) {
  clearInterval(timer);
  checkInMinutes.value = minutes;
  checkInSeconds.value = 0;
  checkInStatus.value = `Timer started • ${minutes} minute check-in`;
  localStorage.setItem("safeher-checkin-status", checkInStatus.value);
  timer = setInterval(() => {
    if (checkInSeconds.value === 0 && checkInMinutes.value === 0)
      return clearInterval(timer);
    if (checkInSeconds.value === 0) {
      checkInMinutes.value -= 1;
      checkInSeconds.value = 59;
    } else checkInSeconds.value -= 1;
  }, 1000);
}

function checkInNow() {
  checkInStatus.value = "Checked in • safe and active";
  localStorage.setItem("safeher-checkin-status", checkInStatus.value);
  clearInterval(timer);
  checkInMinutes.value = 0;
  checkInSeconds.value = 0;
  if (props.contacts.length) {
    emit("message-contact", props.contacts[0]);
  }
}

onBeforeUnmount(() => {
  clearInterval(timer);
});
</script>
<template>
  <main class="hub-page container-fluid px-4 px-xl-5">
    <div class="hub-header">
      <div>
        <p class="eyebrow">{{ t("MY SAFETY HUB") }}</p>
        <h1>{{ t("welcome") }}</h1>
        <p>{{ t("hubLead") }}</p>
      </div>
      <div class="hub-plan">
        <small>{{ t("SAFEHER PLAN") }}</small><strong>{{ t("Community") }}</strong
        ><span>{{ t("Always protected") }}</span>
      </div>
    </div>
    <section class="hub-metrics">
      <article class="hub-sos-card">
        <div class="hub-card-title">
          <strong>{{ t("oneTap") }}</strong
          ><i class="bi bi-broadcast-pin"></i>
        </div>
        <p> {{ t("Press to activate the SOS visual alert.") }} </p>
        <button class="hub-sos-button" @click="emit('sos')">SOS</button
        ><small>{{ t("Tap to activate") }}</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-people-fill"></i><strong>{{ contacts.length }}</strong
        ><b>{{ t("emergencyContacts") }}</b
        ><small>{{
          t(contacts.length ? "Saved for quick contact" : t("contactPrompt"))
        }}</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-send-fill"></i
        ><strong>{{ t(locationReady ? "1" : "0") }}</strong
        ><b>{{ t("liveRoute") }}</b
        ><small>{{
          t(locationReady ? "Location sharing ready" : "Not active yet")
        }}</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-check-square-fill"></i
        ><strong>{{ checkInMinutes || "0" }}</strong
        ><b>{{ t("checkins") }}</b
        ><small>{{ t("This session") }}</small>
      </article>
      <article class="hub-stat">
        <i class="bi bi-shield-fill"></i><strong>24/7</strong
        ><b>{{ t("Safe Hours Logged") }}</b><small>{{ t("Since joining SafeHer") }}</small>
      </article>
    </section>
    <section class="hub-main-grid">
      <article class="hub-panel location-panel">
        <LiveMap
          :location="props.userLocation"
          :loading="props.locationLoading"
          :error="props.locationError"
          compact
          @locate="emit('track')"
        />
        <div class="hub-map-footer">
          <span
            ><i class="bi bi-crosshair2"></i
            >{{
              t(locationReady
                ? "Live GPS tracking active"
                : "Location sharing is private")
            }}</span
          ><button @click="emit('track')">
            {{ t(locationReady ? "Use My Location" : "Locate me") }}
          </button>
        </div>
      </article>
      <article class="hub-panel contacts-panel">
        <div class="hub-panel-heading">
          <h2>{{ t("Emergency Contacts") }}</h2>
          <span class="hub-add">{{ contacts.length }} {{ t("saved") }}</span>
        </div>
        <div v-if="contacts.length" class="hub-contact-list">
          <div v-for="contact in contacts" :key="contact.id">
            <span class="hub-contact-avatar">{{ contact.name.charAt(0) }}</span
            ><span
              ><strong>{{ contact.name }}</strong
              ><small
                >{{ t(contact.relationship) }} · {{ contact.phone }}</small
              ></span
            ><i class="bi bi-circle-fill"></i
            ><div class="hub-contact-actions">
              <button class="hub-mini-action" @click="emit('call-contact', contact)">
                <i class="bi bi-telephone"></i>
              </button>
              <button class="hub-mini-action" @click="emit('message-contact', contact)">
                <i class="bi bi-chat-text"></i>
              </button>
              <button
                class="hub-remove"
                @click="emit('remove-contact', contact.id)"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="hub-empty-contacts">
          <i class="bi bi-person-plus"></i>
          <p>{{ t("Add someone you trust below.") }}</p>
        </div>
        <form
          class="contact-form hub-contact-form"
          @submit.prevent="emit('add-contact', $event)"
        >
          <input name="name" required :placeholder="t(&quot;Contact name&quot;)" /><input
            name="phone"
            required
            type="tel"
            :placeholder="t(&quot;Cellphone number&quot;)"
          /><select name="relationship">
            <option value="Trusted contact">{{ t("Trusted contact") }}</option>
            <option value="Family">{{ t("Family") }}</option>
            <option value="Friend">{{ t("Friend") }}</option></select
          ><button class="btn btn-dark-plum" type="submit">{{ t("Save contact") }}</button>
        </form>
      </article>
    </section>
    <section class="hub-panel checkin-panel">
      <div>
        <h2>{{ t("checkinTimer") }}</h2>
        <p>{{ t("Use a timer to remind yourself to check in.") }}</p>
      </div>
      <div class="checkin-status-box">
        <span class="status-pill">{{ t(checkInStatus) }}</span>
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
          {{ minutes }} {{ t("min") }}</button
        ><button class="btn btn-dark-plum" @click="checkInNow">
          <i class="bi bi-check-circle"></i> {{ t("Check in now") }} </button>
        <button class="btn btn-dark-plum" @click="emit('share')">
          <i class="bi bi-send"></i> {{ t("shareRoute") }}
        </button>
      </div>
    </section>

  </main>
</template>
