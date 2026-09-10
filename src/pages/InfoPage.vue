<script setup>
import { t } from "../languageConfig.js";
defineProps({ view: String });
const emit = defineEmits(["sos"]);
</script>
<template>
  <main class="guide-page container-fluid px-4 px-xl-5">
    <div class="guide-heading">
      <p class="eyebrow">SAFEHER / {{ t("guide") }}</p>
      <h1>{{ t("servicesTitle") }}</h1>
      <p>{{ t("guideLead") }}</p>
    </div>
    <section class="guide-sos-banner">
      <div>
        <span class="guide-sos-pulse"
          ><i class="bi bi-exclamation-lg"></i
        ></span>
        <div>
          <p class="eyebrow">{{ t("NEED HELP NOW?") }}</p>
          <h2>{{ t("Your safety comes first.") }}</h2>
          <p> {{ t("Use SafeHer SOS to notify your trusted people and start your emergency response.") }} </p>
        </div>
      </div>
      <button class="guide-sos-action" @click="emit('sos')">
        <i class="bi bi-broadcast-pin"></i> {{ t("Get help now") }} </button>
    </section>
    <section class="guide-feature-grid">
      <article class="guide-feature guide-feature-main">
        <i class="bi bi-shield-check"></i>
        <p class="eyebrow">01 / {{ t("staySafe") }}</p>
        <h2>{{ t("staySafe") }}</h2>
        <p>{{ t("staySafeText") }}</p>
      </article>
      <article class="guide-feature guide-feature-pink">
        <i class="bi bi-person-raised-hand"></i>
        <p class="eyebrow">02 / {{ t("selfDefence") }}</p>
        <h2>{{ t("selfDefence") }}</h2>
        <p>{{ t("selfDefenceText") }}</p>
      </article>
      <article class="guide-feature guide-feature-cream">
        <i class="bi bi-tools"></i>
        <p class="eyebrow">03 / {{ t("itemGuide") }}</p>
        <h2>{{ t("itemGuide") }}</h2>
        <p>{{ t("itemGuideText") }}</p>
      </article>
    </section>
    <section class="steps-panel">
      <div class="steps-heading">
        <p class="eyebrow">{{ t("A SIMPLE PLAN") }}</p>
        <h2>{{ t("When something feels wrong.") }}</h2>
        <p>{{ t("Keep these steps calm, simple and repeatable.") }}</p>
      </div>
      <div class="steps-list">
        <article>
          <span>01</span>
          <div>
            <h3>{{ t("stepOne") }}</h3>
            <p>{{ t("stepOneText") }}</p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h3>{{ t("stepTwo") }}</h3>
            <p>{{ t("stepTwoText") }}</p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h3>{{ t("stepThree") }}</h3>
            <p>{{ t("stepThreeText") }}</p>
          </div>
        </article>
      </div>
    </section>
    <section class="guide-detail-grid">
      <article>
        <div class="guide-detail-heading">
          <i class="bi bi-bag-heart-fill"></i>
          <h2>{{ t("Use your safety items") }}</h2>
        </div>
        <ul>
          <li>
            <strong>{{ t("Smart Panic Button") }}</strong
            ><span
              >{{ t("Keep it charged and accessible. Press it when you need your emergency circle to know you need help.") }}</span
            >
          </li>
          <li>
            <strong>{{ t("Defender Spray") }}</strong
            ><span
              >{{ t("Carry it where you can reach it quickly. Aim away from yourself, create distance and leave.") }}</span
            >
          </li>
          <li>
            <strong>{{ t("Safety Whistle") }}</strong
            ><span
              >{{ t("Use three sharp blasts to attract attention, then move toward a public, well-lit place.") }}</span
            >
          </li>
        </ul>
      </article>
      <article>
        <div class="guide-detail-heading">
          <i class="bi bi-check2-circle"></i>
          <h2>{{ t("A safer everyday routine") }}</h2>
        </div>
        <ul>
          <li>
            <strong>{{ t("Before you leave") }}</strong
            ><span
              >{{ t("Charge your phone, tell someone your plan and check that your location tools are ready.") }}</span
            >
          </li>
          <li>
            <strong>{{ t("While travelling") }}</strong
            ><span
              >{{ t("Stay aware, keep one ear free and use your check-in timer for longer journeys.") }}</span
            >
          </li>
          <li>
            <strong>{{ t("When you arrive") }}</strong
            ><span
              >{{ t("Check in with your people and stop sharing your route when you are safely home.") }}</span
            >
          </li>
        </ul>
      </article>
    </section>
    <section class="guide-callout">
      <i class="bi bi-play-circle-fill"></i>
      <div>
        <p class="eyebrow">{{ t("PRACTICE MAKES READY") }}</p>
        <h2>{{ t("Learn how your tools work before you need them.") }}</h2>
        <p> {{ t("Visit the Safety Hub to add emergency contacts, start a check-in timer and share your live route.") }} </p>
      </div>
    </section>
  </main>
</template>
