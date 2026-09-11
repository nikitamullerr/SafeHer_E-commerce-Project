import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], requests = [];
await page.route("https://**/*", route => route.abort());
page.on("pageerror", error => errors.push(error.message));
const product = { id: 1, name: "Smart Panic Button", detail: "Wearable GPS alert", price: 899, stock: 20, category: "personal-safety", icon: "bi-shield", tone: "rose" };
await page.route("**/api/**", route => {
  const url = new URL(route.request().url()), method = route.request().method(); requests.push([method, url.pathname]);
  if (url.pathname.endsWith("/auth/login") || url.pathname.endsWith("/auth/register")) return route.fulfill({ json: { token: "test-session-token", user: { id: 1, email: "visitor@example.com", name: "Visitor" } } });
  if (method !== "GET") return route.fulfill({ status: 400, json: { error: "Unexpected test mutation" } });
  let data = { success: true };
  if (url.pathname.endsWith("/products")) data.products = [product];
  if (url.pathname.endsWith("/orders")) data.orders = [];
  if (url.pathname.endsWith("/lessons")) data = { lessons: [], progress: { completed: 0, total: 0 } };
  if (url.pathname.endsWith("/addresses")) data.addresses = [];
  if (url.pathname.endsWith("/config")) data = { payfastAvailable: true, cardDemoAvailable: true, sandbox: true };
  return route.fulfill({ json: data });
});
const app = () => document.querySelector("#app").__vue_app__._instance.setupState;
async function navigate(view) { await page.evaluate(view => document.querySelector("#app").__vue_app__._instance.setupState.navigate(view), view); }
async function signIn(refreshAfterSuccess = false) {
  await page.locator('input[type="email"]').fill("visitor@example.com");
  await page.locator('input[type="password"]').fill("ExamplePass123!");
  await page.locator('form').first().evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await page.locator(".swal2-confirm").waitFor();
  if (refreshAfterSuccess) await page.reload({ waitUntil: "domcontentloaded" });
  else await page.locator(".swal2-confirm").click();
}
async function logout() { await page.getByRole("button", { name: "Log out", exact: true }).click(); await page.locator(".guest-login").waitFor(); }
try {
  await page.goto(process.env.APP_URL || "http://localhost:5173", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Your safety. Your people. Your choice." }).waitFor();
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  for (const [view, text] of [["products", "Safety products for every day."], ["store-all", "All products"], ["reviews", "Customer Reviews"], ["packages", "Choose the support that fits your life."]]) {
    await navigate(view); await page.getByText(text, { exact: true }).first().waitFor();
    assert.ok(await page.locator(".guest-login").isVisible());
  }
  assert.ok(requests.every(([,path]) => path === "/api/products"), "Guest browsing does not request member data");
  for (const view of ["services", "guide", "contact", "safetyhub", "videos", "orders"]) {
    await navigate(view); await page.getByText("Welcome back.", { exact: true }).waitFor();
    await page.locator(".auth-access-notice").waitFor();
    assert.equal(await page.locator(".guide-page, .hub-page, .orders-page").count(), 0);
    await page.getByRole("button", { name: "Continue browsing", exact: true }).click();
  }
  await navigate("services");
  await page.reload({ waitUntil: "domcontentloaded" });
  await signIn(true);
  await page.getByRole("heading", { name: "Safety Guide", exact: true }).first().waitFor();
  await logout();
  await navigate("products");
  await page.evaluate(product => document.querySelector("#app").__vue_app__._instance.setupState.addToCart(product), product);
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.evaluate(() => document.querySelector("#app").__vue_app__._instance.setupState.cart.length), 1);
  await page.getByRole("button", { name: "Shopping bag", exact: true }).click();
  await page.locator(".cart-drawer.open").getByText("Card form (demo - no charge)", { exact: true }).click();
  await page.getByText("Welcome back.", { exact: true }).waitFor();
  assert.equal(await page.locator(".checkout-dialog").count(), 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await signIn();
  await page.getByText("Card details - demo only", { exact: true }).waitFor();
  assert.equal(await page.locator('input[value="card_demo"]').isChecked(), true);
  await page.getByRole("button", { name: "Close checkout", exact: true }).click();
  await logout();
  await navigate("orders");
  await page.getByRole("tab", { name: "Create account", exact: true }).click();
  await page.getByPlaceholder("Your full name", { exact: true }).fill("Visitor");
  await page.locator('input[type="email"]').fill("visitor@example.com");
  await page.getByText("Continue", { exact: true }).click();
  await page.locator('input[type="password"]').nth(0).fill("ExamplePass123!");
  await page.locator('input[type="password"]').nth(1).fill("ExamplePass123!");
  await page.locator('input[type="checkbox"]').check();
  await page.locator('form').first().evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await page.locator(".swal2-confirm").click();
  await page.getByRole("heading", { name: "Your orders", exact: true }).waitFor();
  await logout();
  await navigate("packages");
  await page.getByText("Choose Essential", { exact: true }).click();
  await page.getByText("Welcome back.", { exact: true }).waitFor();
  assert.equal(await page.locator("#safeher-card-number").count(), 0);
  await page.getByRole("button", { name: "Continue browsing", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const language of ["English", "Afrikaans", "isiZulu", "isiXhosa"]) {
    await page.locator(".nav-actions select").selectOption(language);
    assert.ok(await page.locator(".guest-login").isVisible());
    assert.ok(await page.locator(".guest-register").isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${language}: mobile overflow`);
  }
  assert.ok(!requests.some(([method,path]) => method !== "GET" && !path.startsWith("/api/auth/")), "No payments, orders or emails created");
  assert.deepEqual(errors, []);
  console.log("PASS: guest pages, member gates, video restriction, guide return after login, refreshed guest cart, checkout resume, Premium gate, logout and four-language mobile controls.");
} catch (error) {
  console.log("Guest test state:", await page.evaluate(() => {
    const state = document.querySelector("#app")?.__vue_app__?._instance.setupState;
    return { view: state?.activeView, authenticated: state?.isAuthenticated, headings: [...document.querySelectorAll("h1, h2")].map(el => el.textContent.trim()) };
  }));
  console.log("Browser errors:", errors);
  throw error;
} finally { await browser.close(); }
