import aiService from "../services/ai.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse } from "../utils/response.util.js";

class AIController {
    /**
     * @desc    Generate a product name from product images using AI
     * @route   POST /api/v1/ai/generate-name
     * @access  Private (Seller only)
     *
     * @body {string[]} imageUrls          - Array of publicly-accessible product image URLs (required)
     * @body {string}   [category]         - Optional product category hint
     * @body {string}   [brand]            - Optional brand hint
     * @body {string}   [model]            - Optional OpenRouter model override
     */
    static generateProductName = asyncHandler(async (req, res) => {
        const { imageUrls, category, brand, model } = req.body;

        const result = await aiService.generateProductName(imageUrls, {
            category,
            brand,
            model,
        });

        return successResponse(
            res,
            "Product name generated successfully",
            result
        );
    });

    /**
     * @desc    Generate a product description from product name and images using AI
     * @route   POST /api/v1/ai/generate-description
     * @access  Private (Seller only)
     *
     * @body {string}   productName        - The product name (required)
     * @body {string[]} imageUrls          - Array of publicly-accessible product image URLs (required)
     * @body {string}   [category]         - Optional product category hint
     * @body {string}   [brand]            - Optional brand hint
     * @body {string}   [targetAudience]   - Optional target audience hint
     * @body {string}   [model]            - Optional OpenRouter model override
     */
    static generateProductDescription = asyncHandler(async (req, res) => {
        const { productName, imageUrls, category, brand, targetAudience, model } =
            req.body;

        const result = await aiService.generateProductDescription(
            productName,
            imageUrls,
            { category, brand, targetAudience, model }
        );

        return successResponse(
            res,
            "Product description generated successfully",
            result
        );
    });
}

export default AIController;
