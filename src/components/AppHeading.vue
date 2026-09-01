<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
  centered: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div class="page-heading" :class="{ 'text-center': centered, 'mx-auto': centered }">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <h1>{{ title }}</h1>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.page-heading {
  max-width: 780px;
  margin-bottom: 42px;
}

.page-heading.text-center {
  text-align: center;
}

.page-heading.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.page-heading h1 {
  font: 700 clamp(42px, 5vw, 68px)/0.98 "Syne", sans-serif;
  color: var(--plum, #351536);
  margin: 0 0 18px;
}

.page-heading .eyebrow {
  font-size: 10px;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--red, #d92d36);
  margin-bottom: 16px;
  text-transform: uppercase;
}

.page-heading .subtitle {
  font-size: 16px;
  line-height: 1.6;
  color: var(--muted, #756d76);
  max-width: 600px;
  margin: 0;
}

.text-center .subtitle {
  margin-left: auto;
  margin-right: auto;
}

/* Dark mode */
.dark-mode .page-heading h1 {
  color: var(--ink, #fff4f7);
}

.dark-mode .page-heading .subtitle {
  color: var(--muted, #c7b8c0);
}

@media (max-width: 600px) {
  .page-heading h1 {
    font-size: clamp(30px, 8vw, 42px);
  }
  .page-heading .subtitle {
    font-size: 14px;
  }
}
</style>` `