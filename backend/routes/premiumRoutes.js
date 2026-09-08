import express from "express";
import { optionalVerifyToken, verifyToken } from "../middleware/verifyToken.js";
import {
  getLessons,
  getLessonById,
  markLessonComplete,
  getUserProgress,
  getSubscription,
  subscribe,
  cancelSubscription,
} from "../controllers/premiumController.js";

const router = express.Router();

// ============================================
// LESSON ROUTES
// ============================================
// Lessons may be displayed to everyone; premium access is enforced by the
// client before playback, while authenticated users also receive progress.
router.get("/lessons", optionalVerifyToken, getLessons);
router.get("/lessons/:id", verifyToken, getLessonById);

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================
router.get("/progress", verifyToken, getUserProgress);
router.post("/progress", verifyToken, markLessonComplete);
router.get("/subscription", verifyToken, getSubscription);
router.post("/subscribe", verifyToken, subscribe);
router.delete("/subscription", verifyToken, cancelSubscription);

export default router;
