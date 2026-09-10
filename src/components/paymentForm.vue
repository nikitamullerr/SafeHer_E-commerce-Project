<script setup>
import { t } from "../languageConfig.js";
import { reactive, ref } from "vue";
import { validateDemoCard } from "../services/cardValidation.js";
const card = reactive({ cardNumber: "", cardHolder: "", expiryMonth: String(new Date().getMonth() + 1), expiryYear: String(new Date().getFullYear()), cvv: "" });
const error = ref("");
const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i);
function formatNumber() { card.cardNumber = card.cardNumber.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim(); error.value = ""; }
function validate() { error.value = validateDemoCard(card); return !error.value; }
function clear() { card.cardNumber = ""; card.cvv = ""; card.cardHolder = ""; }
defineExpose({ validate, clear });
</script>
<template>
  <fieldset class="card-fields">
    <legend>{{ t("Card details - demo only") }}</legend>
    <p>{{ t("Use test card") }} <strong>4242 4242 4242 4242</strong>{{ t(", a future expiry and CVV") }} <strong>123</strong>{{ t(". No money is charged. Do not enter a real card.") }}</p>
    <p v-if="error" class="checkout-error" role="alert">{{ t(error) }}</p>
    <label for="card-number">{{ t("Card number") }}</label>
    <input id="card-number" v-model="card.cardNumber" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" maxlength="23" @input="formatNumber" />
    <label for="card-holder">{{ t("Cardholder name") }}</label>
    <input id="card-holder" v-model="card.cardHolder" autocomplete="off" maxlength="100" :placeholder="t(&quot;Test cardholder&quot;)" />
    <div class="card-expiry">
      <div><label for="card-month">{{ t("Expiry month") }}</label><select id="card-month" v-model="card.expiryMonth"><option v-for="month in 12" :key="month" :value="String(month)">{{ String(month).padStart(2, '0') }}</option></select></div>
      <div><label for="card-year">{{ t("Expiry year") }}</label><select id="card-year" v-model="card.expiryYear"><option v-for="year in years" :key="year" :value="String(year)">{{ year }}</option></select></div>
      <div><label for="card-cvv">CVV</label><input id="card-cvv" v-model="card.cvv" type="password" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="123" /></div>
    </div>
  </fieldset>
</template>
