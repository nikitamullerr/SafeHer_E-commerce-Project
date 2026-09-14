<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import LiveMap from "../components/LiveMap.vue";
import { t } from "../languageConfig.js";
import api from "../services/api.js";
import checkinService from "../services/checkinService.js";

const props = defineProps({
  contacts: Array,
  locationReady: Boolean,
  userLocation: Object,
  locationLoading: Boolean,
  locationError: String,
  premiumMembership: Object,
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
const checkInMinutes = ref(0), checkInSeconds = ref(0);
const customCheckinMinutes = ref(30);
const checkInStatus = ref("Not checked in yet");
const checkInStatusText = computed(() => t(checkInStatus.value));
const panicStatus = ref("Ready"), panicCountdown = ref(0);
const selectedPlan = ref("Home mode");
const safetyPlans = ["Home mode", "Travel mode", "Night mode"];
const nightChecklist = ref({ phoneCharged: false, locationReady: false, contactSelected: false, routePlanned: false });
const nightChecklistItems = [
  { key: "phoneCharged", label: "My phone is charged" },
  { key: "locationReady", label: "Location sharing is ready" },
  { key: "contactSelected", label: "A trusted contact is available" },
  { key: "routePlanned", label: "I have planned a safer route" },
];
const nightReadyCount = computed(() => Object.values(nightChecklist.value).filter(Boolean).length);
const tripDestination = ref(""), tripArrival = ref(""), tripDuration = ref(60);
const activeTrip = ref(null), tripNotice = ref("");
const completedCheckins = ref(0), activeCheckin = ref(null);
const hubError = ref(""), hubBusy = ref(false), hubLoading = ref(true);
let timer, panicTimer, pollTimer, expiresAt = 0, clockOffset = 0, loadingState = false, disposed = false;
let lastMissedId = null;

function displayCheckins(checkins, serverTime) {
  clockOffset = serverTime ? Date.parse(serverTime) - Date.now() : clockOffset;
  activeCheckin.value = checkins.find(item => item.status === "active") || null;
  clearInterval(timer);
  if (activeCheckin.value) {
    expiresAt = Date.parse(activeCheckin.value.expires_at);
    checkInStatus.value = "Check-in active";
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now() - clockOffset) / 1000));
      checkInMinutes.value = Math.floor(seconds / 60);
      checkInSeconds.value = seconds % 60;
      if (!seconds) { clearInterval(timer); loadState(); }
    };
    tick(); timer = setInterval(tick, 1000);
  } else {
    checkInMinutes.value = 0; checkInSeconds.value = 0;
    const latest = checkins[0];
    checkInStatus.value = latest?.status === "completed" ? "Check-in completed" : latest?.status === "missed" ? "Check-in missed" : "Not checked in yet";
    if (latest?.status === "missed" && lastMissedId !== latest.id) {
      lastMissedId = latest.id;
      showMissedCheckinAlert();
    }
  }
}
async function loadState() {
  if (loadingState) return;
  loadingState = true;
  try {
    const { data } = await api.get("/safety-hub/state");
    if (disposed) return;
    selectedPlan.value = data.state.selectedPlan;
    nightChecklist.value = data.state.nightChecklist;
    activeTrip.value = data.state.trip;
    completedCheckins.value = data.completedCheckins;
    displayCheckins(data.checkins, data.serverTime);
    hubError.value = "";
  } catch (error) { hubError.value = error.response?.data?.error || "Unable to load your safety data. Please try again."; }
  finally { loadingState = false; hubLoading.value = false; }
}
async function perform(action) {
  if (hubBusy.value || hubLoading.value || loadingState) return false;
  hubBusy.value = true; hubError.value = "";
  try { await action(); await loadState(); return true; }
  catch (error) { hubError.value = error.response?.data?.error || error.message || "Unable to save safety data."; return false; }
  finally { hubBusy.value = false; }
}
async function startTimer(minutes) {
  return perform(() => checkinService.start(Number(minutes)));
}
function adjustCustomCheckin(minutes) { customCheckinMinutes.value = Math.min(240, Math.max(5, customCheckinMinutes.value + minutes)); }
function startCustomCheckin() { return startTimer(customCheckinMinutes.value); }
async function checkInNow() {
  if (!activeCheckin.value) { hubError.value = "Start a check-in before confirming that you are safe."; return false; }
  return perform(() => checkinService.updateStatus(activeCheckin.value.id, "completed"));
}
async function showMissedCheckinAlert() {
  const result = await Swal.fire({ icon: "warning", title: "Check-in missed", text: "Your check-in time has passed. Choose an action.", showDenyButton: true, showCancelButton: true, confirmButtonText: "Send SOS to contacts", denyButtonText: "Start another check-in", cancelButtonText: "Dismiss" });
  if (result.isConfirmed) emit("sos-all");
  else if (result.isDenied) startCustomCheckin();
}
function setSafetyPlan(plan) { return perform(() => api.put("/safety-hub/state", { selectedPlan: plan })); }
async function saveNightChecklist() {
  const saved = await perform(() => api.put("/safety-hub/state", { nightChecklist: { ...nightChecklist.value } }));
  if (!saved) {
    const error = hubError.value;
    await loadState();
    hubError.value = error;
  }
}
function startNightCheckin(minutes) { return startTimer(minutes); }
async function startTrip() {
  if (!tripDestination.value.trim() || !tripArrival.value) { tripNotice.value = "Add a destination and expected arrival time to start your trip."; return; }
  const saved = await perform(() => api.post("/safety-hub/trips", {
    destination: tripDestination.value.trim(), arrival: new Date(tripArrival.value).toISOString(), duration: Number(tripDuration.value),
  }));
  if (saved) tripNotice.value = "Trip and check-in saved to your account.";
}
async function arriveSafely() {
  if (await perform(() => api.post("/safety-hub/trips/arrive"))) tripNotice.value = "Arrival and completed check-in saved.";
}
async function clearTrip() {
  if (await perform(() => api.delete("/safety-hub/trips"))) {
    tripDestination.value = ""; tripArrival.value = "";
    tripNotice.value = "Saved trip cleared. Any active check-in remains running.";
  }
}
function startPanicCountdown() {
  clearInterval(panicTimer); panicCountdown.value = 5; panicStatus.value = "Panic countdown started";
  panicTimer = setInterval(() => {
    if (--panicCountdown.value <= 0) {
      clearInterval(panicTimer); panicStatus.value = "Opening SOS"; emit("sos", { skipCountdown: true });
    }
  }, 1000);
}
function cancelPanicCountdown() { clearInterval(panicTimer); panicCountdown.value = 0; panicStatus.value = "Countdown cancelled"; }
onMounted(async () => {
  await loadState();
  if (disposed) return;
  pollTimer = setInterval(() => { if (!hubBusy.value) loadState(); }, 15000);
});
onBeforeUnmount(() => { disposed = true; clearInterval(timer); clearInterval(panicTimer); clearInterval(pollTimer); });
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
        <small>{{ t("SAFEHER PLAN") }}</small><strong>{{ t(premiumMembership?.name || "Community") }}</strong
        ><span>{{ t("Always protected") }}</span>
      </div>
    </div>
    <p v-if="hubLoading" role="status">{{ t("Loading safety data...") }}</p>
    <p v-if="hubError" role="alert">{{ hubError }} <button @click="loadState">{{ t("Retry") }}</button></p>
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
        ><small>{{ t("This session") }}</small>
        </article>
        <article class="hub-stat">
        <i class="bi bi-shield-fill"></i><strong>{{ completedCheckins }}</strong
        ><b>{{ t("Completed check-ins") }}</b><small>{{ t("Since joining SafeHer") }}</small>
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
          :disabled="hubBusy || hubLoading" @click="setSafetyPlan(plan)"
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
      <div class="mode-checklist"><label v-for="item in nightChecklistItems" :key="item.key"><input v-model="nightChecklist[item.key]" type="checkbox" :disabled="hubBusy || hubLoading" @change="saveNightChecklist" /><span>{{ item.label }}</span><i :class="nightChecklist[item.key] ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i></label></div>
      <div class="mode-action-row"><button v-for="minutes in [15, 30, 60]" :key="minutes" :disabled="hubBusy || hubLoading" @click="startNightCheckin(minutes)">Start {{ minutes }} min check-in</button><button class="btn btn-sos" @click="startPanicCountdown"><i class="bi bi-exclamation-triangle-fill"></i> Quick alert</button></div>
      <small class="mode-tools-note">Quick alert starts the existing five-second SOS countdown; it does not send an alert automatically.</small>
    </section>

    <section v-if="selectedPlan === 'Travel mode'" class="hub-panel mode-tools-panel travel-mode-panel">
      <div class="mode-tools-heading"><span class="mode-tools-icon"><i class="bi bi-airplane-engines-fill"></i></span><div><p class="eyebrow">TRAVEL MODE</p><h2>Share a plan and check in on arrival</h2><p>Save your destination, choose a check-in window, and confirm when you arrive.</p></div></div>
      <form class="trip-form" @submit.prevent="startTrip"><label>Destination<input v-model="tripDestination" required maxlength="120" placeholder="e.g. Rosebank Mall" /></label><label>Expected arrival<input v-model="tripArrival" required type="datetime-local" /></label><label>Check-in window<select v-model.number="tripDuration"><option :value="30">30 minutes</option><option :value="60">60 minutes</option><option :value="90">90 minutes</option></select></label><button class="btn btn-dark-plum" type="submit" :disabled="hubBusy || hubLoading"><i class="bi bi-play-circle"></i> Start trip</button></form>
      <div v-if="activeTrip" class="trip-status" :class="{ complete: !activeTrip.active }"><span><i :class="activeTrip.active ? 'bi bi-geo-alt-fill' : 'bi bi-check-circle-fill'"></i></span><div><strong>{{ activeTrip.active ? `Trip to ${activeTrip.destination}` : `Arrived at ${activeTrip.destination}` }}</strong><small>Expected arrival: {{ new Date(activeTrip.arrival).toLocaleString() }}</small></div><button v-if="activeTrip.active" class="btn btn-dark-plum" :disabled="hubBusy || hubLoading" @click="arriveSafely">I arrived safely</button><button class="hub-mini-action" aria-label="Clear saved trip" :disabled="hubBusy || hubLoading" @click="clearTrip"><i class="bi bi-x-lg"></i></button></div>
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
          :disabled="hubBusy || hubLoading" @click="startTimer(minutes)"
        >
          {{ minutes }} min</button
        ><div class="checkin-custom-time">
          <span>Custom time</span>
          <button type="button" aria-label="Decrease check-in time by five minutes" @click="adjustCustomCheckin(-5)"><i class="bi bi-dash-lg"></i></button>
          <strong>{{ customCheckinMinutes }} min</strong>
          <button type="button" aria-label="Increase check-in time by five minutes" @click="adjustCustomCheckin(5)"><i class="bi bi-plus-lg"></i></button>
          <button type="button" class="checkin-custom-start" :disabled="hubBusy || hubLoading" @click="startCustomCheckin">Start</button>
        </div><button class="btn btn-dark-plum" :disabled="hubBusy || hubLoading" @click="checkInNow">
          <i class="bi bi-check-circle"></i> Check in now
        </button>
        <button class="btn btn-dark-plum" @click="emit('share')">
          <i class="bi bi-send"></i> {{ t("shareRoute") }}
        </button>
      </div>
    </section>

  </main>
</template>
