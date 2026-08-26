import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { genUnique } from "../utils/index.js";

// Configure S3 client to talk to MinIO
const useSSL = String(process.env.MINIO_USE_SSL).toLowerCase() === "true";
const endpointHost = process.env.MINIO_ENDPOINT;
const endpointPort = process.env.MINIO_PORT
    ? parseInt(process.env.MINIO_PORT, 10)
    : useSSL
    ? 443
    : 9000;
const endpoint = `${
    useSSL ? "https" : "http"
}://${endpointHost}:${endpointPort}`;

const s3 = new S3Client({
    forcePathStyle: true,
    region: process.env.AWS_REGION || "us-east-1",
    endpoint,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
});

const BUCKET = process.env.MINIO_BUCKET_NAME;

// Set up MinIO (S3-compatible) storage for multer
const storage = multerS3({
    s3,
    bucket: BUCKET,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
        const { name } = req.user || {};
        cb(null, {
            filename: file.originalname,
            uploader: name || "unknown",
            metadata: JSON.stringify(req.body?.metadata || {}),
        });
    },
    key: (req, file, cb) => {
        try {
            const folder = "Abamba";
            let extension = "";
            const match = file.originalname.match(/\.([^.]+)$/);
            if (match) extension = `.${match[1]}`;

            const id = genUnique();
            const originalNameWithoutExt = file.originalname.replace(
                /\.[^/.]+$/,
                ""
            );
            const key = `${folder}/${id}_${originalNameWithoutExt}${extension}`;
            cb(null, key);
        } catch (err) {
            cb(err);
        }
    },
});

const supportedMimeTypes = [
    // Image MIME types
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/tiff",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",

    // Audio MIME types
    "audio/mpeg", // MP3
    "audio/ogg", // OGG
    "audio/wav", // WAV
    "audio/webm", // WebM audio
    "audio/aac", // AAC
    "audio/mp4", // MP4 audio
    "audio/flac", // FLAC
    "audio/x-m4a", // M4A (Apple)
    "audio/x-opus+ogg", // Opus in OGG container

    // Video MIME types
    "video/mp4", // MP4 video
    "video/mpeg", // MPEG video
    "video/quicktime", // QuickTime video
    "video/x-msvideo", // AVI video
    "video/x-ms-wmv", // WMV video
    "video/webm", // WebM video
    "video/3gpp", // 3GP video
    "video/3gpp2", // 3G2 video
    "video/ogg", // OGG video
    "video/x-matroska", // MKV video

    // Document MIME types
    "application/pdf", // PDF document
    "application/rtf", // Rich Text Format
    "application/txt", // Text file
];

// Set up multer with MinIO storage
const upload = multer({
    storage: storage,
    limits: { fileSize: 30_000_000 }, // Limit file size to 30MB
    fileFilter: (req, file, cb) => {
        if (supportedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file type: " + file.originalname), false);
        }
    },
});

export default upload;
