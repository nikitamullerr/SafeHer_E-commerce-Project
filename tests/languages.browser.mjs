// Run against npm run dev. Set PLAYWRIGHT_MODULE to a Playwright module URL if it is not installed locally.
import assert from "node:assert/strict";
import { language, supportedLanguages, t } from "../src/languageConfig.js";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], mutations = [];
await page.route("https://**/*", route => route.abort());
page.on("pageerror", error => errors.push(error.message));
const product = { id: 1, name: "Smart Panic Button", detail: "Wearable GPS alert", price: 899, stock: 20, category: "personal-safety", icon: "bi-shield", tone: "rose", is_featured: true };
await page.route("**/api/**", route => {
  const request = route.request(), url = new URL(request.url());
  if (request.method() !== "GET") { mutations.push(url.pathname); return route.fulfill({ status: 400, json: { error: "Unexpected test mutation" } }); }
  let data = { success: true };
  if (url.pathname.endsWith("/products")) data.products = [product];
  if (url.pathname.endsWith("/orders")) data.orders = [{ id: 1, orderNumber: "SH-TEST", createdAt: "2026-09-10T10:00:00Z", total: 948, paymentMethod: "card_demo", paymentStatus: "pending", status: "Confirmed", deliveryMethod: "standard", deliveryAddress: "1 Example Street", items: [{ name: product.name, quantity: 1, price: 899 }], emailSent: false }];
  if (url.pathname.endsWith("/addresses")) data.addresses = [{ id: 1, address: "1 Example Street", label: "My home" }];
  if (url.pathname.endsWith("/config")) data = { payfastAvailable: true, cardDemoAvailable: true, sandbox: true };
  if (url.pathname.endsWith("/lessons")) data = { lessons: [{ id: 1, title: "Personal Safety Tips for Women", detail: "Everyday safety habits to help you move through the world with confidence.", duration: "07:16", youtube_id: "N4hWOp9Hvg4" }], progress: { completed: 0, total: 1 } };
  return route.fulfill({ json: data });
});
const state = async values => page.evaluate(values => Object.assign(document.querySelector("#app").__vue_app__._instance.setupState, values), values);
async function visibleText(text) { await page.getByText(text, { exact: true }).first().waitFor({ state: "visible", timeout: 5000 }); }
const views = { index: "hero", services: "servicesTitle", guide: "servicesTitle", contact: "servicesTitle", products: "storeTitle", "store-all": "All products", safetyhub: "welcome", packages: "chooseFit", videos: "Explore Premium", reviews: "Customer Reviews", orders: "Your orders", "payment-success": "Checking payment", "payment-cancel": "Payment not completed" };
try {
  await page.goto(process.env.APP_URL || "http://localhost:5173", { waitUntil: "domcontentloaded" });
  await page.locator(".guest-login").click();
  for (const name of supportedLanguages) {
    language.value = name;
    await page.locator("#auth-language").selectOption(name);
    await visibleText(t("Welcome back."));
    await page.locator("form").first().evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await visibleText(t("Enter your email address"));
    await state({ activeView: "registration" });
    await visibleText(t("Join the network."));
    await state({ activeView: "login" });
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.equal(await page.locator("#auth-language").inputValue(), name);
    assert.equal(await page.locator("html").getAttribute("lang"), { English: "en", Afrikaans: "af", isiZulu: "zu", isiXhosa: "xh" }[name]);
    await visibleText(t("Welcome back."));
  }
  await state({ isAuthenticated: true, activeView: "index" });
  for (const [view, key] of Object.entries(views)) {
    await state({ activeView: view });
    for (const name of supportedLanguages) {
      language.value = name;
      await page.locator(".nav-actions select").selectOption(name);
      await visibleText(t(key));
      if (view === "products" || view === "store-all") await visibleText(t("All Accessories"));
      if (view === "orders") { await page.getByText(t("Demo - no charge"), { exact: false }).first().waitFor(); assert.equal(await page.locator("select").nth(1).inputValue(), "all"); }
      if (view === "safetyhub") {
        await visibleText(t("Not checked in yet"));
        assert.equal(await page.locator(".leaflet-control-zoom-in").first().getAttribute("title"), t("Zoom in"));
      }
    }
  }
  await state({ activeView: "products", cart: [{ ...product, quantity: 1 }], cartOpen: true });
  for (const name of supportedLanguages) {
    language.value = name;
    await state({ language: name });
    await page.locator(".cart-drawer.open").getByText(t("Your bag"), { exact: true }).waitFor();
    await page.locator(".cart-drawer.open").getByText(t("Card form (demo - no charge)"), { exact: true }).waitFor();
  }
  await state({ cartOpen: false });
  await state({ activeView: "products", cart: [{ ...product, quantity: 1 }], checkoutMethod: "card_demo", checkoutOpen: true });
  await page.locator("#checkout-delivery").waitFor();
  await page.locator("#checkout-delivery").selectOption("express");
  for (const name of supportedLanguages) {
    language.value = name;
    // The checkout is modal, so use the same reactive language source as the selector.
    await state({ language: name });
    await visibleText(t("Card details - demo only"));
    await visibleText(t("Save address now"));
    assert.equal(await page.locator("#checkout-delivery").inputValue(), "express");
    assert.equal(await page.locator("#saved-address option").nth(1).textContent(), "My home");
    await page.locator(".checkout-dialog form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await visibleText(t("Enter a delivery address."));
  }
  await state({ checkoutOpen: false, activeView: "packages" });
  for (const name of supportedLanguages) {
    language.value = name;
    await page.locator(".nav-actions select").selectOption(name);
    await page.getByRole("button", { name: `${t("choose")} ${t("Essential")}` }).click();
    await visibleText(t("Pay for {plan}", { plan: t("Essential") }));
    await visibleText(t("Order summary"));
    await page.locator("input[name=safeher-payment][value=card]").check();
    await visibleText(t("Cardholder name"));
    await page.locator(".swal2-cancel").click();
  }
  await state({ activeView: "index" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of supportedLanguages) {
    language.value = name;
    await page.locator(".nav-actions select").selectOption(name);
    await visibleText(t("hero"));
    assert.ok(await page.locator(".nav-actions select").isVisible());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 2, `${name}: mobile horizontal overflow ${overflow}px`);
  }
  assert.deepEqual(mutations, [], "No backend writes during language checks");
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(`PASS: login, registration, ${Object.keys(views).length} views, checkout, Premium dialogs and mobile in all four languages; persistence and form values verified.`);
} finally { await browser.close(); }
