const EMERGENCY_PATTERNS = [
  /\b(help|attack(?:ed)?|weapon|gun|knife|break[ -]?in|assault|medical emergency|ambulance|kill|immediate danger)\b/i,
];
const CONCERN_PATTERNS = [
  /\b(follow(?:ing|ed)?|unsafe|threat(?:en|ening|ened)?|harass(?:ed|ment)?|stalk(?:ing|ed)?|tracking my phone|walking home|online date|domestic violence|partner)\b/i,
];

export const WELCOME_MESSAGE = "Hi, I'm SafeHer AI. I'm here to help you stay safe, find support and use Safe_Her's safety features. How can I help you?";

export function assessRisk(text) {
  const value = String(text || "").trim();
  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(value))) return "emergency";
  if (CONCERN_PATTERNS.some((pattern) => pattern.test(value))) return "concern";
  return "safe";
}

function localReply(text, risk) {
  const value = text.toLowerCase();
  if (risk === "emergency") {
    return "You may be in immediate danger. If you can, move to a safer public place and avoid confrontation. Use the emergency actions below. Contact emergency services directly if you need urgent police or medical help.";
  }
  if (/police|station/.test(value)) return "I can use your permitted location to open nearby police results. Check the listing and call the service directly before travelling.";
  if (/hospital|medical|ambulance/.test(value)) return "I can use your permitted location to open nearby hospital results. For urgent medical care, contact emergency services directly.";
  if (/sos/.test(value)) return "Select Activate SOS to start Safe_Her's SOS flow. This app will only confirm an alert after a configured service successfully accepts it.";
  if (/location|share/.test(value)) return "Select Share location to request browser permission. Your location stays on this device unless you choose to share it.";
  if (/follow|stalk/.test(value)) return "Trust your instincts. Go to a busy, well-lit place, contact someone you trust, and avoid going straight home. If the danger becomes immediate, use Emergency Mode.";
  if (/harass|partner|domestic|threat/.test(value)) return "You deserve to be safe. Keep distance where possible, document incidents only if it is safe to do so, and contact trusted support or emergency services if you are in immediate danger.";
  if (/walk|travel|date/.test(value)) return "Share your plan with someone you trust, keep your phone charged, use well-lit routes, and arrange your own transport. Meet new people in public places.";
  if (/phone|digital|track/.test(value)) return "Check app location permissions, review unfamiliar apps and account logins, and change passwords from a device you trust. Avoid confronting anyone you suspect is monitoring you.";
  if (/safe_?her|how.*work|feature/.test(value)) return "Safe_Her brings SOS, location sharing, trusted contacts, Safe Journey tools and safety guidance together. I can help you open the relevant action.";
  return "I’m here with you. Tell me what is happening or choose a quick action. If you feel in immediate danger, use Emergency Mode and contact emergency services directly.";
}

/**
 * AI gateway. Configure VITE_SAFEHER_AI_ENDPOINT to point at a protected server
 * endpoint. The browser never receives an AI provider API key. Without one, a
 * deterministic safety-focused development responder is used.
 */
export async function getSafetyAssistantReply(message) {
  const risk = assessRisk(message);
  const endpoint = import.meta.env.VITE_SAFEHER_AI_ENDPOINT;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: String(message).slice(0, 2000), risk }),
      });
      if (!response.ok) throw new Error("AI service unavailable");
      const body = await response.json();
      if (typeof body.reply === "string" && body.reply.trim()) return { reply: body.reply.trim(), risk };
    } catch {
      // Safety guidance remains available if the optional service is offline.
    }
  }
  return { reply: localReply(message, risk), risk, developmentMode: true };
}

export function openNearbySearch(kind, location) {
  const query = kind === "hospital" ? "hospital" : "police station";
  const coords = location ? `@${location.lat},${location.lng},15z` : "";
  window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}/${coords}`, "_blank", "noopener,noreferrer");
}
