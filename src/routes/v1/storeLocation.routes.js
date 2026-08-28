import express from "express";
import StoreLocationController from "../../controllers/storeLocation.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.js";

const router = express.Router();

// Public routes - no authentication required for fetching store locations
router.get("/", StoreLocationController.getEnabledStoreLocations);
router.get(
    "/address/:addressCode",
    StoreLocationController.getStoreLocationByAddressCode
);
router.get("/:id", StoreLocationController.getStoreLocationById);

// Protected routes - require authentication and admin role for CRUD operations
router.use(authenticate);

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
