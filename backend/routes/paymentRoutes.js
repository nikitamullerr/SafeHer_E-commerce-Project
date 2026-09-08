import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { createPayment, getPaymentStatus, payfastItn } from "../controllers/paymentController.js";

const router = express.Router();
router.post("/payfast/itn", payfastItn);
router.post("/payfast/create", verifyToken, createPayment);
router.get("/:orderNumber/status", verifyToken, getPaymentStatus);
export default router;
