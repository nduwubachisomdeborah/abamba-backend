import dns from "dns";
// Ensure reliable DNS resolution for MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../src/models/product.model.js";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function runMigration() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB successfully.");

        // 1. Reset all products' lowStockAlert to 2
        const lowStockResult = await Product.updateMany(
            {},
            { $set: { lowStockAlert: 2 } }
        );
        console.log(`✅ Updated lowStockAlert to 2 for ${lowStockResult.modifiedCount} products.`);

        // 2. Cap any product with quantity greater than 100 down to 100
        const quantityResult = await Product.updateMany(
            { quantity: { $gt: 100 } },
            { $set: { quantity: 100 } }
        );
        console.log(`✅ Capped quantity to 100 for ${quantityResult.modifiedCount} products.`);

        // 3. Cap any variant quantity greater than 100 down to 100
        const variantQuantityResult = await Product.updateMany(
            { "variants.quantity": { $gt: 100 } },
            { $set: { "variants.$[elem].quantity": 100 } },
            { arrayFilters: [{ "elem.quantity": { $gt: 100 } }] }
        );
        console.log(`✅ Capped variant quantities to 100 for ${variantQuantityResult.modifiedCount} products.`);

        console.log("🎉 Database migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
