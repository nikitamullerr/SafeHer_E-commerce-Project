<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";

const props = defineProps({ active: { type: Boolean, default: false } });
const emit = defineEmits(["complete"]);

const container = ref(null);
let scene, camera, renderer;
let pulses = []; // [{ ring, glow, delay }]
let flash = null;
let ringParticles;
let animationId = null;
let isAnimating = false;
let clock = null;
let totalElapsed = 0;
let fallbackTimer = null;
const fallbackActive = ref(false);

const PULSE_COUNT = 3;
const PULSE_STAGGER = 0.26; // seconds between each ring starting
const PULSE_DURATION = 1.5; // seconds for one ring to expand + fade
const FLASH_DURATION = 0.45;
const MAX_SCALE = 7;

function log(msg) {
  console.log("[SOSEffect]", msg);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function initScene() {
  if (!container.value) return;
  log("initScene");

  try {
    scene = new THREE.Scene();
    scene.background = null;

    const width = container.value.clientWidth;
    const height = container.value.clientHeight;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.value.appendChild(renderer.domElement);

    window.addEventListener("resize", onResize);
    createRingEffect();
    log("Scene ready");
  } catch (err) {
    log("Error: " + err.message);
  }
}

function makeRingPair() {
  // Inner ring: crisp red, additive so overlapping rings glow rather than
  // flatten to solid color. depthWrite:false keeps stacked transparent
  // rings from fighting each other for draw order.
  const ringGeo = new THREE.RingGeometry(0.42, 0.58, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff3b46,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);

  // Outer glow: wider, softer, warmer pink halo around the inner ring.
  const glowGeo = new THREE.RingGeometry(0.3, 0.85, 80);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff8fa3,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);

  ring.scale.set(0.05, 0.05, 0.05);
  glow.scale.set(0.05, 0.05, 0.05);
  ring.visible = false;
  glow.visible = false;
  scene.add(glow); // glow behind the crisp ring
  scene.add(ring);

  return { ring, glow };
}

function createRingEffect() {
  log("Creating ring effect");

  pulses = [];
  for (let i = 0; i < PULSE_COUNT; i++) {
    const { ring, glow } = makeRingPair();
    pulses.push({ ring, glow, delay: i * PULSE_STAGGER });
  }

  // Bright flash at the center at the instant of trigger — gives the
  // pulse a sense of "impact" rather than just rings drifting outward.
  const flashGeo = new THREE.CircleGeometry(0.4, 48);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfff0f2,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  flash = new THREE.Mesh(flashGeo, flashMat);
  flash.scale.set(0.05, 0.05, 0.05);
  flash.visible = false;
  scene.add(flash);

  // --- PARTICLES (sparkles) ---
  const particleCount = 260;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.25 + Math.random() * 0.75;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    const color = new THREE.Color().setHSL(
      0.98,
      0.85,
      0.55 + Math.random() * 0.35,
    );
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.07,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  ringParticles = new THREE.Points(particleGeo, particleMat);
  ringParticles.scale.set(0.05, 0.05, 0.05);
  ringParticles.visible = false;
  scene.add(ringParticles);

  log("Ring effect created");
}

function animate() {
  animationId = requestAnimationFrame(animate);

  if (isAnimating) {
    if (!clock) clock = new THREE.Clock();
    const delta = clock.getDelta();
    totalElapsed += delta;

    let allPulsesDone = true;
    pulses.forEach((p) => {
      const local = totalElapsed - p.delay;
      if (local < 0) {
        p.ring.visible = false;
        p.glow.visible = false;
        allPulsesDone = false;
        return;
      }
      const progress = Math.min(local / PULSE_DURATION, 1);
      if (progress < 1) allPulsesDone = false;

      const scale = 0.05 + easeOutCubic(progress) * MAX_SCALE;
      const fade = (1 - progress) * (1 - progress); // eased fade-out

      p.ring.visible = true;
      p.glow.visible = true;
      p.ring.scale.set(scale, scale, scale);
      p.ring.material.opacity = fade * 0.9;
      p.ring.rotation.z += delta * 0.15;
      p.glow.scale.set(scale * 1.18, scale * 1.18, scale * 1.18);
      p.glow.material.opacity = fade * 0.35;
    });

    // Center flash — quick pop, done well before the rings finish.
    const flashProgress = Math.min(totalElapsed / FLASH_DURATION, 1);
    if (flashProgress < 1) {
      flash.visible = true;
      const fScale = 0.05 + easeOutCubic(flashProgress) * 2.4;
      flash.scale.set(fScale, fScale, fScale);
      flash.material.opacity = (1 - flashProgress) * 0.85;
    } else {
      flash.visible = false;
    }

    // Particle burst, fading a little faster than the rings.
    const particleProgress = Math.min(
      totalElapsed / (PULSE_DURATION * 0.85),
      1,
    );
    const particleDone = particleProgress >= 1;
    if (!particleDone) {
      const pScale = 0.05 + easeOutCubic(particleProgress) * MAX_SCALE * 0.65;
      ringParticles.visible = true;
      ringParticles.scale.set(pScale, pScale, pScale);
      ringParticles.material.opacity = 1 - particleProgress;
      ringParticles.rotation.z += delta * 0.35;
    } else {
      ringParticles.visible = false;
    }

    if (allPulsesDone && particleDone && flashProgress >= 1) {
      isAnimating = false;
      emit("complete");
      setTimeout(() => {
        pulses.forEach((p) => {
          p.ring.visible = false;
          p.glow.visible = false;
        });
        ringParticles.visible = false;
        flash.visible = false;
      }, 100);
      log("Animation complete");
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function triggerEffect() {
  if (isAnimating) return;
  if (!pulses.length || !flash || !ringParticles) {
    log("WebGL unavailable; using CSS fallback");
    fallbackActive.value = true;
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      fallbackActive.value = false;
    }, 1900);
    return;
  }

  log("SOS EFFECT TRIGGERED!");

  totalElapsed = 0;
  isAnimating = true;
  clock = new THREE.Clock();

  pulses.forEach((p) => {
    p.ring.visible = false;
    p.glow.visible = false;
    p.ring.scale.set(0.05, 0.05, 0.05);
    p.glow.scale.set(0.05, 0.05, 0.05);
    p.ring.material.opacity = 0;
    p.glow.material.opacity = 0;
  });

  flash.visible = true;
  flash.scale.set(0.05, 0.05, 0.05);
  flash.material.opacity = 0.85;

  ringParticles.visible = true;
  ringParticles.scale.set(0.05, 0.05, 0.05);
  ringParticles.material.opacity = 1;
}

function onResize() {
  if (!container.value || !camera || !renderer) return;
  const w = container.value.clientWidth;
  const h = container.value.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

watch(
  () => props.active,
  (newVal) => {
    log("active:", newVal);
    if (newVal) triggerEffect();
  },
  { immediate: true },
);

onMounted(() => {
  log("mounted");
  setTimeout(() => {
    if (container.value) {
      initScene();
      animate();
    } else {
      log("container null");
    }
  }, 100);
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  clearTimeout(fallbackTimer);
  if (renderer) {
    renderer.dispose();
    if (container.value && renderer.domElement) {
      container.value.removeChild(renderer.domElement);
    }
  }
  window.removeEventListener("resize", onResize);
});
</script>

<template>
  <div ref="container" class="sos-effect-container">
    <div v-if="fallbackActive" class="sos-fallback" aria-hidden="true">
      <span class="sos-fallback-ring"></span>
      <span class="sos-fallback-ring"></span>
      <span class="sos-fallback-ring"></span>
    </div>
  </div>
</template>

<style scoped>
.sos-effect-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

.sos-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.sos-fallback-ring {
  position: absolute;
  width: clamp(96px, 30vw, 280px);
  aspect-ratio: 1;
  border: clamp(3px, 0.8vw, 8px) solid #ff3b46;
  border-radius: 50%;
  box-shadow:
    0 0 18px #ff8fa3,
    inset 0 0 18px #ff8fa3;
  opacity: 0;
  animation: sos-fallback-pulse 1.8s ease-out both;
}

.sos-fallback-ring:nth-child(2) {
  animation-delay: 0.26s;
}

.sos-fallback-ring:nth-child(3) {
  animation-delay: 0.52s;
}

@keyframes sos-fallback-pulse {
  0% {
    opacity: 0.9;
    transform: scale(0.15);
  }
  100% {
    opacity: 0;
    transform: scale(3.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sos-fallback-ring {
    animation-duration: 0.01ms;
  }
}
</style>
