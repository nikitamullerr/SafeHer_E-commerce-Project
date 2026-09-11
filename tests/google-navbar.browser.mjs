import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1320, height: 950 } });
const errors = [], authRequests = [];
page.on("pageerror", error => errors.push(error.message));
await page.route("https://**/*", route => route.abort());
await page.addInitScript(() => {
  window.google = { accounts: { id: {
    initialize(options) { this.callback = options.callback; },
    renderButton(element, options) { const button=document.createElement("button");button.textContent=options.text === "signup_with" ? "Google test registration" : "Google test sign in";button.onclick=()=>this.callback({credential:"mock-google-id-token"});element.appendChild(button); },
    cancel() {},
  } } };
});
await page.route("**/api/**", route => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith("/api/auth/")) {
    const body = route.request().postDataJSON(); authRequests.push({ path: url.pathname, body });
    if (body.mode === "registration") return route.fulfill({ status: 409, json: { error: "User already exists" } });
    return route.fulfill({ json: { token: "test-token", user: { id: 7, email: "existing@gmail.com", name: "Existing" } } });
  }
  return route.fulfill({ json: { success: true, products: [], orders: [] } });
});
try {
  await page.goto(process.env.APP_URL || "http://localhost:5173", { waitUntil: "domcontentloaded" });
  await page.locator(".guest-login").waitFor();
  assert.equal(await page.locator(".site-nav .guest-login, .site-nav .guest-register, .member-link-lock").count(), 0);
  for (const width of [290,390,1320]) for (const dark of [false,true]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(dark => document.querySelector("#app").__vue_app__._instance.setupState.darkMode=dark,dark);
    await page.mouse.move(0,949);
    await page.waitForTimeout(400);
    assert.ok(await page.locator(".guest-login").isVisible());assert.ok(await page.locator(".guest-register").isVisible());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    const controls = await page.locator(".nav-actions select, .nav-actions button").evaluateAll(elements=>elements.map(el=>{const s=getComputedStyle(el);return {border:s.borderTopWidth,shadow:s.boxShadow,outline:s.outlineStyle}}));
    for(const control of controls){assert.equal(control.border,"0px");assert.equal(control.shadow,"none");assert.equal(control.outline,"none");}
  }
  await page.setViewportSize({ width: 1320, height: 950 });
  await page.locator(".guest-login").click();
  await page.getByText("Google test sign in", { exact:true }).click();
  await page.locator(".swal2-confirm").click();
  await page.getByRole("button", { name: "Log out", exact: true }).waitFor();
  assert.deepEqual(authRequests.map(r=>r.path), ["/api/auth/google"]);
  assert.equal(authRequests[0].body.mode,"login");assert.equal(authRequests[0].body.password,undefined);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.locator(".guest-register").click();
  await page.getByText("Google test registration", { exact:true }).click();
  await page.getByText("User already exists", { exact:true }).waitFor();
  assert.equal(authRequests[1].body.mode,"registration");
  assert.equal(await page.locator("#auth-language").count(),1,"Registration errors keep the user on the auth page");
  assert.deepEqual(errors,[]);
  console.log("PASS: borderless desktop/mobile navbar, relocated account links, and separate verified-Google login/registration requests (provider mocked).");
} finally { await browser.close(); }
