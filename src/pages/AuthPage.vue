<script setup>
import { ref } from "vue";
import Swal from "sweetalert2";
const props = defineProps({ mode: String });
const emit = defineEmits(["navigate", "authenticated"]);
const name = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const showPassword = ref(false);

function readAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem("safeher-accounts") || "[]");
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function normalizedEmail(value) {
  return value.trim().toLowerCase();
}

// Login and registration share one form so the visual experience stays consistent.
function submit() {
  if (
    !email.value ||
    password.value.length < 6 ||
    (props.mode === "registration" &&
      (!name.value || password.value !== confirm.value))
  ) {
    Swal.fire({
      toast: true,
      position: "top-end",
      timer: 2500,
      showConfirmButton: false,
      icon: "error",
      title: "Check your details",
    });
    return;
  }
  const accountEmail = normalizedEmail(email.value);
  const accounts = readAccounts();
  const account = accounts.find((item) => item.email === accountEmail);

  if (props.mode === "registration") {
    if (account) {
      Swal.fire({
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
        icon: "error",
        title: "An account with this email already exists",
      });
      return;
    }
    accounts.push({ name: name.value.trim(), email: accountEmail, password: password.value });
    localStorage.setItem("safeher-accounts", JSON.stringify(accounts));
  } else if (!account || account.password !== password.value) {
    Swal.fire({
      toast: true,
      position: "top-end",
      timer: 2500,
      showConfirmButton: false,
      icon: "error",
      title: "Incorrect email or password",
    });
    return;
  }

  emit("authenticated", accountEmail);
  Swal.fire({
    icon: "success",
    title:
      props.mode === "login"
        ? "Welcome back to SafeHer"
        : "Your SafeHer account is ready",
    confirmButtonColor: "#351536",
  }).then(() => emit("navigate", "index"));
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
    inputValidator: (value) => (!value ? "Please enter your email address" : undefined),
  });
  if (!emailResult.isConfirmed) return;

  const accountEmail = normalizedEmail(emailResult.value);
  const accounts = readAccounts();
  const account = accounts.find((item) => item.email === accountEmail);
  if (!account) {
    Swal.fire({
      icon: "error",
      title: "Account not found",
      text: "Check the email address or create a new account.",
      confirmButtonColor: "#351536",
    });
    return;
  }

  const passwordResult = await Swal.fire({
    title: "Choose a new password",
    input: "password",
    inputLabel: "Your new password must be at least 6 characters",
    inputPlaceholder: "At least 6 characters",
    inputAttributes: { minlength: 6, autocomplete: "new-password" },
    showCancelButton: true,
    confirmButtonText: "Update password",
    confirmButtonColor: "#351536",
    inputValidator: (value) =>
      value.length < 6 ? "Use at least 6 characters" : undefined,
  });
  if (!passwordResult.isConfirmed) return;

  account.password = passwordResult.value;
  localStorage.setItem("safeher-accounts", JSON.stringify(accounts));
  Swal.fire({
    icon: "success",
    title: "Password updated",
    text: "You can now sign in with your new password.",
    confirmButtonColor: "#351536",
  });
}
</script>
<template>
  <main class="auth-shell">
    <section class="auth-page">
      <div class="auth-card">
        <div class="auth-intro">
          <div class="auth-intro-copy">
            <span class="auth-mark"
              ><i
                :class="
                  mode === 'login'
                    ? 'bi bi-shield-fill'
                    : 'bi bi-person-plus-fill'
                "
              ></i
            ></span>
            <p class="eyebrow">
              SAFEHER /
              {{ mode === "login" ? "WELCOME BACK" : "JOIN THE NETWORK" }}
            </p>
            <h1>
              <template v-if="mode === 'login'">
                Your safety.<br /><em>Always on.</em>
              </template>
              <template v-else>
                Join 12,400+<br /><em>protected</em><br />women.
              </template>
            </h1>
            <p>
              {{
                mode === "login"
                  ? "Your trusted safety network, always within reach."
                  : "Every account includes free access to live GPS tracking, emergency alerts and more."
              }}
            </p>
          </div>
        </div>
        <form class="auth-form" @submit.prevent="submit">
          <div v-if="mode === 'registration'" class="auth-steps">
            <span>1</span><b>Your info</b><i></i><span>2</span><b>Security</b>
          </div>
          <p class="eyebrow">
            {{ mode === "login" ? "SIGN IN" : "CREATE ACCOUNT" }}
          </p>
          <h2>{{ mode === "login" ? "Welcome back." : "Create account." }}</h2>
          <p class="auth-subtitle">
            {{
              mode === "login"
                ? "Sign in to access your Safety Hub and order history."
                : "Your safety profile starts here."
            }}
          </p>
          <label v-if="mode === 'registration'"
            >Full name<input
              v-model="name"
              type="text"
              placeholder="Your full name"
              required /></label
          ><label
            >Email address
            <input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required /></label
          ><label
            >Password
            <div class="password-field">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="At least 6 characters"
                minlength="6"
                required
              /><button type="button" @click="showPassword = !showPassword">
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button></div></label
          ><label v-if="mode === 'registration'"
            >Confirm password<input
              v-model="confirm"
              type="password"
              placeholder="Repeat your password"
              required
          /></label>
          <div class="form-row">
            <label class="check-label"
              ><input type="checkbox" :required="mode === 'registration'" />
              {{
                mode === "registration"
                  ? "I agree to the terms and privacy policy"
                  : "Remember me"
              }}</label
            ><button
              v-if="mode === 'login'"
              type="button"
              class="form-link"
              @click="forgotPassword"
            >
              Forgot password?
            </button>
          </div>
          <button class="btn btn-sos w-100" type="submit">
            {{ mode === "login" ? "Sign in" : "Continue" }}
            <i class="bi bi-arrow-right"></i>
          </button>
          <div class="auth-divider"><span>or</span></div>
          <button type="button" class="google-button">
            <b>G</b> Continue with Google
          </button>
          <p class="auth-switch">
            {{
              mode === "login" ? "New to SafeHer?" : "Already have an account?"
            }}
            <button
              type="button"
              class="form-link"
              @click="
                emit('navigate', mode === 'login' ? 'registration' : 'login')
              "
            >
              {{ mode === "login" ? "Create an account" : "Sign in" }}
            </button>
          </p>
        </form>
      </div>
    </section>
  </main>
</template>
