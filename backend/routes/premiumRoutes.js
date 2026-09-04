import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
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
router.get("/lessons", verifyToken, getLessons);
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
