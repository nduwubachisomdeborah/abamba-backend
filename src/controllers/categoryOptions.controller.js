import { asyncHandler } from "../middlewares/error.js";
import { successResponse, errorResponse } from "../utils/response.util.js";
import categoryOptionsService from "../services/categoryOptions.service.js";

class CategoryOptionsController {
    /**
     * @desc    Get all category options
     * @route   GET /api/v1/products/category-options
     * @access  Public
     */
    static getAllCategoryOptions = asyncHandler(async (req, res) => {
        const categoryOptions =
            await categoryOptionsService.getAllCategoryOptions();

        return successResponse(
            res,
            "Category options retrieved successfully",
            categoryOptions
        );
    });

    /**
     * @desc    Get options for a specific category
     * @route   GET /api/v1/products/category-options/:category
     * @access  Public
     */
    static getCategoryOptionsByCategory = asyncHandler(async (req, res) => {
        const { category } = req.params;
        const categoryOptions =
            await categoryOptionsService.getCategoryOptionsByCategory(category);

        return successResponse(
            res,
            `Options for ${category} retrieved successfully`,
            categoryOptions
        );
    });

    /**
     * @desc    Update options for a specific category (admin only)
     * @route   PUT /api/v1/products/category-options/:category
     * @access  Private (Admin)
     */
    static updateCategoryOptions = asyncHandler(async (req, res) => {
        const { category } = req.params;
        const { options } = req.body;

        if (!options || !Array.isArray(options)) {
            return errorResponse(
                res,
                "Options must be provided as an array",
                400
            );
        }

        const updatedOptions =
            await categoryOptionsService.updateCategoryOptions(
                category,
                options
            );

        return successResponse(
            res,
            `Options for ${category} updated successfully`,
            updatedOptions
        );
    });
}

export default CategoryOptionsController;
