export const publicViews = new Set(["index", "products", "store-all", "reviews", "packages"]);
export const authViews = new Set(["login", "registration"]);
export const memberViews = new Set(["services", "guide", "safetyhub", "videos", "orders", "payment-success", "payment-cancel"]);
export function normalizeView(view) {
  if (view === "contact") return "services";
  return publicViews.has(view) || authViews.has(view) || memberViews.has(view) ? view : "index";
}
export function resolveView(view, signedIn) {
  const requested = normalizeView(view);
  return !signedIn && memberViews.has(requested) ? "login" : requested;
}
