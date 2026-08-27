<script setup>
import Swal from "sweetalert2";

const packages = [
  {
    name: "Essential",
    price: "R49",
    detail: "A focused start for everyday confidence.",
    features: ["Full premium video library", "Monthly safety checklist", "Cancel anytime"],
  },
  {
    name: "Circle",
    price: "R89",
    detail: "More support for you and your trusted people.",
    featured: true,
    features: ["Everything in Essential", "Shared safety plans", "Priority support"],
  },
  {
    name: "Annual",
    price: "R899",
    detail: "The best value for a year of preparedness.",
    features: ["Everything in Circle", "Two months free", "Annual safety review"],
  },
];

function choosePackage(packageName) {
  Swal.fire({
    icon: "success",
    title: `${packageName} package selected`,
    text: "Package checkout will be available soon.",
    confirmButtonColor: "#351536",
  });
}
</script>
<template>
  <main class="packages-page container-fluid px-4 px-xl-5">
    <section class="packages-heading">
      <p class="eyebrow">SAFEHER / PREMIUM PACKAGES</p>
      <h1>Choose the support that fits your <em>life.</em></h1>
      <p>Unlock guided safety videos and practical tools for building a stronger everyday safety routine.</p>
    </section>
    <section class="package-grid">
      <article v-for="item in packages" :key="item.name" class="package-card" :class="{ featured: item.featured }">
        <span v-if="item.featured" class="package-popular">MOST POPULAR</span>
        <p class="eyebrow">SAFEHER PREMIUM</p>
        <h2>{{ item.name }}</h2>
        <p>{{ item.detail }}</p>
        <strong class="package-price">{{ item.price }}<small>{{ item.name === "Annual" ? " / year" : " / month" }}</small></strong>
        <ul>
          <li v-for="feature in item.features" :key="feature"><i class="bi bi-check2"></i>{{ feature }}</li>
        </ul>
        <button class="btn" :class="item.featured ? 'btn-sos' : 'btn-outline-plum'" @click="choosePackage(item.name)">
          Choose {{ item.name }} <i class="bi bi-arrow-right"></i>
        </button>
      </article>
    </section>
  </main>
</template>
