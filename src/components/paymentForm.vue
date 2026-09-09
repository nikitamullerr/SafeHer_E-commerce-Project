<template>
  <div class="payment-form">
    <h3> Pay with Card</h3>
    <p class="subtitle">Enter your card details below</p>

    <form @submit.prevent="submitPayment">
      <div class="form-group">
        <label>Card Number</label>
        <input
          v-model="form.cardNumber"
          type="text"
          placeholder="4111 1111 1111 1111"
          maxlength="19"
          @input="formatCardNumber"
          required
        />
        <div class="card-icons">
          <span v-if="cardType === 'Visa'">💳 Visa</span>
          <span v-else-if="cardType === 'Mastercard'">💳 Mastercard</span>
          <span v-else>💳</span>
        </div>
      </div>

      <div class="form-group">
        <label>Card Holder Name</label>
        <input
          v-model="form.cardHolder"
          type="text"
          placeholder="John Doe"
          required
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Expiry Month</label>
          <select v-model="form.expiryMonth" required>
            <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">
              {{ String(m).padStart(2, '0') }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Expiry Year</label>
          <select v-model="form.expiryYear" required>
            <option v-for="y in 10" :key="y" :value="String(new Date().getFullYear() + y)">
              {{ new Date().getFullYear() + y }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>CVV</label>
          <input
            v-model="form.cvv"
            type="password"
            placeholder="123"
            maxlength="4"
            required
          />
        </div>
      </div>

      <div class="order-summary">
        <div class="summary-row">
          <span>Items</span>
          <strong>{{ itemCount }}</strong>
        </div>
        <div class="summary-row">
          <span>Subtotal</span>
          <strong>R{{ subtotal.toFixed(2) }}</strong>
        </div>
        <div class="summary-row">
          <span>Delivery</span>
          <strong>R{{ deliveryFee.toFixed(2) }}</strong>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <strong>R{{ total.toFixed(2) }}</strong>
        </div>
      </div>

      <button type="submit" class="btn-pay" :disabled="loading">
        <span v-if="loading">Processing...</span>
        <span v-else>Pay R{{ total.toFixed(2) }}</span>
      </button>

      <p class="secure-note">
        <i class="bi bi-shield-check"></i> Payment simulation – no real charge
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { paymentService } from '../services/paymentClient.js';

const props = defineProps({
  items: { type: Array, required: true },
  deliveryMethod: { type: String, default: 'standard' },
  deliveryAddress: { type: String, required: true }
});

const emit = defineEmits(['success', 'error']);

const loading = ref(false);
const form = ref({
  cardNumber: '',
  cardHolder: '',
  expiryMonth: '01',
  expiryYear: String(new Date().getFullYear() + 1),
  cvv: ''
});

// Debug: log form changes
watch(form, (newVal) => {
  console.log('Form updated:', newVal);
}, { deep: true });

const cardType = ref('Unknown');

const deliveryFees = { standard: 49, express: 99, pickup: 0 };

const subtotal = computed(() => {
  return props.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
});

const deliveryFee = computed(() => deliveryFees[props.deliveryMethod] || 0);
const total = computed(() => subtotal.value + deliveryFee.value);
const itemCount = computed(() => props.items.reduce((sum, item) => sum + item.quantity, 0));

watch(() => form.value.cardNumber, (newVal) => {
  const clean = newVal.replace(/\s/g, '');
  if (clean.startsWith('4')) cardType.value = 'Visa';
  else if (clean.startsWith('5')) cardType.value = 'Mastercard';
  else if (clean.startsWith('3')) cardType.value = 'Amex';
  else if (clean.startsWith('6')) cardType.value = 'Discover';
  else cardType.value = 'Unknown';
});

function formatCardNumber() {
  let value = form.value.cardNumber.replace(/\D/g, '');
  value = value.replace(/(.{4})/g, '$1 ').trim();
  form.value.cardNumber = value;
}

async function submitPayment() {
  loading.value = true;
  try {
    const response = await paymentService.createCardPayment({
      items: props.items.map(item => ({ product_id: item.id, quantity: item.quantity })),
      delivery_method: props.deliveryMethod,
      delivery_address: props.deliveryAddress,
      payment_method: 'card',
      card_details: {
        card_number: form.value.cardNumber.replace(/\s/g, ''),
        card_holder: form.value.cardHolder,
        expiry_month: form.value.expiryMonth,
        expiry_year: form.value.expiryYear,
        cvv: form.value.cvv
      }
    });
    emit('success', response);
  } catch (error) {
    emit('error', error.response?.data?.error || 'Payment failed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.payment-form {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  background: var(--surface, #fff);
  border-radius: 16px;
  transition: background 0.2s ease;
}
.payment-form h3 {
  font-family: 'Syne', sans-serif;
  color: var(--plum, #351536);
  margin-bottom: 4px;
}
.subtitle {
  color: var(--muted, #756d76);
  font-size: 14px;
  margin-bottom: 24px;
}
.form-group {
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--plum, #351536);
  margin-bottom: 6px;
}
.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--line, #e9e0e5);
  border-radius: 10px;
  font-size: 14px;
  background: var(--blush, #f8f5f6) !important; /* FORCE BG so it never gets stranded on a mismatched dark/light pair */
  color: var(--ink, #161317) !important; /* FORCE TEXT COLOR */
  -webkit-text-fill-color: var(--ink, #161317) !important; /* For Safari */
}
.form-group input::placeholder {
  color: var(--muted, #a3979f);
  -webkit-text-fill-color: var(--muted, #a3979f);
  opacity: 0.7;
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--red, #d92d36);
  box-shadow: 0 0 0 3px rgba(217,45,54,0.1);
}
.card-icons {
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted, #756d76);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.order-summary {
  background: var(--blush, #f8f5f6);
  border-radius: 10px;
  padding: 16px 18px;
  margin: 20px 0 24px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: var(--muted, #5a4d5c);
}
.summary-row.total {
  border-top: 1px solid var(--line, #e9e0e5);
  margin-top: 6px;
  padding-top: 12px;
  font-size: 16px;
  color: var(--plum, #351536);
}
.summary-row.total strong {
  font-size: 20px;
  color: var(--red, #d92d36);
}
.btn-pay {
  width: 100%;
  padding: 16px;
  background: var(--red, #d92d36);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.btn-pay:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.secure-note {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: var(--muted, #756d76);
}
.secure-note i {
  color: #2eaa6c;
  margin-right: 6px;
}

/* Explicit dark-mode fallback in case CSS variables aren't
   inherited for any reason (belt-and-suspenders) */
:global(.dark-mode) .payment-form {
  background: #1b121b;
}
:global(.dark-mode) .form-group input,
:global(.dark-mode) .form-group select {
  background: #120d12 !important;
  color: #fff4f7 !important;
  -webkit-text-fill-color: #fff4f7 !important;
  border-color: #3b2938;
}
:global(.dark-mode) .order-summary {
  background: #120d12;
}
</style>