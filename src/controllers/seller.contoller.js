import sellerService from "../services/seller.service.js";
import followerService from "../services/follower.service.js";
import transactionService from "../services/transaction.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
} from "../utils/response.util.js";
import authService from "../services/auth.service.js";
import paystackService from "../services/payments/paystack.service.js";

class SellerController {
    /**
     * @desc    Login user and send OTP
     * @route   POST /api/v1/auth/login
     * @access  Public
     */
    static loginSeller = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const result = await authService.login(email, password, "seller");

        return successResponse(
            res,
            "Login successful. Please verify your OTP.",
        );
    });

    /**
     * @desc    Sign up seller and send OTP
     * @route   POST /api/v1/auth/signup
     * @access  Public
     */

    static signUpSeller = asyncHandler(async (req, res) => {
        const result = await authService.signup(req.body, "seller");

        return successResponse(
            res,
            "Seller registration successful. Please verify your OTP.",
            result,
        );
    });

    /**
     * @desc    Forgot Password - Request password reset OTP
     * @route   POST /api/v1/seller/forgot-password
     * @access  Public
     */
    static forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;

        const result = await authService.forgotPassword(email, "seller");

        return successResponse(res, result.message, {
            otp: result.otp,
        });
    });

    /**
     * @desc    Reset Password with OTP
     * @route   POST /api/v1/seller/reset-password
     * @access  Public
     */
    static resetPassword = asyncHandler(async (req, res) => {
        const { email, otpCode, newPassword } = req.body;

        const result = await authService.resetPassword(
            email,
            otpCode,
            newPassword,
            "seller",
        );

        return successResponse(res, "Password reset successful", {
            user: result.user,
            token: result.token,
        });
    });

    /**
     * @desc    Verify OTP
     * @route   POST /api/v1/auth/verify-otp
     * @access  Public
     */
    static verifyOTP = asyncHandler(async (req, res) => {
        const { email, otpCode } = req.body;

        const result = await authService.verifyOTP(email, otpCode, "seller");

        return successResponse(res, "OTP verification successful.", result);
    });

    /**
     * @desc    Resend OTP
     * @route   POST /api/v1/auth/resend-otp
     * @access  Public
     */
    static resendOTP = asyncHandler(async (req, res) => {
        const { email } = req.body;

        const result = await authService.resendOTP(email, "seller");

        return successResponse(res, "OTP sent successfully.", result);
    });

    /**
     * @desc    Get all sellers
     * @route   GET /api/v1/sellers
     * @access  Private/Seller
     */
    static onBoarding = asyncHandler(async (req, res) => {
        await sellerService.onBoarding(req.user._id, req.body);

        return successResponse(res, "Seller onboarding successful.");
    });

    /**
     * @desc    Get current seller profile
     * @route   GET /api/v1/sellers/me
     * @access  Private
     */
    static getMe = asyncHandler(async (req, res) => {
        // req.user is set by the auth middleware
        const user = await sellerService.getUserById(req.user.id);

        return successResponse(
            res,
            "User profile retrieved successfully",
            user,
        );
    });

    /**
     * @desc    Get banks
     * @route   GET /api/v1/sellers/bank/list
     * @access  Private
     */
    static getBanks = asyncHandler(async (req, res) => {
        const result = await paystackService.getBankList();
        const banks = result?.data || result || [];

        return successResponse(res, "Banks retrieved successfully", banks);
    });

    /**
     * @desc    Resolve bank account details
     * @route   GET /api/v1/sellers/bank/resolve
     * @access  Private
     */
    static resolveBankAccount = asyncHandler(async (req, res) => {
        const { accountNumber, bankCode } = req.query;

        const result = await paystackService.resolveAccountNumber({
            accountNumber,
            bankCode,
        });

        return successResponse(
            res,
            "Account details resolved successfully",
            result,
        );
    });

    /**
     * @desc    Update seller bank details with OTP
     * @route   PATCH /api/v1/sellers/bank
     * @access  Private
     */
    static updateBank = asyncHandler(async (req, res) => {
        const { bank, otp } = req.body;

        const result = await sellerService.updateBank(req.user.id, bank, otp);

        return successResponse(
            res,
            "Bank details updated successfully",
            result,
        );
    });

    /**
     * @desc    Get seller statistics and dashboard data
     * @route   GET /api/v1/sellers/stats
     * @access  Private/Seller
     */
    static getSellerStats = asyncHandler(async (req, res) => {
        const stats = await sellerService.getSellerStats(req.user._id);

        return successResponse(
            res,
            "Seller statistics retrieved successfully",
            stats,
        );
    });

    static getSeller = asyncHandler(async (req, res) => {
        const seller = await sellerService.getUserById(req.user._id);

        return successResponse(res, "Seller retrieved successfully", seller);
    });

    static updateProfilePicture = asyncHandler(async (req, res) => {
        const { profilePicture } = req.body;

        const result = await sellerService.updateProfilePicture(
            req.user.id,
            profilePicture,
        );

        return successResponse(
            res,
            "Seller profile picture updated successfully",
            result,
        );
    });

    static updatePassword = asyncHandler(async (req, res) => {
        const { oldPassword, newPassword } = req.body;

        await sellerService.updatePassword(
            req.user.id,
            oldPassword,
            newPassword,
        );

        return successResponse(res, "Password updated successfully");
    });

    static updateNotificationSettings = asyncHandler(async (req, res) => {
        const notificationSettings =
            await sellerService.updateNotificationSettings(
                req.user.id,
                req.body,
            );

        return successResponse(
            res,
            "Notification preferences updated successfully",
            notificationSettings,
        );
    });

    static getSellerById = asyncHandler(async (req, res) => {
        const seller = await sellerService.getUserById(req.params.sellerId);
        const storeStats = await sellerService.getStoreStats(
            req.params.sellerId,
        );

        // Get follow status and follower count (only for authenticated users)
        let followInfo = { isFollowing: false, followDetails: null };
        let followerCount = 0;

        // console.log(req.user);

        if (req.user?.id) {
            followInfo = await followerService.isFollowing(
                req.user.id,
                req.params.sellerId,
            );
        }

        followerCount = await followerService.getFollowerCount(
            req.params.sellerId,
        );

        const filteredSeller = {
            name: seller?.name,
            profilePicture: seller?.profilePicture,
            followerCount,
            followInfo,
            storeStats: {
                totalSales: storeStats.totalSales,
                totalOrders: storeStats.totalOrders,
                totalCustomers: storeStats.totalCustomers,
                totalProducts: storeStats.totalProducts,
                averageRating: storeStats.averageRating,
                totalReviews: storeStats.totalReviews,
                reviewPercentage: storeStats.reviewPercentage,
                conversionRate: storeStats.conversionRate,
                repeatCustomerRate: storeStats.repeatCustomerRate,
                totalViews: storeStats.totalViews,
                uniqueViewers: storeStats.uniqueViewers,
                averageOrderValue: storeStats.averageOrderValue,
                topRatedProducts: storeStats.topRatedProducts,
            },
        };

        return successResponse(
            res,
            "Seller retrieved successfully",
            filteredSeller,
        );
    });

    /**
     * @desc    Follow a seller
     * @route   POST /api/v1/seller/:sellerId/follow
     * @access  Private
     */
    static followSeller = asyncHandler(async (req, res) => {
        const follow = await followerService.followSeller(
            req.user.id,
            req.params.sellerId,
        );

        return successResponse(res, "Successfully followed seller", {
            follow,
            message: "You are now following this seller",
        });
    });

    /**
     * @desc    Unfollow a seller
     * @route   DELETE /api/v1/seller/:sellerId/follow
     * @access  Private
     */
    static unfollowSeller = asyncHandler(async (req, res) => {
        await followerService.unfollowSeller(req.user.id, req.params.sellerId);

        return successResponse(res, "Successfully unfollowed seller", {
            message: "You are no longer following this seller",
        });
    });

    /**
     * @desc    Get followers of a seller
     * @route   GET /api/v1/seller/:sellerId/followers
     * @access  Public
     */
    static getSellerFollowers = asyncHandler(async (req, res) => {
        const { page, limit } = req.query;
        const result = await followerService.getFollowers(req.params.sellerId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });

        return successResponse(
            res,
            "Seller followers retrieved successfully",
            result,
        );
    });

    /**
     * @desc    Get sellers that current user is following
     * @route   GET /api/v1/seller/following
     * @access  Private
     */
    static getFollowing = asyncHandler(async (req, res) => {
        const { page, limit } = req.query;
        const result = await followerService.getFollowing(req.user.id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });

        return successResponse(
            res,
            "Following list retrieved successfully",
            result,
        );
    });

    // Payout management methods
    static requestPayout = asyncHandler(async (req, res) => {
        const transaction = await transactionService.createPayout(
            req.user.id,
            req.body,
        );

        return successResponse(
            res,
            "Payout request submitted successfully",
            transaction,
        );
    });

    static getAllPayouts = asyncHandler(async (req, res) => {
        const payouts = await transactionService.getUserTransactions(
            req.user.id,
            {
                type: "payout",
            },
        );

        return successResponse(
            res,
            "All payouts retrieved successfully",
            payouts,
        );
    });

    static getUserTransactions = asyncHandler(async (req, res) => {
        const { type, status } = req.query;
        const filters = {};
        if (type) filters.type = type;
        if (status) filters.status = status;

        const transactions = await transactionService.getUserTransactions(
            req.user.id,
            filters,
        );

        return successResponse(
            res,
            "Transactions retrieved successfully",
            transactions,
        );
    });
}

export default SellerController;
