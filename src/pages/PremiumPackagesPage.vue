<script setup>
import { computed, ref, watch } from "vue";
import { t, formatDate } from "../languageConfig.js";
import Swal from "../services/localizedSwal.js";
import { getSubscription, subscribeToPremium, cancelSubscription, mapSubscription } from "../services/premiumClient.js";
import CheckoutModal from "../components/CheckoutModal.vue";

const props = defineProps({ email: String, isAuthenticated: Boolean });
const emit = defineEmits(["navigate", "premium-updated", "require-auth"]);

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

const selectedPackage = ref(null);
const checkoutItems = computed(() => selectedPackage.value ? [{
  id: selectedPackage.value.name,
  name: selectedPackage.value.name,
  price: Number(selectedPackage.value.price.replace(/[^0-9.]/g, "")),
  quantity: 1,
}] : []);

const membership = ref(null);
const membershipError = ref("");
const cancelling = ref(false);
const activeMembership = computed(() => membership.value?.expiresAt && new Date(membership.value.expiresAt) > new Date() ? membership.value : null);
function setMembership(subscription) {
  membership.value = mapSubscription(subscription);
  emit("premium-updated", membership.value);
}
watch(() => [props.isAuthenticated, props.email], async () => {
  membership.value = null;
  if (!props.isAuthenticated) return;
  try {
    const data = await getSubscription();
    setMembership(data.subscription);
  } catch { membershipError.value = "Unable to load your subscription. Please refresh and try again."; }
}, { immediate: true });

async function cancelMembership() {
  if (cancelling.value) return;
  cancelling.value = true;
  membershipError.value = "";
  try {
    await cancelSubscription();
    setMembership(null);
  } catch { membershipError.value = "Unable to cancel your subscription. Please try again."; }
  finally { cancelling.value = false; }
}

function choosePackage(packageItem) {
  if (!props.isAuthenticated) { emit("require-auth"); return; }
  selectedPackage.value = packageItem;
}

async function completePackagePayment(payload) {
  const data = await subscribeToPremium({
    plan: selectedPackage.value.name,
    amount: checkoutItems.value[0].price,
    method: payload.payment_method,
    receipt_email: props.email,
    reference: payload.payment_reference || payload.request_id,
  });
  if (!data.success || !data.subscription) throw new Error("Subscription could not be saved. Please try again.");
  setMembership(data.subscription);
  return data;
}

async function checkoutComplete() {
  selectedPackage.value = null;
  await Swal.fire({
    icon: "success",
    title: "Payment successful",
    confirmButtonText: "Open video library",
    confirmButtonColor: "#351536",
  });
  emit("navigate", "videos");
}
</script>

<template>
  <main class="packages-page container-fluid px-4 px-xl-5">
    <section class="packages-heading">
      <p class="eyebrow">SAFEHER / {{ t('premiumPackages') }}</p>
      <h1>{{ t('chooseFit') }}</h1>
      <p>{{ t('unlockTools') }}</p>
    </section>
    <p v-if="membershipError" role="alert">{{ membershipError }}</p>
    <section v-if="activeMembership" class="premium-banner mb-4">
      <div>
        <i class="bi bi-patch-check-fill"></i>
        <div>
          <p class="eyebrow">{{ t("YOUR MEMBERSHIP") }}</p>
          <h2>{{ t(activeMembership.name) }} {{ t("is active") }}</h2>
          <p>{{ t("Includes the video library and SafeHer AI until") }} {{ formatDate(activeMembership.expiresAt) }}.</p>
        </div>
      </div>
      <button class="btn btn-outline-plum" :disabled="cancelling" @click="cancelMembership">{{ t("Cancel membership") }}</button>
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
        <h2>{{ t(item.name) }}</h2>
        <p>{{ t(item.detail) }}</p>
        <strong class="package-price">
          {{ item.price }}
          <small>{{
            t(item.name === "Annual" ? t("perYear") : t("perMonth"))
          }}</small>
        </strong>
        <ul>
          <li v-for="feature in item.features" :key="feature">
            <i class="bi bi-check2"></i>{{ t(feature) }}
          </li>
        </ul>
        <button
          class="btn"
          :class="item.featured ? 'btn-sos' : 'btn-outline-plum'"
          @click="choosePackage(item)"
        >
          {{ t("choose") }} {{ t(item.name) }} <i class="bi bi-arrow-right"></i>
        </button>
      </article>
    </section>
    <CheckoutModal
      v-if="selectedPackage && isAuthenticated"
      :items="checkoutItems"
      :requires-delivery="false"
      :submit-payment="completePackagePayment"
      @close="selectedPackage = null"
      @success="checkoutComplete"
    />
  </main>
</template>
