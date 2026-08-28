import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { genUnique } from "../utils/index.js";

// Ensure Cloudinary is configured from environment variables
cloudinary.config();

// Set up Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const folder = "Abamba";
        const id = genUnique();
        const originalNameWithoutExt = (file.originalname || "file")
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-zA-Z0-9_-]/g, "_");
        const public_id = `${id}_${originalNameWithoutExt}`;

        return {
            folder: folder,
            public_id: public_id,
            resource_type: "auto",
        };
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
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Set up multer with Cloudinary storage
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
