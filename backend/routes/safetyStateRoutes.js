import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { createCheckin, getCheckinsByUser } from "../models/checkinModel.js";

const router = express.Router();
router.use(verifyToken);
const decode = value => typeof value === "string" ? JSON.parse(value) : value;
const checklistKeys = ["phoneCharged", "locationReady", "contactSelected", "routePlanned"];
const handler = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) { res.status(error.status || 500).json({ success: false, error: error.status ? error.message : "Unable to save or load safety data. Please try again." }); }
};
const bad = message => Object.assign(new Error(message), { status: 400 });

router.get("/state", handler(async (req, res) => {
  const [[state]] = await pool.query("SELECT * FROM safety_hub_state WHERE user_id = ?", [req.user.id]);
  const checkins = await getCheckinsByUser(req.user.id);
  res.json({ success: true, state: {
    selectedPlan: state?.selected_plan || "Home mode",
    nightChecklist: decode(state?.night_checklist) || Object.fromEntries(checklistKeys.map(key => [key, false])),
    trip: decode(state?.trip) || null,
  }, checkins, serverTime: new Date().toISOString(), completedCheckins: checkins.filter(item => item.status === "completed").length });
}));

router.put("/state", handler(async (req, res) => {
  const { selectedPlan, nightChecklist } = req.body || {};
  if (selectedPlan !== undefined && !["Home mode", "Night mode", "Travel mode"].includes(selectedPlan)) throw bad("Choose a valid safety mode.");
  if (nightChecklist !== undefined && (!nightChecklist || checklistKeys.some(key => typeof nightChecklist[key] !== "boolean") || Object.keys(nightChecklist).length !== checklistKeys.length)) throw bad("Invalid night checklist.");
  if (selectedPlan === undefined && nightChecklist === undefined) throw bad("No safety settings supplied.");
  await pool.query(`INSERT INTO safety_hub_state (user_id, selected_plan, night_checklist) VALUES (?, COALESCE(?, 'Home mode'), ?)
    ON DUPLICATE KEY UPDATE selected_plan = COALESCE(?, selected_plan), night_checklist = COALESCE(?, night_checklist)`,
    [req.user.id, selectedPlan ?? null, nightChecklist ? JSON.stringify(nightChecklist) : null, selectedPlan ?? null, nightChecklist ? JSON.stringify(nightChecklist) : null]);
  res.json({ success: true });
}));

router.post("/trips", handler(async (req, res) => {
  const { destination, arrival, duration } = req.body || {};
  if (typeof destination !== "string" || !destination.trim() || destination.length > 120 || !Number.isFinite(Date.parse(arrival)) || Date.parse(arrival) <= Date.now() || !Number.isInteger(duration) || duration < 1 || duration > 240) throw bad("Enter a destination, future arrival time and a check-in duration from 1 to 240 minutes.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const checkin = await createCheckin(req.user.id, duration, connection);
    const trip = { destination: destination.trim(), arrival, duration, active: true, startedAt: new Date().toISOString(), checkinId: checkin.id };
    await connection.query("INSERT INTO safety_hub_state (user_id, trip) VALUES (?, ?) ON DUPLICATE KEY UPDATE trip = VALUES(trip)", [req.user.id, JSON.stringify(trip)]);
    await connection.commit();
    res.status(201).json({ success: true, trip, checkin });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}));

router.post("/trips/arrive", handler(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user.id]);
    const [[state]] = await connection.query("SELECT trip FROM safety_hub_state WHERE user_id = ? FOR UPDATE", [req.user.id]);
    const trip = decode(state?.trip);
    if (!trip?.active) throw bad("No active trip to complete.");
    const [result] = await connection.query("UPDATE checkins SET status = 'completed', completed_at = NOW() WHERE id = ? AND user_id = ?", [trip.checkinId, req.user.id]);
    if (!result.affectedRows) throw bad("Trip check-in could not be found.");
    trip.active = false; trip.arrivedAt = new Date().toISOString();
    await connection.query("UPDATE safety_hub_state SET trip = ? WHERE user_id = ?", [JSON.stringify(trip), req.user.id]);
    await connection.commit();
    res.json({ success: true, trip });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}));

router.delete("/trips", handler(async (req, res) => {
  await pool.query("UPDATE safety_hub_state SET trip = NULL WHERE user_id = ?", [req.user.id]);
  res.json({ success: true });
}));

router.post("/events", handler(async (req, res) => {
  if (!["sos", "sos_contacts"].includes(req.body?.type)) throw bad("Invalid safety event.");
  await pool.query("INSERT INTO safety_events (user_id, event_type) VALUES (?, ?)", [req.user.id, req.body.type]);
  res.status(201).json({ success: true });
}));
export default router;
