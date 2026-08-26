import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables before doing anything else
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Set port to 3051 to avoid port binding conflicts with a running dev server
process.env.PORT = "3051";

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/user.model.js";

async function runTests() {
    console.log("--------------------------------------------------");
    console.log("  STARTING INTEGRATION TESTS FOR AI ROUTES       ");
    console.log("--------------------------------------------------\n");

    let testSeller = null;

    try {
        // Wait for MongoDB to connect (initialized by app.js)
        if (mongoose.connection.readyState !== 1) {
            console.log("Waiting for database connection...");
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (mongoose.connection.readyState === 1) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 500);
            });
        }
        console.log(`Connected to database: ${mongoose.connection.name}`);

        // Provision a temporary seller user
        const email = "test_seller_ai_temp@example.com";
        console.log(`Checking if temporary user '${email}' exists...`);
        
        testSeller = await User.findOne({ email });
        if (testSeller) {
            console.log("Temporary user already exists, reusing...");
        } else {
            console.log("Creating new temporary seller user...");
            testSeller = new User({
                name: "Test AI Seller",
                email,
                password: "Password123!",
                role: "seller",
                active: true,
                business: {
                    approved: true,
                    businessName: "AI Test Store",
                    businessType: "Retail",
                    businessPhone: "1234567890",
                    businessEmail: "aitest@example.com",
                    documentType: "nin",
                    businessAddress: {
                        addressLine1: "123 Test St",
                        city: "Aba",
                        state: "Abia",
                        country: "NG"
                    }
                }
            });
            await testSeller.save();
            console.log("Temporary seller user created successfully.");
        }

        // Generate JWT authentication token
        const token = testSeller.generateAuthToken();
        console.log(`Generated JWT token successfully: \n${token.substring(0, 40)}...\n`);

        const imageUrls = ["https://images.unsplash.com/photo-1542291026-7eec264c27ff"]; // Nike shoe on Unsplash

        // ==========================================
        // Test 1: Generate Product Name
        // ==========================================
        console.log("Testing: POST /api/v1/ai/generate-name");
        console.log("Request Body:", JSON.stringify({ imageUrls, category: "footwear", brand: "Nike" }, null, 2));

        const nameRes = await request(app)
            .post("/api/v1/ai/generate-name")
            .set("Authorization", `Bearer ${token}`)
            .send({
                imageUrls,
                category: "footwear",
                brand: "Nike"
            });

        console.log(`Response Status: ${nameRes.status}`);
        console.log("Response Body:", JSON.stringify(nameRes.body, null, 2));
        
        if (nameRes.status !== 200) {
            console.warn("\n⚠️  Warning: generate-name route returned non-200 status. This might be due to a missing/invalid OPENROUTER_API_KEY or quota limits.\n");
        } else {
            console.log("✅  generate-name route returned successfully!\n");
        }

        // ==========================================
        // Test 2: Generate Product Description
        // ==========================================
        console.log("--------------------------------------------------");
        console.log("Testing: POST /api/v1/ai/generate-description");
        
        // Use generated name if available, otherwise fallback
        const generatedName = nameRes.body?.data?.name || "Nike Red Running Shoe";
        console.log("Request Body:", JSON.stringify({ productName: generatedName, imageUrls, category: "footwear", brand: "Nike", targetAudience: "athletes" }, null, 2));

        const descRes = await request(app)
            .post("/api/v1/ai/generate-description")
            .set("Authorization", `Bearer ${token}`)
            .send({
                productName: generatedName,
                imageUrls,
                category: "footwear",
                brand: "Nike",
                targetAudience: "athletes"
            });

        console.log(`Response Status: ${descRes.status}`);
        console.log("Response Body:", JSON.stringify(descRes.body, null, 2));

        if (descRes.status !== 200) {
            console.warn("\n⚠️  Warning: generate-description route returned non-200 status. This might be due to a missing/invalid OPENROUTER_API_KEY or quota limits.\n");
        } else {
            console.log("✅  generate-description route returned successfully!\n");
        }

    } catch (error) {
        console.error("❌  An unexpected error occurred during test execution:", error);
    } finally {
        // Cleanup temporary user
        if (testSeller) {
            console.log("--------------------------------------------------");
            console.log("CLEANING UP...");
            try {
                await User.deleteOne({ _id: testSeller._id });
                console.log("Temporary seller user deleted from database.");
            } catch (err) {
                console.error("Error deleting temporary user:", err);
            }
        }

        // Close MongoDB connection
        try {
            await mongoose.connection.close();
            console.log("Database connection closed.");
        } catch (err) {
            console.error("Error closing database connection:", err);
        }

        console.log("\nTests finished. Exiting...");
        process.exit(0);
    }
}

runTests();
