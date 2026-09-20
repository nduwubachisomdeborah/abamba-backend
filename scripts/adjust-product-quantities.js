import dns from "dns";
// Ensure reliable DNS resolution for MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://abamba:HzfJuQcNNn1@130.185.118.226:27018/abamba?authSource=admin";

async function runAdjustment() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB successfully.");

        const db = mongoose.connection.db;

        // 1. Any product with quantity >= 50 (e.g. 100) set to 50
        const cap50Result = await db.collection("products").updateMany(
            { quantity: { $gte: 50 } },
            { $set: { quantity: 50 } }
        );
        console.log(`✅ Set quantity to 50 for ${cap50Result.modifiedCount} products.`);

        // 2. Any product with quantity == 2 set to 5
        const bump2to5Result = await db.collection("products").updateMany(
            { quantity: 2 },
            { $set: { quantity: 5 } }
        );
        console.log(`✅ Updated quantity from 2 to 5 for ${bump2to5Result.modifiedCount} products.`);

        // 3. Any variant with quantity >= 50 set to 50
        const variantCap50Result = await db.collection("products").updateMany(
            { "variants.quantity": { $gte: 50 } },
            { $set: { "variants.$[elem].quantity": 50 } },
            { arrayFilters: [{ "elem.quantity": { $gte: 50 } }] }
        );
        console.log(`✅ Set variant quantity to 50 for ${variantCap50Result.modifiedCount} products.`);

        // 4. Any variant with quantity == 2 set to 5
        const variantBumpResult = await db.collection("products").updateMany(
            { "variants.quantity": 2 },
            { $set: { "variants.$[elem].quantity": 5 } },
            { arrayFilters: [{ "elem.quantity": 2 }] }
        );
        console.log(`✅ Updated variant quantity from 2 to 5 for ${variantBumpResult.modifiedCount} products.`);

        console.log("🎉 Quantity adjustment completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Adjustment failed:", error);
        process.exit(1);
    }
}

runAdjustment();
