<script setup>
import { t, formatMoney } from "../languageConfig.js";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
const props = defineProps({ open: Boolean, cart: { type: Array, default: () => [] }, total: { type: Number, default: 0 } });
const emit = defineEmits(["toggle", "quantity", "remove", "checkout", "shop"]);
const drawer = ref(null);
let previousFocus;
let previousOverflow;
function releaseDrawer() {
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = undefined;
  }
  if (drawer.value?.contains(document.activeElement) && previousFocus?.isConnected) previousFocus.focus();
}
watch(() => props.open, async (open) => {
  if (!open) { releaseDrawer(); return; }
  previousFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  await nextTick();
  if (props.open) drawer.value?.querySelector("button")?.focus();
}, { immediate: true });
onBeforeUnmount(releaseDrawer);
function handleKeydown(event) {
  if (event.key === "Escape") { event.preventDefault(); emit("toggle"); }
  if (event.key !== "Tab") return;
  const buttons = [...drawer.value.querySelectorAll("button:not(:disabled)")];
  const first = buttons[0], last = buttons.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
</script>

<template>
  <div>
    <div v-if="open" class="cart-backdrop" @click="emit('toggle')"></div>
    <aside ref="drawer" class="cart-drawer" :class="{ open }" role="dialog" :aria-modal="open ? 'true' : undefined" :aria-hidden="!open" :inert="!open" :aria-label="t('Shopping cart')" @keydown="handleKeydown">
      <div class="drawer-header">
        <div>
          <p class="eyebrow">{{ t("SAFEHER STORE") }}</p>
          <h2 v-full-stop>{{ t("Your bag") }}</h2>
        </div>
        <button type="button" class="drawer-close" :aria-label="t('Close cart')" @click="emit('toggle')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div v-if="cart.length" class="drawer-items">
        <article v-for="item in cart" :key="item.id" class="drawer-item">
          <div class="drawer-product-art" :class="item.tone">
            <img
              v-if="item.image"
              class="product-image"
              :src="item.image"
              :alt="item.name"
            />
            <i v-else :class="`bi ${item.icon}`"></i>
          </div>
          <div class="drawer-item-info">
            <strong>{{ item.name }}</strong>
            <small>{{ formatMoney(item.price) }} {{ t("each") }}</small>
            <div class="quantity-control">
              <button type="button" :aria-label="t('Decrease quantity')" @click="emit('quantity', item, -1)">
                <i class="bi bi-dash"></i>
              </button>
              <span>{{ item.quantity }}</span>
              <button type="button" :aria-label="t('Increase quantity')" @click="emit('quantity', item, 1)">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
          <div class="drawer-item-end">
            <strong>{{ formatMoney(item.price * item.quantity) }}</strong>
            <button type="button" :aria-label="t('Remove from cart')" @click="emit('remove', item.id)">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </article>
      </div>

      <div v-else class="drawer-empty">
        <i class="bi bi-bag"></i>
        <h3 v-full-stop>{{ t("Your bag is empty") }}</h3>
        <p>{{ t("Choose a safety product and it will appear here.") }}</p>
        <button class="btn btn-dark-plum" @click="emit('shop')"> {{ t("Browse store") }} </button>
      </div>

      <div v-if="cart.length" class="drawer-footer">
        <div class="drawer-total">
          <span>{{ t("Total") }}</span>
          <strong>{{ formatMoney(total) }}</strong>
        </div>

        <button class="btn btn-sos w-100" @click="emit('checkout')">
          <i class="bi bi-lock-fill"></i> {{ t("Secure checkout") }}
        </button>

        <button class="drawer-continue" @click="emit('shop')">
          {{ t("Continue shopping") }} <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Add a small divider style if needed */
.drawer-divider {
  text-align: center;
  color: var(--muted, #756d76);
  font-size: 12px;
  margin: 8px 0;
  position: relative;
}
.drawer-divider::before,
.drawer-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: var(--line, #e9e0e5);
}
.drawer-divider::before {
  left: 0;
}
.drawer-divider::after {
  right: 0;
}
.drawer-divider span {
  background: #fff;
  padding: 0 10px;
  position: relative;
  z-index: 1;
}
</style>
