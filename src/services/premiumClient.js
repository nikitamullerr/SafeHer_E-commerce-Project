import api from "./api.js";

export function mapSubscription(subscription) {
  if (!subscription || !subscription.active) return null;
  return {
    name: subscription.plan,
    amount: Number(subscription.amount),
    method: subscription.method,
    receiptEmail: subscription.receipt_email,
    reference: subscription.reference,
    purchasedAt: subscription.started_at,
    expiresAt: subscription.expires_at,
  };
}

export async function getLessons() {
  const { data } = await api.get("/premium/lessons");
  return data;
}

export async function markLessonComplete(lessonId) {
  const { data } = await api.post("/premium/progress", {
    lesson_id: lessonId,
  });

  return data;
}

export async function getSubscription() {
  const { data } = await api.get("/premium/subscription");
  return data;
}

export async function subscribeToPremium(payload) {
  const { data } = await api.post("/premium/subscribe", payload);
  return data;
}

export async function cancelSubscription() {
  const { data } = await api.delete("/premium/subscription");
  return data;
}
