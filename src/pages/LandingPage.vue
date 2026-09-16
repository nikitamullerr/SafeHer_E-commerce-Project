<script setup>
import { t, language, supportedLanguages } from "../languageConfig.js";
import { ref } from "vue";
import hostedImages from "../../shared/hosted-images.json";
defineProps({ darkMode: Boolean });
const backgroundsPaused = ref(false);
const landingBackgrounds = Object.keys(hostedImages).filter(name => name.startsWith('landing')).sort().map(name => hostedImages[name]);
const rotation = ref(0);
const dragging = ref(false);
const interacted = ref(false);
let previousAngle = 0;
function pointerAngle(event) {
  const box = event.currentTarget.getBoundingClientRect();
  return Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI;
}
function beginRotation(event) {
  if (event.button !== 0) return;
  interacted.value = true;
  dragging.value = true;
  previousAngle = pointerAngle(event);
  event.currentTarget.setPointerCapture(event.pointerId);
}
function rotate(event) {
  if (!dragging.value) return;
  const angle = pointerAngle(event);
  rotation.value += ((angle - previousAngle + 540) % 360) - 180;
  previousAngle = angle;
}
function nudge(amount) { interacted.value = true; rotation.value += amount; }
const emit = defineEmits(["navigate", "toggle-dark-mode"]);
</script>

<template>
  <div class="welcome-page">
    <div class="landing-backgrounds" aria-hidden="true" :class="{ paused: backgroundsPaused }">
      <div v-for="(background, index) in landingBackgrounds" :key="background" class="landing-background" :style="{ backgroundImage: `url('${background}')`, animationDelay: `${index * 8 - 1.5}s`, animationDuration: `${landingBackgrounds.length * 8}s` }" />
    </div>
    <header class="welcome-nav">
      <a class="welcome-brand" href="#welcome">SafeHer</a>
      <div class="welcome-controls">
        <button class="theme-button background-toggle" :aria-label="t(backgroundsPaused ? 'Resume backgrounds' : 'Pause backgrounds')" :title="t(backgroundsPaused ? 'Resume backgrounds' : 'Pause backgrounds')" :aria-pressed="backgroundsPaused" @click="backgroundsPaused = !backgroundsPaused"><i :class="backgroundsPaused ? 'bi bi-play' : 'bi bi-pause'" /></button>
        <label class="visually-hidden" for="welcome-language">{{ t('Language') }}</label>
        <select id="welcome-language" v-model="language"><option v-for="option in supportedLanguages" :key="option">{{ option }}</option></select>
        <button class="theme-button" :aria-label="t(darkMode ? 'Switch to light mode' : 'Switch to dark mode')" :aria-pressed="darkMode" @click="emit('toggle-dark-mode')"><i :class="darkMode ? 'bi bi-sun' : 'bi bi-moon'" /></button>
        <button class="welcome-login" @click="emit('navigate', 'login')">{{ t('Log in') }} <i class="bi bi-chevron-right" aria-hidden="true" /></button>
      </div>
    </header>
    <main id="welcome">
      <section class="safety-intro">
        <div class="safety-intro-copy">
          <p class="welcome-kicker">{{ t('Your everyday safety companion') }}</p>
          <h1 v-full-stop>{{ t('Your world.') }}<br />{{ t('Your pace.') }}<br /><em>{{ t('Your peace of mind.') }}</em></h1>
          <p class="welcome-intro">{{ t('SafeHer brings safety essentials, trusted contacts and everyday check-ins together, so you can move through your day with more confidence.') }}</p>
          <div class="welcome-actions"><button class="welcome-primary" @click="emit('navigate', 'index')">{{ t('Explore SafeHer') }} <i class="bi bi-arrow-right" /></button><button class="welcome-secondary" @click="emit('navigate', 'registration')">{{ t('Create account') }}</button></div>
          <a class="welcome-more" href="#discover">{{ t('A little more about us') }} <i class="bi bi-arrow-down" /></a>
        </div>
        <figure class="safety-orbit-figure">
          <div class="safety-orbit" :class="{ dragging, 'orbit-idle': !interacted }" tabindex="0" role="slider" :aria-label="t('Rotate your safety circle')" aria-valuemin="0" aria-valuemax="359" :aria-valuenow="Math.round((rotation % 360 + 360) % 360) % 360" aria-describedby="orbit-instructions"
            @pointerdown="beginRotation" @pointermove="rotate" @pointerup="dragging = false" @pointercancel="dragging = false" @lostpointercapture="dragging = false"
            @keydown.right.prevent="nudge(15)" @keydown.left.prevent="nudge(-15)" @keydown.up.prevent="nudge(15)" @keydown.down.prevent="nudge(-15)" @keydown.home.prevent="interacted = true; rotation = 0" @keydown.end.prevent="interacted = true; rotation = 359">
            <div class="safety-orbit-track" aria-hidden="true" />
            <div class="safety-shield" aria-hidden="true"><svg viewBox="0 0 160 190" fill="none"><path d="M80 9 145 34v54c0 43-30 75-65 93-35-18-65-61-65-93V34Z" fill="currentColor"/><path d="m52 92 19 19 39-42" stroke="var(--control-active-text)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>SafeHer</strong></div>
            <div class="safety-orbit-rotor" :style="{ transform: `rotate(${rotation}deg)` }" aria-hidden="true">
              <div v-for="(icon, index) in ['bi-people', 'bi-stopwatch', 'bi-shield-check']" :key="icon" class="safety-orbit-arm" :style="{ transform: `rotate(${index * 120}deg)` }"><span class="safety-orbit-node" :style="{ transform: `rotate(${-rotation - index * 120}deg)` }"><i :class="`bi ${icon}`" /></span></div>
            </div>
          </div>
          <figcaption id="orbit-instructions">{{ t('Drag in a circle or use the arrow keys to rotate.') }}</figcaption>
          <div class="orbit-legend"><span>{{ t('Your trusted circle') }}</span><span>{{ t('checkinTimer') }}</span><span>{{ t('Safety essentials') }}</span></div>
        </figure>
      </section>
      <section id="discover" class="welcome-discover">
        <div class="welcome-section-heading"><p class="welcome-kicker">{{ t('Small steps. Everyday confidence.') }}</p><h2 v-full-stop>{{ t('More than a safety store.') }}</h2><p>{{ t('Thoughtful essentials and useful tools for wherever life takes you.') }}</p></div>
        <div class="welcome-features">
          <button @click="emit('navigate', 'products')"><span class="feature-top"><i class="bi bi-bag-heart" /><span>01</span></span><h3 v-full-stop>{{ t('Find your essentials') }}</h3><p>{{ t('Explore personal safety products for your home, your commute, and your next adventure.') }}</p><span class="feature-link">{{ t('Explore the store') }} <i class="bi bi-arrow-up-right" /></span></button>
          <button @click="emit('navigate', 'safetyhub')"><span class="feature-top"><i class="bi bi-shield-check" /><span>02</span></span><h3 v-full-stop>{{ t('Keep your people close') }}</h3><p>{{ t('Save emergency contacts, set check-in reminders, and choose when to share your location in Safety Hub.') }}</p><span class="feature-link">{{ t('Discover Safety Hub') }} <i class="bi bi-arrow-up-right" /></span></button>
          <button @click="emit('navigate', 'packages')"><span class="feature-top"><i class="bi bi-play-circle" /><span>03</span></span><h3 v-full-stop>{{ t('Build your confidence') }}</h3><p>{{ t('Discover premium memberships and safety videos to support your everyday awareness.') }}</p><span class="feature-link">{{ t('Discover Premium') }} <i class="bi bi-arrow-up-right" /></span></button>
        </div>
      </section>
      <section class="welcome-steps" aria-labelledby="steps-title">
        <div class="steps-heading"><p class="welcome-kicker">{{ t('Made for your everyday') }}</p><h2 v-full-stop id="steps-title">{{ t('Make SafeHer part of your day') }}</h2><p>{{ t('Start small. Choose the tools that work for you.') }}</p></div>
        <ol class="steps-list">
          <li><span class="step-number" aria-hidden="true">01</span><div><h3 v-full-stop>{{ t('Take a look around') }}</h3><p>{{ t('Browse safety essentials and discover what SafeHer offers before creating an account.') }}</p></div></li>
          <li><span class="step-number" aria-hidden="true">02</span><div><h3 v-full-stop>{{ t('Create your safety circle') }}</h3><p>{{ t('Sign in to save trusted contacts and choose the safety tools you need.') }}</p></div></li>
          <li><span class="step-number" aria-hidden="true">03</span><div><h3 v-full-stop>{{ t('Build a simple routine') }}</h3><p>{{ t('Set a check-in reminder or share your current location when you choose.') }}</p></div></li>
        </ol>
      </section>
      <section class="welcome-closing"><span class="welcome-kicker">SafeHer</span><h2 v-full-stop>{{ t('A little more prepared.') }}<br />{{ t('A little more you.') }}</h2><button class="welcome-primary" @click="emit('navigate', 'index')">{{ t('Step inside') }} <i class="bi bi-arrow-right" /></button></section>
    </main>
    <footer class="welcome-footer"><strong>SafeHer</strong><span>{{ t('Your safety. Your people. Your choice.') }}</span><button @click="emit('navigate', 'index')">{{ t('Explore website') }} <i class="bi bi-chevron-right" aria-hidden="true" /></button></footer>
  </div>
</template>

<style scoped>
.welcome-page { --welcome-bg: var(--surface); --welcome-card: var(--surface); --welcome-ink: var(--ink); --welcome-muted: var(--muted); --welcome-line: var(--line); background: var(--welcome-bg); color: var(--welcome-ink); overflow: hidden; }
.welcome-page button, .welcome-page a, .welcome-page select { -webkit-tap-highlight-color: transparent; }
.welcome-page button { cursor: pointer; }
.welcome-page :is(button,a,select):focus-visible { outline: 3px solid #c94c7e; outline-offset: 5px; }
.welcome-nav, .welcome-footer { max-width: 1320px; margin: auto; padding: 26px 40px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.welcome-brand { color: var(--welcome-ink); text-decoration: none; font-size: 28px; font-weight: 850; letter-spacing: -1.5px; }.welcome-brand span { font-size: 11px; vertical-align: super; margin-left: 4px; }
.welcome-controls { display: flex; align-items: center; gap: 14px; }.welcome-controls select { max-width: 120px; background: transparent; color: var(--welcome-ink); border: 0; }.welcome-controls option { background: var(--welcome-card); }
.theme-button, .welcome-login { border: 1px solid var(--welcome-line); background: transparent; color: var(--welcome-ink); border-radius: 100px; min-height: 44px; padding: 10px 18px; }.theme-button { width: 44px; padding: 0; }
.welcome-hero { max-width: 1320px; margin: auto; padding: 80px 40px 100px; display: grid; grid-template-columns: 1.1fr 1fr; gap: 35px; align-items: center; min-height: 700px; }
.welcome-copy { animation: welcome-enter .8s ease both; }.welcome-kicker { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 750; color: var(--welcome-muted); }.welcome-kicker > span { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #b64072; margin-right: 8px; }
.welcome-page h1 { color: var(--welcome-ink); font-size: clamp(44px, 5.4vw, 76px); line-height: 1.06; letter-spacing: -3px; margin: 28px 0; font-weight: 750; }.welcome-page h1 em { font-family: Georgia, serif; font-weight: 400; color: #b23c6b; }
.welcome-intro { max-width: 470px; font-size: 16px; line-height: 1.85; color: var(--welcome-muted); }.welcome-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
.welcome-primary, .welcome-secondary { min-height: 50px; padding: 14px 24px; border-radius: 100px; font-weight: 700; font-size: 14px; border: 1px solid var(--welcome-line); transition: transform .2s; }.welcome-primary { background: var(--control-active); color: var(--control-active-text); }.welcome-secondary { background: transparent; color: var(--welcome-ink); }.welcome-primary i { margin-left: 16px; }.welcome-primary:hover, .welcome-secondary:hover { transform: translateY(-3px); }
.welcome-more { display: inline-block; margin-top: 35px; font-size: 12px; color: var(--welcome-muted); text-decoration: none; }.welcome-more i { margin-left: 12px; }
.welcome-art { position: relative; height: 510px; background: radial-gradient(ellipse, #df87ad33, transparent 68%); animation: welcome-enter 1.2s ease both; }.welcome-ring { position: absolute; border: 1px solid var(--welcome-line); border-radius: 50%; inset: 12% 6%; transform: rotate(-25deg); }.ring-b { inset: 3% 17%; transform: rotate(30deg); }
.welcome-core { position: absolute; inset: 26% 24%; border-radius: 44% 44% 48% 48%; background: linear-gradient(140deg, #f8c6d8, #c879a3); color: #351536; display: flex; align-items: center; justify-content: center; flex-direction: column; box-shadow: 0 30px 70px #9a426325, inset 0 1px 2px #fff9; transform: rotate(-8deg); }.welcome-core > i { font-size: 66px; }.welcome-core > span { font-size: 26px; font-weight: 800; }.welcome-core small { margin-top: 8px; font-size: 10px; }
.welcome-float { position: absolute; background: var(--welcome-card); border: 1px solid var(--welcome-line); border-radius: 16px; padding: 17px; display: flex; align-items: center; gap: 12px; box-shadow: 0 15px 35px #180d1610; font-size: 12px; font-weight: 650; animation: welcome-float 6s ease-in-out infinite; }.welcome-float i { color: #b64072; font-size: 22px; }.float-one { left: 3%; top: 13%; }.float-two { right: 0; top: 44%; animation-delay: -2s; }.float-three { left: 6%; bottom: 12%; animation-delay: -4s; }.welcome-spark { position: absolute; font-size: 40px; color: #c9759a; }.spark-one { right: 16%; top: 12%; }.spark-two { right: 26%; bottom: 12%; font-size: 24px; }
.welcome-discover { max-width: 1320px; margin: auto; padding: 60px 40px 90px; border-top: 1px solid var(--welcome-line); scroll-margin-top: 25px; }.welcome-section-heading { text-align: center; margin-bottom: 40px; }.welcome-page h2 { color: var(--welcome-ink); font-size: clamp(28px, 3.5vw, 44px); letter-spacing: -1.5px; }.welcome-section-heading > p:last-child { color: var(--welcome-muted); }
.welcome-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }.welcome-features > button { text-align: left; background: var(--welcome-card); border: 1px solid var(--welcome-line); border-radius: 22px; padding: 28px; color: var(--welcome-ink); transition: transform .25s, border-color .25s; }.welcome-features > button:hover { transform: translateY(-6px); border-color: #c9759a; }.feature-top { display: flex; justify-content: space-between; align-items: center; color: var(--welcome-muted); margin-bottom: 35px; }.feature-top i { font-size: 28px; }.feature-top > span { font-size: 11px; }.welcome-features h3 { color: var(--welcome-ink); font-size: 20px; }.welcome-features p { color: var(--welcome-muted); font-size: 14px; line-height: 1.8; }.feature-link { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-top: 28px; }
.welcome-closing { text-align: center; padding: 70px 24px 90px; background: radial-gradient(ellipse at bottom, #d482a329, transparent 70%); }.welcome-closing h2 { margin: 22px 0 30px; }.welcome-footer { border-top: 1px solid var(--welcome-line); font-size: 12px; color: var(--welcome-muted); }.welcome-footer button { background: transparent; border: 0; color: var(--welcome-ink); min-height: 44px; }
@keyframes welcome-enter { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }@keyframes welcome-float { 50% { transform: translateY(-12px); } }
@media(max-width: 850px) { .welcome-hero { grid-template-columns: 1fr; padding-top: 45px; gap: 0; }.welcome-art { height: 430px; max-width: 500px; width: 100%; margin: auto; }.welcome-copy { text-align: center; }.welcome-intro { margin: auto; }.welcome-actions { justify-content: center; }.welcome-features { grid-template-columns: 1fr; }.welcome-features > button { padding: 25px; }.feature-top { margin-bottom: 20px; } }
@media(max-width: 480px) { .welcome-nav, .welcome-footer { padding: 20px; flex-wrap: wrap; }.welcome-nav { gap: 12px; }.welcome-controls { gap: 7px; }.welcome-controls select { max-width: 78px; font-size: 12px; }.welcome-login { padding: 10px; font-size: 12px; }.welcome-brand { font-size: 24px; }.welcome-hero { padding: 40px 20px; }.welcome-page h1 { font-size: 44px; letter-spacing: -2px; }.welcome-art { height: 360px; }.welcome-float { padding: 12px; font-size: 10px; }.welcome-core { inset: 25% 22%; }.welcome-core > i { font-size: 48px; }.welcome-discover { padding: 45px 20px; }.welcome-footer { justify-content: center; } }
@media(prefers-reduced-motion: reduce) { .welcome-page *, .welcome-page *::before { animation: none !important; transition: none !important; } }
.welcome-controls select { min-height: 44px; border: 1px solid var(--control-border); border-radius: 10px; padding: 8px; background: var(--control-bg); color: var(--control-text); }
.welcome-controls option { background: var(--control-bg); color: var(--control-text); }
.welcome-page h1 em, .welcome-float i { color: var(--control-active); }
.welcome-core { background: var(--control-active); color: var(--control-active-text); }

 .safety-intro { max-width: 1320px; margin: auto; padding: 70px 40px 85px; display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: 55px; }
.safety-intro-copy { min-width: 0; animation: welcome-enter .8s ease both; }.safety-intro-copy h1 { font-size: clamp(40px, 4.8vw, 67px); overflow-wrap: anywhere; }
.safety-orbit-figure { min-width: 0; margin: 0; text-align: center; }.safety-orbit { position: relative; width: 100%; max-width: 460px; aspect-ratio: 1; margin: auto; touch-action: none; cursor: grab; user-select: none; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--control-active) 16%, transparent), transparent 70%); }.safety-orbit:focus-visible { outline: 3px solid var(--control-active); outline-offset: 5px; }.safety-orbit.dragging { cursor: grabbing; }
.safety-orbit-track { position: absolute; inset: 13%; border: 1px solid var(--control-border); border-radius: 50%; box-shadow: 0 0 0 22px color-mix(in srgb, var(--control-active) 4%, transparent), 0 0 0 45px color-mix(in srgb, var(--control-active) 3%, transparent); }
.safety-shield { position: absolute; inset: 29%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }.safety-shield svg { width: 100%; max-height: 160px; color: var(--control-active); filter: drop-shadow(0 12px 9px #35153625); }.safety-shield strong { font-size: 22px; color: var(--ink); margin-top: 10px; }
.safety-orbit-rotor { position: absolute; inset: 0; pointer-events: none; }.safety-orbit-arm { position: absolute; inset: 0; }.safety-orbit-node { position: absolute; left: calc(50% - 30px); top: calc(13% - 30px); width: 60px; height: 60px; border-radius: 20px; display: grid; place-items: center; background: var(--control-bg); color: var(--control-text); border: 1px solid var(--control-border); box-shadow: 0 10px 24px #35153618; font-size: 25px; }
.orbit-idle .safety-orbit-rotor { animation: orbit-invitation 8s ease-in-out infinite; }@keyframes orbit-invitation { 50% { transform: rotate(25deg); } }
.safety-orbit-figure figcaption { font-size: 12px; color: var(--muted); margin-top: 20px; }.orbit-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 16px; font-size: 11px; color: var(--ink); margin-top: 14px; }
@media(max-width: 850px) { .safety-intro { grid-template-columns: 1fr; padding: 40px 24px 60px; gap: 32px; }.safety-intro-copy { text-align: center; }.safety-orbit { max-width: 380px; }.safety-intro-copy h1 { font-size: clamp(38px, 7vw, 60px); }.safety-intro-copy .welcome-intro { margin: auto; } }
@media(prefers-reduced-motion: reduce) { .safety-orbit-rotor, .safety-intro-copy { animation: none !important; } }
/* The illustration stays behind the content and never intercepts dragging. */
.welcome-page { position: relative; isolation: isolate; }
.landing-backgrounds { position: absolute; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; background: var(--surface); }
.landing-backgrounds::after { content: ""; position: absolute; inset: 0; background: linear-gradient(color-mix(in srgb, var(--surface) 88%, transparent), color-mix(in srgb, var(--surface) 94%, transparent)); }
.landing-background { position: absolute; inset: 0; background-size: 448px auto; background-repeat: repeat; opacity: 0; animation: landing-crossfade linear infinite; }
.landing-background:first-child { opacity: 1; }
.landing-backgrounds.paused .landing-background { animation-play-state: paused; }
@keyframes landing-crossfade { 0% { opacity: 0; } 6.25%, 33.333% { opacity: 1; } 39.583%, 100% { opacity: 0; } }
@media(prefers-reduced-motion: reduce) { .landing-background { animation: none !important; }.landing-background:not(:first-child) { display: none; }.background-toggle { display: none; } }

.welcome-features > button { background: var(--surface); }

.welcome-nav { border-bottom: 1px solid var(--welcome-line); }
.welcome-controls { flex-wrap: wrap; justify-content: flex-end; }
.welcome-login, .welcome-footer button { display: inline-flex; align-items: center; justify-content: center; gap: 12px; font-weight: 650; }
.welcome-login { background: var(--control-bg); border-color: var(--control-border); color: var(--control-text); }
.welcome-login i, .welcome-footer button i { font-size: 12px; transition: transform .2s ease; }
.welcome-login:hover i, .welcome-footer button:hover i { transform: translateX(3px); }
.theme-button { flex-shrink: 0; background: var(--control-bg); color: var(--control-text); }
.welcome-features > button { display: flex; flex-direction: column; box-shadow: 0 8px 28px #35153608; }
.feature-top { width: 100%; }.feature-link { width: 100%; margin-top: auto; padding-top: 22px; }
.welcome-steps { max-width: 1240px; margin: 0 auto; padding: 40px; border: 1px solid var(--welcome-line); border-radius: 28px; background: var(--surface); display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; }
.steps-heading { align-self: center; }.steps-heading > p:last-child { font-size: 14px; line-height: 1.8; color: var(--muted); }
.steps-list { list-style: none; padding: 0; margin: 0; }.steps-list li { display: flex; gap: 20px; padding: 22px 0; }.steps-list li + li { border-top: 1px solid var(--welcome-line); }
.step-number { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; background: var(--control-bg); color: var(--control-text); border: 1px solid var(--control-border); border-radius: 50%; font-size: 11px; font-weight: 700; }
.steps-list h3 { font-size: 17px; color: var(--ink); margin: 0 0 8px; }.steps-list p { font-size: 13px; line-height: 1.8; color: var(--muted); margin: 0; }
@media(max-width: 850px) { .welcome-steps { margin: 0 24px; padding: 26px; grid-template-columns: 1fr; gap: 12px; } }
@media(max-width: 480px) { .welcome-nav { justify-content: center; }.welcome-controls { justify-content: center; width: 100%; }.welcome-controls select { max-width: 110px; }.welcome-steps { margin: 0 20px; padding: 22px; }.steps-list li { gap: 14px; } }
</style>
