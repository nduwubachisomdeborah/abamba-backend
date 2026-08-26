import sellerProductService from "../services/seller.product.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
    badResponse,
} from "../utils/response.util.js";

class SellerProductController {
    /**
     * @desc    Get all products for the authenticated seller
     * @route   GET /api/v1/seller/products
     * @access  Private (Seller only)
     */
    static getSellerProducts = asyncHandler(async (req, res) => {
        const { products, pagination } =
            await sellerProductService.getSellerProducts(
                req.user.id,
                req.query
            );

        return successResponse(res, "Products retrieved successfully", {
            products,
            pagination,
        });
    });

    /**
     * @desc    Create new product
     * @route   POST /api/v1/seller/products
     * @access  Private (Seller only)
     */
    static createProduct = asyncHandler(async (req, res) => {
        const product = await sellerProductService.createProduct(
            req.body,
            req.user.id
        );

        return sendResponse(
            res,
            201,
            true,
            "Product created successfully",
            product
        );
    });

    /**
     * @desc    Get seller's product
     * @route   GET /api/v1/seller/products/:id
     * @access  Private (Seller only)
     */
    static getProduct = asyncHandler(async (req, res) => {
        const product = await sellerProductService.getProduct(
            req.params.id,
            req.user.id
        );

        return successResponse(res, "Product retrieved successfully", product);
    });

    /**
     * @desc    Update seller's product
     * @route   PUT /api/v1/seller/products/:id
     * @access  Private (Seller only)
     */
    static updateProduct = asyncHandler(async (req, res) => {
        const product = await sellerProductService.updateProduct(
            req.params.id,
            req.body,
            req.user.id
        );

        return successResponse(res, "Product updated successfully", product);
    });

    /**
     * @desc    Delete seller's product
     * @route   DELETE /api/v1/seller/products/:id
     * @access  Private (Seller only)
     */
    static deleteProduct = asyncHandler(async (req, res) => {
        await sellerProductService.deleteProduct(req.params.id, req.user.id);

        return successResponse(res, "Product deleted successfully", null);
    });

    /**
     * @desc    Set promotional pricing for product
     * @route   POST /api/v1/seller/products/:id/promotion
     * @access  Private (Seller only)
     */
    static setProductPromotion = asyncHandler(async (req, res) => {
        const product = await sellerProductService.setProductPromotion(
            req.params.id,
            req.body,
            req.user.id
        );

        return successResponse(
            res,
            "Product promotion set successfully",
            product
        );
    });

    /**
     * @desc    Remove promotional pricing from product
     * @route   DELETE /api/v1/seller/products/:id/promotion
     * @access  Private (Seller only)
     */
    static removeProductPromotion = asyncHandler(async (req, res) => {
        const product = await sellerProductService.removeProductPromotion(
            req.params.id,
            req.user.id
        );

        return successResponse(
            res,
            "Product promotion removed successfully",
            product
        );
    });

    /**
     * @desc    Add a new variant to a product
     * @route   POST /api/v1/seller/products/:productId/variants
     * @access  Private (Seller only)
     */
    static addVariant = asyncHandler(async (req, res) => {
        const { product, variant } = await sellerProductService.addVariant(
            req.params.productId,
            req.body,
            req.user.id
        );

        return sendResponse(
            res,
            201,
            true,
            "Product variant added successfully",
            {
                product,
                variant,
            }
        );
    });

    /**
     * @desc    Update a product variant
     * @route   PUT /api/v1/seller/products/:productId/variants/:variantId
     * @access  Private (Seller only)
     */
    static updateVariant = asyncHandler(async (req, res) => {
        const { product, variant } = await sellerProductService.updateVariant(
            req.params.productId,
            req.params.variantId,
            req.body,
            req.user.id
        );

        return successResponse(res, "Product variant updated successfully", {
            product,
            variant,
        });
    });

    /**
     * @desc    Delete a product variant
     * @route   DELETE /api/v1/seller/products/:productId/variants/:variantId
     * @access  Private (Seller only)
     */
    static deleteVariant = asyncHandler(async (req, res) => {
        const product = await sellerProductService.deleteVariant(
            req.params.productId,
            req.params.variantId,
            req.user.id
        );

        return successResponse(
            res,
            "Product variant deleted successfully",
            product
        );
    });

    /**
     * @desc    Set promotional pricing for variant
     * @route   POST /api/v1/seller/products/:productId/variants/:variantId/promotion
     * @access  Private (Seller only)
     */
    static setVariantPromotion = asyncHandler(async (req, res) => {
        const { product, variant } =
            await sellerProductService.setVariantPromotion(
                req.params.productId,
                req.params.variantId,
                req.body,
                req.user.id
            );

        return successResponse(res, "Variant promotion set successfully", {
            product,
            variant,
        });
    });

    /**
     * @desc    Remove promotional pricing from variant
     * @route   DELETE /api/v1/seller/products/:productId/variants/:variantId/promotion
     * @access  Private (Seller only)
     */
    static removeVariantPromotion = asyncHandler(async (req, res) => {
        const { product, variant } =
            await sellerProductService.removeVariantPromotion(
                req.params.productId,
                req.params.variantId,
                req.user.id
            );

        return successResponse(res, "Variant promotion removed successfully", {
            product,
            variant,
        });
    });

    /**
     * @desc    Get seller product statistics
     * @route   GET /api/v1/seller/products/stats
     * @access  Private (Seller only)
     */
    static getSellerProductStats = asyncHandler(async (req, res) => {
        const stats = await sellerProductService.getSellerProductStats(
            req.user.id
        );

        return successResponse(
            res,
            "Product statistics retrieved successfully",
            stats
        );
    });
}

export default SellerProductController;
