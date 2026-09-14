// Run manually against the configured database. Only temporary test accounts are changed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import routes from "../routes/safetyHubRoutes.js";
import { ensureSafetySchema } from "../database/ensureSafetySchema.js";

await ensureSafetySchema();
const app = express();
app.use(express.json());
app.use("/api/safety-hub", routes);
const server = await new Promise(resolve => {
  const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
});
const users = [];
try {
  for (let i = 0; i < 2; i++) {
    const email = `safety-integration-${randomUUID()}@example.invalid`;
    const [result] = await pool.query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", ["Temporary integration test", email, "disabled-integration-account"]);
    users.push({ id: result.insertId, email });
  }
  async function request(method, path, body, user = users[0], expected = 200) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/safety-hub${path}`, {
      method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "5m" })}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  }
  await request("GET", "/state", null, null, 401);
  await request("PUT", "/state", { selectedPlan: "Night mode", nightChecklist: { phoneCharged: true, locationReady: false, contactSelected: true, routePlanned: false } });
  let data = await request("GET", "/state");
  assert.equal(data.state.selectedPlan, "Night mode");
  assert.equal(data.state.nightChecklist.phoneCharged, true);
  assert.equal((await request("GET", "/state", null, users[1])).state.selectedPlan, "Home mode");
  await request("POST", "/checkins", { duration_minutes: 1.5 }, users[0], 400);
  const { checkin } = await request("POST", "/checkins", { duration_minutes: 1 }, users[0], 201);
  await request("POST", "/checkins", { duration_minutes: 15 }, users[0], 409);
  await request("PUT", `/checkins/${checkin.id}`, { status: "completed" }, users[1], 404);
  await request("PUT", `/checkins/${checkin.id}`, { status: "missed" }, users[0], 404);
  assert.equal((await request("GET", "/state")).checkins[0].id, checkin.id);
  await pool.query("UPDATE checkins SET created_at = DATE_SUB(NOW(), INTERVAL 2 MINUTE) WHERE id = ? AND user_id = ?", [checkin.id, users[0].id]);
  assert.equal((await request("GET", "/state")).checkins[0].status, "missed");
  await request("PUT", `/checkins/${checkin.id}`, { status: "completed" });
  const { trip } = await request("POST", "/trips", { destination: "Integration test destination", duration: 30, arrival: new Date(Date.now() + 3600000).toISOString() }, users[0], 201);
  assert.equal((await request("GET", "/state")).state.trip.checkinId, trip.checkinId);
  await request("POST", "/trips/arrive", {}, users[1], 400);
  await request("POST", "/trips/arrive", {});
  data = await request("GET", "/state");
  assert.equal(data.state.trip.active, false);
  assert.equal(data.completedCheckins, 2);
  await request("DELETE", "/trips");
  assert.equal((await request("GET", "/state")).state.trip, null);
  const { contact } = await request("POST", "/contacts", { name: "Test contact", phone: "0000000000", relationship: "Test" }, users[0], 201);
  await request("DELETE", `/contacts/${contact.id}`, null, users[1], 404);
  await request("DELETE", `/contacts/${contact.id}`);
  await request("POST", "/events", { type: "sos" }, users[0], 201);
  const [[event]] = await pool.query("SELECT COUNT(*) AS count FROM safety_events WHERE user_id = ?", [users[0].id]);
  assert.equal(event.count, 1);
  console.log("PASS: database persistence, account isolation, contacts, timer expiry, trips, arrivals and SOS event recording.");
} finally {
  for (const user of users) await pool.query("DELETE FROM users WHERE id = ? AND email = ?", [user.id, user.email]);
  await new Promise(resolve => server.close(resolve));
  await pool.end();
}
