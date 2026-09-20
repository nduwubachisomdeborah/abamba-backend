import dns from "dns";
// Ensure reliable DNS resolution for MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://abamba:HzfJuQcNNn1@130.185.118.226:27018/abamba?authSource=admin";

async function runMigration() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully.");

        const db = mongoose.connection.db;

        // 1. Reset all products with lowStockAlert > 2 (or missing/null) back to 2 (fixes Hot Comb issue)
        const alertResult = await db.collection("products").updateMany(
            {
                $or: [
                    { lowStockAlert: { $gt: 2 } },
                    { lowStockAlert: { $exists: false } },
                    { lowStockAlert: null },
                ],
            },
            { $set: { lowStockAlert: 2 } }
        );
        console.log(
            `Updated ${alertResult.modifiedCount} products with corrected lowStockAlert (default: 2)`
        );

        // 2. Cap any product quantity > 50 down to 50
        const qtyResult = await db.collection("products").updateMany(
            { quantity: { $gt: 50 } },
            { $set: { quantity: 50 } }
        );
        console.log(
            `Capped ${qtyResult.modifiedCount} products to max 50 quantity`
        );

        // 3. Cap any variant quantity > 50 down to 50
        const variantResult = await db.collection("products").updateMany(
            { "variants.quantity": { $gt: 50 } },
            { $set: { "variants.$[elem].quantity": 50 } },
            { arrayFilters: [{ "elem.quantity": { $gt: 50 } }] }
        );
        console.log(
            `Capped variant quantities to max 50 for ${variantResult.modifiedCount} products`
        );

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
