import { Router } from "express";
import uploadController from "../../controllers/upload.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import upload from "../../middlewares/multer.js";

const router = Router();

router.put("/", authenticate, upload.any(), uploadController.uploadFile);

router.delete("/:id", authenticate, uploadController.deleteFile);

router.get("/:id", authenticate, uploadController.getFile);

export default router;
