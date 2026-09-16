import express from "express";
import safetyStateRoutes from "./safetyStateRoutes.js";
import { verifyToken } from "../middleware/verifyToken.js";

import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  startCheckin,
  getMyCheckins,
  completeCheckin
} from "../controllers/safetyHubController.js";

const router = express.Router();

// ================================
// EMERGENCY CONTACT ROUTES
// ================================

router.get("/contacts", verifyToken, getContacts);
router.get("/contacts/:id", verifyToken, getContact);
router.post("/contacts", verifyToken, createContact);
router.put("/contacts/:id", verifyToken, updateContact);
router.delete("/contacts/:id", verifyToken, deleteContact);

// ================================
// CHECK-IN ROUTES
// ================================

router.post("/checkins", verifyToken, startCheckin);
router.get("/checkins", verifyToken, getMyCheckins);
router.put("/checkins/:id", verifyToken, completeCheckin);

// STATE / TRIP / EVENT ROUTES

router.use(safetyStateRoutes);

export default router;