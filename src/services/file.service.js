import File from "../models/files.model.js";

class FileService {
    async addFiles(userId, files) {
        const filesResult = await File.create(
            files.map((file) => ({
                name: file.originalname || file.filename || "file",
                url: file.path || file.secure_url || file.location || file.url,
                mimeType: file.mimetype || "application/octet-stream",
                size: file.size || 0,
                uploadedBy: userId,
            }))
        );

        return filesResult;
    }

    async getFileById(fileId) {
        const file = await File.findById(fileId);
        return file;
    }

    async getFile(userId, fileId) {
        const file = await File.findOne({
            _id: fileId,
            uploadedBy: userId,
        }).populate("uploadedBy", "name");
        return file;
    }

    async hasFile(fileId) {
        const file = await File.findById(fileId);
        return file;
    }
}

export default new FileService();
