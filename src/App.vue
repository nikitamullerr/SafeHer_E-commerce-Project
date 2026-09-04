<script setup>
import { computed, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import SiteHeader from "./components/SiteHeader.vue";
import CartDrawer from "./components/CartDrawer.vue";
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
import { language } from "./languageConfig.js";
import { assessDangerLevel } from "./services/dangerAssessment.js";
import api from "./services/api.js";

const isAuthenticated = ref(
  localStorage.getItem("safeher-authenticated") === "true",
);
const darkMode = ref(localStorage.getItem("safeher-dark-mode") === "true");

// Restore activeView from localStorage to prevent redirect on refresh
const savedView = isAuthenticated.value
  ? localStorage.getItem("safeher-active-view")
  : null;
const activeView = ref(
  savedView || (isAuthenticated.value ? "index" : "login"),
);
const cartOpen = ref(false);
const menuOpen = ref(false);
const sosActive = ref(false);
const cart = ref([]);
const contacts = ref([]);
const userLocation = ref(null);
const locationLoading = ref(false);
const locationError = ref("");

const products = ref([
  {
    id: 1,
    name: "Smart Panic Button",
    detail: "Wearable GPS alert",
    price: 899,
    icon: "bi-broadcast-pin",
    image: "https://i.ibb.co/yn1NHJvF/panic-button-gallery-13.jpg",
    tone: "rose",
    category: "personal-safety",
  },
  {
    id: 2,
    name: "Defender Spray",
    detail: "Compact & discreet",
    price: 149,
    icon: "bi-shield-shaded",
    image:
      "https://i.ibb.co/5hnVXV5x/NEWSIZEFog-Heat-MK3-509e0365-f200-4a49-bdc8-b61d097a26d5.jpg",
    tone: "plum",
    category: "home",
  },
  {
    id: 3,
    name: "Safety Whistle",
    detail: "High-decibel alarm",
    price: 79,
    icon: "bi-megaphone",
    image: "https://i.ibb.co/JWCp8rB0/61l2-Sp9-Sss-L.jpg",
    tone: "gold",
    category: "travel",
  },
  {
    id: 4,
    name: "Emergency Contact Card",
    detail: "Quick-access ID and medical info",
    price: 99,
    icon: "bi-person-vcard",
    image: "https://i.ibb.co/7dcV0dzc/ICEw-Digital5pack-61593-1755633471.jpg",
    tone: "cream",
    category: "personal-safety",
  },
  {
    id: 5,
    name: "Door Alarm Sensor",
    detail: "Smart entry alert for your home",
    price: 399,
    icon: "bi-door-open",
    image: "https://i.ibb.co/Zz9wN8KZ/ooma-door-window-sensor.jpg",
    tone: "rose",
    category: "home",
  },
  {
    id: 6,
    name: "Travel Safety Kit",
    detail: "Compact essentials for on-the-go trips",
    price: 279,
    icon: "bi-bag-check",
    image:
      "https://i.ibb.co/wrwWMY8V/tal-pickpocketed-tout-62aad4629f384fd2bd5ca630a0e2de41.jpg",
    tone: "plum",
    category: "travel",
  },
  {
    id: 7,
    name: "Keychain SOS Beacon",
    detail: "Small, bright and always within reach",
    price: 199,
    icon: "bi-key",
    image:
      "https://i.ibb.co/yFrvhG5x/130d-B-Wireless-Sos-Button-Anti-Attack-Personal-Safety-Security-Keychain-Alarm-Devices-for-Women.webp",
    tone: "gold",
    category: "personal-safety",
  },
  {
    id: 8,
    name: "Window Safety Lock",
    detail: "Extra deterrent for secure homes",
    price: 149,
    icon: "bi-window",
    image:
      "https://i.ibb.co/nsHHYhXB/cubelock-window-child-safety-lock-restrictor-2325-p.png",
    tone: "cream",
    category: "home",
  },
  {
    id: 9,
    name: "Portable Phone Charger",
    detail: "Emergency backup for daily travel",
    price: 179,
    icon: "bi-phone",
    image: "https://i.ibb.co/XffBnJWh/5-1024x1024.png",
    tone: "rose",
    category: "travel",
  },
  {
    id: 10,
    name: "Personal Alarm Clip",
    detail: "Attachable siren for busy commutes",
    price: 249,
    icon: "bi-bell",
    image: "https://i.ibb.co/VsBBBfC/pa-clip-colors.jpg",
    tone: "rose",
    category: "personal-safety",
  },
  {
    id: 11,
    name: "Nightlight Safety Lamp",
    detail: "Soft light for entryways and hallways",
    price: 219,
    icon: "bi-lightbulb",
    image:
      "https://i.ibb.co/j9bcFrJb/led-safety-night-light-plug-in-light-sensor-emergency-lamp-child-safety-lamp-8581684635341-06c-MP-M.webp",
    tone: "gold",
    category: "home",
  },
  {
    id: 12,
    name: "Travel Lock Box",
    detail: "Discreet secure storage for valuables",
    price: 329,
    icon: "bi-lock",
    image: "https://i.ibb.co/LX9cgZ9T/s-zoom.jpg",
    tone: "plum",
    category: "travel",
  },
  {
    id: 13,
    name: "Flashlight Keyring",
    detail: "Mini torch with emergency beacon",
    price: 129,
    icon: "bi-flashlight",
    image: "https://i.ibb.co/7tj3d4JH/GFT-19-MF-black.png",
    tone: "cream",
    category: "personal-safety",
  },
  {
    id: 14,
    name: "Home Entry Alarm",
    detail: "Alerts you the moment the door opens",
    price: 449,
    icon: "bi-door-closed",
    image: "https://i.ibb.co/Q7msMFDt/HS-DHA.jpg",
    tone: "rose",
    category: "home",
  },
  {
    id: 15,
    name: "Passport Safety Sleeve",
    detail: "Hidden document protection for travel",
    price: 119,
    icon: "bi-passport",
    image: "https://i.ibb.co/8gSz1cMx/rfid-blocking-passport-sleeve-730782.jpg",
    tone: "gold",
    category: "travel",
  },
  {
    id: 16,
    name: "Pepper Spray Holder",
    detail: "Easy-grip case with quick access design",
    price: 169,
    icon: "bi-shield-lock",
    image: "https://i.ibb.co/Kx6HFkL2/71-CRWg3-IGRL-AC-UY1000.jpg",
    tone: "plum",
    category: "personal-safety",
  },
  {
    id: 17,
    name: "Smart Window Sensor",
    detail: "Notifies you of movement or tampering",
    price: 499,
    icon: "bi-window-fullscreen",
    image: "https://i.ibb.co/BKf15RXx/Tuya-D06-Door-Window-sensor-2-result.jpg",
    tone: "rose",
    category: "home",
  },
  {
    id: 18,
    name: "Road Trip Essentials Kit",
    detail: "Safety basics for long-distance travel",
    price: 399,
    icon: "bi-car-front",
    image:
      "https://i.ibb.co/cSHx0qCL/mountain-road-warrior-vehicle-emergency-kit.jpg",
    tone: "gold",
    category: "travel",
  },
  {
    id: 19,
    name: "Safety Bracelet",
    detail: "Medical alert bracelet with quick ID",
    price: 189,
    icon: "bi-heart-pulse",
    image: "https://i.ibb.co/xtY5MpX7/SOS-ID-Wristband-children-1024x1024.webp",
    tone: "cream",
    category: "personal-safety",
  },
  {
    id: 20,
    name: "Fire Escape Plan Set",
    detail: "Preparedness cards for your home",
    price: 89,
    icon: "bi-exclamation-triangle",
    image: "https://i.ibb.co/fdFRTjR0/il-fullxfull-7068051978-tnfd.jpg",
    tone: "plum",
    category: "home",
  },
  {
    id: 21,
    name: "Travel First-Aid Pouch",
    detail: "Compact emergency essentials case",
    price: 299,
    icon: "bi-bandaid",
    image:
      "https://i.ibb.co/KjdYCJLn/Mini-First-Aid-Kit-In-Zip-Pouch-2025-3-700x700.jpg",
    tone: "gold",
    category: "travel",
  },
  {
    id: 22,
    name: "Digital Safety Sticker",
    detail: "Visible ID and emergency response note",
    price: 139,
    icon: "bi-tag",
    image: "https://i.ibb.co/HTsVQwnY/Emergency-ID-Smart-nfc.webp",
    tone: "rose",
    category: "personal-safety",
  },
  {
    id: 23,
    name: "Safe Home Sensor Pack",
    detail: "Multi-room motion and alert support",
    price: 599,
    icon: "bi-house-door",
    image:
      "https://i.ibb.co/MD8Q814h/4-AJAX-White-Alarm-System-Indoor-Starter-Kit-4-Passive-Motion-Cam.jpg",
    tone: "plum",
    category: "home",
  },
  {
    id: 24,
    name: "Travel Buddy Kit",
    detail: "All-in-one essentials for safer trips",
    price: 359,
    icon: "bi-bag-heart",
    image: "https://i.ibb.co/PdjqWYK/HBK001-Holts-Travel-Buddy-Boot-Kit.png",
    tone: "gold",
    category: "travel",
  },
]);

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
          ? `${assessment.zone.distance.toFixed(1)} km from ${assessment.zone.label}`
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
            <span>Location unavailable — this advisory uses time of day only. Allow location access to get a precise location-based danger level.</span>
          </div>
        `
            : ""
        }
        <div style="text-align:center; margin-bottom:14px;">
          <span style="display:inline-flex; align-items:center; gap:8px; background:${assessment.chip}; color:${assessment.color}; border:1px solid ${assessment.ring}33; border-radius:999px; padding:8px 16px; font-weight:800; font-size:14px; letter-spacing:0.02em;">
            <i class="bi ${assessment.icon}" style="font-size:16px;"></i>
            ${assessment.level} danger level at your location
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

        <p style="margin:0 0 12px; font-size:13px; line-height:1.6; color:#5a4d5c;">${assessment.guidance}</p>

        ${
          factorRows.length
            ? `
          <div style="background:#f9f4fb; border:1px solid #ecd9ef; border-radius:12px; padding:10px 14px; margin-bottom:12px;">
            <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#756d76; margin-bottom:6px;">What this is based on</div>
            ${factorRows
              .map(
                (row) => `
              <div style="display:flex; justify-content:space-between; gap:10px; font-size:12px; padding:4px 0; color:#5a4d5c;">
                <span>${row.label}</span>
                <strong style="color:#351536;">${row.value}${row.points > 0 ? ` · +${row.points}` : ""}</strong>
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
function navigate(view) {
  if (!isAuthenticated.value && view !== "login" && view !== "registration")
    return;
  if (view === "contact") view = "services";
  if (view === "packages" && hasPremiumAccess.value) view = "videos";
  activeView.value = view;
  localStorage.setItem("safeher-active-view", view);
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
function showSos() {
  const countdownSeconds = 5;
  let countdownTimer;

  Swal.fire({
    title: "SOS activating",
    html: `Your SOS will be sent in <strong id="sos-countdown">${countdownSeconds}</strong> seconds.`,
    icon: "warning",
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "Cancel SOS",
    cancelButtonColor: "#351536",
    timer: countdownSeconds * 1000,
    timerProgressBar: true,
    didOpen: () => {
      const countdownElement =
        Swal.getHtmlContainer()?.querySelector("#sos-countdown");
      let secondsLeft = countdownSeconds;
      countdownTimer = setInterval(() => {
        secondsLeft -= 1;
        if (countdownElement)
          countdownElement.textContent = String(Math.max(secondsLeft, 0));
      }, 1000);
    },
    willClose: () => {
      clearInterval(countdownTimer);
    },
  }).then((result) => {
    if (result.dismiss === Swal.DismissReason.timer) {
      sosActive.value = true;

      Swal.fire({
        toast: true,
        position: "top-end",
        title: "SOS activated",
        text: "Your safety circle has been notified.",
        icon: "success",
        timer: 1500,
      });

      setTimeout(() => {
        sosActive.value = false;
      }, 3000);
    }
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
function checkout() {
  if (!cart.value.length) return;
  const orderTotal = cartTotal.value;
  const deliveryOptions = [
    {
      value: "standard",
      label: "Standard delivery",
      fee: 49,
      eta: "2-4 working days",
    },
    {
      value: "express",
      label: "Express delivery",
      fee: 99,
      eta: "1-2 working days",
    },
    {
      value: "pickup",
      label: "Click & collect",
      fee: 0,
      eta: "Ready in 24 hours",
    },
  ];
  const savedAddresses = JSON.parse(
    localStorage.getItem("safeher-delivery-addresses") || "[]",
  );

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
        const selected = deliveryOptions.find(
          (option) => option.value === deliveryMethod.value,
        );
        if (!selected) return;
        if (deliveryEta) deliveryEta.textContent = selected.eta;
        if (deliveryFee)
          deliveryFee.textContent = `R${selected.fee.toLocaleString()}`;
        if (totalValue)
          totalValue.textContent = `Pay R${(orderTotal + selected.fee).toLocaleString()}`;
      };

      if (deliveryMethod)
        deliveryMethod.addEventListener("change", updateDeliveryMeta);
      if (savedSelect) {
        savedSelect.addEventListener("change", (event) => {
          const selectedId = event.target.value;
          if (!selectedId) return;
          const selectedAddress = savedAddresses.find(
            (address) => String(address.id) === String(selectedId),
          );
          if (selectedAddress && addressField)
            addressField.value = selectedAddress.address;
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
      if (
        !name ||
        number.length < 12 ||
        !/^\d{2}\/\d{2}$/.test(expiry) ||
        !/^\d{3,4}$/.test(cvv)
      ) {
        Swal.showValidationMessage("Enter valid payment details to continue.");
        return false;
      }
      if (saveAddress) {
        const addresses = JSON.parse(
          localStorage.getItem("safeher-delivery-addresses") || "[]",
        );
        const cleanAddress = address.replace(/\s+/g, " ").trim();
        const newAddress = {
          id: Date.now(),
          label:
            cleanAddress.split(",").slice(0, 2).join(", ").slice(0, 40) ||
            "Saved address",
          address: cleanAddress,
        };
        if (!addresses.some((item) => item.address === cleanAddress)) {
          addresses.push(newAddress);
          localStorage.setItem(
            "safeher-delivery-addresses",
            JSON.stringify(addresses),
          );
        }
      }

      const selectedDelivery = deliveryOptions.find(
        (option) => option.value === deliveryMethod,
      );
      return {
        name,
        method: document.getElementById("payment-method").value,
        deliveryMethod: selectedDelivery.label,
        deliveryFee: selectedDelivery.fee,
        address,
      };
    },
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    const finalTotal = orderTotal + result.value.deliveryFee;
    try {
      await api.post("/orders", {
        items: cart.value.map(({ id, quantity }) => ({
          productId: id,
          quantity,
        })),
        deliveryAddress: result.value.address,
        deliveryMethod: result.value.deliveryMethod,
        paymentMethod: result.value.method,
      });
      cart.value = [];
      cartOpen.value = false;
      Swal.fire({
        title: "Payment successful",
        text: `Your order is confirmed. Delivery: ${result.value.deliveryMethod} • Total: R${finalTotal.toLocaleString()}`,
        icon: "success",
        confirmButtonColor: "#351536",
      });
    } catch (error) {
      Swal.fire({
        title: "Order could not be placed",
        text: error.response?.data?.error || "Please try again.",
        icon: "error",
        confirmButtonColor: "#351536",
      });
    }
  });
}

// ----- Auth -----
function authenticated(email) {
  isAuthenticated.value = true;
  localStorage.setItem("safeher-authenticated", "true");
  if (email) localStorage.setItem("safeher-client-email", email);
  premiumMembership.value = readPremiumMembership();
  activeView.value = "index";
  // Trigger the Premium danger alert directly here. The AuthPage emits
  // "sign-in-notification-complete" after it has been unmounted (because
  // isAuthenticated switches the view), so relying on that event alone is
  // unreliable. This direct call guarantees the alert fires on every
  // Premium sign-in.
  schedulePremiumSafetyCheck();
}
function logout() {
  isAuthenticated.value = false;
  localStorage.removeItem("safeher-authenticated");
  localStorage.removeItem("safeher-active-view");
  premiumMembership.value = null;
  activeView.value = "login";
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
  locationReady: locationReady.value,
  userLocation: userLocation.value,
  locationLoading: locationLoading.value,
  locationError: locationError.value,
  nearest: nearest.value,
  products: products.value,
  contacts: contacts.value,
  email: localStorage.getItem("safeher-client-email"),
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

  api.get("/products")
    .then(({ data }) => {
      if (data.success && data.products?.length) products.value = data.products;
    })
    .catch((error) => {
      console.error("Could not load products from API:", error);
    });
});
</script>

<template>
  <div class="app-shell" :class="{ 'dark-mode': darkMode }">
    <AuthPage
      v-if="!isAuthenticated"
      :mode="activeView === 'registration' ? 'registration' : 'login'"
      @navigate="navigate"
      @authenticated="authenticated"
      @sign-in-notification-complete="schedulePremiumSafetyCheck"
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
      <SOSEffect :active="sosActive" />
      <SafeHerAI
        :location="userLocation"
        :contacts="contacts"
        :has-premium-access="hasPremiumAccess"
        @request-location="startTracking"
        @activate-sos="showSos"
        @contact-trusted="contactTrustedPerson"
        @upgrade="navigate('packages')"
      />
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
</style>
