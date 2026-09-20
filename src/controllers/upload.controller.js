import { asyncHandler } from "../middlewares/error.js";
import fileService from "../services/file.service.js";
import uploadService from "../services/upload.service.js";
import { errorResponse, successResponse } from "../utils/response.util.js";
import { processKycDocument } from "../services/documentUpload.service.js";
import { processProductImage } from "../services/imageProcessing.service.js";
import { uploadFile as minioUploadFile } from "../config/minio.js";

class UploadController {
    async uploadFile(req, res) {
        if (!req.files && !req.file) {
            return successResponse(res, "No file uploaded", []);
        }

        const files = req.file ? [req.file] : (req.files || []);

        try {
            const userId = req.user?._id || req.user?.id || null;
            const filesResult = await fileService.addFiles(userId, files);
            return successResponse(
                res,
                "Upload success",
                filesResult.map((file) => {
                    return {
                        _id: file._id,
                        url: file.url,
                        name: file.name,
                        mimeType: file.mimeType,
                        size: file.size,
                    };
                })
            );
        } catch (error) {
            console.error("Upload error:", error);
            return errorResponse(res, error.message || "An error occurred");
        }
    }

    /**
     * @desc    Upload & optimize KYC / ID Document (ID Card, NIN, CAC, Passport)
     * @route   POST /api/v1/upload/kyc
     * @access  Private / Optional Auth
     */
    uploadKycDocument = asyncHandler(async (req, res) => {
        const file = req.file || (req.files && req.files[0]);
        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const userId = req.user?._id || req.user?.id || "public";
        const fileBuffer = file.buffer;

        if (!fileBuffer) {
            return res.status(400).json({ success: false, message: "File buffer not available" });
        }

        const { optimizedBuffer, thumbnailBuffer, contentType, ext } = await processKycDocument(
            fileBuffer,
            file.mimetype
        );

        const timestamp = Date.now();
        const documentKey = `kyc/${userId}/${timestamp}_doc${ext}`;
        const thumbKey = `kyc/${userId}/${timestamp}_thumb${ext}`;

        try {
            await minioUploadFile(documentKey, optimizedBuffer, contentType);
            if (thumbnailBuffer) {
                await minioUploadFile(thumbKey, thumbnailBuffer, contentType);
            }
        } catch (minioErr) {
            console.warn("MinIO storage note:", minioErr.message);
        }

        const baseUrl = process.env.MINIO_PUBLIC_URL || process.env.APP_URL || "";
        const fileUrl = baseUrl
            ? `${baseUrl.replace(/\/+$/, "")}/${documentKey}`
            : `/uploads/${documentKey}`;
        const thumbUrl = thumbnailBuffer && baseUrl
            ? `${baseUrl.replace(/\/+$/, "")}/${thumbKey}`
            : thumbnailBuffer ? `/uploads/${thumbKey}` : null;

        return res.status(200).json({
            success: true,
            data: {
                url: fileUrl,
                thumbnailUrl: thumbUrl,
                contentType,
                name: file.originalname,
            },
        });
    });

    /**
     * @desc    Upload & optimize Product Image into 3 WebP variants (Thumb, Med, Full)
     * @route   POST /api/v1/upload/image
     * @access  Private / Optional Auth
     */
    uploadProductImage = asyncHandler(async (req, res) => {
        const file = req.file || (req.files && req.files[0]);
        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const userId = req.user?._id || req.user?.id || "products";
        const fileBuffer = file.buffer;

        if (!fileBuffer) {
            return res.status(400).json({ success: false, message: "File buffer not available" });
        }

        const { thumbnailBuffer, mediumBuffer, fullBuffer } = await processProductImage(fileBuffer);
        const timestamp = Date.now();
        const baseName = `prod_${userId}_${timestamp}`;

        const thumbKey = `products/thumb_${baseName}.webp`;
        const medKey = `products/med_${baseName}.webp`;
        const fullKey = `products/full_${baseName}.webp`;

        try {
            await minioUploadFile(thumbKey, thumbnailBuffer, "image/webp");
            await minioUploadFile(medKey, mediumBuffer, "image/webp");
            await minioUploadFile(fullKey, fullBuffer, "image/webp");
        } catch (minioErr) {
            console.warn("MinIO storage note:", minioErr.message);
        }

        const baseUrl = process.env.MINIO_PUBLIC_URL || process.env.APP_URL || "";
        const thumbUrl = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/${thumbKey}` : `/uploads/${thumbKey}`;
        const medUrl = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/${medKey}` : `/uploads/${medKey}`;
        const fullUrl = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/${fullKey}` : `/uploads/${fullKey}`;

        return res.status(200).json({
            success: true,
            data: {
                thumbnail: thumbUrl,
                medium: medUrl,
                url: fullUrl,
                name: file.originalname,
            },
        });
    });

    deleteFile = asyncHandler(async (req, res) => {
        const userId = req.user?._id || req.user?.id || null;
        const file = await uploadService.deleteFile(
            req.params.id,
            userId
        );
        successResponse(res, "File deleted successfully", file);
    });

    getFile = asyncHandler(async (req, res) => {
        const isAdmin = req.user?.role === "admin";
        const userId = req.user?._id || req.user?.id || null;
        const file = isAdmin
            ? await fileService.getFileById(req.params.id)
            : await fileService.getFile(userId, req.params.id);
        successResponse(res, "File retrieved successfully", file);
    });
}

export default new UploadController();
