<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
const props = defineProps({
  location: Object,
  nearest: String,
  compact: Boolean,
});
const mapElement = ref(null);
let map;
let marker;
let circle;

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
    marker = L.marker(position)
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
  map.setView(position, 14);
}
onMounted(() => {
  map = L.map(mapElement.value, { zoomControl: false }).setView(
    [-33.9249, 18.4241],
    13,
  );
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  points.forEach((point) =>
    L.marker([point.lat, point.lng])
      .addTo(map)
      .bindPopup(`<strong>${point.name}</strong><br>${point.type}`),
  );
  update();
});
watch(() => props.location, update);
onBeforeUnmount(() => map?.remove());
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
      </div>
      <span class="map-status" :class="{ active: location }"
        ><i class="bi bi-circle-fill"></i
        >{{ location ? "Live now" : "Map ready" }}</span
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
              ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} · ±${Math.round(location.accuracy)}m`
              : "Use live tracking to locate yourself"
          }}</small></span
        >
      </div>
    </div>
  </section>
</template>
