import test from "node:test";
import assert from "node:assert/strict";
import { publicViews, memberViews, resolveView } from "../src/services/viewAccess.js";
import premiumRoutes from "../backend/routes/premiumRoutes.js";

test("visitors can browse public pages and must sign in for all member pages", () => {
  for (const view of publicViews) assert.equal(resolveView(view, false), view);
  for (const view of memberViews) { assert.equal(resolveView(view, false), "login"); assert.equal(resolveView(view, true), view); }
  assert.equal(resolveView("contact", false), "login");
  assert.equal(resolveView("contact", true), "services");
  assert.equal(resolveView("unknown", false), "index");
});
test("direct video-list API access rejects a guest before loading lessons", () => {
  const route = premiumRoutes.stack.find(layer => layer.route?.path === "/lessons").route;
  let status, body, continued = false;
  const response = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
  route.stack[0].handle({ headers: {} }, response, () => { continued = true; });
  assert.equal(status, 401); assert.equal(body.success, false); assert.equal(continued, false);
});
