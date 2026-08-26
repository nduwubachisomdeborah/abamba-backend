import * as Minio from "minio";

// Initialize MinIO client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "abamba-uploads";

/**
 * Initialize MinIO bucket
 */
const initializeMinIO = async () => {
    try {
        // Check if bucket exists
        const bucketExists = await minioClient.bucketExists(MINIO_BUCKET_NAME);

        if (!bucketExists) {
            // Create bucket if it doesn't exist
            await minioClient.makeBucket(MINIO_BUCKET_NAME, "us-east-1");
            console.log(
                `✅ Bucket '${MINIO_BUCKET_NAME}' created successfully`
            );

            // Set bucket policy to allow read access
            const policy = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: { AWS: ["*"] },
                        Action: ["s3:GetObject"],
                        Resource: [`arn:aws:s3:::${MINIO_BUCKET_NAME}/*`],
                    },
                ],
            };

            await minioClient.setBucketPolicy(
                MINIO_BUCKET_NAME,
                JSON.stringify(policy)
            );
            console.log(`✅ Bucket policy set for '${MINIO_BUCKET_NAME}'`);
        } else {
            console.log(`✅ Bucket '${MINIO_BUCKET_NAME}' already exists`);
        }
    } catch (error) {
        console.error("❌ Error initializing MinIO:", error);
        throw error;
    }
};

/**
 * Upload file to MinIO
 */
const uploadFile = async (fileName, fileBuffer, contentType, metadata = {}) => {
    try {
        const metaData = {
            "Content-Type": contentType,
            ...metadata,
        };

        await minioClient.putObject(
            MINIO_BUCKET_NAME,
            fileName,
            fileBuffer,
            fileBuffer.length,
            metaData
        );

        return {
            success: true,
            fileName,
            size: fileBuffer.length,
            contentType,
        };
    } catch (error) {
        console.error("Error uploading file to MinIO:", error);
        throw error;
    }
};

/**
 * Delete file from MinIO
 */
const deleteFile = async (fileName) => {
    try {
        await minioClient.removeObject(MINIO_BUCKET_NAME, fileName);
        return { success: true, fileName };
    } catch (error) {
        console.error("Error deleting file from MinIO:", error);
        throw error;
    }
};

/**
 * Get file from MinIO
 */
const getFile = async (fileName) => {
    try {
        const stream = await minioClient.getObject(MINIO_BUCKET_NAME, fileName);
        return stream;
    } catch (error) {
        console.error("Error getting file from MinIO:", error);
        throw error;
    }
};

/**
 * Get file info from MinIO
 */
const getFileInfo = async (fileName) => {
    try {
        const stat = await minioClient.statObject(MINIO_BUCKET_NAME, fileName);
        return stat;
    } catch (error) {
        console.error("Error getting file info from MinIO:", error);
        throw error;
    }
};

/**
 * Generate presigned URL for file access
 */
const getPresignedUrl = async (fileName, expiry = 24 * 60 * 60) => {
    try {
        const url = await minioClient.presignedGetObject(
            MINIO_BUCKET_NAME,
            fileName,
            expiry
        );
        return url;
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw error;
    }
};

/**
 * List files with prefix
 */
const listFiles = async (prefix = "", recursive = true) => {
    try {
        const files = [];
        const stream = minioClient.listObjects(
            MINIO_BUCKET_NAME,
            prefix,
            recursive
        );

        return new Promise((resolve, reject) => {
            stream.on("data", (obj) => files.push(obj));
            stream.on("error", reject);
            stream.on("end", () => resolve(files));
        });
    } catch (error) {
        console.error("Error listing files from MinIO:", error);
        throw error;
    }
};

// listFiles().then((files) => console.log(files));
// initializeMinIO();

export {
    minioClient,
    initializeMinIO,
    uploadFile,
    deleteFile,
    getFile,
    getFileInfo,
    getPresignedUrl,
    listFiles,
};

export default minioClient;
