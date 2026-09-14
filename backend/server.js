import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { ensureRequiredOrderColumns } from "./database/ensureSchema.js";
import { ensureSafetySchema } from "./database/ensureSafetySchema.js";

dotenv.config({ path: new URL('./.env', import.meta.url) });

console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

const app = express();

const PORT = process.env.PORT || 5000;

try {
    await ensureRequiredOrderColumns();
    await ensureSafetySchema();
} catch (error) {
    console.error("Backend startup failed: check DB_HOST, DB_PORT, DB_NAME and MySQL availability.", error.code || error.message);
    process.exit(1);
}

// Middleware
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Requests from tools such as curl have no Origin header.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
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
    res.json({
        status: "OK",
        timestamp: new Date().toISOString()
    });
});

// Confirms that the database required by login and registration is reachable.
app.get("/api/health/database", async (req, res, next) => {
    try {
        const { default: pool } = await import("./config/db.js");
        await pool.query("SELECT 1");
        res.json({ status: "OK", database: "connected" });
    } catch (error) {
        next(error);
    }
});
// Error handler
app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
    });
});

const server = app.listen(PORT, () => {
    console.log(`?? SafeHer API running on http://localhost:${PORT}`);
    console.log(`?? Health check: http://localhost:${PORT}/api/health`);
    console.log(`?? Test route: POST http://localhost:${PORT}/api/test`);
});
// Expire reminders even when the browser is closed. No messages are sent here.
const checkinExpiryTimer = setInterval(async () => {
    try {
        const { default: pool } = await import("./config/db.js");
        await pool.query("UPDATE checkins SET status = 'missed' WHERE status = 'active' AND TIMESTAMPADD(MINUTE, duration_minutes, created_at) <= NOW()");
    } catch (error) { console.error("Unable to expire check-ins:", error.code || error.message); }
}, 30000);
checkinExpiryTimer.unref();
server.on("close", () => clearInterval(checkinExpiryTimer));
server.on("error", (error) => {
    console.error(error.code === "EADDRINUSE"
        ? `Port ${PORT} is already in use. Stop the previous backend instance or set PORT and the frontend VITE_API_URL to a matching unused port.`
        : `Backend failed to listen: ${error.message}`);
    process.exit(1);
});
