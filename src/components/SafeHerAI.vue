<script setup>
import { nextTick, onBeforeUnmount, ref } from "vue";
import { WELCOME_MESSAGE, getSafetyAssistantReply, openNearbySearch } from "../services/safetyAssistant.js";

const props = defineProps({
  location: Object,
  contacts: { type: Array, default: () => [] },
  hasPremiumAccess: Boolean,
});
const emit = defineEmits(["request-location", "activate-sos", "contact-trusted", "start-journey", "upgrade"]);
const open = ref(false);
const draft = ref("");
const loading = ref(false);
const emergencyMode = ref(false);
const listening = ref(false);
const messages = ref([{ id: 1, role: "assistant", text: WELCOME_MESSAGE }]);
const chatLog = ref(null);
let recognition;

async function scrollToBottom() { await nextTick(); chatLog.value?.scrollTo({ top: chatLog.value.scrollHeight, behavior: "smooth" }); }
async function send(text = draft.value) {
  const value = String(text).trim();
  if (!value || loading.value) return;
  messages.value.push({ id: Date.now(), role: "user", text: value });
  draft.value = "";
  loading.value = true;
  await scrollToBottom();
  const result = await getSafetyAssistantReply(value);
  emergencyMode.value = result.risk === "emergency" || emergencyMode.value;
  messages.value.push({ id: Date.now() + 1, role: "assistant", text: result.reply, development: result.developmentMode });
  loading.value = false;
  await scrollToBottom();
}
function quickAction(text) {
  open.value = true;
  if (/nearest police/i.test(text)) openNearbySearch("police", props.location);
  if (/nearby hospital/i.test(text)) openNearbySearch("hospital", props.location);
  send(text);
}
function requestLocation() { emit("request-location"); messages.value.push({ id: Date.now(), role: "assistant", text: "I’ve requested location permission. I will only use your location after your browser grants it." }); scrollToBottom(); }
function emergencyAction(action) {
  if (action === "sos") emit("activate-sos");
  if (action === "location") requestLocation();
  if (action === "contact") emit("contact-trusted");
  if (action === "medical") openNearbySearch("hospital", props.location);
}
function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { messages.value.push({ id: Date.now(), role: "assistant", text: "Voice input is not supported in this browser. Please type your message instead." }); return; }
  recognition?.stop(); recognition = new SpeechRecognition(); recognition.lang = "en-ZA"; recognition.interimResults = false; recognition.maxAlternatives = 1;
  recognition.onstart = () => { listening.value = true; };
  recognition.onend = () => { listening.value = false; };
  recognition.onerror = () => { listening.value = false; };
  recognition.onresult = (event) => { draft.value = event.results[0][0].transcript; send(draft.value); };
  recognition.start();
}
onBeforeUnmount(() => recognition?.stop());
</script>

<template>
  <div class="safeher-ai" :class="{ open, emergency: emergencyMode }">
    <button v-if="!hasPremiumAccess" class="ai-launcher" aria-label="Unlock SafeHer AI" @click="emit('upgrade')"><i class="bi bi-chat-dots-fill"></i><span>Unlock AI</span></button>
    <button v-else-if="!open" class="ai-launcher" aria-label="Open Safe_Her AI" @click="open = true"><i class="bi bi-chat-dots-fill"></i><span>Safe_Her AI</span></button>
    <section v-else class="ai-window" aria-label="Safe_Her AI chat">
      <header><div><i class="bi bi-shield-fill-check"></i><span><strong>Safe_Her AI</strong><small>{{ emergencyMode ? 'Emergency support active' : 'Private safety assistant' }}</small></span></div><button aria-label="Close chat" @click="open = false"><i class="bi bi-x-lg"></i></button></header>
      <div v-if="emergencyMode" class="emergency-banner"><strong><i class="bi bi-exclamation-octagon-fill"></i> Emergency mode</strong><span>Move to a safe/public location if you can. Avoid confrontation.</span></div>
      <div ref="chatLog" class="chat-log"><p v-for="message in messages" :key="message.id" class="message" :class="message.role"><span>{{ message.text }}</span><small v-if="message.development">Development safety guidance</small></p><div v-if="loading" class="typing"><i></i><i></i><i></i> Safe_Her AI is typing</div></div>
      <div v-if="emergencyMode" class="emergency-actions"><button @click="emergencyAction('sos')"><i class="bi bi-broadcast-pin"></i> Activate SOS</button><button @click="emergencyAction('location')"><i class="bi bi-geo-alt-fill"></i> Share location</button><button @click="emergencyAction('contact')"><i class="bi bi-person-fill"></i> Contact trusted person</button><button @click="emergencyAction('medical')"><i class="bi bi-hospital-fill"></i> Get medical help</button></div>
      <div v-else class="quick-actions"><button @click="quickAction(`I'm in danger`) "><i class="bi bi-exclamation-octagon-fill"></i> I'm in danger</button><button @click="quickAction('I feel unsafe')"><i class="bi bi-geo-alt-fill"></i> I feel unsafe</button><button @click="quickAction('Find the nearest police station')"><i class="bi bi-shield-fill-check"></i> Find police</button><button @click="quickAction('Find a nearby hospital')"><i class="bi bi-hospital-fill"></i> Find a hospital</button><button @click="quickAction('Contact my trusted person')"><i class="bi bi-person-fill"></i> Trusted person</button><button @click="quickAction('Give me safety advice')"><i class="bi bi-shield-check"></i> Safety advice</button></div>
      <form class="chat-input" @submit.prevent="send()"><button type="button" :aria-label="listening ? 'Listening' : 'Use voice input'" :class="{ listening }" @click="startVoice"><i class="bi bi-mic-fill"></i></button><input v-model="draft" maxlength="2000" placeholder="Tell Safe_Her AI what's happening…" aria-label="Message Safe_Her AI"/><button class="send" :disabled="!draft.trim() || loading" aria-label="Send message"><i class="bi bi-send-fill"></i></button></form>
      <p class="privacy-note">Location is requested only when you choose it. This chat does not place emergency calls.</p>
    </section>
  </div>
</template>

<style scoped>
.safeher-ai{position:fixed;right:20px;bottom:20px;z-index:1100;font-family:inherit}.ai-launcher{border:0;border-radius:999px;background:#351536;color:#fff;padding:14px 18px;box-shadow:0 12px 32px #35153666;font-weight:700}.ai-launcher i{margin-right:8px}.ai-window{width:min(390px,calc(100vw - 24px));height:min(640px,calc(100vh - 24px));display:flex;flex-direction:column;background:#fff;border:1px solid #eaddec;border-radius:20px;overflow:hidden;box-shadow:0 20px 65px #1d102033}.ai-window header{background:#351536;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}.ai-window header>div{display:flex;gap:10px;align-items:center}.ai-window header>div>i{font-size:24px}.ai-window header span{display:grid}.ai-window header small{opacity:.78;font-size:11px}.ai-window header button{background:transparent;border:0;color:#fff}.emergency-banner{background:#a61b25;color:#fff;padding:10px 16px;font-size:12px;display:grid;gap:3px}.chat-log{flex:1;overflow:auto;padding:14px;background:#fcf9fc;display:flex;flex-direction:column;gap:9px}.message{max-width:85%;margin:0;display:grid;gap:3px}.message span{padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap}.message.assistant span{background:#eee4ef;color:#321634;border-bottom-left-radius:3px}.message.user{align-self:end}.message.user span{background:#351536;color:#fff;border-bottom-right-radius:3px}.message small{font-size:10px;color:#766477}.typing{font-size:12px;color:#715d73}.typing i{display:inline-block;width:5px;height:5px;border-radius:50%;background:#735276;margin:0 1px;animation:dot 1s infinite alternate}.typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}@keyframes dot{to{opacity:.2;transform:translateY(-3px)}}.quick-actions,.emergency-actions{padding:9px 12px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid #eee3ef}.quick-actions button,.emergency-actions button{font-size:11px;border:1px solid #dbc7de;background:#fff;color:#351536;border-radius:999px;padding:6px 8px}.emergency-actions{background:#fff3f3}.emergency-actions button{border-radius:8px;color:#891b25;border-color:#f0bcc0;font-weight:700}.chat-input{padding:10px 12px;display:flex;gap:8px;border-top:1px solid #eee3ef}.chat-input input{min-width:0;flex:1;border:1px solid #d9c8db;border-radius:999px;padding:9px 12px;font-size:13px}.chat-input button{width:36px;border:0;border-radius:50%;background:#eaddeb;color:#351536}.chat-input .send{background:#351536;color:#fff}.chat-input button:disabled{opacity:.5}.chat-input .listening{background:#d92d36;color:#fff;animation:pulse .8s infinite alternate}@keyframes pulse{to{transform:scale(1.08)}}.privacy-note{margin:0;padding:0 12px 10px;font-size:10px;color:#766477;text-align:center}.emergency .ai-window{border-color:#d92d36}@media(max-width:480px){.safeher-ai{right:12px;bottom:12px}.ai-window{height:min(680px,calc(100vh - 24px))}.ai-launcher span{display:none}.ai-launcher{width:52px;height:52px;padding:0}.ai-launcher i{margin:0;font-size:20px}}
/* Safety action icon accents */
.quick-actions button i,
.emergency-actions button i {
  color: #d92d36;
  background: #fff0f1;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  font-size: 12px;
}
.emergency-banner i {
  color: #fff;
  margin-right: 5px;
}
.emergency-actions button i {
  background: #fde1e4;
}

/* Match the application's dark-mode palette. */
:global(.dark-mode .ai-launcher) {
  background: #5a2a5c;
  box-shadow: 0 12px 32px rgba(10, 4, 13, 0.62);
}
:global(.dark-mode .ai-window) {
  background: #211423;
  border-color: #5d4260;
  box-shadow: 0 20px 65px rgba(0, 0, 0, 0.55);
}
:global(.dark-mode .ai-window header) {
  background: #351536;
}
:global(.dark-mode .chat-log) {
  background: #1a111c;
}
:global(.dark-mode .message.assistant span) {
  background: #3a293d;
  color: #f5edf6;
}
:global(.dark-mode .message.user span),
:global(.dark-mode .chat-input .send) {
  background: #7a3c7d;
}
:global(.dark-mode .message small),
:global(.dark-mode .typing),
:global(.dark-mode .privacy-note) {
  color: #c9b8cb;
}
:global(.dark-mode .typing i) {
  background: #d9b9dc;
}
:global(.dark-mode .quick-actions),
:global(.dark-mode .emergency-actions),
:global(.dark-mode .chat-input) {
  background: #211423;
  border-color: #513555;
}
:global(.dark-mode .quick-actions button),
:global(.dark-mode .emergency-actions button) {
  background: #302033;
  border-color: #644568;
  color: #f4eaf5;
}
:global(.dark-mode .emergency-actions) {
  background: #31191f;
}
:global(.dark-mode .emergency-actions button) {
  color: #ffbdc4;
  border-color: #8a424d;
}
:global(.dark-mode .chat-input input) {
  background: #302033;
  border-color: #644568;
  color: #f5edf6;
}
:global(.dark-mode .chat-input input::placeholder) {
  color: #b9a4bc;
}
:global(.dark-mode .chat-input button:not(.send)) {
  background: #4b314e;
  color: #f5edf6;
}
:global(.dark-mode .quick-actions button i),
:global(.dark-mode .emergency-actions button i) {
  background: #4a252c;
  color: #ff9ba5;
}
</style>
