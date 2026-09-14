import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

import {
    // Emergency Contacts
    getContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,

    // Check-In
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

// Start a check-in
router.post("/checkins", verifyToken, startCheckin);

// Get my check-ins
router.get("/checkins", verifyToken, getMyCheckins);

// Complete or mark a check-in as missed
router.put("/checkins/:id", verifyToken, completeCheckin);

export default router;