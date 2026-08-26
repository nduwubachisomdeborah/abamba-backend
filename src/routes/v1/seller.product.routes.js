import { Router } from "express";
import SellerProductController from "../../controllers/seller.product.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.js";
import {
    productSchema,
    variantSchema,
    promotionSchema,
} from "../../validators/seller.product.validator.js";
import validate from "../../middlewares/validate.js";

const router = Router();

// All routes require authentication and seller role
router.use(authenticate);
router.use(restrictTo("seller"));

// Product routes
router.get("/", SellerProductController.getSellerProducts);
router.post(
    "/",
    validate(productSchema),
    SellerProductController.createProduct
);
router.get("/:id", SellerProductController.getProduct);
router.put(
    "/:id",
    validate(productSchema),
    SellerProductController.updateProduct
);

router.delete("/:id", SellerProductController.deleteProduct);

// Product promotion routes
router.post(
    "/:id/promotion",
    validate(promotionSchema),
    SellerProductController.setProductPromotion
);

router.delete("/:id/promotion", SellerProductController.removeProductPromotion);

// Product variant routes
router.post(
    "/:productId/variants",
    validate(variantSchema),
    SellerProductController.addVariant
);
router.put(
    "/:productId/variants/:variantId",
    validate(variantSchema),
    SellerProductController.updateVariant
);
router.delete(
    "/:productId/variants/:variantId",
    SellerProductController.deleteVariant
);

// Variant promotion routes
router.post(
    "/:productId/variants/:variantId/promotion",
    validate(promotionSchema),
    SellerProductController.setVariantPromotion
);

router.delete(
    "/:productId/variants/:variantId/promotion",
    SellerProductController.removeVariantPromotion
);

// Product stats
router.get("/stats", SellerProductController.getSellerProductStats);

export default router;
