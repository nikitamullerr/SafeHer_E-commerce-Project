<script setup>
import { t } from "../languageConfig.js";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import PaymentForm from "./paymentForm.vue";
import api from "../services/api.js";
import { createPayfastPayment, createCardPayment, getPaymentConfig, submitPayfastForm } from "../services/paymentClient.js";
const props = defineProps({ items: { type: Array, required: true }, initialMethod: { type: String, default: "payfast" } });
const emit = defineEmits(["close", "success"]);
const method = ref(props.initialMethod);
const delivery = ref("standard");
const address = ref("");
const addresses = ref([]), selectedAddress = ref(""), saveAddress = ref(false);
const addressError = ref(""), addressMessage = ref(""), savingAddress = ref(false);
async function loadAddresses() {
  addressError.value = "";
  try { const { data } = await api.get("/addresses"); addresses.value = data.addresses || []; }
  catch { addressError.value = "Saved addresses could not be loaded. You can still enter an address below."; }
}
function useSavedAddress() {
  const selected = addresses.value.find((item) => String(item.id) === selectedAddress.value);
  address.value = selected?.address || "";
  saveAddress.value = false;
  addressMessage.value = "";
}
async function storeAddress() {
  if (savingAddress.value) return false;
  addressError.value = ""; addressMessage.value = "";
  if (!address.value.trim()) { addressError.value = "Enter an address before saving."; return false; }
  savingAddress.value = true;
  try {
    const { data } = await api.post("/addresses", { address: address.value.trim() });
    if (!addresses.value.some((item) => item.id === data.address.id)) addresses.value.unshift(data.address);
    address.value = data.address.address;
    selectedAddress.value = String(data.address.id);
    saveAddress.value = false;
    addressMessage.value = "Address saved to your account.";
    return true;
  } catch (failure) { addressError.value = failure.response?.data?.error || "Address could not be saved. Try again, or uncheck Save address to continue."; return false; }
  finally { savingAddress.value = false; }
}
async function removeAddress() {
  if (!selectedAddress.value || savingAddress.value) return;
  savingAddress.value = true; addressError.value = "";
  try {
    await api.delete(`/addresses/${selectedAddress.value}`);
    addresses.value = addresses.value.filter((item) => String(item.id) !== selectedAddress.value);
    selectedAddress.value = ""; addressMessage.value = "Saved address removed. The current delivery address is unchanged.";
  } catch { addressError.value = "Unable to remove this saved address."; }
  finally { savingAddress.value = false; }
}
watch(address, (value) => {
  const selected = addresses.value.find((item) => String(item.id) === selectedAddress.value);
  if (selected && selected.address !== value) selectedAddress.value = "";
});
const busy = ref(false), error = ref(""), configLoading = ref(true);
const config = ref({ payfastAvailable: false, cardDemoAvailable: false, sandbox: true });
const cardForm = ref(null), dialog = ref(null);
const requestId = ref(crypto.randomUUID());
const options = [{ value: "standard", label: "Standard delivery", fee: 49 }, { value: "express", label: "Express delivery", fee: 99 }];
const money = (value) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
const subtotal = computed(() => props.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0));
const fee = computed(() => options.find((item) => item.value === delivery.value).fee);
const available = computed(() => method.value === "payfast" ? config.value.payfastAvailable : config.value.cardDemoAvailable);
watch([method, delivery, address], () => { requestId.value = crypto.randomUUID(); error.value = ""; });
async function loadConfig() {
  configLoading.value = true; error.value = "";
  try { config.value = await getPaymentConfig(); }
  catch { error.value = "Could not load payment options. Check the backend and try again."; }
  finally { configLoading.value = false; }
}
onMounted(async () => { await nextTick(); dialog.value?.focus(); loadConfig(); loadAddresses(); });
function trapFocus(event) {
  if (event.key === "Escape" && !busy.value) { emit("close"); return; }
  if (event.key !== "Tab") return;
  const elements = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
  const first = elements[0], last = elements.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
async function submit() {
  if (busy.value || !available.value) return;
  error.value = "";
  if (!address.value.trim()) { error.value = "Enter a delivery address."; return; }
  if (method.value === "card_demo" && !cardForm.value?.validate()) return;
  busy.value = true;
  try {
    if (saveAddress.value && !(await storeAddress())) return;
    const payload = { items: props.items.map(({ id, quantity }) => ({ product_id: id, quantity })), delivery_method: delivery.value, delivery_address: address.value.trim(), request_id: requestId.value };
    const result = await (method.value === "payfast" ? createPayfastPayment(payload) : createCardPayment(payload));
    if (method.value === "payfast") submitPayfastForm(result);
    cardForm.value?.clear();
    emit("success", result);
  } catch (failure) { error.value = failure.response?.data?.error || failure.message || "Payment could not be started. Please try again."; }
  finally { busy.value = false; }
}
</script>
<template>
  <div class="checkout-backdrop" @click.self="!busy && emit('close')">
    <section ref="dialog" class="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title" tabindex="-1" @keydown="trapFocus">
      <header><h2 id="checkout-title">{{ t("Checkout") }}</h2><button type="button" class="btn btn-outline-plum" :disabled="busy" :aria-label="t(&quot;Close checkout&quot;)" @click="emit('close')">&times;</button></header>
      <p v-if="error" class="checkout-error" role="alert">{{ t(error) }}</p>
      <p v-if="configLoading" role="status">{{ t("Loading payment options...") }}</p>
      <form @submit.prevent="submit">
        <fieldset :disabled="busy || configLoading">
          <legend>{{ t("Delivery") }}</legend>
          <label for="checkout-delivery">{{ t("Delivery method") }}</label>
          <select id="checkout-delivery" v-model="delivery"><option v-for="option in options" :key="option.value" :value="option.value">{{ t(option.label) }} - {{ money(option.fee) }}</option></select>
          <p v-if="addressError" class="checkout-error" role="alert">{{ t(addressError) }} <button type="button" class="btn btn-outline-plum" @click="loadAddresses">{{ t("Reload addresses") }}</button></p>
          <template v-if="addresses.length">
            <label for="saved-address">{{ t("Saved addresses") }}</label>
            <select id="saved-address" v-model="selectedAddress" @change="useSavedAddress"><option value="">{{ t("Enter a new address") }}</option><option v-for="item in addresses" :key="item.id" :value="String(item.id)">{{ t(item.label || item.address) }}</option></select>
            <button v-if="selectedAddress" type="button" class="btn btn-outline-plum mt-2" :disabled="savingAddress" @click="removeAddress">{{ t("Remove saved address") }}</button>
          </template>
          <label for="checkout-address">{{ t("Delivery address") }}</label>
          <textarea id="checkout-address" v-model="address" rows="2" maxlength="1000" required autocomplete="street-address"></textarea>
          <label class="save-address-label"><input v-model="saveAddress" type="checkbox" /> {{ t("Save this address for next time") }}</label>
          <button type="button" class="btn btn-outline-plum" :disabled="savingAddress || !address.trim()" @click="storeAddress">{{ t(savingAddress ? 'Saving...' : 'Save address now') }}</button>
          <p v-if="addressMessage" role="status">{{ t(addressMessage) }}</p>
          <legend class="mt-3">{{ t("Payment method") }}</legend>
          <div class="checkout-methods">
            <label><input v-model="method" type="radio" value="payfast" /> PayFast</label>
            <label><input v-model="method" type="radio" value="card_demo" /> {{ t("Card form (demo)") }}</label>
          </div>
          <template v-if="method === 'payfast'">
            <p v-if="config.payfastAvailable">{{ t(config.sandbox ? 'PayFast sandbox: test checkout, no real charge.' : 'Complete your payment securely on PayFast.') }}</p>
            <p v-else class="checkout-error">{{ t("PayFast checkout is currently unavailable. Please try again once payment confirmation has been enabled.") }}</p>
          </template>
          <template v-else><p v-if="!config.cardDemoAvailable" class="checkout-error">{{ t("Card demo is disabled on this server.") }}</p><PaymentForm v-else ref="cardForm" /></template>
          <dl class="checkout-totals"><div><dt>{{ t("Items (") }}{{ items.reduce((n, item) => n + item.quantity, 0) }})</dt><dd>{{ money(subtotal) }}</dd></div><div><dt>{{ t("Delivery") }}</dt><dd>{{ money(fee) }}</dd></div><div><dt>{{ t("Total") }}</dt><dd>{{ money(subtotal + fee) }}</dd></div></dl>
          <button type="submit" class="btn btn-sos w-100" :disabled="!available || !items.length">{{ t(busy ? 'Processing...' : method === 'payfast' ? 'Continue to PayFast' : 'Create demo order') }}</button>
        </fieldset>
      </form>
      <button v-if="!configLoading && !available" class="btn btn-outline-plum mt-3" @click="loadConfig">{{ t("Refresh payment options") }}</button>
    </section>
  </div>
</template>
<style>
.checkout-backdrop { position: fixed; inset: 0; z-index: 1100; background: #120d12b3; display: grid; place-items: center; padding: 16px; }
.checkout-dialog { width: min(580px, 100%); max-height: 92vh; overflow: auto; border-radius: 18px; padding: 24px; background: var(--surface); color: var(--ink); box-shadow: 0 18px 70px #0006; }
.checkout-dialog header, .checkout-totals > div { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.checkout-dialog h2 { font-size: 26px; margin: 0; }
.checkout-dialog legend { font-size: 18px; margin: 18px 0 10px; font-weight: 700; }
.checkout-dialog label { display: block; font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
.checkout-dialog :is(input:not([type="radio"]):not([type="checkbox"]), select, textarea) { width: 100%; padding: 10px; color: var(--ink); background: var(--surface); border: 1px solid var(--muted); border-radius: 8px; }
.checkout-dialog p { font-size: 14px; margin-top: 12px; }
.checkout-methods { display: flex; gap: 22px; flex-wrap: wrap; }
.checkout-methods input { accent-color: #8b2450; }
.card-expiry { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.checkout-totals { margin: 20px 0; border-top: 1px solid var(--line); padding-top: 12px; }
.checkout-totals dd { margin: 4px 0; }
.checkout-error { padding: 12px; border-radius: 8px; background: #fff0f1; color: #951626; }
</style>
