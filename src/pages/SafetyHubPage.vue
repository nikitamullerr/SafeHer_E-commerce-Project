<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import LiveMap from "../components/LiveMap.vue";
import { t } from "../languageConfig.js";
import checkinService from "../services/checkinService.js";

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
  "sos-all",
  "call-contact",
  "message-contact",
]);
const checkInMinutes = ref(0);
const checkInSeconds = ref(0);
const customCheckinMinutes = ref(30);
const checkInStatus = ref(localStorage.getItem("safeher-checkin-status") || "Not checked in yet");
const panicStatus = ref("Ready");
const panicCountdown = ref(0);
const selectedPlan = ref(localStorage.getItem("safeher-active-plan") || "Home mode");
const safetyPlans = ["Home mode", "Travel mode", "Night mode"];
const nightChecklist = ref({ phoneCharged: false, locationReady: false, contactSelected: false, routePlanned: false });
const tripDestination = ref("");
const tripArrival = ref("");
const tripDuration = ref(60);
const activeTrip = ref(null);
const tripNotice = ref("");
const orders = ref([]);
const orderStages = ["Confirmed", "Packed", "Out for delivery", "Delivered"];
let timer;

async function startTimer(minutes) {
  try {
    clearInterval(timer);

    checkInStatus.value = "Starting check-in...";

    const response = await checkinService.start(minutes);

    if (!response.success) {
      throw new Error(response.error || "Failed to start check-in");
    }

    const checkin = response.checkin;

    // Set the timer numbers
    checkInMinutes.value = checkin.duration_minutes;
    checkInSeconds.value = 0;

    checkInStatus.value =
      `Timer started • ${checkin.duration_minutes} minute check-in`;

    localStorage.setItem(
      "safeher-checkin-status",
      checkInStatus.value
    );

    localStorage.setItem(
      "safeher-active-checkin-id",
      checkin.id
    );

    // Countdown
    timer = setInterval(() => {
      if (
        checkInMinutes.value === 0 &&
        checkInSeconds.value === 0
      ) {
        clearInterval(timer);

        checkinService.updateStatus(
          checkin.id,
          "missed"
        ).catch((error) => {
          console.error("Failed to update missed check-in:", error);
        });

        checkInStatus.value = "Check-in missed";

        localStorage.setItem(
          "safeher-checkin-status",
          "Check-in missed"
        );

        localStorage.removeItem(
          "safeher-active-checkin-id"
        );

        showMissedCheckinAlert();
        return;
      }

      if (checkInSeconds.value === 0) {
        checkInMinutes.value -= 1;
        checkInSeconds.value = 59;
      } else {
        checkInSeconds.value -= 1;
      }
    }, 1000);

  } catch (error) {
    console.error("Start check-in error:", error);

    checkInStatus.value =
      error.response?.data?.error ||
      error.message ||
      "Failed to start check-in";
  }
}

function adjustCustomCheckin(minutes) {
  customCheckinMinutes.value = Math.min(240, Math.max(5, customCheckinMinutes.value + minutes));
}

function startCustomCheckin() {
  startTimer(customCheckinMinutes.value);
}

async function showMissedCheckinAlert() {
  const result = await Swal.fire({
    icon: "warning",
    title: "Check-in missed",
    text: "We did not receive your check-in. Choose an action now.",
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "Send SOS to contacts",
    denyButtonText: `Add ${customCheckinMinutes.value} minutes`,
    cancelButtonText: "Dismiss",
    confirmButtonColor: "#d92d36",
    denyButtonColor: "#351536",
  });

  if (result.isConfirmed) emit("sos-all");
  else if (result.isDenied) startCustomCheckin();
}
async function checkInNow() {
  try {
    const checkinId = localStorage.getItem(
      "safeher-active-checkin-id"
    );

    // If there is no active backend check-in,
    // simply show the current status.
    if (!checkinId) {
      checkInStatus.value = "Checked in • safe and active";

      localStorage.setItem(
        "safeher-checkin-status",
        checkInStatus.value
      );

      clearInterval(timer);

      checkInMinutes.value = 0;
      checkInSeconds.value = 0;

      return;
    }

    const response = await checkinService.updateStatus(
      checkinId,
      "completed"
    );

    if (!response.success) {
      throw new Error(
        response.error || "Failed to complete check-in"
      );
    }

    clearInterval(timer);

    checkInMinutes.value = 0;
    checkInSeconds.value = 0;

    checkInStatus.value = "Checked in • safe and active";

    localStorage.setItem(
      "safeher-checkin-status",
      checkInStatus.value
    );

    localStorage.removeItem(
      "safeher-active-checkin-id"
    );

    if (props.contacts.length) {
      emit("message-contact", props.contacts[0]);
    }
  } catch (error) {
    console.error("Complete check-in error:", error);

    checkInStatus.value =
      error.response?.data?.error ||
      error.message ||
      "Failed to complete check-in";
  }
}

function setSafetyPlan(plan) {
  selectedPlan.value = plan;
  localStorage.setItem("safeher-active-plan", plan);
  panicStatus.value = `${plan} active`;
}

const nightChecklistItems = [
  { key: "phoneCharged", label: "My phone is charged" },
  { key: "locationReady", label: "Location sharing is ready" },
  { key: "contactSelected", label: "A trusted contact is available" },
  { key: "routePlanned", label: "I have planned a safer route" },
];
const nightReadyCount = computed(() => Object.values(nightChecklist.value).filter(Boolean).length);
function saveNightChecklist() { localStorage.setItem("safeher-night-checklist", JSON.stringify(nightChecklist.value)); }
function startNightCheckin(minutes) { startTimer(minutes); panicStatus.value = `Night check-in started for ${minutes} minutes`; }
function saveTrip() { localStorage.setItem("safeher-active-trip", JSON.stringify(activeTrip.value)); }
async function startTrip() {
  const destination = tripDestination.value.trim();
  if (!destination || !tripArrival.value) { tripNotice.value = "Add a destination and expected arrival time to start your trip."; return; }
  activeTrip.value = { destination, arrival: tripArrival.value, duration: Number(tripDuration.value), startedAt: new Date().toISOString(), active: true };
  saveTrip(); tripNotice.value = `Trip to ${destination} is active. Check in when you arrive.`; await startTimer(Number(tripDuration.value));
}
async function arriveSafely() {
  await checkInNow();
  if (activeTrip.value) { activeTrip.value = { ...activeTrip.value, active: false, arrivedAt: new Date().toISOString() }; saveTrip(); }
  tripNotice.value = "Arrival recorded. Your check-in has been completed.";
}
function clearTrip() { activeTrip.value = null; tripDestination.value = ""; tripArrival.value = ""; tripNotice.value = "Trip cleared."; localStorage.removeItem("safeher-active-trip"); }
function startPanicCountdown() {
  clearInterval(panicTimer);
  panicCountdown.value = 5;
  panicStatus.value = "Panic countdown started";

  panicTimer = setInterval(() => {
    if (panicCountdown.value <= 1) {
      clearInterval(panicTimer);
      panicCountdown.value = 0;
      panicStatus.value = "SOS triggered";
      emit("sos");
      return;
    }
    panicCountdown.value -= 1;
  }, 1000);
}

function cancelPanicCountdown() {
  clearInterval(panicTimer);
  panicCountdown.value = 0;
  panicStatus.value = "Countdown cancelled";
}

function loadOrders() {
  try {
    orders.value = JSON.parse(localStorage.getItem("safeher-orders") || "[]");
  } catch {
    orders.value = [];
  }
}

function advanceOrder(orderId) {
  const targetOrder = orders.value.find((order) => order.id === orderId);
  if (!targetOrder) return;
  const currentIndex = orderStages.indexOf(targetOrder.status || "Confirmed");
  const nextIndex = Math.min(currentIndex + 1, orderStages.length - 1);
  targetOrder.status = orderStages[nextIndex];
  localStorage.setItem("safeher-orders", JSON.stringify(orders.value));
  orders.value = [...orders.value];
}

const latestOrder = computed(() => orders.value[orders.value.length - 1]);

onMounted(() => {
  loadOrders();
  try {
    const savedChecklist = JSON.parse(localStorage.getItem("safeher-night-checklist") || "null");
    if (savedChecklist) nightChecklist.value = { ...nightChecklist.value, ...savedChecklist };
    const savedTrip = JSON.parse(localStorage.getItem("safeher-active-trip") || "null");
    if (savedTrip) { activeTrip.value = savedTrip; tripDestination.value = savedTrip.destination || ""; tripArrival.value = savedTrip.arrival || ""; tripDuration.value = savedTrip.duration || 60; }
  } catch { localStorage.removeItem("safeher-night-checklist"); localStorage.removeItem("safeher-active-trip"); }
});
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
        ><strong>{{ String(checkInMinutes).padStart(2, "0") }}:{{String(checkInSeconds).padStart(2, "0")}}
        </strong><b>{{ t("checkins") }}</b
        ><small>This session</small>
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
    <section class="hub-panel panic-panel">
      <div>
        <h2>Safety plans</h2>
        <p>Switch your daily protection mode based on your situation.</p>
      </div>
      <div class="safety-plan-row">
        <button
          v-for="plan in safetyPlans"
          :key="plan"
          :class="{ active: selectedPlan === plan }"
          @click="setSafetyPlan(plan)"
        >
          {{ plan }}
        </button>
      </div>
      <div class="panic-box">
        <div>
          <strong>{{ panicStatus }}</strong>
          <small>{{ panicCountdown ? `Triggering in ${panicCountdown}s` : "Ready to trigger SOS" }}</small>
        </div>
        <div class="panic-actions">
          <button class="btn btn-sos" @click="startPanicCountdown">Start countdown</button>
          <button class="btn btn-outline-plum" @click="cancelPanicCountdown">Cancel</button>
          <button class="btn btn-dark-plum" @click="emit('sos-all')"><i class="bi bi-send-fill"></i> Send SOS to all contacts</button>
        </div>
      </div>
    </section>

    <section v-if="selectedPlan === 'Night mode'" class="hub-panel mode-tools-panel night-mode-panel">
      <div class="mode-tools-heading"><span class="mode-tools-icon"><i class="bi bi-moon-stars-fill"></i></span><div><p class="eyebrow">NIGHT MODE</p><h2>Get ready for a safer journey home</h2><p>Complete your check, then start a timed check-in when you leave.</p></div><strong>{{ nightReadyCount }}/{{ nightChecklistItems.length }} ready</strong></div>
      <div class="mode-checklist"><label v-for="item in nightChecklistItems" :key="item.key"><input v-model="nightChecklist[item.key]" type="checkbox" @change="saveNightChecklist" /><span>{{ item.label }}</span><i :class="nightChecklist[item.key] ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i></label></div>
      <div class="mode-action-row"><button v-for="minutes in [15, 30, 60]" :key="minutes" @click="startNightCheckin(minutes)">Start {{ minutes }} min check-in</button><button class="btn btn-sos" @click="startPanicCountdown"><i class="bi bi-exclamation-triangle-fill"></i> Quick alert</button></div>
      <small class="mode-tools-note">Quick alert starts the existing five-second SOS countdown; it does not send an alert automatically.</small>
    </section>

    <section v-if="selectedPlan === 'Travel mode'" class="hub-panel mode-tools-panel travel-mode-panel">
      <div class="mode-tools-heading"><span class="mode-tools-icon"><i class="bi bi-airplane-engines-fill"></i></span><div><p class="eyebrow">TRAVEL MODE</p><h2>Share a plan and check in on arrival</h2><p>Save your destination, choose a check-in window, and confirm when you arrive.</p></div></div>
      <form class="trip-form" @submit.prevent="startTrip"><label>Destination<input v-model="tripDestination" required maxlength="120" placeholder="e.g. Rosebank Mall" /></label><label>Expected arrival<input v-model="tripArrival" required type="datetime-local" /></label><label>Check-in window<select v-model.number="tripDuration"><option :value="30">30 minutes</option><option :value="60">60 minutes</option><option :value="90">90 minutes</option></select></label><button class="btn btn-dark-plum" type="submit"><i class="bi bi-play-circle"></i> Start trip</button></form>
      <div v-if="activeTrip" class="trip-status" :class="{ complete: !activeTrip.active }"><span><i :class="activeTrip.active ? 'bi bi-geo-alt-fill' : 'bi bi-check-circle-fill'"></i></span><div><strong>{{ activeTrip.active ? `Trip to ${activeTrip.destination}` : `Arrived at ${activeTrip.destination}` }}</strong><small>Expected arrival: {{ new Date(activeTrip.arrival).toLocaleString() }}</small></div><button v-if="activeTrip.active" class="btn btn-dark-plum" @click="arriveSafely">I arrived safely</button><button class="hub-mini-action" aria-label="Clear saved trip" @click="clearTrip"><i class="bi bi-x-lg"></i></button></div>
      <p v-if="tripNotice" class="mode-tools-note">{{ tripNotice }}</p>
      <div class="travel-readiness"><span><i :class="locationReady ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i> Location {{ locationReady ? "ready" : "not ready" }}</span><span><i :class="contacts.length ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i> {{ contacts.length ? `${contacts.length} trusted contact${contacts.length === 1 ? "" : "s"} ready` : "Add a trusted contact" }}</span><button @click="emit('share')"><i class="bi bi-send"></i> Share route</button></div>
    </section>
    <section class="hub-panel checkin-panel">
      <div>
        <h2>{{ t("checkinTimer") }}</h2>
        <p>{{ t("Use a timer to remind yourself to check in.") }}</p>
      </div>
      <div class="checkin-status-box">
        <span class="status-pill">{{ checkInStatusText }}</span>
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
        ><div class="checkin-custom-time">
          <span>Custom time</span>
          <button type="button" aria-label="Decrease check-in time by five minutes" @click="adjustCustomCheckin(-5)"><i class="bi bi-dash-lg"></i></button>
          <strong>{{ customCheckinMinutes }} min</strong>
          <button type="button" aria-label="Increase check-in time by five minutes" @click="adjustCustomCheckin(5)"><i class="bi bi-plus-lg"></i></button>
          <button type="button" class="checkin-custom-start" @click="startCustomCheckin">Start</button>
        </div><button class="btn btn-dark-plum" @click="checkInNow">
          <i class="bi bi-check-circle"></i> Check in now
        </button>
        <button class="btn btn-dark-plum" @click="emit('share')">
          <i class="bi bi-send"></i> {{ t("shareRoute") }}
        </button>
      </div>
    </section>

  </main>
</template>
