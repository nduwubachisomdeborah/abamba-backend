import admin from "firebase-admin";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// In production, use environment variables or secret management service
// For local development, we look for a service account file
const initializeFirebaseAdmin = () => {
    try {
        // Check if service account is provided via environment variable (preferred for production)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT
            );

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });

            console.log(
                "Firebase Admin SDK initialized with environment variable"
            );
            return;
        }

        // Check for service account file (local development)
        const serviceAccountPath = path.join(
            __dirname,
            "../../firebase-service-account.json"
        );

        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(
                fs.readFileSync(serviceAccountPath, "utf8")
            );

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });

            console.log(
                "Firebase Admin SDK initialized with service account file"
            );
            return;
        }

        // If no service account is found, initialize without authentication for testing
        // This will limit functionality but allow development to proceed
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || "abamba-app",
        });

        console.warn(
            "Firebase Admin SDK initialized without authentication. Some features will be limited."
        );
    } catch (error) {
        console.error("Error initializing Firebase Admin SDK:", error);
        throw new Error("Failed to initialize Firebase Admin SDK");
    }
};

// Initialize on import
initializeFirebaseAdmin();

export default admin;
