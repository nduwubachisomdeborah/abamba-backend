import { asyncHandler } from "../middlewares/error.js";
import fileService from "../services/file.service.js";
import uploadService from "../services/upload.service.js";
import { errorResponse, successResponse } from "../utils/response.util.js";

class UploadController {
    async uploadFile(req, res) {
        // if (err instanceof multer.MulterError) {
        //     return res.badResponse(err.message);
        // } else if (err) {
        //     return res.badResponse(err.message);
        // }

        console.log(req.files);

        if (!req.files && !req.file) {
            return successResponse(res, "No file uploaded", []);
        }

        const files = req.file ? [req.file] : req.files;

        try {
            const filesResult = await fileService.addFiles(req.user._id, files);
            successResponse(
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
            console.error("error", error);
            errorResponse(res, error.message || "An error occurred");
        }
    }

    deleteFile = asyncHandler(async (req, res) => {
        const file = await uploadService.deleteFile(
            req.params.id,
            req.user._id
        );
        successResponse(res, "File deleted successfully", file);
    });

    getFile = asyncHandler(async (req, res) => {
        const isAdmin = req.user.role === "admin";
        const file = isAdmin
            ? await fileService.getFileById(req.params.id)
            : await fileService.getFile(req.user._id, req.params.id);
        successResponse(res, "File retrieved successfully", file);
    });
}

export default new UploadController();
