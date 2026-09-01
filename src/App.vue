<script setup>
import { computed, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import SiteHeader from "./components/SiteHeader.vue";
import CartDrawer from "./components/CartDrawer.vue";
import HomePage from "./pages/HomePage.vue";
import ProductsPage from "./pages/ProductsPage.vue";
import SafetyHubPage from "./pages/SafetyHubPage.vue";
import PremiumVideosPage from "./pages/PremiumVideosPage.vue";
import PremiumPackagesPage from "./pages/PremiumPackagesPage.vue";
import ReviewsPage from "./pages/ReviewsPage.vue";
import OrdersPage from "./pages/OrdersPage.vue";
import AuthPage from "./pages/AuthPage.vue";
import InfoPage from "./pages/InfoPage.vue";
import SiteFooter from "./components/SiteFooter.vue";
import SafeHerAI from "./components/SafeHerAI.vue";
import { language } from "./languageConfig.js";

const isAuthenticated = ref(
  localStorage.getItem("safeher-authenticated") === "true",
);
const darkMode = ref(localStorage.getItem("safeher-dark-mode") === "true");

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
    category: "personal-safety",
  },
  {
    id: 2,
    name: "Defender Spray",
    detail: "Compact & discreet",
    price: 149,
    icon: "bi-shield-shaded",
    tone: "plum",
    category: "home",
  },
  {
    id: 3,
    name: "Safety Whistle",
    detail: "High-decibel alarm",
    price: 79,
    icon: "bi-megaphone",
    tone: "gold",
    category: "travel",
  },
  {
    id: 4,
    name: "Emergency Contact Card",
    detail: "Quick-access ID and medical info",
    price: 99,
    icon: "bi-person-vcard",
    tone: "cream",
    category: "personal-safety",
  },
  {
    id: 5,
    name: "Door Alarm Sensor",
    detail: "Smart entry alert for your home",
    price: 399,
    icon: "bi-door-open",
    tone: "rose",
    category: "home",
  },
  {
    id: 6,
    name: "Travel Safety Kit",
    detail: "Compact essentials for on-the-go trips",
    price: 279,
    icon: "bi-bag-check",
    tone: "plum",
    category: "travel",
  },
  {
    id: 7,
    name: "Keychain SOS Beacon",
    detail: "Small, bright and always within reach",
    price: 199,
    icon: "bi-key",
    tone: "gold",
    category: "personal-safety",
  },
  {
    id: 8,
    name: "Window Safety Lock",
    detail: "Extra deterrent for secure homes",
    price: 149,
    icon: "bi-window",
    tone: "cream",
    category: "home",
  },
  {
    id: 9,
    name: "Portable Phone Charger",
    detail: "Emergency backup for daily travel",
    price: 179,
    icon: "bi-phone",
    tone: "rose",
    category: "travel",
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

// ----- Navigation -----
function navigate(view) {
  if (!isAuthenticated.value && view !== "login" && view !== "registration")
    return;
  if (view === "contact") view = "services";
  activeView.value = view;
  menuOpen.value = false;
  cartOpen.value = false;
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

// ----- Location & SOS -----
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
        title: "SOS action started",
        text: "This development app has no alert delivery service configured. Use your phone's call or SMS options to contact help now.",
        icon: "success",
        confirmButtonColor: "#351536",
      });
  });
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
    Swal.fire({ title: "Add a trusted contact", text: "Save a trusted contact in the Safety Hub first.", icon: "info", confirmButtonColor: "#351536" });
    return;
  }
  messageContact(contacts.value[0]);
}

// ----- Checkout -----
function checkout() {
  if (!cart.value.length) return;
  const orderTotal = cartTotal.value;
  const deliveryOptions = [
    { value: "standard", label: "Standard delivery", fee: 49, eta: "2-4 working days" },
    { value: "express", label: "Express delivery", fee: 99, eta: "1-2 working days" },
    { value: "pickup", label: "Click & collect", fee: 0, eta: "Ready in 24 hours" },
  ];
  const savedAddresses = JSON.parse(localStorage.getItem("safeher-delivery-addresses") || "[]");

  Swal.fire({
    title: "Secure checkout",
    html: `
      <div style="display:grid; gap:12px; text-align:left; width:100%; max-width:100%; box-sizing:border-box; margin:0 auto;">
        <div style="display:flex; gap:8px; align-items:center; justify-content:space-between; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:#756d76;">
          <span style="display:inline-flex; align-items:center; justify-content:center; min-width:32px; height:24px; border-radius:999px; background:#351536; color:#fff; padding:0 10px; font-weight:700;">1</span>
          <span style="flex:1; height:2px; background:#ecd9ef; border-radius:999px; display:block;"></span>
          <span style="display:inline-flex; align-items:center; justify-content:center; min-width:32px; height:24px; border-radius:999px; background:#f0e7f1; color:#351536; padding:0 10px; font-weight:700;">2</span>
          <span style="flex:1; height:2px; background:#ecd9ef; border-radius:999px; display:block;"></span>
          <span style="display:inline-flex; align-items:center; justify-content:center; min-width:32px; height:24px; border-radius:999px; background:#f0e7f1; color:#351536; padding:0 10px; font-weight:700;">3</span>
        </div>

        <div style="background:#f9f4fb; border:1px solid #ecd9ef; border-radius:12px; padding:12px 14px; color:#351536; width:100%; box-sizing:border-box;">
          <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.7; margin-bottom:6px;">Order summary</div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:13px; color:#5a4d5c;">
            <span>Subtotal</span>
            <strong>R${orderTotal.toLocaleString()}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:13px; color:#5a4d5c; margin-top:6px;">
            <span>Delivery</span>
            <strong id="checkout-delivery-fee">R49</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:8px; border-top:1px solid #ecd9ef; padding-top:8px;">
            <span style="font-size:13px; color:#351536; font-weight:700;">Total</span>
            <strong style="font-size:22px; color:#351536;">R${(orderTotal + 49).toLocaleString()}</strong>
          </div>
        </div>

        <div style="width:100%; box-sizing:border-box;">
          <label style="display:block; font-size:12px; color:#5a4d5c; font-weight:600; margin-bottom:8px;">Delivery method</label>
          <select id="delivery-method" class="swal2-input" style="width:100%; margin:0; box-sizing:border-box;">
            ${deliveryOptions
              .map(
                (option) =>
                  `<option value="${option.value}">${option.label} - R${option.fee.toLocaleString()}</option>`,
              )
              .join("")}
          </select>
        </div>

        <div style="width:100%; box-sizing:border-box;">
          <label style="display:block; font-size:12px; color:#5a4d5c; font-weight:600; margin-bottom:8px;">Estimated delivery</label>
          <div id="delivery-eta" style="background:#f3fbf7; border:1px solid #d7f0df; border-radius:10px; padding:10px 12px; color:#1d5c3d; font-size:13px; font-weight:600;">
            2-4 working days
          </div>
        </div>

        <div style="width:100%; box-sizing:border-box;">
          <label style="display:block; font-size:12px; color:#5a4d5c; font-weight:600; margin-bottom:8px;">Saved addresses</label>
          <select id="saved-delivery-address" class="swal2-input" style="width:100%; margin:0; box-sizing:border-box;">
            <option value="">Use a new address</option>
            ${savedAddresses
              .map(
                (address) =>
                  `<option value="${address.id}">${address.label}</option>`,
              )
              .join("")}
          </select>
        </div>

        <div style="width:100%; box-sizing:border-box;">
          <label style="display:block; font-size:12px; color:#5a4d5c; font-weight:600; margin-bottom:8px;">Delivery address</label>
          <textarea id="delivery-address" class="swal2-textarea" rows="3" placeholder="Your street address, suburb, city, province" style="width:100%; max-width:100%; min-height:80px; resize:vertical; box-sizing:border-box; margin:0; text-align:left;"></textarea>
        </div>

        <div style="display:flex; align-items:center; gap:8px; color:#5a4d5c; font-size:12px;">
          <input id="save-address" type="checkbox" style="accent-color:#351536;">
          <label for="save-address">Save this address for next time</label>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; color:#5a4d5c; font-size:12px;">
          <span style="display:inline-flex; align-items:center; gap:6px; background:#f8f5fa; border:1px solid #eee2f4; border-radius:999px; padding:5px 8px;">
            <i class="bi bi-shield-check" style="color:#351536;"></i> Secure checkout
          </span>
          <span style="display:inline-flex; align-items:center; gap:6px; background:#f8f5fa; border:1px solid #eee2f4; border-radius:999px; padding:5px 8px;">
            <i class="bi bi-credit-card" style="color:#351536;"></i> SA banks
          </span>
          <span style="display:inline-flex; align-items:center; gap:6px; background:#f8f5fa; border:1px solid #eee2f4; border-radius:999px; padding:5px 8px;">
            <i class="bi bi-truck" style="color:#351536;"></i> Fast dispatch
          </span>
        </div>

        <div style="width:100%; box-sizing:border-box;">
          <label style="display:block; font-size:12px; color:#5a4d5c; font-weight:600; margin-bottom:8px;">Payment method</label>
          <select id="payment-method" class="swal2-input" style="width:100%; margin:0; font-size:13px; box-sizing:border-box;">
            <option value="card">Credit or debit card</option>
            <option value="mobile">Mobile money / wallet</option>
            <option value="eft">Instant EFT</option>
          </select>
        </div>

        <div style="display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:8px; width:100%; box-sizing:border-box;">
          <input id="payment-name" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" placeholder="Cardholder name" autocomplete="cc-name">
          <input id="payment-number" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" placeholder="Card number" inputmode="numeric" autocomplete="cc-number" maxlength="19">
        </div>

        <div style="display:flex; gap:8px; justify-content:center; width:100%; box-sizing:border-box;">
          <input id="payment-expiry" class="swal2-input" style="width:48%; margin:0; box-sizing:border-box;" placeholder="MM/YY" inputmode="numeric" autocomplete="cc-exp">
          <input id="payment-cvv" class="swal2-input" style="width:48%; margin:0; box-sizing:border-box;" placeholder="CVV" inputmode="numeric" autocomplete="cc-csc" maxlength="4">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Pay R${(orderTotal + 49).toLocaleString()}`,
    confirmButtonColor: "#d92d36",
    cancelButtonText: "Back to bag",
    focusConfirm: false,
    didOpen: () => {
      const deliveryMethod = document.getElementById("delivery-method");
      const deliveryEta = document.getElementById("delivery-eta");
      const deliveryFee = document.getElementById("checkout-delivery-fee");
      const totalValue = document.querySelector(".swal2-confirm");
      const savedSelect = document.getElementById("saved-delivery-address");
      const addressField = document.getElementById("delivery-address");

      const updateDeliveryMeta = () => {
        const selected = deliveryOptions.find((option) => option.value === deliveryMethod.value);
        if (!selected) return;
        if (deliveryEta) deliveryEta.textContent = selected.eta;
        if (deliveryFee) deliveryFee.textContent = `R${selected.fee.toLocaleString()}`;
        if (totalValue) totalValue.textContent = `Pay R${(orderTotal + selected.fee).toLocaleString()}`;
      };

      if (deliveryMethod) deliveryMethod.addEventListener("change", updateDeliveryMeta);
      if (savedSelect) {
        savedSelect.addEventListener("change", (event) => {
          const selectedId = event.target.value;
          if (!selectedId) return;
          const selectedAddress = savedAddresses.find((address) => String(address.id) === String(selectedId));
          if (selectedAddress && addressField) addressField.value = selectedAddress.address;
        });
      }

      updateDeliveryMeta();
    },
    preConfirm: () => {
      const deliveryMethod = document.getElementById("delivery-method").value;
      const address = document.getElementById("delivery-address").value.trim();
      const name = document.getElementById("payment-name").value.trim();
      const number = document
        .getElementById("payment-number")
        .value.replace(/\s/g, "");
      const expiry = document.getElementById("payment-expiry").value.trim();
      const cvv = document.getElementById("payment-cvv").value.trim();
      const saveAddress = document.getElementById("save-address")?.checked;

      if (!address) {
        Swal.showValidationMessage("Add a delivery address to continue.");
        return false;
      }
      if (!name || number.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
        Swal.showValidationMessage("Enter valid payment details to continue.");
        return false;
      }
      if (saveAddress) {
        const addresses = JSON.parse(localStorage.getItem("safeher-delivery-addresses") || "[]");
        const cleanAddress = address.replace(/\s+/g, " ").trim();
        const newAddress = {
          id: Date.now(),
          label: cleanAddress.split(",").slice(0, 2).join(", ").slice(0, 40) || "Saved address",
          address: cleanAddress,
        };
        if (!addresses.some((item) => item.address === cleanAddress)) {
          addresses.push(newAddress);
          localStorage.setItem("safeher-delivery-addresses", JSON.stringify(addresses));
        }
      }

      const selectedDelivery = deliveryOptions.find((option) => option.value === deliveryMethod);
      return {
        name,
        method: document.getElementById("payment-method").value,
        deliveryMethod: selectedDelivery.label,
        deliveryFee: selectedDelivery.fee,
        address,
      };
    },
  }).then((result) => {
    if (!result.isConfirmed) return;
    const finalTotal = orderTotal + result.value.deliveryFee;
    const orders = JSON.parse(localStorage.getItem("safeher-orders") || "[]");
    orders.push({
      id: Date.now(),
      email: localStorage.getItem("safeher-client-email"),
      total: finalTotal,
      deliveryMethod: result.value.deliveryMethod,
      deliveryAddress: result.value.address,
      items: cart.value.map(({ id, name, quantity }) => ({ id, name, quantity })),
      paymentMethod: result.value.method,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("safeher-orders", JSON.stringify(orders));
    cart.value = [];
    cartOpen.value = false;
    Swal.fire({
      title: "Payment successful",
      text: `Your order is confirmed. Delivery: ${result.value.deliveryMethod} • Total: R${finalTotal.toLocaleString()}`,
      icon: "success",
      confirmButtonColor: "#351536",
    });
  });
}

// ----- Auth -----
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

// ----- Page component mapping for transitions -----
const pageComponentMap = {
  index: HomePage,
  products: ProductsPage,
  safetyhub: SafetyHubPage,
  videos: PremiumVideosPage,
  packages: PremiumPackagesPage,
  reviews: ReviewsPage,
  orders: OrdersPage,
  // 'services' is handled by InfoPage with view prop
  // 'contact' is redirected to services
};
// InfoPage handles any other views (services, guide, etc.)
const currentPageComponent = computed(() => {
  if (activeView.value === 'services' || activeView.value === 'guide' || activeView.value === 'contact') {
    return InfoPage;
  }
  return pageComponentMap[activeView.value] || InfoPage;
});

// Props and events passed to the dynamic page
const pageProps = computed(() => ({
  view: activeView.value,
  locationReady: locationReady.value,
  userLocation: userLocation.value,
  nearest: nearest.value,
  products: products,
  contacts: contacts.value,
}));

const pageEvents = {
  sos: showSos,
  track: toggleTracking,
  navigate: navigate,
  add: addToCart,
  'add-contact': addContact,
  'remove-contact': removeContact,
  share: shareRoute,
  'call-contact': callContact,
  'message-contact': messageContact,
};

// ----- Lifecycle -----
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
  <div class="app-shell" :class="{ 'dark-mode': darkMode }">
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
      />

      <!-- ===== PAGE TRANSITION ===== -->
      <Transition name="page" mode="out-in">
        <component
          :is="currentPageComponent"
          :key="activeView"
          v-bind="pageProps"
          v-on="pageEvents"
        />
      </Transition>

      <SiteFooter @navigate="navigate" />
      <SafeHerAI
        :location="userLocation"
        :contacts="contacts"
        @request-location="startTracking"
        @activate-sos="showSos"
        @contact-trusted="contactTrustedPerson"
      />
    </template>
  </div>
</template>

<style>
/* ============================================
   PAGE TRANSITION ANIMATIONS
   ============================================ */
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
</style>
