<script setup>
import { t } from "../languageConfig.js";
import Swal from "sweetalert2";

const packages = [
  {
    name: "Essential",
    price: "R49",
    detail: "A focused start for everyday confidence.",
    features: [
      "Full premium video library",
      "Monthly safety checklist",
      "Cancel anytime",
    ],
  },
  {
    name: "Circle",
    price: "R89",
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

const paymentOptions = [
  {
    value: "card",
    label: "Credit / Debit Card",
    detail: "Visa, Mastercard, Amex",
  },
  {
    value: "instant-eft",
    label: "Instant EFT",
    detail: "Pay directly from your bank",
  },
  {
    value: "bank-transfer",
    label: "Bank Transfer",
    detail: "Secure transfer to SafeHer",
  },
  {
    value: "wallet",
    label: "Wallet / QR / Mobile Pay",
    detail: "Apple Pay, SnapScan, Ozow",
  },
];

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
                  <input type="radio" name="safeher-payment" value="${option.value}" ${option.value === "card" ? "checked" : ""}>
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
          <label style="text-align:left; font-size:12px; color:#5a4d5c; font-weight:600;">Card or reference number</label>
          <input id="safeher-payment-number" class="swal2-input" style="width:100%; margin:0;" placeholder="Optional for bank transfer / EFT" inputmode="numeric" autocomplete="cc-number">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Pay ${packageItem.price}`,
    confirmButtonColor: "#d92d36",
    cancelButtonColor: "#351536",
    width: 560,
    focusConfirm: false,
    preConfirm: () => {
      const selectedMethod = document.querySelector(
        'input[name="safeher-payment"]:checked',
      );
      const bank = document.getElementById("safeher-bank")?.value || "Bank";
      const email = document.getElementById("safeher-email")?.value.trim();
      const paymentNumber =
        document.getElementById("safeher-payment-number")?.value.trim() || "";

      if (!selectedMethod) {
        Swal.showValidationMessage("Select a payment method to continue.");
        return false;
      }
      if (!email) {
        Swal.showValidationMessage("Enter your email address to continue.");
        return false;
      }
      if (selectedMethod.value === "card" && paymentNumber.length < 12) {
        Swal.showValidationMessage("Enter a valid card number.");
        return false;
      }
      if (selectedMethod.value === "wallet" && !paymentNumber) {
        Swal.showValidationMessage("Add a wallet or reference number.");
        return false;
      }

      return {
        method: selectedMethod.value,
        bank,
        email,
        amount,
      };
    },
  }).then((result) => {
    if (!result.isConfirmed) return;
    Swal.fire({
      icon: "success",
      title: "Payment details received",
      text: `Your ${packageItem.name} package is ready for secure checkout via ${result.value.bank}.`,
      confirmButtonColor: "#351536",
    });
  });
}
</script>

<template>
  <main class="packages-page container-fluid px-4 px-xl-5">
    <div class="guide-heading">
      <p class="eyebrow">SAFEHER / {{ t("premiumPackages") }}</p>
      <h1>{{ t("chooseFit") }}</h1>
      <p>{{ t("unlockTools") }}</p>
    </div>
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
