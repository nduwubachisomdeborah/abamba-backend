import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
dotenv.config();

try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {}

const ATLAS_DIRECT_URI =
    "mongodb://deborahchisom033_db_user:0ynecEkLv2ImlVqz@ac-fsqpvbf-shard-00-00.xplxdhx.mongodb.net:27017,ac-fsqpvbf-shard-00-01.xplxdhx.mongodb.net:27017,ac-fsqpvbf-shard-00-02.xplxdhx.mongodb.net:27017/abamba?ssl=true&replicaSet=atlas-m4jwd9-shard-0&authSource=admin&retryWrites=true&w=majority";

const connectDB = async () => {
    const targetUri = process.env.MONGODB_URI || ATLAS_DIRECT_URI;
    try {
        const conn = await mongoose.connect(targetUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.warn(`Primary MongoDB connection failed (${error.message}). Retrying direct replica...`);
        try {
            const conn = await mongoose.connect(ATLAS_DIRECT_URI);
            console.log(`MongoDB Connected (Replica): ${conn.connection.host}`);
        } catch (err2) {
            console.error(`Error connecting to MongoDB: ${err2.message}`);
            process.exit(1);
        }
    }
};

export default connectDB;
