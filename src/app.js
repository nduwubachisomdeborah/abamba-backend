import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

// Import versioned routes
import v1Routes from "./routes/v1/index.js";
import v2Routes from "./routes/v2/index.js";

// Import initialization scripts
import { initializeCategoryOptions } from "./scripts/initializeCategoryOptions.js";
import { initializeAdminUser } from "./scripts/initializeAdmin.js";
import { syncCouriers } from "./scripts/syncCouriers.js";
import { seedLogisticsCompanies } from "./scripts/seedLogistics.js";

// Import error middleware
import { errorHandler } from "./middlewares/error.js";
import { conditionalDebugLogger } from "./middlewares/debug.js";
import initializeStoreLocations from "./scripts/storeLocations.js";

// Get directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const result = dotenv.config();

// Check if .env file exists and was loaded correctly
if (result.error) {
    console.error("Error loading .env file:", result.error);
    // process.exit(1);
}

// Verify required environment variables
const requiredEnvVars = ["MONGODB_URI", "PORT", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(
        `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
    process.exit(1);
}

// Initialize app
const app = express();

// Security middleware
// app.use(helmet());

// Rate limiting
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//     standardHeaders: true,
//     legacyHeaders: false,
//     message: {
//         success: false,
//         message: "Too many requests, please try again later.",
//     },
// });
// app.use(limiter);

// CORS middleware
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware (logs request/response when DEBUG=true or in development)
// app.use(conditionalDebugLogger);

// Setup request logging
// Create a logs directory if it doesn't exist
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), {
    flags: "a",
});

// Setup morgan logger
// Use 'combined' format for production and 'dev' for development
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat, { stream: accessLogStream }));

// Also log to console in development
// if (process.env.NODE_ENV !== "production") {
app.use(morgan("dev"));
// }

// Connect to database
mongoose
    .connect(process.env.MONGODB_URI)
    .then((mon) => {
        console.log("Connected to MongoDB");
        // Initialize category options after database connection
        initializeCategoryOptions();
        initializeStoreLocations();
        // Ensure at least one admin user exists
        initializeAdminUser();
        // Sync couriers from ShipBubble
        syncCouriers();
        // Seed Regional Logistics Companies
        seedLogisticsCompanies();
    })
    .catch((err) => console.error("Could not connect to MongoDB", err));

// Register versioned routes
app.use("/api/v1", v1Routes);
app.use("/api/v2", v2Routes);

// Default route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "API is running",
        version: "1.0.0",
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    const dbStatus =
        mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
            status: dbStatus,
            connection: mongoose.connection.host,
            name: mongoose.connection.name || "not connected",
        },
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
