import { Client as MinioClient } from "minio";

// Configure MinIO client using environment variables
const minioConfig = {
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000,
    useSSL: String(process.env.MINIO_USE_SSL).toLowerCase() === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
};

const BUCKET = process.env.MINIO_BUCKET_NAME;

// Create and export a Cloudinary-like adapter powered by MinIO
const client = new MinioClient(minioConfig);

// Helper: find objects by prefix (to mimic Cloudinary public_id behavior)
async function findObjectsByPrefix(bucket, prefix, max = 1) {
    return new Promise((resolve, reject) => {
        const objects = [];
        const stream = client.listObjectsV2(bucket, prefix, true);
        stream.on("data", (obj) => {
            objects.push(obj);
            if (objects.length >= max) {
                // Attempt to end the stream early
                stream.destroy();
            }
        });
        stream.on("end", () => resolve(objects));
        stream.on("error", (err) => reject(err));
    });
}

const uploader = {
    // Cloudinary-compatible API: destroy(publicId)
    // For MinIO, we interpret publicId as the object key prefix and delete matching object(s).
    async destroy(publicId) {
        if (!BUCKET) {
            throw new Error("MINIO_BUCKET_NAME is not configured");
        }
        if (!publicId) {
            throw new Error("publicId is required for deletion");
        }

        // Try to find matching objects by prefix (handles cases with/without extension)
        const matches = await findObjectsByPrefix(BUCKET, publicId, 10);
        if (!matches || matches.length === 0) {
            // Attempt exact key delete as a fallback
            try {
                await client.removeObject(BUCKET, publicId);
                return { result: "ok" };
            } catch (err) {
                // If no matches and direct delete fails, surface a friendly error
                throw new Error(
                    `Object not found for publicId prefix or key: ${publicId}`
                );
            }
        }

        // Delete all matched objects
        const keys = matches.map((m) => m.name).filter(Boolean);
        // If there are many, use removeObjects; otherwise remove individually
        if (keys.length > 1 && client.removeObjects) {
            await client.removeObjects(BUCKET, keys);
        } else {
            for (const key of keys) {
                await client.removeObject(BUCKET, key);
            }
        }
        return { result: "ok" };
    },
};

// Default export keeps the same import path and shape used across the codebase
const cloudinaryLike = {
    client,
    uploader,
};

export default cloudinaryLike;
