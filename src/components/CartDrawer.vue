<script setup>
defineProps({ open: Boolean, cart: Array, total: Number });
const emit = defineEmits(["toggle", "quantity", "remove", "checkout", "shop"]);
</script>
<template>
  <div>
    <div v-if="open" class="cart-backdrop" @click="emit('toggle')"></div>
    <aside class="cart-drawer" :class="{ open }" aria-label="Shopping cart">
      <div class="drawer-header">
        <div>
          <p class="eyebrow">SAFEHER STORE</p>
          <h2>Your bag</h2>
        </div>
        <button class="drawer-close" @click="emit('toggle')">
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
            <strong>{{ item.name }}</strong
            ><small>R{{ item.price.toLocaleString() }} each</small>
            <div class="quantity-control">
              <button @click="emit('quantity', item, -1)">
                <i class="bi bi-dash"></i></button
              ><span>{{ item.quantity }}</span
              ><button @click="emit('quantity', item, 1)">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
          <div class="drawer-item-end">
            <strong>R{{ (item.price * item.quantity).toLocaleString() }}</strong
            ><button @click="emit('remove', item.id)">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </article>
      </div>
      <div v-else class="drawer-empty">
        <i class="bi bi-bag"></i>
        <h3>Your bag is empty</h3>
        <p>Choose a safety product and it will appear here.</p>
        <button class="btn btn-dark-plum" @click="emit('shop')">
          Browse store
        </button>
      </div>
      <div v-if="cart.length" class="drawer-footer">
        <div class="drawer-total">
          <span>Total</span><strong>R{{ total.toLocaleString() }}</strong>
        </div>
        <button class="btn btn-sos w-100" @click="emit('checkout')">
          <i class="bi bi-lock-fill"></i> Checkout securely</button
        ><button class="drawer-continue" @click="emit('shop')">
          Continue shopping <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </aside>
  </div>
</template>
