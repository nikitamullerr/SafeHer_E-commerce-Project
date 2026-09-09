import express from "express";
import { createOrder, getOrders, updateOrderStatus, resendConfirmationEmail } from "../controllers/orderController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);
router.post("/", createOrder);
router.get("/", getOrders);
router.patch("/:id/status", updateOrderStatus);
router.post("/:id/resend-confirmation-email", resendConfirmationEmail);

export default router;
