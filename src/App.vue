<script setup>
import { computed, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import SiteHeader from "./components/SiteHeader.vue";
import CartDrawer from "./components/CartDrawer.vue";
import HomePage from "./pages/HomePage.vue";
import ProductsPage from "./pages/ProductsPage.vue";
import SafetyHubPage from "./pages/SafetyHubPage.vue";
import AuthPage from "./pages/AuthPage.vue";
import InfoPage from "./pages/InfoPage.vue";
import SiteFooter from "./components/SiteFooter.vue";
import { language } from "./languageConfig.js";

const isAuthenticated = ref(
  localStorage.getItem("safeher-authenticated") === "true",
);

// App-level state is shared with the page and component views below.
const activeView = ref(isAuthenticated.value ? "index" : "login");
const cartOpen = ref(false);
const menuOpen = ref(false);
const cart = ref([]);
const contacts = ref([]);
const userLocation = ref(null);
let watcher;
const products = [
  {
    id: 1,
    name: "Smart Panic Button",
    detail: "Wearable GPS alert",
    price: 899,
    icon: "bi-broadcast-pin",
    tone: "rose",
  },
  {
    id: 2,
    name: "Defender Spray",
    detail: "Compact & discreet",
    price: 149,
    icon: "bi-shield-shaded",
    tone: "plum",
  },
  {
    id: 3,
    name: "Safety Whistle",
    detail: "High-decibel alarm",
    price: 79,
    icon: "bi-megaphone",
    tone: "gold",
  },
];
const cartCount = computed(() =>
  cart.value.reduce((sum, item) => sum + item.quantity, 0),
);
const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
);
const locationReady = computed(() => Boolean(userLocation.value));
const nearest = computed(() =>
  locationReady.value
    ? "Your exact location is active"
    : "Use live tracking to locate yourself",
);

// Navigation is kept here so every view uses the same route behavior.
function navigate(view) {
  if (!isAuthenticated.value && view !== "login" && view !== "registration")
    return;
  if (view === "contact") view = "services";
  activeView.value = view;
  menuOpen.value = false;
  cartOpen.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function addToCart(product) {
  const existing = cart.value.find((item) => item.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.value.push({ ...product, quantity: 1 });
  Swal.fire({
    toast: true,
    position: "top-end",
    timer: 1800,
    showConfirmButton: false,
    icon: "success",
    title: `${product.name} added to your bag`,
    background: "#351536",
    color: "#fff",
  });
}
function changeQuantity(item, amount) {
  item.quantity += amount;
  if (item.quantity <= 0) removeFromCart(item.id);
}
function removeFromCart(id) {
  cart.value = cart.value.filter((item) => item.id !== id);
}
function startTracking() {
  if (!navigator.geolocation) return;
  watcher = navigator.geolocation.watchPosition(
    ({ coords }) => {
      userLocation.value = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      };
    },
    () =>
      Swal.fire({
        toast: true,
        position: "top-end",
        timer: 2200,
        showConfirmButton: false,
        icon: "error",
        title: "Location permission is required",
      }),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
  );
}

// The browser asks for permission only when the user starts tracking.
function toggleTracking() {
  if (userLocation.value && watcher !== undefined) {
    navigator.geolocation.clearWatch(watcher);
    watcher = undefined;
    userLocation.value = null;
  } else startTracking();
}
function showSos() {
  Swal.fire({
    title: "Send an SOS?",
    text: "Your trusted contacts and nearby help will be alerted.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Send SOS now",
    confirmButtonColor: "#d92d36",
    cancelButtonColor: "#351536",
  }).then((result) => {
    if (result.isConfirmed)
      Swal.fire({
        title: "SOS activated",
        text: "Your safety circle has been notified.",
        icon: "success",
        confirmButtonColor: "#351536",
      });
  });
}
function addContact(event) {
  const form = new FormData(event.target);
  contacts.value.push({
    id: Date.now(),
    name: form.get("name"),
    phone: form.get("phone"),
    relationship: form.get("relationship"),
  });
  localStorage.setItem(
    "safeher-emergency-contacts",
    JSON.stringify(contacts.value),
  );
  event.target.reset();
  Swal.fire({
    toast: true,
    position: "top-end",
    timer: 1800,
    showConfirmButton: false,
    icon: "success",
    title: "Emergency contact added",
  });
}
function removeContact(id) {
  contacts.value = contacts.value.filter((contact) => contact.id !== id);
  localStorage.setItem(
    "safeher-emergency-contacts",
    JSON.stringify(contacts.value),
  );
}
function shareRoute() {
  if (!userLocation.value || !contacts.value.length) {
    Swal.fire({
      title: !userLocation.value
        ? "Start live tracking first"
        : "Add an emergency contact",
      icon: "info",
      confirmButtonColor: "#351536",
    });
    return;
  }
  const link = `https://www.google.com/maps/dir/?api=1&destination=${userLocation.value.lat},${userLocation.value.lng}`;
  const body = `SafeHer alert: please check in on me. My live location: ${link}`;
  window.location.href = `sms:${contacts.value.map((contact) => contact.phone).join(",")}?body=${encodeURIComponent(body)}`;
}
function checkout() {
  Swal.fire({
    title: "Order confirmed",
    text: `Your R${cartTotal.value.toLocaleString()} order is ready for confirmation.`,
    icon: "success",
    confirmButtonColor: "#351536",
  });
  cart.value = [];
  cartOpen.value = false;
}
function authenticated(email) {
  isAuthenticated.value = true;
  localStorage.setItem("safeher-authenticated", "true");
  if (email) localStorage.setItem("safeher-client-email", email);
  activeView.value = "index";
}
function logout() {
  isAuthenticated.value = false;
  localStorage.removeItem("safeher-authenticated");
  activeView.value = "login";
}
onMounted(() => {
  try {
    contacts.value = JSON.parse(
      localStorage.getItem("safeher-emergency-contacts") || "[]",
    );
  } catch {
    contacts.value = [];
  }
});
</script>

<template>
  <div class="app-shell">
    <AuthPage
      v-if="!isAuthenticated"
      :mode="activeView === 'registration' ? 'registration' : 'login'"
      @navigate="navigate"
      @authenticated="authenticated"
    />
    <template v-else>
      <SiteHeader
        :active-view="activeView"
        :menu-open="menuOpen"
        :language="language"
        :cart-count="cartCount"
        @navigate="navigate"
        @toggle-menu="menuOpen = !menuOpen"
        @update:language="language = $event"
        @toggle-cart="cartOpen = !cartOpen"
        @logout="logout"
      />
      <CartDrawer
        :open="cartOpen"
        :cart="cart"
        :total="cartTotal"
        @toggle="cartOpen = !cartOpen"
        @quantity="changeQuantity"
        @remove="removeFromCart"
        @checkout="checkout"
        @shop="navigate('products')"
      />
      <HomePage
        v-if="activeView === 'index'"
        :location-ready="locationReady"
        :user-location="userLocation"
        :nearest="nearest"
        @sos="showSos"
        @track="toggleTracking"
        @navigate="navigate"
      />
      <ProductsPage
        v-else-if="activeView === 'products'"
        :products="products"
        @add="addToCart"
      />
      <SafetyHubPage
        v-else-if="activeView === 'safetyhub'"
        :contacts="contacts"
        :location-ready="locationReady"
        :user-location="userLocation"
        @add-contact="addContact"
        @remove-contact="removeContact"
        @share="shareRoute"
        @track="toggleTracking"
        @sos="showSos"
      />
      <InfoPage v-else :view="activeView" @sos="showSos" />
      <SiteFooter @navigate="navigate" />
    </template>
  </div>
</template>
