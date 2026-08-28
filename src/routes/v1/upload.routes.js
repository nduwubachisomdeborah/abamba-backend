import { Router } from "express";
import uploadController from "../../controllers/upload.controller.js";
import { authenticate, optionalAuth } from "../../middlewares/auth.js";
import upload from "../../middlewares/multer.js";

const router = Router();

router.post("/", optionalAuth(authenticate), upload.any(), uploadController.uploadFile);
router.put("/", optionalAuth(authenticate), upload.any(), uploadController.uploadFile);

router.delete("/:id", authenticate, uploadController.deleteFile);

router.get("/:id", authenticate, uploadController.getFile);

export default router;
