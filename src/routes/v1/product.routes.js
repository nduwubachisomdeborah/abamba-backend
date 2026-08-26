import { Router } from "express";
import ProductController from "../../controllers/product.controller.js";
import ReviewController from "../../controllers/review.controller.js";
import CategoryOptionsController from "../../controllers/categoryOptions.controller.js";
import {
    validateCreateProduct,
    validateUpdateProduct,
    validateVariant,
    validateVariantStock,
} from "../../validators/product.validator.js";
import { validateCreateReview } from "../../validators/review.validator.js";
import { updateCategoryOptionsSchema } from "../../validators/categoryOptions.validator.js";
import {
    authenticate,
    restrictTo,
    optionalAuth,
} from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";

const router = Router();

// Product viewed routes (authenticated user can access)
router.get("/viewed", authenticate, ProductController.getProductViewed);
router.post(
    "/viewed/:productId",
    authenticate,
    ProductController.addProductViewed
);

// Public routes (some with optional authentication for enhanced features)
router.get("/brands-categories", ProductController.getBrandsAndCategories);
router.get(
    "/category-options",
    CategoryOptionsController.getAllCategoryOptions
);
router.get(
    "/category-options/:category",
    CategoryOptionsController.getCategoryOptionsByCategory
);
router.get(
    "/featured",
    optionalAuth(authenticate),
    ProductController.getFeaturedProducts
);
router.get("/", optionalAuth(authenticate), ProductController.getProducts);
router.get(
    "/:id",
    optionalAuth(authenticate),
    ProductController.getProductById
);

// Public variant routes
router.get("/:productId/variants", ProductController.getProductVariants);
router.get("/:productId/variants/:variantId", ProductController.getVariantById);

// Public review routes
router.get("/:productId/reviews", ReviewController.getProductReviews);

// Admin only routes
router.get(
    "/stats",
    authenticate,
    restrictTo("admin"),
    ProductController.getProductStats
);

router.put(
    "/category-options/:category",
    authenticate,
    restrictTo("admin"),
    validate(updateCategoryOptionsSchema),
    CategoryOptionsController.updateCategoryOptions
);

export default router;
