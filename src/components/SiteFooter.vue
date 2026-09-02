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
          ><button @click="emit('navigate', 'reviews')">Reviews</button>
        </div>
        <div>
          <strong>Premium</strong
          ><button class="footer-premium-link" @click="emit('navigate', 'packages')">
            <i class="bi bi-heart-fill"></i> Premium packages
          </button><button class="footer-premium-link" @click="emit('navigate', 'videos')">
            <i class="bi bi-lock-fill"></i> Safety videos
          </button>
        </div>
        <div class="footer-hotlines">
          <strong>Emergency support</strong>
          <a href="tel:0800428428"><i class="bi bi-telephone-fill"></i> GBV Command Centre <b>0800 428 428</b></a>
          <a href="tel:10111"><i class="bi bi-shield-fill"></i> Police emergency <b>10111</b></a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2025 SafeHer. Made for safer tomorrows.</span>
      </div>
    </div>
  </footer>
</template>
