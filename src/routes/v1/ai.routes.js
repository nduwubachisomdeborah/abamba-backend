import { Router } from "express";
import AIController from "../../controllers/ai.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.js";

const router = Router();

// All AI generation routes require a valid seller session
router.use(authenticate);
router.use(restrictTo("seller"));

/**
 * POST /api/v1/ai/generate-name
 * Generate a product name from one or more product images.
 *
 * Body:
 *   imageUrls   string[]  required  Publicly-accessible image URLs
 *   category    string    optional  Category hint for the AI
 *   brand       string    optional  Brand hint for the AI
 *   model       string    optional  OpenRouter model override
 */
router.post("/generate-name", AIController.generateProductName);

/**
 * POST /api/v1/ai/generate-description
 * Generate a product description from the product name and images.
 *
 * Body:
 *   productName    string    required  Product name to base the description on
 *   imageUrls      string[]  required  Publicly-accessible image URLs
 *   category       string    optional  Category hint for the AI
 *   brand          string    optional  Brand hint for the AI
 *   targetAudience string    optional  Target audience hint
 *   model          string    optional  OpenRouter model override
 */
router.post("/generate-description", AIController.generateProductDescription);

export default router;
