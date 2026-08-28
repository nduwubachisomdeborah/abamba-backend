import File from "../models/files.model.js";
import cloudinary from "../services/cloudinary.js";

class UploadService {
    getPublicIdFromUrl(url) {
        if (!url || typeof url !== "string") {
            throw new Error("Invalid URL provided");
        }

        // 1) Try to parse MinIO/S3-style URLs
        // Expecting path-style URL like: https://endpoint:port/bucket/key...
        try {
            const u = new URL(url);
            const segments = u.pathname.split("/").filter(Boolean);
            if (segments.length >= 2) {
                // segments[0] = bucket, the rest form the key
                const bucket = segments[0];
                const key = segments.slice(1).join("/");
                // Remove only the last extension
                const lastDot = key.lastIndexOf(".");
                const publicId = lastDot !== -1 ? key.substring(0, lastDot) : key;
                return publicId;
            }
        } catch (_) {
            // Not a valid URL, fall through to Cloudinary parsing
        }

        // 2) Legacy Cloudinary URLs
        const uploadIndex = url.indexOf("/upload/");
        if (uploadIndex === -1) {
            // If neither S3-style nor Cloudinary-style is recognized, return the URL as-is
            // or throw to keep existing behavior strict. We choose to be tolerant and return as-is.
            return url;
        }

        let path = url.substring(uploadIndex + 8); // skip '/upload/'
        const parts = path.split("/");
        if (parts[0].startsWith("v") && /^\d+$/.test(parts[0].substring(1))) {
            parts.shift();
        }
        const fullPath = parts.join("/");
        const lastDot = fullPath.lastIndexOf(".");
        const publicId = lastDot !== -1 ? fullPath.substring(0, lastDot) : fullPath;
        return publicId;
    }

    deleteFile = async (fileId, userId) => {
        const file = await File.findById(fileId);

        if (!file) {
            throw new Error("File not found");
        }
        if (userId && file.uploadedBy?.toString() !== userId?.toString()) {
            throw new Error("You are not authorized to delete this file");
        }

        const publicId = this.getPublicIdFromUrl(file.url);
        if (publicId && cloudinary?.uploader?.destroy) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error("Cloudinary delete error:", err.message);
            }
        }
        return await File.findByIdAndDelete(fileId);
    };
}

export default new UploadService();
