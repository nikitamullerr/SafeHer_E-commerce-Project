import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ TEST ROUTE - Add this to check if body parsing works
app.post("/api/test", (req, res) => {
    console.log("✅ Test route hit!");
    console.log("📝 Body:", req.body);
    res.json({
        success: true,
        message: "Body received!",
        body: req.body
    });
});

// Routes
app.use("/api", routes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
    });
});

app.listen(PORT, () => {
    console.log(`🚀 SafeHer API running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test route: POST http://localhost:${PORT}/api/test`);
});
