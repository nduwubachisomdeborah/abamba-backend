import productService from "../services/product.service.js";
import wishlistService from "../services/wishlist.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
    badResponse,
} from "../utils/response.util.js";

class ProductController {
    /**
     * @desc    Get all products with pagination and filtering
     * @route   GET /api/v1/products
     * @access  Public
     */
    static getProducts = asyncHandler(async (req, res) => {
        // Enhance query with user role and ID information for filtering approved/disabled products
        const enhancedQuery = {
            ...req.query,
            isAdmin: req.user?.role === "admin",
            userId: req.user?.id,
            sellerId: req.query.sellerId, // Add seller ID filtering
        };

        const { products, pagination } = await productService.getProducts(
            enhancedQuery
        );

        return successResponse(res, "Products retrieved successfully", {
            products,
            pagination,
        });
    });

    /**
     * @desc    Get product by ID
     * @route   GET /api/v1/products/:id
     * @access  Public
     */
    static getProductById = asyncHandler(async (req, res) => {
        // Check if rating stats should be included
        const includeRatingStats = req.query.includeRatingStats === "true";

        // Pass user role and ID information for access control
        const options = {
            isAdmin: req.user?.role === "admin",
            userId: req.user?.id,
        };

        const product = await productService.getProductById(
            req.params.id,
            includeRatingStats,
            options
        );

        // Check if product is in user's wishlist (only for authenticated users)
        let wishlistInfo = { isInWishlist: false, wishlist: null };
        if (req.user?.id) {
            wishlistInfo = await wishlistService.isProductInWishlist(
                req.user.id,
                req.params.id
            );
        }

        // Add wishlist information to the product response
        const productWithWishlistInfo = {
            ...product,
            wishlistInfo,
        };

        return successResponse(
            res,
            "Product retrieved successfully",
            productWithWishlistInfo
        );
    });

    /**
     * @desc    Get featured products
     * @route   GET /api/v1/products/featured
     * @access  Public
     */
    static getFeaturedProducts = asyncHandler(async (req, res) => {
        const limit = req.query.limit ? parseInt(req.query.limit) : 5;
        const includeRatingStats = req.query.includeRatingStats === "true";

        const products = await productService.getFeaturedProducts(
            limit,
            includeRatingStats
        );

        return successResponse(
            res,
            "Featured products retrieved successfully",
            products
        );
    });

    /**
     * @desc    Get product statistics
     * @route   GET /api/v1/products/stats
     * @access  Private (Admin)
     */
    static getProductStats = asyncHandler(async (req, res) => {
        const stats = await productService.getProductStats();

        return successResponse(
            res,
            "Product statistics retrieved successfully",
            stats
        );
    });
    /**
     * @desc    Get all variants for a product
     * @route   GET /api/v1/products/:productId/variants
     * @access  Public
     */
    static getProductVariants = asyncHandler(async (req, res) => {
        const variants = await productService.getProductVariants(
            req.params.productId
        );

        return successResponse(
            res,
            "Product variants retrieved successfully",
            variants
        );
    });

    /**
     * @desc    Get a specific variant by ID
     * @route   GET /api/v1/products/:productId/variants/:variantId
     * @access  Public
     */
    static getVariantById = asyncHandler(async (req, res) => {
        const variant = await productService.getVariantById(
            req.params.productId,
            req.params.variantId
        );

        return successResponse(
            res,
            "Product variant retrieved successfully",
            variant
        );
    });

    /**
     * @desc    Get unique brands and categories with optional filtering
     * @route   GET /api/v1/products/brands-categories
     * @access  Public
     * @query   {string} [category] - Filter brands by category
     * @query   {string} [search] - Search term to filter brands and categories
     * @query   {string} [sort] - Sort order (asc/desc)
     */
    static getBrandsAndCategories = asyncHandler(async (req, res) => {
        const { category, search, sort } = req.query;
        const filters = {};

        // Apply category filter if provided
        if (category) {
            filters.category = category;
        }

        // Apply search term if provided
        if (search) {
            filters.search = search;
        }

        // Apply sort order if provided
        if (sort) {
            filters.sort = sort;
        }

        const { brands, categories } =
            await productService.getBrandsAndCategories(filters);

        return successResponse(
            res,
            "Brands and categories retrieved successfully",
            {
                brands,
                categories,
            }
        );
    });

    /**
     * @desc    Get product viewed
     * @route   GET /api/v1/products/viewed
     * @access  Public
     */
    static getProductViewed = asyncHandler(async (req, res) => {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const userId = req.user?._id || req.user?.id;
        const productViewed = await productService.getProductViewed(
            userId,
            limit
        );

        return successResponse(
            res,
            "Product viewed retrieved successfully",
            productViewed
        );
    });

    /**
     * @desc    Add product viewed
     * @route   POST /api/v1/products/viewed/:productId
     * @access  Public
     */
    static addProductViewed = asyncHandler(async (req, res) => {
        const productId = req.params.productId;
        const userId = req.user?._id || req.user?.id;
        const productViewed = await productService.addProductViewed(
            userId,
            productId
        );

        return successResponse(
            res,
            "Product viewed added successfully",
            productViewed
        );
    });
}

export default ProductController;
