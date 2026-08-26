import userService from "../services/user.service.js";
import transactionService from "../services/transaction.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
    badResponse,
} from "../utils/response.util.js";

class UserController {
    /**
     * @desc    Login user and send OTP
     * @route   POST /api/v1/auth/login
     * @access  Public
     */
    static login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const result = await userService.login(email, password);

        // In a real application, you would send the OTP via SMS or email
        // For demonstration, we're returning it in the response
        return successResponse(
            res,
            "Login successful. Please verify your OTP to get access token.",
            {
                user: result.user,
                sessionToken: result.sessionToken, // Temporary token for OTP verification
                // NOTE: In production, you would NOT send the OTP back in the response
                // It's included here for testing purposes only
                otp: result.otp,
            },
        );
    });
    /**
     * @desc    Get all users
     * @route   GET /api/v1/users
     * @access  Private/Admin
     */
    static getUsers = asyncHandler(async (req, res) => {
        const users = await userService.getUsers();
        return successResponse(res, "Users retrieved successfully", users);
    });

    /**
     * @desc    Get user by ID
     * @route   GET /api/v1/users/:id
     * @access  Private
     */
    static getUserById = asyncHandler(async (req, res) => {
        const user = await userService.getUserById(req.params.id);
        return successResponse(res, "User retrieved successfully", user);
    });

    /**
     * @desc    Create new user
     * @route   POST /api/v1/users
     * @access  Public
     */
    static createUser = asyncHandler(async (req, res) => {
        const user = await userService.createUser(req.body);
        return sendResponse(res, 201, true, "User created successfully", user);
    });

    /**
     * @desc    Update user
     * @route   PUT /api/v1/users/:id
     * @access  Private
     */
    static updateUser = asyncHandler(async (req, res) => {
        const user = await userService.updateUser(req.params.id, req.body);
        return successResponse(res, "User updated successfully", user);
    });

    /**
     * @desc    Disable user account
     * @route   PATCH /api/v1/users/:id/disable
     * @access  Private/Admin or Self
     */
    static disableAccount = asyncHandler(async (req, res) => {
        // Check if user is disabling their own account or if admin is disabling another account
        if (req.user.role !== "admin" && req.user.id !== req.params.id) {
            return errorResponse(
                res,
                "You are not authorized to disable this account",
                403,
            );
        }

        const { reason } = req.body;

        // Pass the ID of who disabled the account and the reason
        const user = await userService.disableAccount(
            req.params.id,
            req.user.id, // ID of the user/admin who performed the action
            reason, // Reason for disabling the account
        );

        return successResponse(res, "Account disabled successfully", user);
    });

    /**
     * @desc    Enable user account
     * @route   PATCH /api/v1/users/:id/enable
     * @access  Private/Admin
     */
    static enableAccount = asyncHandler(async (req, res) => {
        // Only admins can enable accounts
        if (req.user.role !== "admin") {
            return errorResponse(
                res,
                "Only administrators can enable accounts",
                403,
            );
        }

        const user = await userService.enableAccount(req.params.id);
        return successResponse(res, "Account enabled successfully", user);
    });

    /**
     * @desc    Get account status
     * @route   GET /api/v1/users/:id/status
     * @access  Private/Admin or Self
     */
    static getAccountStatus = asyncHandler(async (req, res) => {
        // Check if user is checking their own account or if admin is checking another account
        if (req.user.role !== "admin" && req.user.id !== req.params.id) {
            return errorResponse(
                res,
                "You are not authorized to view this account status",
                403,
            );
        }

        const status = await userService.getAccountStatus(req.params.id);
        return successResponse(
            res,
            "Account status retrieved successfully",
            status,
        );
    });

    /**
     * @desc    Update user password
     * @route   PATCH /api/v1/users/password
     * @access  Private
     */
    static updatePassword = asyncHandler(async (req, res) => {
        const { oldPassword, newPassword } = req.body;

        await userService.updatePassword(req.user.id, oldPassword, newPassword);

        return successResponse(res, "Password updated successfully");
    });

    /**
     * @desc    Login user
     * @route   POST /api/v1/users/login
     * @access  Public
     */
    static loginUser = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const { user, token } = await userService.loginUser(email, password);

        return successResponse(res, "Login successful", { user, token });
    });

    /**
     * @desc    Get user profile
     * @route   GET /api/v1/users/me
     * @access  Private
     */
    static getMe = asyncHandler(async (req, res) => {
        // req.user is set by the auth middleware
        const user = await userService.getUserById(req.user.id);

        return successResponse(
            res,
            "User profile retrieved successfully",
            user,
        );
    });

    /**
     * @desc    Get all transactions for current user
     * @route   GET /api/v1/users/transactions
     * @access  Private
     */
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

export default UserController;
