<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
const props = defineProps({
  location: Object,
  nearest: String,
  compact: Boolean,
});
const emit = defineEmits(["request-location"]);
const mapElement = ref(null);
const locationName = ref("");
const nearestPoliceName = ref("");
let map;
let marker;
let circle;
let locationRequest;
let helpMarkers = [];
let nearestPolice;

// Emergency-service listings are opened in Google Maps; no unverified local places are shown.
const points = [];
function update() {
  if (!map || !props.location) return;
  const position = [props.location.lat, props.location.lng];
  if (!marker) {
    marker = L.marker(position, {
      icon: L.divIcon({
        className: "user-location-marker",
        html: '<i class="bi bi-crosshair2"></i>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup("<strong>You are here</strong><br>Live location");
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
  const policeStations = points.filter((point) => point.type === "Police");
  nearestPolice = policeStations.reduce((nearest, point) => {
    const distance = Math.hypot(
      (point.lat - props.location.lat) * 111,
      (point.lng - props.location.lng) * 111 *
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
        html: `<i class="bi ${isNearest ? "bi-shield-fill-check" : "bi-shield-fill"}"></i>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
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
    if (error.name !== "AbortError") locationName.value = "Your current position";
  }
}
function openGoogleMaps() {
  const coordinates = props.location
    ? `${props.location.lat},${props.location.lng}`
    : "";
  const url = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`
    : "https://www.google.com/maps";
  window.open(url, "_blank", "noopener,noreferrer");
}
onMounted(() => {
  map = L.map(mapElement.value, { zoomControl: false }).setView(
    [-30.5595, 22.9375],
    5,
  );
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 20,
  }).addTo(map);
  helpMarkers = points.map((point) => {
    const helpMarker = L.marker([point.lat, point.lng], {
      icon: L.divIcon({
        className: "help-marker",
        html: '<i class="bi bi-shield-fill"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    })
      .addTo(map)
      .bindPopup(`<strong>${point.name}</strong><br>${point.type}`);
    return { point, marker: helpMarker };
  });
  update();
  requestAnimationFrame(() => map?.invalidateSize());
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
          Your location appears only after you grant browser permission.
        </p>
        <p v-if="nearestPoliceName" class="nearest-station-label">
          <i class="bi bi-shield-fill-check"></i>
          Nearest police station: <strong>{{ nearestPoliceName }}</strong>
        </p>
      </div>
      <span class="map-status" :class="{ active: location }"
        ><i class="bi bi-circle-fill"></i
        >{{ location ? "Live now" : "Location private" }}</span
      >
    </div>
    <div class="live-map-wrap">
      <div ref="mapElement" class="live-map"></div>
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
      <div class="map-actions">
        <button class="btn btn-track" @click="emit('request-location')">
          <i class="bi bi-crosshair"></i>
          {{ location ? "Refresh location" : "Use my location" }}
        </button>
        <button class="btn btn-outline-plum" @click="openGoogleMaps">
          <i class="bi bi-map"></i> Open Google Maps
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.map-actions { position:absolute; right:16px; bottom:16px; z-index:500; display:flex; gap:8px; flex-wrap:wrap; }
.map-actions .btn { font-size:12px; box-shadow:0 4px 14px rgba(53,21,54,.2); }
@media (max-width: 576px) { .map-actions { left:12px; right:12px; bottom:12px; } .map-actions .btn { flex:1; padding:7px 8px; } }
</style>
