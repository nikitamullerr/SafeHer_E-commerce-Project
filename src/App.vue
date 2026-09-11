<script setup>
import { t } from "./languageConfig.js";
import { computed, onMounted, ref, watch } from "vue";
import Swal from "./services/localizedSwal.js";
import SiteHeader from "./components/SiteHeader.vue";
import CartDrawer from "./components/CartDrawer.vue";
import CheckoutModal from "./components/CheckoutModal.vue";
import HomePage from "./pages/HomePage.vue";
import ProductsPage from "./pages/ProductsPage.vue";
import AllProductsPage from "./pages/AllProductsPage.vue";
import SafetyHubPage from "./pages/SafetyHubPage.vue";
import PremiumVideosPage from "./pages/PremiumVideosPage.vue";
import PremiumPackagesPage from "./pages/PremiumPackagesPage.vue";
import ReviewsPage from "./pages/ReviewsPage.vue";
import OrdersPage from "./pages/OrdersPage.vue";
import AuthPage from "./pages/AuthPage.vue";
import InfoPage from "./pages/InfoPage.vue";
import SiteFooter from "./components/SiteFooter.vue";
import SafeHerAI from "./components/SafeHerAI.vue";
import SOSEffect from "./components/SOSEffect.vue";
import PaymentSuccessPage from "./pages/PaymentSuccessPage.vue";
import PaymentCancelledPage from "./pages/PaymentCancelledPage.vue";
import { language, supportedLanguages } from "./languageConfig.js";
import { assessDangerLevel } from "./services/dangerAssessment.js";
import api from "./services/api.js";
import { publicViews, authViews, memberViews, normalizeView, resolveView } from "./services/viewAccess.js";

const isAuthenticated = ref(
  Boolean(localStorage.getItem("safeher-token")),
);
const darkMode = ref(localStorage.getItem("safeher-dark-mode") === "true");

function readSession(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveSession(key, value) {
  try { value === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing still works when storage is blocked. */ }
}
const restoredAction = readSession("safeher-after-login", null);
const pendingAction = ref(restoredAction && (
  (restoredAction.type === "view" && (memberViews.has(restoredAction.view) || restoredAction.view === "packages")) ||
  (restoredAction.type === "checkout" && ["payfast", "card_demo"].includes(restoredAction.method))
) ? restoredAction : null);
watch(pendingAction, value => saveSession("safeher-after-login", value), { deep: true, flush: "sync" });
const savedView = localStorage.getItem("safeher-active-view");
const paymentReturnView = window.location.pathname === "/payment-success"
  ? "payment-success" : window.location.pathname === "/payment-cancel" ? "payment-cancel" : null;
const sessionView = readSession("safeher-browse-view", null);
const requestedView = paymentReturnView || (isAuthenticated.value ? savedView : pendingAction.value ? "login" : authViews.has(sessionView) ? sessionView : publicViews.has(savedView) ? savedView : "index") || "index";
const activeView = ref(resolveView(requestedView, isAuthenticated.value));
if (activeView.value === "login" && memberViews.has(requestedView)) pendingAction.value = { type: "view", view: requestedView };
const showingAuth = computed(() => authViews.has(activeView.value));
const cartOpen = ref(false);
const menuOpen = ref(false);
const sosActive = ref(false);
const restoredCart = readSession("safeher-browse-cart", []);
const cart = ref(Array.isArray(restoredCart) ? restoredCart.filter(item => item && Number.isInteger(item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100 && Number.isFinite(Number(item.price))) : []);
watch(cart, value => saveSession("safeher-browse-cart", value), { deep: true });
const contacts = ref([]);
const userLocation = ref(null);
const locationLoading = ref(false);
const locationError = ref("");

const products = ref([]);
const productsLoading = ref(true);
const productsError = ref("");
async function loadProducts() {
  productsLoading.value = true;
  productsError.value = "";
  try {
    const { data } = await api.get("/products");
    if (!data.success || !Array.isArray(data.products)) throw new Error("Invalid product response");
    products.value = data.products;
  } catch {
    products.value = [];
    productsError.value = "Could not load the store. Check the backend and try again.";
  } finally { productsLoading.value = false; }
}

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

function readPremiumMembership() {
  if (!isAuthenticated.value) return null;
  const email = localStorage.getItem("safeher-client-email");
  if (!email) return null;
  try {
    const memberships = JSON.parse(
      localStorage.getItem("safeher-premium-memberships") || "{}",
    );
    const membership = memberships[email];
    return membership ? { ...membership, email } : null;
  } catch {
    return null;
  }
}
const premiumMembership = ref(readPremiumMembership());
const hasPremiumAccess = computed(() =>
  Boolean(
    premiumMembership.value?.expiresAt &&
    new Date(premiumMembership.value.expiresAt) > new Date(),
  ),
);

function updatePremiumMembership(membership) {
  premiumMembership.value = membership
    ? { ...membership, email: localStorage.getItem("safeher-client-email") }
    : null;
}

function showPremiumSafetyCheck() {
  if (!hasPremiumAccess.value) return;
  if (!navigator.geolocation) {
    // No geolocation API at all — still show a time-based advisory.
    const assessment = assessDangerLevel(null);
    showDangerAlert(assessment, true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const assessment = assessDangerLevel({
        lat: coords.latitude,
        lng: coords.longitude,
      });
      showDangerAlert(assessment, false);
    },
    () => {
      // Location denied or unavailable — still show a time-based advisory
      // so Premium members always receive their sign-in danger alert.
      const assessment = assessDangerLevel(null);
      showDangerAlert(assessment, true);
    },
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
  );
}

function showDangerAlert(assessment, locationUnavailable) {
  const zoneLabel =
    assessment.zone && assessment.zone.distance <= assessment.zone.radiusKm
      ? assessment.zone.label
      : null;
  const factorRows = [
    {
      label: "Time of day",
      value: assessment.factors.time.band,
      points: assessment.factors.time.points,
    },
    {
      label: "Weekend uplift",
      value: assessment.factors.day > 0 ? "Weekend" : "Weekday",
      points: assessment.factors.day,
    },
    {
      label: "Distance to help",
      value: `~${assessment.factors.helpDistanceKm} km`,
      points:
        assessment.factors.helpDistanceKm > 2
          ? assessment.factors.zone > 0
            ? assessment.factors.zone
            : 8
          : 0,
    },
    {
      label: "Advisory zone",
      value:
        zoneLabel ||
        (assessment.zone
          ? t("{distance} km from {place}", { distance: assessment.zone.distance.toFixed(1), place: assessment.zone.label })
          : "None"),
      points: assessment.factors.zone,
    },
    {
      label: "Visibility",
      value: assessment.factors.weather > 0 ? "Rainy season" : "Clear season",
      points: assessment.factors.weather,
    },
  ].filter((row) => row.value);

  Swal.fire({
    title: "Your Premium danger alert",
    html: `
      <div style="font-family: 'DM Sans', sans-serif; text-align:left;">
        ${
          locationUnavailable
            ? `
          <div style="display:flex; align-items:center; gap:8px; background:#fdf3e2; border:1px solid #f0d9a8; border-radius:10px; padding:9px 12px; margin-bottom:12px; font-size:12px; color:#8a5a12;">
            <i class="bi bi-geo-alt-fill"></i>
            <span>${t("Location unavailable - this advisory uses time of day only. Allow location access to get a precise location-based danger level.")}</span>
          </div>
        `
            : ""
        }
        <div style="text-align:center; margin-bottom:14px;">
          <span style="display:inline-flex; align-items:center; gap:8px; background:${assessment.chip}; color:${assessment.color}; border:1px solid ${assessment.ring}33; border-radius:999px; padding:8px 16px; font-weight:800; font-size:14px; letter-spacing:0.02em;">
            <i class="bi ${assessment.icon}" style="font-size:16px;"></i>
            ${t("{level} danger level at your location", { level: t(assessment.level) })}
          </span>
        </div>

        <div style="background:${assessment.chip}; border:1px solid ${assessment.ring}30; border-radius:12px; padding:14px 16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:8px;">
            <span style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${assessment.color};">Danger index</span>
            <span style="font-size:20px; font-weight:800; color:${assessment.color};">${assessment.score}/100</span>
          </div>
          <div style="position:relative; height:10px; border-radius:999px; background:linear-gradient(90deg, #2e9e5b 0%, #e8a13c 40%, #d92d36 70%, #8e0f16 100%); overflow:visible;">
            <div style="position:absolute; top:50%; left:${assessment.marker}%; transform:translate(-50%, -50%); width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid ${assessment.ring}; box-shadow:0 2px 6px rgba(0,0,0,0.25);" title="${assessment.score}/100"></div>
          </div>
        </div>

        <p style="margin:0 0 12px; font-size:13px; line-height:1.6; color:#5a4d5c;">${t(assessment.guidance)}</p>

        ${
          factorRows.length
            ? `
          <div style="background:#f9f4fb; border:1px solid #ecd9ef; border-radius:12px; padding:10px 14px; margin-bottom:12px;">
            <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#756d76; margin-bottom:6px;">What this is based on</div>
            ${factorRows
              .map(
                (row) => `
              <div style="display:flex; justify-content:space-between; gap:10px; font-size:12px; padding:4px 0; color:#5a4d5c;">
                <span>${t(row.label)}</span>
                <strong style="color:#351536;">${t(row.value)}${row.points > 0 ? ` · +${row.points}` : ""}</strong>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }

        <small style="display:block; color:#756d76; line-height:1.5; font-size:11px;">This advisory is generated from your location, time of day and distance to nearby help points. It is not live crime or emergency data. Always call emergency services if you are in immediate danger.</small>
      </div>
    `,
    confirmButtonText: "I understand",
    confirmButtonColor: "#351536",
    width: 480,
  });
}

function schedulePremiumSafetyCheck() {
  window.setTimeout(showPremiumSafetyCheck, 5000);
}

// ----- Navigation -----
function requireSignIn(action) {
  pendingAction.value = action;
  activeView.value = "login";
  menuOpen.value = false;
  cartOpen.value = false;
  checkoutOpen.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function navigate(view) {
  view = normalizeView(view);
  if (!isAuthenticated.value && memberViews.has(view)) {
    requireSignIn({ type: "view", view });
    return;
  }
  if (isAuthenticated.value && authViews.has(view)) view = "index";
  if (view === "packages" && isAuthenticated.value && hasPremiumAccess.value) view = "videos";
  if (!authViews.has(view)) pendingAction.value = null;
  activeView.value = view;
  localStorage.setItem("safeher-active-view", view);
  saveSession("safeher-browse-view", view);
  menuOpen.value = false;
  cartOpen.value = false;
  if (paymentReturnView && view !== paymentReturnView && !authViews.has(view)) history.replaceState({}, "", "/");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value;
  localStorage.setItem("safeher-dark-mode", String(darkMode.value));
}

// ----- Cart -----
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
    title: t("{product} added to your bag", { product: product.name }),
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

// ----- Location & SOS -----
function startTracking() {
  if (!isAuthenticated.value) return requireSignIn({ type: "view", view: "safetyhub" });
  if (!navigator.geolocation) {
    locationError.value = "Location is not supported by this browser.";
    return;
  }

  locationLoading.value = true;
  locationError.value = "";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      userLocation.value = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      };
      locationLoading.value = false;
    },
    (error) => {
      locationLoading.value = false;
      locationError.value =
        error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Please allow it and try again."
          : "We could not get your location. Please try again.";
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
  );
}
function toggleTracking() {
  startTracking();
}
async function showSos() {
  if (!isAuthenticated.value) return requireSignIn({ type: "view", view: "safetyhub" });
  if (Swal.isVisible()) return;
  sosActive.value = true;
  const countdownSeconds = 5;
  let countdownTimer;
  await Swal.fire({
    title: "SOS activating",
    html: `SOS countdown: <strong id="sos-countdown">${countdownSeconds}</strong> seconds. No alert is sent automatically.`,
    icon: "warning",
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "Cancel SOS",
    cancelButtonColor: "#351536",
    timer: countdownSeconds * 1000,
    timerProgressBar: true,
    didOpen: () => {
      let secondsLeft = countdownSeconds;
      countdownTimer = setInterval(() => {
        const counter = Swal.getHtmlContainer()?.querySelector("#sos-countdown");
        if (counter) counter.textContent = String(Math.max(--secondsLeft, 0));
      }, 1000);
    },
    willClose: () => clearInterval(countdownTimer),
  });
  sosActive.value = false;

}

// ----- Contacts -----
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
function callContact(contact) {
  if (!contact?.phone) return;
  window.location.href = `tel:${contact.phone}`;
}
function messageContact(contact) {
  if (!contact?.phone) return;
  const body = "I’m checking in — please confirm you received my message.";
  window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(body)}`;
}
function contactTrustedPerson() {
  if (!contacts.value.length) {
    navigate("safetyhub");
    Swal.fire({
      icon: "info",
      title: "Add a trusted contact",
      text: "Add one in Safety Hub, then SafeHer AI can help you check in with them.",
      confirmButtonColor: "#351536",
    });
    return;
  }
  messageContact(contacts.value[0]);
}

// ----- Checkout -----
const checkoutOpen = ref(false);
const checkoutMethod = ref("payfast");
function checkout() {
  if (!cart.value.length) return;
  if (!isAuthenticated.value) return requireSignIn({ type: "checkout", method: "payfast" });
  checkoutMethod.value = "payfast";
  checkoutOpen.value = true;
  cartOpen.value = false;
}
function openCardPayment() {
  if (!cart.value.length) return;
  if (!isAuthenticated.value) return requireSignIn({ type: "checkout", method: "card_demo" });
  checkoutMethod.value = "card_demo";
  checkoutOpen.value = true;
  cartOpen.value = false;
}
function checkoutComplete(result) {
  checkoutOpen.value = false;
  cart.value = [];
  navigate("orders");
  if (result.simulated) Swal.fire({ icon: "info", title: "Demo order created", text: result.emailSent ? "No money was charged. A labelled demo confirmation was sent to your account email." : "No money was charged. The email could not be sent; use Send demo confirmation in your order history to retry.", confirmButtonColor: "#351536" });
}

// ----- Auth -----
function authenticated(user) {
  const email = typeof user === "string" ? user : user?.email;
  isAuthenticated.value = true;
  localStorage.setItem("safeher-authenticated", "true");
  if (email) localStorage.setItem("safeher-client-email", email);
  premiumMembership.value = readPremiumMembership();
  loadContacts();
  const action = pendingAction.value;
  pendingAction.value = null;
  navigate(action?.type === "view" ? action.view : "index");
  if (action?.type === "checkout" && cart.value.length) {
    checkoutMethod.value = action.method;
    checkoutOpen.value = true;
  }
}

function logout() {
  localStorage.removeItem("safeher-token");
  localStorage.removeItem("safeher-user");
  localStorage.removeItem("safeher-client-email");
  isAuthenticated.value = false;
  localStorage.removeItem("safeher-authenticated");
  localStorage.removeItem("safeher-active-view");
  premiumMembership.value = null;
  pendingAction.value = null;
  contacts.value = [];
  userLocation.value = null;
  sosActive.value = false;
  checkoutOpen.value = false;
  cart.value = [];
  navigate("index");
}

// ----- Page component mapping for transitions -----
const pageComponentMap = {
  index: HomePage,
  products: ProductsPage,
  "store-all": AllProductsPage,
  safetyhub: SafetyHubPage,
  videos: PremiumVideosPage,
  packages: PremiumPackagesPage,
  reviews: ReviewsPage,
  orders: OrdersPage,
  "payment-success": PaymentSuccessPage,
  "payment-cancel": PaymentCancelledPage,
  // 'services' is handled by InfoPage with view prop
  // 'contact' is redirected to services
};
// InfoPage handles any other views (services, guide, etc.)
const currentPageComponent = computed(() => {
  if (
    activeView.value === "services" ||
    activeView.value === "guide" ||
    activeView.value === "contact"
  ) {
    return InfoPage;
  }
  return pageComponentMap[activeView.value] || InfoPage;
});

// Props and events passed to the dynamic page
const pageProps = computed(() => ({
  view: activeView.value,
  isAuthenticated: isAuthenticated.value,
  locationReady: locationReady.value,
  userLocation: userLocation.value,
  locationLoading: locationLoading.value,
  locationError: locationError.value,
  nearest: nearest.value,
  products: products.value,
  contacts: contacts.value,
  email: isAuthenticated.value ? localStorage.getItem("safeher-client-email") : "",
  premiumMembership: premiumMembership.value,
}));

const pageEvents = {
  sos: showSos,
  track: toggleTracking,
  navigate: navigate,
  add: addToCart,
  "add-contact": addContact,
  "remove-contact": removeContact,
  share: shareRoute,
  "call-contact": callContact,
  "message-contact": messageContact,
  "premium-updated": updatePremiumMembership,
  "require-auth": () => requireSignIn({ type: "view", view: "packages" }),
};

// ----- Lifecycle -----
function loadContacts() {
  if (!isAuthenticated.value) return;
  try {
    contacts.value = JSON.parse(
      localStorage.getItem("safeher-emergency-contacts") || "[]",
    );
  } catch {
    contacts.value = [];
  }

}
onMounted(() => {
  if (isAuthenticated.value && (pendingAction.value || showingAuth.value)) authenticated(localStorage.getItem("safeher-client-email"));
  loadContacts();
  loadProducts();
});
</script>

<template>
  <div class="app-shell" :class="{ 'dark-mode': darkMode, 'auth-view': showingAuth }">
    <div v-if="showingAuth" class="auth-language">
      <button class="btn btn-outline-plum browse-return" @click="navigate('index')">{{ t("Continue browsing") }}</button>
      <label for="auth-language" class="visually-hidden">{{ t('Language') }}</label>
      <select id="auth-language" v-model="language">
        <option v-for="option in supportedLanguages" :key="option" :value="option">{{ option }}</option>
      </select>
    </div>
    <AuthPage
      v-if="showingAuth"
      :notice="pendingAction ? t('Sign in or create an account to continue. Your shopping bag will be kept.') : ''"
      :mode="activeView === 'registration' ? 'registration' : 'login'"
      @navigate="navigate"
      @authenticated="authenticated"
      @sign-in-notification-complete="schedulePremiumSafetyCheck"
    />
    <template v-else>
      <SiteHeader
        :active-view="activeView"
        :is-authenticated="isAuthenticated"
        :menu-open="menuOpen"
        :language="language"
        :cart-count="cartCount"
        :dark-mode="darkMode"
        @navigate="navigate"
        @toggle-menu="menuOpen = !menuOpen"
        @update:language="language = $event"
        @toggle-cart="cartOpen = !cartOpen"
        @logout="logout"
        @toggle-dark-mode="toggleDarkMode"
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
        @card-payment="openCardPayment"
      />
      <section v-if="['products', 'store-all'].includes(activeView)" class="container-fluid px-4 py-3" aria-live="polite">
        <p v-if="productsLoading" role="status">{{ t("Loading products...") }}</p>
        <div v-else-if="productsError" role="alert"><p>{{ t(productsError) }}</p><button class="btn btn-outline-plum" @click="loadProducts">{{ t("Retry loading products") }}</button></div>
        <p v-else-if="!products.length">{{ t("No products are available right now.") }}</p>
      </section>
      <!--  PAGE TRANSITION  -->
      <Transition name="page" mode="out-in">
        <component
          :is="currentPageComponent"
          :key="activeView"
          v-bind="pageProps"
          v-on="pageEvents"
        />
      </Transition>

      <SiteFooter @navigate="navigate" />
      <SOSEffect :active="sosActive" @complete="sosActive = false" />
      <SafeHerAI
        v-if="isAuthenticated"
        :location="userLocation"
        :contacts="contacts"
        :has-premium-access="hasPremiumAccess"
        @request-location="startTracking"
        @activate-sos="showSos"
        @contact-trusted="contactTrustedPerson"
        @upgrade="navigate('packages')"
      />

      <CheckoutModal v-if="checkoutOpen && isAuthenticated" :items="cart" :initial-method="checkoutMethod" @close="checkoutOpen = false" @success="checkoutComplete" />
    </template>
  </div>
</template>

<style>
/* 
   PAGE TRANSITION ANIMATIONS
  */
.page-enter-active,
.page-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none !important;
  }
  .page-enter-from,
  .page-leave-to {
    opacity: 1 !important;
    transform: none !important;
  }
}

/* Payment Modal Styles */
.payment-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.payment-modal-content {
  background: var(--surface, #fff);
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.payment-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--muted, #756d76);
  cursor: pointer;
  z-index: 1;
}

/* Safety net in case --surface doesn't inherit for any reason */
.dark-mode .payment-modal-content {
  background: #1b121b;
}
.dark-mode .payment-modal-close {
  color: #c7b8c0;
}
</style>
