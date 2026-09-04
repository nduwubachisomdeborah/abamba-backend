import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";

class UserService {
    /**
     * Get all users
     * @returns {Promise<Array>} Array of users
     */
    async getUsers() {
        return await User.find().select("-password");
    }

    /**
     * Get user by ID
     * @param {string} id - User ID
     * @returns {Promise<Object>} User object
     */
    async getUserById(id) {
        const user = await User.findById(id)
            .select("+business +bank")
            .populate({
                path: "business",
                populate: [
                    { path: "personalDocument", model: "File" },
                    { path: "businessDocument", model: "File" },
                ],
            });
        if (!user) {
            throw new AppError("User not found", 404);
        }
        return user;
    }

    /**
     * Create new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} New user object
     */
    async createUser(userData) {
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new AppError("User with this email already exists", 400);
        }

        const user = new User(userData);
        await user.save();

        // Remove password from response
        const userObject = user.toObject();
        delete userObject.password;

        return userObject;
    }

    /**
     * Update user by ID
     * @param {string} id - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated user object
     */
    async updateUser(id, updateData) {
        // Prevent password updates through this route
        if (updateData.password) {
            throw new AppError(
                "This route is not for password updates. Please use /updatePassword",
                400,
            );
        }

        const user = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        return user;
    }

    /**
     * Disable a user account
     * @param {string} id - User ID
     * @param {string} disabledById - ID of admin/user who disabled the account
     * @param {string} reason - Reason for disabling the account
     * @returns {Promise<Object>} Disabled user object
     */
    async disableAccount(id, disabledById, reason) {
        const user = await User.findById(id);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Set active to false
        user.active = false;
        user.disabledAt = new Date();

        // Store the ID of who disabled the account and the reason
        if (disabledById) {
            user.disabledBy = disabledById;
        }

        if (reason) {
            user.disabledReason = reason;
        }

        await user.save();

        return user;
    }

    /**
     * Enable a user account
     * @param {string} id - User ID
     * @returns {Promise<Object>} Enabled user object
     */
    async enableAccount(id) {
        // Find user even if they're inactive by using a direct query
        const user = await User.findById(id).select("+active");

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Set active to true
        user.active = true;
        user.disabledAt = undefined;
        await user.save();

        return user;
    }

    /**
     * Get account status
     * @param {string} id - User ID
     * @returns {Promise<Object>} Account status information
     */
    async getAccountStatus(id) {
        // Find user even if they're inactive by using a direct query
        const user = await User.findById(id)
            .select("+active")
            .populate("disabledBy", "firstName lastName email role");

        if (!user) {
            throw new AppError("User not found", 404);
        }

        return {
            id: user._id,
            email: user.email,
            active: user.active || false,
            disabledAt: user.disabledAt,
            disabledBy: user.disabledBy,
            disabledReason: user.disabledReason,
        };
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User object with token
     */
    async loginUser(email, password) {
        // Find user by email
        const user = await User.findOne({ email }).select("+password");

        // Check if user exists and password is correct
        if (!user || !(await user.correctPassword(password))) {
            throw new AppError("Incorrect email or password", 401);
        }

        // Generate token
        const token = user.generateAuthToken();

        // Remove password from response
        const userObject = user.toObject();
        delete userObject.password;

        return { user: userObject, token };
    }

    /**
     * Update user password
     * @param {string} userId - ID of the user updating their password
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<boolean>} True if update succeeds
     */
    async updatePassword(userId, oldPassword, newPassword) {
        const user = await User.findOne({ _id: userId, deleted: false }).select(
            "+password googleId",
        );

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (!user.password) {
            throw new AppError(
                "This account was created with Google sign-in and does not have a password set. Please use the password reset flow to set one.",
                400,
            );
        }

        const isCorrectPassword = await user.correctPassword(oldPassword);

        if (!isCorrectPassword) {
            throw new AppError("Old password is incorrect", 400);
        }

        if (oldPassword === newPassword) {
            throw new AppError(
                "New password must be different from the old password",
                400,
            );
        }

        user.password = newPassword;
        await user.save();

        return true;
    }
}

export default new UserService();
