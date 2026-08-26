import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Debug middleware that logs request body and response sent to client
 * Should only be used in development/debugging mode
 */
export const debugLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const requestId = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

    // Log request details
    const requestLog = {
        requestId,
        timestamp,
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress,
    };

    console.log("\n=== 📥 INCOMING REQUEST ===");
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    console.log(`Request ID: ${requestId}`);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

    if (Object.keys(req.query).length > 0) {
        console.log("Query Params:", JSON.stringify(req.query, null, 2));
    }

    if (Object.keys(req.params).length > 0) {
        console.log("Route Params:", JSON.stringify(req.params, null, 2));
    }

    if (req.body && Object.keys(req.body).length > 0) {
        console.log("Body:", JSON.stringify(req.body, null, 2));
    }

    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;

    // Track if response was already captured
    let responseCaptured = false;

    // Helper function to log response
    const logResponse = (data, type) => {
        if (responseCaptured) return;
        responseCaptured = true;

        const responseTime = Date.now() - new Date(timestamp).getTime();

        console.log("\n=== 📤 OUTGOING RESPONSE ===");
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
        );
        console.log(`Request ID: ${requestId}`);
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response Time: ${responseTime}ms`);
        console.log(`Response Type: ${type}`);

        // Try to parse and log response data
        try {
            if (typeof data === "string") {
                try {
                    const parsed = JSON.parse(data);
                    console.log(
                        "Response Data:",
                        JSON.stringify(parsed, null, 2)
                    );
                } catch {
                    console.log("Response Data:", data.substring(0, 500)); // Limit string output
                }
            } else if (data) {
                console.log("Response Data:", JSON.stringify(data, null, 2));
            }
        } catch (err) {
            console.log("Response Data: [Unable to parse]");
        }

        console.log("=".repeat(50) + "\n");

        // Optional: Write to debug log file
        if (process.env.DEBUG_LOG === "true") {
            const logDir = path.join(__dirname, "..", "logs");
            const debugLogPath = path.join(logDir, "debug.log");

            const logEntry = {
                request: requestLog,
                response: {
                    requestId,
                    timestamp: new Date().toISOString(),
                    statusCode: res.statusCode,
                    responseTime,
                    data:
                        typeof data === "string"
                            ? data.substring(0, 1000)
                            : data,
                },
            };

            fs.appendFileSync(
                debugLogPath,
                JSON.stringify(logEntry, null, 2) +
                    "\n" +
                    "-".repeat(80) +
                    "\n",
                "utf8"
            );
        }
    };

    // Override res.json
    res.json = function (data) {
        logResponse(data, "json");
        return originalJson.call(this, data);
    };

    // Override res.send
    res.send = function (data) {
        logResponse(data, "send");
        return originalSend.call(this, data);
    };

    // Override res.end (fallback for responses that don't use json/send)
    res.end = function (data) {
        if (!responseCaptured && data) {
            logResponse(data, "end");
        }
        return originalEnd.call(this, data);
    };

    next();
};

/**
 * Conditional debug logger - only active when DEBUG env variable is set
 */
export const conditionalDebugLogger = (req, res, next) => {
    // if (process.env.DEBUG === "true" || process.env.NODE_ENV === "development") {
    return debugLogger(req, res, next);
    // }
    next();
};
