import sellerSubscriptionService from "../services/sellerSubscription.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse, sendResponse } from "../utils/response.util.js";

class SellerSubscriptionController {
    /**
     * @desc    Accept Merchant Agreement
     * @route   POST /api/v1/sellers/agreement/accept
     * @access  Private (Seller)
     */
    static acceptAgreement = asyncHandler(async (req, res) => {
        const result = await sellerSubscriptionService.acceptAgreement(
            req.user._id || req.user.id,
            req.body
        );

        return successResponse(res, "Merchant agreement accepted successfully", result);
    });

    /**
     * @desc    Verify Paystack payment for vendor subscription plan
     * @route   POST /api/v1/sellers/subscription/verify
     * @access  Private (Seller)
     */
    static verifySubscription = asyncHandler(async (req, res) => {
        const result = await sellerSubscriptionService.verifySubscription(
            req.user._id || req.user.id,
            req.body
        );

        return successResponse(
            res,
            "Vendor subscription verified and activated for 12 months",
            result
        );
    });

    /**
     * @desc    Create an Ad for Sales placement
     * @route   POST /api/v1/sellers/ads
     * @access  Private (Seller)
     */
    static createAd = asyncHandler(async (req, res) => {
        const ad = await sellerSubscriptionService.createAd(
            req.user._id || req.user.id,
            req.body
        );

        return sendResponse(res, 201, true, "Ad submitted for admin review successfully", ad);
    });

    /**
     * @desc    Get current seller's submitted ads
     * @route   GET /api/v1/sellers/ads/my-ads
     * @access  Private (Seller)
     */
    static getMyAds = asyncHandler(async (req, res) => {
        const ads = await sellerSubscriptionService.getSellerAds(
            req.user._id || req.user.id
        );

        return successResponse(res, "Ads retrieved successfully", ads);
    });

    /**
     * @desc    Get all ads for review (Super Admin)
     * @route   GET /api/v1/admin/ads
     * @access  Private (Admin / Super Admin)
     */
    static getAllAds = asyncHandler(async (req, res) => {
        const ads = await sellerSubscriptionService.getAllAds(req.query.status);
        return successResponse(res, "Ads retrieved successfully", ads);
    });

    /**
     * @desc    Approve or reject banner ad (Super Admin)
     * @route   PATCH /api/v1/admin/ads/:id/status
     * @access  Private (Admin / Super Admin)
     */
    static updateAdStatus = asyncHandler(async (req, res) => {
        const ad = await sellerSubscriptionService.updateAdStatus(
            req.params.id,
            req.user._id || req.user.id,
            req.body
        );

        return successResponse(
            res,
            `Ad ${req.body?.status === "approved" ? "approved and activated" : "rejected"} successfully`,
            ad
        );
    });

    /**
     * @desc    Get live homepage banner ads with rotation pool (Public)
     * @route   GET /api/v1/ads/live-banner
     * @access  Public
     */
    static getLiveBanner = asyncHandler(async (req, res) => {
        const result = await sellerSubscriptionService.getLiveBanner();
        return res.status(200).json({
            success: true,
            ...result,
        });
    });
}

export default SellerSubscriptionController;

