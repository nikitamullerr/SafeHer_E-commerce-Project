<script setup>
import { computed, reactive, ref, watch } from "vue";
import Swal from "sweetalert2";
import { authService } from "../services/authService.js";

const props = defineProps({ mode: String });
const emit = defineEmits([
  "navigate",
  "authenticated",
  "sign-in-notification-complete",
]);

const name = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const agreeTerms = ref(false);
const showPassword = ref(false);
const currentStep = ref(1);
const submitting = ref(false);

const errors = reactive({
  name: "",
  email: "",
  password: "",
  confirm: "",
  terms: "",
  form: "",
});

const benefits = [
  { icon: "bi-broadcast-pin", title: "Live GPS" },
  { icon: "bi-shield-fill-exclamation", title: "One-tap SOS" },
  { icon: "bi-headset", title: "24/7 support" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clearError(field) {
  errors[field] = "";
  if (errors.form) errors.form = "";
}

function switchMode(target) {
  if (target !== props.mode) emit("navigate", target);
}

const passwordStrength = computed(() => {
  const value = password.value;
  if (!value) return { score: 0, label: "", color: "var(--line)" };
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const meta = [
    { label: "Very weak", color: "var(--red)" },
    { label: "Weak", color: "var(--red)" },
    { label: "Fair", color: "#d98a2b" },
    { label: "Good", color: "#2e9e5b" },
    { label: "Strong", color: "var(--plum)" },
  ][score];
  return { score, ...meta };
});

const passwordsMatch = computed(
  () => confirm.value.length > 0 && confirm.value === password.value,
);

watch(
  () => props.mode,
  () => {
    name.value = "";
    email.value = "";
    password.value = "";
    confirm.value = "";
    agreeTerms.value = false;
    currentStep.value = 1;
    showPassword.value = false;
    Object.keys(errors).forEach((key) => (errors[key] = ""));
  },
);

function validateStep1() {
  errors.name = "";
  errors.email = "";
  let valid = true;
  if (props.mode === "registration" && !name.value.trim()) {
    errors.name = "Enter your full name";
    valid = false;
  }
  if (!email.value.trim()) {
    errors.email = "Enter your email address";
    valid = false;
  } else if (!emailPattern.test(email.value.trim())) {
    errors.email = "Enter a valid email address";
    valid = false;
  }
  return valid;
}

function validateLogin() {
  errors.email = "";
  errors.password = "";
  let valid = true;
  if (!email.value.trim()) {
    errors.email = "Enter your email address";
    valid = false;
  }
  if (!password.value) {
    errors.password = "Enter your password";
    valid = false;
  }
  return valid;
}

function validateStep2() {
  errors.password = "";
  errors.confirm = "";
  errors.terms = "";
  let valid = true;
  if (password.value.length < 6) {
    errors.password = "Use at least 6 characters";
    valid = false;
  }
  if (confirm.value !== password.value) {
    errors.confirm = "Passwords don't match";
    valid = false;
  }
  if (!agreeTerms.value) {
    errors.terms = "Accept the terms to continue";
    valid = false;
  }
  return valid;
}

function nextStep() {
  if (validateStep1()) currentStep.value = 2;
}

function prevStep() {
  currentStep.value = 1;
  errors.form = "";
}

function finishAuth(user, title) {
  localStorage.setItem("safeher-token", user.token);
  localStorage.setItem("safeher-user", JSON.stringify(user.user));

  emit("authenticated", user.user);
  Swal.fire({
    icon: "success",
    title,
    confirmButtonColor: "#351536",
  }).then(() => {
    emit("navigate", "index");
    emit("sign-in-notification-complete");
  });
}

async function submit() {
  errors.form = "";

  if (props.mode === "login") {
    if (!validateLogin()) return;
    submitting.value = true;

    try {
      const response = await authService.login({
        email: email.value,
        password: password.value,
      });

      submitting.value = false;
      finishAuth(response, "Welcome back to SafeHer");
    } catch (error) {
      submitting.value = false;
      errors.form =
        error.response?.data?.error || "Incorrect email or password";
    }
    return;
  }

  // Registration
  if (!validateStep1()) {
    currentStep.value = 1;
    return;
  }
  if (!validateStep2()) return;

  submitting.value = true;

  try {
    const response = await authService.register({
      name: name.value.trim(),
      email: email.value,
      password: password.value,
      phone: "",
    });

    submitting.value = false;
    finishAuth(response, "Your SafeHer account is ready");
  } catch (error) {
    submitting.value = false;
    errors.form =
      error.response?.data?.error || "Registration failed. Please try again.";
  }
}

const googleLoading = ref(false);

let googleTokenClient = null;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      console.log("Google script already loaded");
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      console.log("⏳ Waiting for existing Google script...");
      existingScript.addEventListener(
        "load",
        () => {
          console.log("Existing Google script loaded");
          resolve();
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => {
          console.error("Existing Google script failed");
          reject(new Error("Failed to load Google script"));
        },
        { once: true },
      );
      return;
    }

    console.log("Loading Google script...");
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("Google script loaded successfully");
      resolve();
    };
    script.onerror = () => {
      console.error("Google script failed to load");
      reject(new Error("Failed to load Google script"));
    };
    document.head.appendChild(script);
  });
}

async function continueWithGoogle() {
  errors.form = "";
  googleLoading.value = true;

  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new Error(
        "Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.",
      );
    }

    console.log("Loading Google script...");
    await loadGoogleScript();
    console.log("Google script loaded");

    googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: async (response) => {
        console.log("Google callback received");

        if (response.error) {
          console.error("Google error:", response);
          errors.form =
            response.error_description || "Google sign-in was cancelled.";
          googleLoading.value = false;
          return;
        }

        try {
          console.log("Fetching user info...");
          const userResponse = await fetch(
            "https://openidconnect.googleapis.com/v1/userinfo",
            {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
              },
            },
          );

          if (!userResponse.ok) {
            throw new Error("Unable to retrieve your Google account.");
          }

          const googleUser = await userResponse.json();
          console.log("Google user:", googleUser);

          if (!googleUser.email) {
            throw new Error("Google did not provide an email address.");
          }

          // Try to login with Google email
          try {
            console.log("Attempting login...");
            const loginResponse = await authService.login({
              email: googleUser.email,
              password: "google_oauth_" + (googleUser.sub || googleUser.id),
            });

            console.log("Login successful");
            localStorage.setItem("safeher-token", loginResponse.token);
            localStorage.setItem(
              "safeher-user",
              JSON.stringify(loginResponse.user),
            );

            emit("authenticated", loginResponse.user);
            Swal.fire({
              icon: "success",
              title: "Welcome back to SafeHer",
              confirmButtonColor: "#351536",
            }).then(() => {
              emit("navigate", "index");
              emit("sign-in-notification-complete");
            });
          } catch (loginError) {
            console.log("ℹ️ User not found, registering...");

            // If login fails, register the user
            try {
              const registerResponse = await authService.register({
                name: googleUser.name || googleUser.email.split("@")[0],
                email: googleUser.email,
                password: "google_oauth_" + (googleUser.sub || googleUser.id),
                phone: "",
              });

              console.log("Registration successful");
              localStorage.setItem("safeher-token", registerResponse.token);
              localStorage.setItem(
                "safeher-user",
                JSON.stringify(registerResponse.user),
              );

              emit("authenticated", registerResponse.user);
              Swal.fire({
                icon: "success",
                title: "Your SafeHer account is ready",
                confirmButtonColor: "#351536",
              }).then(() => {
                emit("navigate", "index");
                emit("sign-in-notification-complete");
              });
            } catch (registerError) {
              console.error("Registration error:", registerError);
              throw new Error(
                registerError.response?.data?.error ||
                  "Failed to create account",
              );
            }
          }
        } catch (error) {
          console.error("Google sign-in error:", error);
          errors.form =
            error?.message ||
            "Unable to continue with Google. Please try again.";
          googleLoading.value = false;
        }
      },
    });

    console.log("Requesting access token...");
    googleTokenClient.requestAccessToken({
      prompt: "select_account",
    });
  } catch (error) {
    console.error("Google sign-in error:", error);
    errors.form =
      error?.message || "Unable to continue with Google. Please try again.";
    googleLoading.value = false;
  }
}

async function forgotPassword() {
  const emailResult = await Swal.fire({
    title: "Reset your password",
    input: "email",
    inputLabel: "Enter the email on your SafeHer account",
    inputPlaceholder: "you@example.com",
    showCancelButton: true,
    confirmButtonText: "Find account",
    confirmButtonColor: "#351536",
    inputValidator: (value) =>
      !value ? "Please enter your email address" : undefined,
  });

  if (!emailResult.isConfirmed) return;

  try {
    await authService.forgotPassword(emailResult.value);

    Swal.fire({
      icon: "success",
      title: "Password reset email sent",
      text: "Check your email for instructions to reset your password.",
      confirmButtonColor: "#351536",
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Account not found",
      text: "Check the email address or create a new account.",
      confirmButtonColor: "#351536",
    });
  }
}
</script>

<template>
  <main class="sf-shell">
    <span class="sf-orbit sf-orbit-a" aria-hidden="true"></span>
    <span class="sf-orbit sf-orbit-b" aria-hidden="true"></span>

    <section class="sf-card">
      <div class="sf-signal" aria-hidden="true">
        <span class="sf-ring sf-ring-1"></span>
        <span class="sf-ring sf-ring-2"></span>
        <span class="sf-core"
          ><i
            :class="
              mode === 'login' ? 'bi bi-shield-fill' : 'bi bi-person-plus-fill'
            "
          ></i
        ></span>
      </div>

      <div class="sf-toggle" role="tablist">
        <button
          role="tab"
          :aria-selected="mode === 'login'"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          Sign in
        </button>
        <button
          role="tab"
          :aria-selected="mode === 'registration'"
          :class="{ active: mode === 'registration' }"
          @click="switchMode('registration')"
        >
          Create account
        </button>
        <span class="sf-thumb" :class="mode"></span>
      </div>

      <transition name="sf-crossfade" mode="out-in">
        <div :key="mode" class="sf-mode-body">
          <div class="sf-copy">
            <h1>
              {{ mode === "login" ? "Welcome back." : "Join the network." }}
            </h1>
            <p>
              {{
                mode === "login"
                  ? "Sign in to access your Safety Hub and order history."
                  : "12,400+ members protected. Your profile starts here."
              }}
            </p>
          </div>

          <div v-if="mode === 'registration'" class="sf-benefits">
            <span v-for="item in benefits" :key="item.title"
              ><i :class="`bi ${item.icon}`"></i>{{ item.title }}</span
            >
          </div>

          <div
            v-if="mode === 'registration'"
            class="sf-progress"
            aria-hidden="true"
          >
            <div class="sf-progress-track">
              <div
                class="sf-progress-fill"
                :style="{ width: currentStep === 1 ? '50%' : '100%' }"
              ></div>
            </div>
            <div class="sf-progress-labels">
              <span :class="{ active: currentStep >= 1 }">Your info</span>
              <span :class="{ active: currentStep >= 2 }">Security</span>
            </div>
          </div>

          <div v-if="errors.form" class="sf-alert" role="alert">
            <i class="bi bi-exclamation-circle"></i> {{ errors.form }}
          </div>

          <transition name="sf-slide" mode="out-in">
            <form
              v-if="mode === 'login'"
              key="login"
              class="sf-form"
              @submit.prevent="submit"
              novalidate
            >
              <label class="sf-field"
                >Email address
                <input
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="email"
                  :class="{ 'sf-invalid': errors.email }"
                  :aria-invalid="Boolean(errors.email)"
                  @input="clearError('email')"
                />
                <span v-if="errors.email" class="sf-error" role="alert">{{
                  errors.email
                }}</span>
              </label>
              <label class="sf-field"
                >Password
                <div class="sf-password-wrap">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="At least 6 characters"
                    autocomplete="current-password"
                    :class="{ 'sf-invalid': errors.password }"
                    :aria-invalid="Boolean(errors.password)"
                    @input="clearError('password')"
                  /><button
                    type="button"
                    class="sf-eye"
                    @click="showPassword = !showPassword"
                    aria-label="Toggle password visibility"
                  >
                    <i
                      :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"
                    ></i>
                  </button>
                </div>
                <span v-if="errors.password" class="sf-error" role="alert">{{
                  errors.password
                }}</span>
              </label>
              <div class="sf-row">
                <label class="sf-check"
                  ><input type="checkbox" /> Remember me</label
                >
                <button type="button" class="sf-link" @click="forgotPassword">
                  Forgot password?
                </button>
              </div>
              <button class="sf-submit" type="submit" :disabled="submitting">
                Sign in <i class="bi bi-arrow-right"></i>
              </button>
            </form>

            <form
              v-else-if="currentStep === 1"
              key="step1"
              class="sf-form"
              @submit.prevent="nextStep"
              novalidate
            >
              <label class="sf-field"
                >Full name
                <input
                  v-model="name"
                  type="text"
                  placeholder="Your full name"
                  autocomplete="name"
                  :class="{ 'sf-invalid': errors.name }"
                  :aria-invalid="Boolean(errors.name)"
                  @input="clearError('name')"
                />
                <span v-if="errors.name" class="sf-error" role="alert">{{
                  errors.name
                }}</span>
              </label>
              <label class="sf-field"
                >Email address
                <input
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="email"
                  :class="{ 'sf-invalid': errors.email }"
                  :aria-invalid="Boolean(errors.email)"
                  @input="clearError('email')"
                />
                <span v-if="errors.email" class="sf-error" role="alert">{{
                  errors.email
                }}</span>
              </label>
              <button class="sf-submit" type="submit">
                Continue <i class="bi bi-arrow-right"></i>
              </button>
            </form>

            <form
              v-else
              key="step2"
              class="sf-form"
              @submit.prevent="submit"
              novalidate
            >
              <label class="sf-field"
                >Password
                <div class="sf-password-wrap">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="At least 6 characters"
                    autocomplete="new-password"
                    :class="{ 'sf-invalid': errors.password }"
                    :aria-invalid="Boolean(errors.password)"
                    @input="clearError('password')"
                  /><button
                    type="button"
                    class="sf-eye"
                    @click="showPassword = !showPassword"
                    aria-label="Toggle password visibility"
                  >
                    <i
                      :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"
                    ></i>
                  </button>
                </div>
                <div v-if="password" class="sf-strength">
                  <div class="sf-strength-track">
                    <div
                      class="sf-strength-fill"
                      :style="{
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        background: passwordStrength.color,
                      }"
                    ></div>
                  </div>
                  <span
                    class="sf-strength-label"
                    :style="{ color: passwordStrength.color }"
                    >{{ passwordStrength.label }}</span
                  >
                </div>
                <span v-if="errors.password" class="sf-error" role="alert">{{
                  errors.password
                }}</span>
              </label>
              <label class="sf-field"
                >Confirm password
                <input
                  v-model="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  autocomplete="new-password"
                  :class="{ 'sf-invalid': errors.confirm }"
                  :aria-invalid="Boolean(errors.confirm)"
                  @input="clearError('confirm')"
                />
                <span
                  v-if="confirm && !errors.confirm"
                  class="sf-match"
                  :class="passwordsMatch ? 'match' : 'mismatch'"
                >
                  <i
                    :class="
                      passwordsMatch
                        ? 'bi bi-check-circle-fill'
                        : 'bi bi-x-circle-fill'
                    "
                  ></i>
                  {{
                    passwordsMatch
                      ? "Passwords match"
                      : "Passwords don't match yet"
                  }}
                </span>
                <span v-if="errors.confirm" class="sf-error" role="alert">{{
                  errors.confirm
                }}</span>
              </label>
              <label class="sf-check sf-check-terms">
                <input
                  type="checkbox"
                  v-model="agreeTerms"
                  @change="clearError('terms')"
                />
                I agree to the terms and privacy policy
              </label>
              <span v-if="errors.terms" class="sf-error" role="alert">{{
                errors.terms
              }}</span>
              <div class="sf-actions">
                <button class="sf-ghost" type="button" @click="prevStep">
                  <i class="bi bi-arrow-left"></i> Back
                </button>
                <button class="sf-submit" type="submit" :disabled="submitting">
                  Create account
                </button>
              </div>
            </form>
          </transition>

          <div class="sf-divider"><span>or</span></div>
          <button
            type="button"
            class="sf-google"
            @click="continueWithGoogle"
            :disabled="googleLoading"
          >
            <b>G</b>
            {{ googleLoading ? "Connecting..." : "Continue with Google" }}
          </button>
          <p class="sf-switch">
            {{
              mode === "login" ? "New to SafeHer?" : "Already have an account?"
            }}
            <button
              type="button"
              class="sf-link"
              @click="switchMode(mode === 'login' ? 'registration' : 'login')"
            >
              {{ mode === "login" ? "Create an account" : "Sign in" }}
            </button>
          </p>
        </div>
      </transition>
    </section>
  </main>
</template>

<style scoped>
.sf-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  overflow: hidden;
  background: var(--blush);
}
.sf-orbit {
  position: absolute;
  z-index: -1;
  border: 1px solid var(--line);
  background: radial-gradient(
    circle at 30% 30%,
    var(--pink) 0%,
    transparent 70%
  );
  border-radius: 50%;
  animation: sf-float 7s ease-in-out infinite alternate;
}
.sf-orbit-a {
  width: 480px;
  height: 480px;
  left: -220px;
  top: -160px;
}
.sf-orbit-b {
  width: 360px;
  height: 360px;
  right: -180px;
  bottom: -140px;
  animation-delay: -3s;
}
@keyframes sf-float {
  from {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  to {
    transform: translateY(-14px) scale(1.03);
    opacity: 0.9;
  }
}

.sf-card {
  width: min(560px, 100%);
  background: linear-gradient(
    165deg,
    var(--surface) 0%,
    var(--surface) 62%,
    var(--pink) 165%
  );
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 44px 52px;
  box-shadow: 0 30px 60px -20px rgba(53, 21, 54, 0.25);
  animation: sf-card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes sf-card-in {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.sf-signal {
  position: relative;
  width: 56px;
  height: 56px;
  margin: 0 auto 24px;
}
.sf-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid var(--red);
  animation: sf-pulse 2.6s ease-out infinite;
}
.sf-ring-2 {
  animation-delay: 1.3s;
}
@keyframes sf-pulse {
  0% {
    transform: scale(0.7);
    opacity: 0.55;
  }
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}
.sf-core {
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--plum), var(--red));
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.sf-toggle {
  position: relative;
  display: flex;
  background: var(--blush);
  border-radius: 999px;
  padding: 4px;
  margin: 0 0 28px;
}
.sf-toggle button {
  position: relative;
  z-index: 1;
  flex: 1;
  border: 0;
  background: transparent;
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  border-radius: 999px;
  transition: color 0.25s ease;
}
.sf-toggle button.active {
  color: #fff;
}
.sf-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  background: linear-gradient(120deg, var(--plum), #5a2a5c);
  border-radius: 999px;
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.sf-thumb.registration {
  transform: translateX(100%);
}

.sf-copy {
  text-align: center;
  margin-bottom: 20px;
}
.sf-copy h1 {
  font:
    700 26px "Syne",
    sans-serif;
  color: var(--plum);
  margin: 0 0 10px;
  position: relative;
  display: inline-block;
}
.sf-copy h1::after {
  content: "";
  display: block;
  width: 36px;
  height: 3px;
  border-radius: 2px;
  margin: 8px auto 0;
  background: linear-gradient(90deg, var(--red), var(--plum));
}
.sf-copy p {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

.sf-benefits {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.sf-benefits span {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--cream);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: var(--plum);
}
.sf-benefits span:nth-child(1) {
  background: var(--pink);
}
.sf-benefits span:nth-child(2) {
  background: var(--cream);
}
.sf-benefits span:nth-child(3) {
  background: var(--blush);
  border: 1px solid var(--line);
}
.sf-benefits i {
  color: var(--red);
  font-size: 12px;
}

.sf-progress {
  margin-bottom: 22px;
}
.sf-progress-track {
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  overflow: hidden;
}
.sf-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--red);
  transition: width 0.35s ease;
}
.sf-progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 9px;
  color: var(--muted);
}
.sf-progress-labels .active {
  color: var(--plum);
  font-weight: 700;
}

.sf-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #f3c7cd;
  border-radius: 10px;
  background: #fdeef0;
  color: #b3232c;
  font-size: 12px;
  font-weight: 600;
}
.dark-mode .sf-alert {
  background: #351216;
  border-color: #5c2027;
  color: #ff9aa4;
}

.sf-form {
  display: flex;
  flex-direction: column;
}
.sf-field {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--plum);
  margin-bottom: 16px;
}
.sf-field input {
  display: block;
  width: 100%;
  margin-top: 7px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 13px;
  font:
    12px "DM Sans",
    sans-serif;
  color: var(--ink);
  background: var(--surface);
  outline: 0;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.sf-field input:focus {
  border-color: var(--red);
  box-shadow: 0 0 0 3px rgba(217, 45, 54, 0.12);
}
.sf-field input.sf-invalid {
  animation: sf-shake 0.4s ease;
}
@keyframes sf-shake {
  10%,
  90% {
    transform: translateX(-1px);
  }
  20%,
  80% {
    transform: translateX(2px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-4px);
  }
  40%,
  60% {
    transform: translateX(4px);
  }
}
.sf-password-wrap {
  position: relative;
}
.sf-password-wrap input {
  padding-right: 42px;
}
.sf-eye {
  position: absolute;
  right: 10px;
  bottom: 12px;
  border: 0;
  background: transparent;
  color: var(--muted);
}
.sf-error {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--red);
}
.sf-strength {
  margin-top: 10px;
}
.sf-strength-track {
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  overflow: hidden;
}
.sf-strength-fill {
  height: 100%;
  border-radius: 2px;
  transition:
    width 0.25s ease,
    background 0.25s ease;
}
.sf-strength-label {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
}
.sf-match {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
}
.sf-match.match {
  color: #1a9e5e;
}
.sf-match.mismatch {
  color: var(--red);
}

.sf-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -3px 0 20px;
}
.sf-check {
  display: flex !important;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 500;
  color: var(--muted);
  text-transform: none;
}
.sf-check input {
  accent-color: var(--red);
}
.sf-check-terms {
  margin-bottom: 6px;
}
.sf-link {
  border: 0;
  background: transparent;
  color: var(--red);
  font-size: 11px;
  font-weight: 700;
  padding: 0;
}

.sf-submit {
  width: 100%;
  border: 0;
  border-radius: 999px;
  padding: 14px;
  background: var(--red);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    transform 0.15s ease,
    background 0.2s ease;
}
.sf-submit:hover {
  background: #b9232b;
}
.sf-submit:active {
  transform: scale(0.97);
}
.sf-submit[disabled] {
  opacity: 0.7;
}
.sf-ghost {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 14px;
  background: transparent;
  color: var(--plum);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}
.sf-ghost:hover {
  background: var(--pink);
}
.sf-ghost:active {
  transform: scale(0.97);
}
.sf-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.sf-actions .sf-submit {
  flex: 1;
}

.sf-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--muted);
  font-size: 11px;
  margin: 26px 0 18px;
}
.sf-divider::before,
.sf-divider::after {
  content: "";
  height: 1px;
  background: var(--line);
  flex: 1;
}
.sf-google {
  width: 100%;
  height: 46px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  transition:
    transform 0.15s ease,
    background 0.2s ease;
}
.sf-google:hover {
  background: var(--cream);
}
.sf-google:active {
  transform: scale(0.98);
}
.sf-google b {
  color: #4285f4;
  font-size: 16px;
  margin-right: 8px;
}
.sf-switch {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  margin: 22px 0 0;
}

.sf-crossfade-enter-active,
.sf-crossfade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.sf-crossfade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.sf-crossfade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.sf-slide-enter-active,
.sf-slide-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}
.sf-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.sf-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 520px) {
  .sf-card {
    padding: 32px 22px;
    border-radius: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-orbit,
  .sf-ring,
  .sf-card {
    animation: none;
  }
  .sf-crossfade-enter-active,
  .sf-crossfade-leave-active,
  .sf-slide-enter-active,
  .sf-slide-leave-active,
  .sf-thumb,
  .sf-submit,
  .sf-ghost,
  .sf-google {
    transition: none;
  }
}
</style>
