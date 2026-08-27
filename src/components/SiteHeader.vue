<script setup>
import { t } from "../languageConfig.js";
defineProps({
  activeView: String,
  menuOpen: Boolean,
  language: String,
  cartCount: Number,
});
const emit = defineEmits([
  "navigate",
  "toggle-menu",
  "update:language",
  "toggle-cart",
  "logout",
]);
</script>
<template>
  <div>
    <div class="top-strip">
      <div class="container-fluid px-4">
        <span
          ><i class="bi bi-shield-check me-2"></i>Safety starts with being
          connected.</span
        ><span class="d-none d-md-inline"
          >Free delivery on orders over R500
          <i class="bi bi-arrow-up-right ms-1"></i
        ></span>
      </div>
    </div>
    <nav
      class="navbar navbar-expand-lg site-nav"
      :class="{ 'menu-open': menuOpen }"
    >
      <div class="container-fluid px-4 px-xl-5">
        <button class="brand" @click="emit('navigate', 'index')">
          <span class="brand-mark"><i class="bi bi-shield-fill"></i></span
          ><span>SafeHer<small>Your safety network</small></span>
        </button>
        <button class="navbar-toggler" @click="emit('toggle-menu')">
          <i class="bi bi-list"></i>
        </button>
        <div class="nav-links" :class="{ show: menuOpen }">
          <button
            :class="{ active: activeView === 'index' }"
            @click="emit('navigate', 'index')"
          >
            {{ t("home") }}</button
          ><button @click="emit('navigate', 'services')">
            {{ t("guide") }}</button
          ><button @click="emit('navigate', 'products')">
            {{ t("store") }}</button
          ><button @click="emit('navigate', 'safetyhub')">
            {{ t("hub") }}
          </button>
        </div>
        <div class="nav-actions">
          <select
            :value="language"
            aria-label="Language"
            @change="emit('update:language', $event.target.value)"
          >
            <option>English</option>
            <option>isiZulu</option>
            <option>Afrikaans</option>
            <option>isiXhosa</option></select
          ><button
            class="icon-button"
            aria-label="Log out"
            title="Log out"
            @click="emit('logout')"
          >
            <i class="bi bi-box-arrow-right"></i></button
          ><button
            class="bag-button"
            aria-label="Shopping bag"
            @click="emit('toggle-cart')"
          >
            <i class="bi bi-bag"></i><b>{{ cartCount }}</b>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>
