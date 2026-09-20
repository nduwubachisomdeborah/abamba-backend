import { Router } from "express";
import uploadController from "../../controllers/upload.controller.js";
import { authenticate, optionalAuth } from "../../middlewares/auth.js";
import upload, { memoryUpload } from "../../middlewares/multer.js";

const router = Router();

router.post("/", optionalAuth(authenticate), upload.any(), uploadController.uploadFile);
router.put("/", optionalAuth(authenticate), upload.any(), uploadController.uploadFile);

// KYC / Identity Document optimization endpoint
router.post(
    "/kyc",
    optionalAuth(authenticate),
    memoryUpload.single("file"),
    uploadController.uploadKycDocument
);
router.post(
    "/document",
    optionalAuth(authenticate),
    memoryUpload.single("file"),
    uploadController.uploadKycDocument
);

// Multi-variant WebP Product Image optimization endpoint
router.post(
    "/image",
    optionalAuth(authenticate),
    memoryUpload.single("file"),
    uploadController.uploadProductImage
);
router.post(
    "/product-image",
    optionalAuth(authenticate),
    memoryUpload.single("file"),
    uploadController.uploadProductImage
);

router.delete("/:id", optionalAuth(authenticate), uploadController.deleteFile);

router.get("/:id", optionalAuth(authenticate), uploadController.getFile);

export default router;
