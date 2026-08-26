import express from "express";
import StoreLocationController from "../../controllers/storeLocation.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.js";

const router = express.Router();

// Protected routes - require authentication for CRUD operations
router.use(authenticate);

// Public routes - no authentication required for fetching store locations
router.get("/", StoreLocationController.getEnabledStoreLocations);
router.get(
    "/address/:addressCode",
    StoreLocationController.getStoreLocationByAddressCode
);
router.get("/:id", StoreLocationController.getStoreLocationById);

router.post(
    "/",
    restrictTo("admin"),
    StoreLocationController.createStoreLocation
);
router.patch(
    "/:id",
    restrictTo("admin"),
    StoreLocationController.updateStoreLocation
);
router.delete(
    "/:id",
    restrictTo("admin"),
    StoreLocationController.deleteStoreLocation
);

export default router;
