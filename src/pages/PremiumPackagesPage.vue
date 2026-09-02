<script setup>
import { computed, ref } from "vue";
import { t } from "../languageConfig.js";
import Swal from "sweetalert2";

const props = defineProps({ email: String });
const emit = defineEmits(["navigate", "premium-updated"]);

const packages = [
  {
    name: "Essential",
    price: "R49",
    billing: "monthly",
    detail: "A focused start for everyday confidence.",
    features: ["Full premium video library", "SafeHer AI safety companion", "Cancel anytime"],
  },
  {
    name: "Circle",
    price: "R89",
    billing: "monthly",
    detail: "More support for you and your trusted people.",
    featured: true,
    features: [
      "Everything in Essential",
      "Shared safety plans",
      "Priority support",
    ],
  },
  {
    name: "Annual",
    price: "R899",
    billing: "annual",
    detail: "The best value for a year of preparedness.",
    features: [
      "Everything in Circle",
      "Two months free",
      "Annual safety review",
    ],
  },
];

const saBanks = [
  "FNB",
  "Standard Bank",
  "Absa",
  "Nedbank",
  "Capitec",
  "TymeBank",
  "African Bank",
];

const cardMonths = [
  "01","02","03","04","05","06","07","08","09","10","11","12",
];

const cardYears = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));

const paymentOptions = [
  { value: "wallet", label: "Wallet / QR / Mobile Pay", detail: "Apple Pay, SnapScan, Ozow" },
  { value: "instant-eft", label: "Instant EFT", detail: "Pay directly from your bank" },
  { value: "card", label: "Credit / Debit Card", detail: "Visa, Mastercard, Amex" },
  { value: "bank-transfer", label: "Bank Transfer", detail: "Secure transfer to SafeHer" },
];

const membership = ref(readMembership());
const activeMembership = computed(() =>
  membership.value?.expiresAt && new Date(membership.value.expiresAt) > new Date()
    ? membership.value
    : null,
);

function readMembership() {
  try {
    const memberships = JSON.parse(localStorage.getItem("safeher-premium-memberships") || "{}");
    return memberships[props.email] || null;
  } catch {
    return null;
  }
}

function savePremiumPlan(packageItem, payment) {
  const memberships = JSON.parse(localStorage.getItem("safeher-premium-memberships") || "{}");
  const existing = memberships[props.email];
  const startsAt = existing?.expiresAt && new Date(existing.expiresAt) > new Date()
    ? new Date(existing.expiresAt)
    : new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + (packageItem.billing === "annual" ? 12 : 1));
  const plan = {
    name: packageItem.name,
    amount: payment.amount,
    method: payment.method,
    receiptEmail: payment.email,
    reference: payment.reference,
    purchasedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  memberships[props.email] = plan;
  localStorage.setItem("safeher-premium-memberships", JSON.stringify(memberships));
  membership.value = plan;
  emit("premium-updated", plan);
}

function cancelMembership() {
  const memberships = JSON.parse(localStorage.getItem("safeher-premium-memberships") || "{}");
  delete memberships[props.email];
  localStorage.setItem("safeher-premium-memberships", JSON.stringify(memberships));
  membership.value = null;
  emit("premium-updated", null);
}

function choosePackage(packageItem) {
  const amount = Number(String(packageItem.price).replace(/\D/g, ""));

  Swal.fire({
    title: `Pay for ${packageItem.name}`,
    html: `
      <div style="text-align:left; display:grid; gap:14px; font-family: inherit;">
        <div style="background:#f9f4fb; border:1px solid #ecd9ef; border-radius:12px; padding:12px 14px; color:#351536;">
          <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.7; margin-bottom:6px;">Order summary</div>
          <strong style="font-size:20px; display:block;">${packageItem.price}</strong>
          <span style="font-size:13px;">${packageItem.name} membership</span>
        </div>

        <div style="display:grid; gap:8px;">
          ${paymentOptions
            .map(
              (option) => `
                <label style="display:flex; align-items:center; gap:10px; border:1px solid #edd9eb; border-radius:12px; padding:10px 12px; cursor:pointer; background:#fff;">
                  <input type="radio" name="safeher-payment" value="${option.value}" ${option.value === "wallet" ? "checked" : ""}>
                  <span style="flex:1;">
                    <strong style="display:block; color:#351536; font-size:14px;">${option.label}</strong>
                    <small style="color:#756d76;">${option.detail}</small>
                  </span>
                </label>
              `,
            )
            .join("")}
        </div>

        <div style="display:grid; gap:8px;">
          <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Select a bank</label>
          <select id="safeher-bank" class="swal2-input" style="width:100%; margin:0; text-align:left;">
            ${saBanks.map((bank) => `<option value="${bank}">${bank}</option>`).join("")}
          </select>
        </div>

        <div style="display:grid; gap:8px;">
          <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Email address</label>
          <input id="safeher-email" class="swal2-input" style="width:100%; margin:0;" placeholder="you@example.com" autocomplete="email">
        </div>

        <div style="display:grid; gap:8px;">
          <label id="safeher-payment-label" style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Wallet / payment reference</label>
          <input id="safeher-payment-number" class="swal2-input" style="width:100%; margin:0;" placeholder="Scan code, wallet ID, or bank reference" inputmode="numeric" autocomplete="off">
        </div>

        <div id="safeher-card-fields" style="display:none; gap:8px;">
          <div style="display:grid; gap:6px;">
            <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Cardholder name</label>
            <input id="safeher-cardholder-name" class="swal2-input" style="width:100%; margin:0;" placeholder="Name as it appears on the card" autocomplete="cc-name">
          </div>

          <div style="display:grid; gap:6px;">
            <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Card number</label>
            <input id="safeher-card-number" class="swal2-input" style="width:100%; margin:0;" placeholder="1234 5678 9012 3456" inputmode="numeric" autocomplete="cc-number">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div style="display:grid; gap:6px;">
              <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Month</label>
              <select id="safeher-card-month" class="swal2-input" style="width:100%; margin:0; text-align:left;">
                ${cardMonths.map((month) => `<option value="${month}">${month}</option>`).join("")}
              </select>
            </div>
            <div style="display:grid; gap:6px;">
              <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Year</label>
              <select id="safeher-card-year" class="swal2-input" style="width:100%; margin:0; text-align:left;">
                ${cardYears.map((year) => `<option value="${year}">${year}</option>`).join("")}
              </select>
            </div>
          </div>

          <div style="display:grid; gap:6px;">
            <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">CVV</label>
            <input id="safeher-card-cvv" class="swal2-input" style="width:100%; margin:0;" placeholder="123" inputmode="numeric" autocomplete="cc-csc" maxlength="4">
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Pay ${packageItem.price}`,
    confirmButtonColor: "#d92d36",
    cancelButtonColor: "#351536",
    width: 560,
    focusConfirm: false,
    didOpen: () => {
      const radioButtons = document.querySelectorAll('input[name="safeher-payment"]');
      const referenceInput = document.getElementById("safeher-payment-number");
      const referenceLabel = document.getElementById("safeher-payment-label");
      const cardFields = document.getElementById("safeher-card-fields");
      const cardholderName = document.getElementById("safeher-cardholder-name");
      const cardNumber = document.getElementById("safeher-card-number");
      const cardCvv = document.getElementById("safeher-card-cvv");
      const cardMonth = document.getElementById("safeher-card-month");
      const cardYear = document.getElementById("safeher-card-year");

      function syncPaymentFields() {
        const selected = document.querySelector('input[name="safeher-payment"]:checked')?.value || "wallet";
        const labelMap = {
          wallet: "Wallet / payment reference",
          "instant-eft": "Instant EFT reference",
          card: "Card number",
          "bank-transfer": "Bank transfer reference",
        };
        const placeholderMap = {
          wallet: "Scan code, wallet ID, or mobile reference",
          "instant-eft": "Your EFT reference or transfer code",
          card: "Card number",
          "bank-transfer": "Account reference or payment note",
        };

        const isCard = selected === "card";
        referenceLabel.textContent = labelMap[selected] || "Payment reference";
        referenceInput.placeholder = placeholderMap[selected] || "Payment reference";
        referenceInput.value = referenceInput.value || "";
        cardFields.style.display = isCard ? "grid" : "none";
        referenceInput.style.display = isCard ? "none" : "block";
        referenceLabel.style.display = isCard ? "none" : "block";

        if (!isCard) {
          cardholderName.value = "";
          cardNumber.value = "";
          cardCvv.value = "";
          cardMonth.value = cardMonth.options[0].value;
          cardYear.value = cardYear.options[0].value;
        }
      }

      radioButtons.forEach((radio) => {
        radio.addEventListener("change", syncPaymentFields);
      });
      syncPaymentFields();
    },
    preConfirm: () => {
      const selectedMethod = document.querySelector(
        'input[name="safeher-payment"]:checked',
      );
      const bank = document.getElementById("safeher-bank")?.value || "Bank";
      const email = document.getElementById("safeher-email")?.value.trim();
      const paymentNumber = document.getElementById("safeher-payment-number")?.value.trim() || "";
      const cardholderName = document.getElementById("safeher-cardholder-name")?.value.trim() || "";
      const cardNumber = document.getElementById("safeher-card-number")?.value.trim() || "";
      const cardCvv = document.getElementById("safeher-card-cvv")?.value.trim() || "";
      const cardMonth = document.getElementById("safeher-card-month")?.value || "";
      const cardYear = document.getElementById("safeher-card-year")?.value || "";

      if (!selectedMethod) {
        Swal.showValidationMessage("Select a payment method to continue.");
        return false;
      }
      if (!email) {
        Swal.showValidationMessage("Enter your email address to continue.");
        return false;
      }
      if (selectedMethod.value === "wallet" && !paymentNumber) {
        Swal.showValidationMessage("Add your wallet or payment reference.");
        return false;
      }
      if (selectedMethod.value === "instant-eft" && !paymentNumber) {
        Swal.showValidationMessage("Add your instant EFT reference to continue.");
        return false;
      }
      if (selectedMethod.value === "card") {
        const cleanedCardNumber = cardNumber.replace(/\s+/g, "");
        if (!cardholderName) {
          Swal.showValidationMessage("Enter the cardholder name.");
          return false;
        }
        if (cleanedCardNumber.length < 12) {
          Swal.showValidationMessage("Enter a valid card number.");
          return false;
        }
        if (!cardMonth || !cardYear) {
          Swal.showValidationMessage("Select the expiry month and year.");
          return false;
        }
        if (cardCvv.length < 3) {
          Swal.showValidationMessage("Enter a valid CVV.");
          return false;
        }
      }

      return {
        method: selectedMethod.value,
        bank,
        email,
        amount,
        reference: paymentNumber,
        cardholderName,
        cardNumber,
        cardMonth,
        cardYear,
        cardCvv,
      };
    },
  }).then((result) => {
    if (!result.isConfirmed) return;

    const { method, bank, email } = result.value;
    savePremiumPlan(packageItem, result.value);

    Swal.fire({
      icon: "success",
      title: "Payment successful",
      text: `${packageItem.name} membership is now active. Payment method: ${method === "wallet" ? "Wallet / QR / Mobile Pay" : method === "instant-eft" ? "Instant EFT" : method === "card" ? "Card" : "Bank transfer"}.`,
      confirmButtonText: "Open video library",
      confirmButtonColor: "#351536",
      footer: `${bank} • ${email}`,
    }).then(() => emit("navigate", "videos"));
  });
}
</script>

<template>
  <main class="packages-page container-fluid px-4 px-xl-5">
    <section class="packages-heading">
      <p class="eyebrow">SAFEHER / {{ t('premiumPackages') }}</p>
      <h1>{{ t('chooseFit') }}</h1>
      <p>{{ t('unlockTools') }}</p>
    </section>
    <section v-if="activeMembership" class="premium-banner mb-4">
      <div>
        <i class="bi bi-patch-check-fill"></i>
        <div>
          <p class="eyebrow">YOUR MEMBERSHIP</p>
          <h2>{{ activeMembership.name }} is active</h2>
          <p>Includes the video library and SafeHer AI until {{ new Date(activeMembership.expiresAt).toLocaleDateString() }}.</p>
        </div>
      </div>
      <button class="btn btn-outline-plum" @click="cancelMembership">Cancel membership</button>
    </section>
    <section class="package-grid">
      <article
        v-for="item in packages"
        :key="item.name"
        class="package-card"
        :class="{ featured: item.featured }"
      >
        <span v-if="item.featured" class="package-popular">{{
          t("mostPopular")
        }}</span>
        <p class="eyebrow">{{ t("premium") }}</p>
        <h2>{{ item.name }}</h2>
        <p>{{ item.detail }}</p>
        <strong class="package-price">
          {{ item.price }}
          <small>{{
            item.name === "Annual" ? t("perYear") : t("perMonth")
          }}</small>
        </strong>
        <ul>
          <li v-for="feature in item.features" :key="feature">
            <i class="bi bi-check2"></i>{{ feature }}
          </li>
        </ul>
        <button
          class="btn"
          :class="item.featured ? 'btn-sos' : 'btn-outline-plum'"
          @click="choosePackage(item)"
        >
          {{ t("choose") }} {{ item.name }} <i class="bi bi-arrow-right"></i>
        </button>
      </article>
    </section>
  </main>
</template>
