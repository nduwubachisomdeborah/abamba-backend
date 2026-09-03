import winston from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { errorResponse } from "../utils/response.util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Configure logger
const logger = winston.createLogger({
    level: "error",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: "api-service" },
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        user: req.user ? req.user.id : "unauthenticated",
    });

    // Send response
    const clientMessage =
        process.env.NODE_ENV === "production" && !err.isOperational && statusCode >= 500
            ? "Something went wrong"
            : err.message || "An error occurred";

    res.status(statusCode).json({
        success: false,
        message: clientMessage,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
        data: {},
    });
};

// Custom error class
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
        throw this;
    }
}

// Async handler to avoid try/catch blocks in controllers
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch((err) => {
            console.error(err);
            errorResponse(res, err.message, null, err.statusCode);
        });
    };
};
