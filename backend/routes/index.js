import express from "express";
import safetyHubRoutes from "./safetyHubRoutes.js";
import authRoutes from "./authRoutes.js";

const router = express.Router();

router.use("/safety-hub", safetyHubRoutes);
router.use("/auth", authRoutes);

export default router;