<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import L from "leaflet";
const props = defineProps({
  location: Object,
  nearest: String,
  compact: Boolean,
  loading: Boolean,
  error: String,
});
const emit = defineEmits(["locate"]);
const mapElement = ref(null);
const locationName = ref("");
const nearestPoliceName = ref("");
let map;
let marker;
let circle;
let locationRequest;
let helpMarkers = [];
let nearestPolice;

// These are the local response points shown until a map service supplies live places.
const points = [
  {
    name: "Cape Town Central Police Station",
    type: "Police",
    lat: -33.9249,
    lng: 18.4241,
  },
  {
    name: "Cape Town Mediclinic",
    type: "Ambulance & medical",
    lat: -33.9295,
    lng: 18.4107,
  },
  {
    name: "SafeHer Community Response",
    type: "Trusted help",
    lat: -33.918,
    lng: 18.431,
  },
];
function update() {
  if (!map || !props.location) return;
  const position = [props.location.lat, props.location.lng];
  if (!marker) {
    marker = L.marker(position, {
      icon: L.divIcon({
        className: "user-location-marker",
        html: '<div class="pin-marker"><i class="bi bi-geo-alt-fill"></i></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48],
      }),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup("<strong>You are here</strong>");
    circle = L.circle(position, {
      radius: props.location.accuracy,
      color: "#d92d36",
      fillColor: "#d92d36",
      fillOpacity: 0.12,
    }).addTo(map);
  } else {
    marker.setLatLng(position);
    circle.setLatLng(position).setRadius(props.location.accuracy);
  }
  marker.openPopup();
  const policeStations = points.filter((point) => point.type === "Police");
  nearestPolice = policeStations.reduce((nearest, point) => {
    const distance = Math.hypot(
      (point.lat - props.location.lat) * 111,
      (point.lng - props.location.lng) *
        111 *
        Math.cos((props.location.lat * Math.PI) / 180),
    );
    return !nearest || distance < nearest.distance
      ? { point, distance }
      : nearest;
  }, null);
  nearestPoliceName.value = nearestPolice?.point.name || "";
  helpMarkers.forEach(({ point, marker: helpMarker }) => {
    const isNearest = point === nearestPolice?.point;
    helpMarker.setIcon(
      L.divIcon({
        className: `help-marker${isNearest ? " nearest-police-marker" : ""}`,
        html: `<div class="pin-marker help-pin"><i class="bi ${isNearest ? "bi-shield-fill-check" : "bi-shield-fill"}"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      }),
    );
    if (isNearest) {
      helpMarker.bindPopup(
        `<strong>Nearest police station</strong><br>${point.name}`,
      );
    } else {
      helpMarker.bindPopup(`<strong>${point.name}</strong><br>${point.type}`);
    }
  });
  map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
}
async function findLocationName(location) {
  if (!location) {
    locationName.value = "";
    return;
  }
  const request = new AbortController();
  locationRequest?.abort();
  locationRequest = request;
  locationName.value = "Finding your location...";
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" }, signal: request.signal },
    );
    if (!response.ok) throw new Error("Location lookup failed");
    const result = await response.json();
    locationName.value = result.display_name || "Your current position";
  } catch (error) {
    if (error.name !== "AbortError")
      locationName.value = "Your current position";
  }
}
onMounted(async () => {
  await nextTick();

  if (!mapElement.value) return;

  // Start near the local help points until the user shares their location.
  map = L.map(mapElement.value, {
    zoomControl: false,
    preferCanvas: false,
    attributionControl: true,
  }).setView([-33.9249, 18.4241], 12);

  // Add zoom control
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Add tile layer with better error handling
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
    maxZoom: 19,
    crossOrigin: true,
  }).addTo(map);

  // Add markers
  helpMarkers = points.map((point) => {
    const helpMarker = L.marker([point.lat, point.lng], {
      icon: L.divIcon({
        className: "help-marker",
        html: '<div class="pin-marker help-pin"><i class="bi bi-shield-fill"></i></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      }),
    })
      .addTo(map)
      .bindPopup(`<strong>${point.name}</strong><br>${point.type}`);
    return { point, marker: helpMarker };
  });

  // Update map with location and invalidate size
  update();

  await nextTick();
  map?.invalidateSize();
});
watch(
  () => props.location,
  (location) => {
    update();
    findLocationName(location);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  locationRequest?.abort();
  map?.remove();
});
</script>
<template>
  <section
    class="live-map-section container-fluid px-4 px-xl-5"
    :class="{ 'compact-map': compact }"
  >
    <div class="map-heading">
      <div>
        <p class="eyebrow">LIVE SAFETY MAP</p>
        <h2>See your surroundings.</h2>
        <p>
          Track your position and find nearby police, ambulance and trusted
          SafeHer help.
        </p>
        <p v-if="nearestPoliceName" class="nearest-station-label">
          <i class="bi bi-shield-fill-check"></i>
          Nearest police station: <strong>{{ nearestPoliceName }}</strong>
        </p>
      </div>
      <span class="map-status" :class="{ active: location }"
        ><i class="bi bi-circle-fill"></i
        >{{ location ? "LIVE LOCATION" : "Map ready" }}</span
      >
    </div>
    <div class="live-map-wrap">
      <div ref="mapElement" class="live-map"></div>
      <div class="map-actions">
        <button
          class="map-locate-button"
          :disabled="loading"
          @click="emit('locate')"
        >
          <i
            :class="loading ? 'bi bi-arrow-repeat spin' : 'bi bi-crosshair2'"
          ></i>
          {{ loading ? "Finding location..." : "Use My Location" }}
        </button>
        <a
          v-if="location"
          class="map-google-button"
          :href="`https://www.google.com/maps?q=${location.lat},${location.lng}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i class="bi bi-box-arrow-up-right"></i> OPEN GOOGLE MAPS
        </a>
      </div>
      <div class="map-overlay">
        <i class="bi bi-crosshair2"></i
        ><span
          ><strong>{{
            location ? "You are here" : "Your location is private"
          }}</strong
          ><small>{{
            location
              ? `${locationName || "Your current position"} · ±${Math.round(location.accuracy)}m`
              : "Use live tracking to locate yourself"
          }}</small></span
        >
      </div>
      <p v-if="error" class="map-location-error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.live-map-section {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.map-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.map-heading > div {
  flex: 1;
}

.map-heading h2 {
  margin: 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.map-heading p {
  margin: 0.5rem 0;
  color: #756d76;
  font-size: 0.95rem;
}

.nearest-station-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  color: #2e9e5b;
  font-weight: 600;
}

.map-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: #f3f1f5;
  color: #756d76;
  font-size: 0.9rem;
  white-space: nowrap;
}

.map-status.active {
  background: #fee7e8;
  color: #d92d36;
}

.map-status i {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.map-status.active i {
  background: #d92d36;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%,
  49%,
  100% {
    opacity: 1;
  }
  50%,
  99% {
    opacity: 0.3;
  }
}

.live-map-wrap {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex: 1;
}

.live-map {
  width: 100% !important;
  height: 100% !important;
  background: #f3f1f5;
  position: relative;
}

/* Ensure Leaflet container displays properly */
.live-map-wrap .leaflet-container {
  width: 100% !important;
  height: 100% !important;
  background: #f3f1f5;
}

.live-map-wrap .leaflet-pane {
  z-index: inherit;
}

.live-map-wrap .leaflet-tile-pane {
  z-index: 200;
}

.map-overlay {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.8);
  z-index: 400;
  max-width: 350px;
}

.map-actions {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 800;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.map-locate-button,
.map-google-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 42px;
  padding: 0.6rem 0.85rem;
  border: 0;
  border-radius: 10px;
  background: #351536;
  color: #fff;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(53, 21, 54, 0.25);
  text-decoration: none;
  cursor: pointer;
}

.map-locate-button:hover,
.map-google-button:hover {
  background: #d92d36;
  color: #fff;
}
.map-locate-button:disabled {
  cursor: wait;
  opacity: 0.8;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.map-location-error {
  position: absolute;
  top: 68px;
  left: 16px;
  z-index: 800;
  max-width: min(360px, calc(100% - 32px));
  margin: 0;
  padding: 0.6rem 0.75rem;
  border-radius: 9px;
  background: #fff1f1;
  color: #a11c25;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

.map-overlay i {
  color: #d92d36;
  font-size: 1.25rem;
}

.map-overlay span {
  display: flex;
  flex-direction: column;
}

.map-overlay strong {
  display: block;
  color: #351536;
  font-weight: 600;
  font-size: 0.95rem;
}

.map-overlay small {
  display: block;
  color: #756d76;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.compact-map .live-map-wrap {
  height: 350px;
}

@media (max-width: 575.98px) {
  .live-map-wrap {
    height: 420px;
  }
  .compact-map .live-map-wrap {
    height: 320px;
  }
  .map-actions {
    right: 12px;
    left: 12px;
  }
  .map-locate-button,
  .map-google-button {
    flex: 1;
    justify-content: center;
  }
  .map-overlay {
    right: 12px;
    bottom: 12px;
    left: 12px;
    max-width: none;
  }
  .map-location-error {
    top: 114px;
    left: 12px;
    max-width: calc(100% - 24px);
  }
}
</style>

<style>
/* Global styles for Leaflet pin markers - not scoped */
.pin-marker {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(135deg, #d92d36 0%, #b8202a 100%) !important;
  border-radius: 50% 50% 50% 0 !important;
  transform: rotate(-45deg) !important;
  box-shadow:
    0 2px 8px rgba(217, 45, 54, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  border: 2px solid #fff !important;
}

.pin-marker i {
  transform: rotate(45deg) !important;
  color: white !important;
  font-size: 24px !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

.help-pin {
  background: linear-gradient(135deg, #351536 0%, #5a4d5c 100%) !important;
  box-shadow:
    0 2px 8px rgba(53, 21, 54, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
}

.help-pin i {
  font-size: 20px !important;
}

.nearest-police-marker .pin-marker {
  background: linear-gradient(135deg, #2e9e5b 0%, #1f6b3c 100%) !important;
  box-shadow:
    0 2px 12px rgba(46, 158, 91, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow:
      0 2px 12px rgba(46, 158, 91, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow:
      0 2px 16px rgba(46, 158, 91, 0.8),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
}

/* Ensure Leaflet displays properly */
.leaflet-pane {
  pointer-events: none;
}

.leaflet-pane > * {
  pointer-events: auto;
}

.leaflet-tile-pane {
  z-index: 200 !important;
}

.leaflet-overlay-pane {
  z-index: 400 !important;
}

.leaflet-shadow-pane {
  z-index: 350 !important;
}

.leaflet-marker-pane {
  z-index: 600 !important;
}

.leaflet-popup-pane {
  z-index: 700 !important;
}

.leaflet-control {
  z-index: 800 !important;
}
</style>
