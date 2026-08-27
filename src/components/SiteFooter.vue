<script setup>
const emit = defineEmits(["navigate"]);
</script>
<template>
  <footer class="site-footer">
    <div class="container-fluid px-4 px-xl-5">
      <div class="footer-brand">
        <button class="brand" @click="emit('navigate', 'index')">
          <span class="brand-mark"><i class="bi bi-shield-fill"></i></span
          ><span>SafeHer<small>Your safety network</small></span>
        </button>
        <p>Protection, connection and support for every South African.</p>
      </div>
      <div class="footer-links">
        <div>
          <strong>Explore</strong
          ><button @click="emit('navigate', 'services')">Our services</button
          ><button @click="emit('navigate', 'safetyhub')">Safety hub</button>
        </div>
        <div>
          <strong>Support</strong
          ><button @click="emit('navigate', 'login')">Log in</button
          ><button @click="emit('navigate', 'registration')">
            Create account
          </button>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2025 SafeHer. Made for safer tomorrows.</span>
      </div>
    </div>
  </footer>
</template>
