import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { createPayment, getPaymentStatus, retryPayment, getPaymentConfig } from "../controllers/paymentController.js";
const router = express.Router();
router.get("/config", getPaymentConfig);
router.post("/create", verifyToken, createPayment);
router.post("/:orderNumber/retry", verifyToken, retryPayment);
router.get("/:orderNumber/status", verifyToken, getPaymentStatus);
export default router;
