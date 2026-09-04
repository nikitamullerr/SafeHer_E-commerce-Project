import express from "express";
import { createOrder, getOrders, updateOrderStatus } from "../controllers/orderController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);
router.post("/", createOrder);
router.get("/", getOrders);
router.patch("/:id/status", updateOrderStatus);

export default router;
