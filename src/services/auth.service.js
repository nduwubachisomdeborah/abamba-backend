import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";
import { generateOTP, getOTPExpiry, verifyOTP } from "../utils/otp.util.js";
import jwt from "jsonwebtoken";
import admin from "../config/firebase.js";
import emailService from "./email.service.js";
import { OTP_SENT, PASSWORD_RESET_REQUEST } from "../config/strings.js";

class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} User object with OTP and token
     */
    async signup(userData, role = "user") {
        // Check if user with this email already exists
        const existingUser = await User.findOne({
            email: userData.email,
            role,
        });

        if (existingUser) {
            throw new AppError("User with this email already exists", 400);
        }

        // Check if user with this phone number already exists (only if phoneNumber is provided)
        if (userData.phoneNumber) {
            const existingPhone = await User.findOne({
                phoneNumber: userData.phoneNumber,
                role,
            });

            if (existingPhone) {
                throw new AppError(
                    "User with this phone number already exists",
                    400
                );
            }
        }

        // Generate OTP for verification
        const otpCode = generateOTP();
        const otpExpiry = getOTPExpiry();

        // Create user with OTP
        const user = new User({
            ...userData,
            otp: {
                code: otpCode,
                expiresAt: otpExpiry,
                verified: false,
            },
            role,
        });

        await user.save();

        // Send OTP verification email
        try {
            await emailService.sendEmail(
                userData.email,
                "Verify Your Account",
                "otp-verification",
                {
                    name: userData.name,
                    otpCode,
                    purpose: "account verification",
                    expiryTime: 10, // OTP expires in 10 minutes
                }
            );
        } catch (error) {
            console.error("Failed to send OTP email:", error);
            // Continue despite email failure - we'll still return the OTP for testing
        }

        // Return user (without password) and OTP code
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.otp.code;

        return {
            user: userObject,
            message: OTP_SENT,
        };
    }

    /**
     * Login user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User object with OTP and token
     */
    async login(email, password, role = "user") {
        // Find user by email with OTP fields
        const user = await User.findOne({ email, role }).select(
            "+password +otp.code +otp.expiresAt"
        );

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Check if user exists and password is correct
        if (!user || !(await user.correctPassword(password))) {
            throw new AppError("Incorrect email or password", 401);
        }

        if (user.suspended) {
            throw new AppError(
                "User is suspended, please contact support",
                401
            );
        }

        // Generate new OTP for verification
        const otpCode = generateOTP();
        const otpExpiry = getOTPExpiry();

        // Update user OTP
        user.otp.code = otpCode;
        user.otp.expiresAt = otpExpiry;
        user.otp.verified = false;

        user.lastLoginAt = new Date();

        await user.save();

        // Send OTP email
        try {
            await emailService.sendEmail(
                email,
                "New Verification Code",
                "otp-verification",
                {
                    name: user.name,
                    otpCode,
                    purpose: "account verification",
                    expiryTime: 10, // OTP expires in 10 minutes
                }
            );
        } catch (error) {
            console.error("Failed to send OTP email:", error);
            // Continue despite email failure
        }

        // Remove sensitive information
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.otp.code;

        return {
            message: OTP_SENT,
        };
    }

    /**
     * Verify OTP code
     * @param {string} email - User email
     * @param {string} otpCode - OTP code entered by user
     * @returns {Promise<Object>} User object with token
     */
    async verifyOTP(email, otpCode, role = "user") {
        // Find user by email with OTP fields
        const user = await User.findOne({ email, role }).select(
            "+otp.code +otp.expiresAt +business"
        );

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.otp.code === null || user.otp.expiresAt === null) {
            throw new AppError("Request a new OTP", 400);
        }

        // Check if user has exceeded maximum attempts (5)
        if (user.otp.attempts >= 5) {
            // Reset OTP and throw error
            user.otp.code = null;
            user.otp.expiresAt = null;
            user.otp.attempts = 0;
            await user.save();
            throw new AppError(
                "Maximum OTP verification attempts exceeded. Please request a new OTP.",
                400
            );
        }

        // Increment attempt counter
        user.otp.attempts += 1;

        // Check if OTP is valid
        if (!verifyOTP(otpCode, user.otp.code, user.otp.expiresAt)) {
            // Save the incremented attempt counter
            await user.save();
            // Throw error with remaining attempts info
            const remainingAttempts = 5 - user.otp.attempts;
            throw new AppError(
                `Invalid or expired OTP. ${remainingAttempts} attempts remaining.`,
                400
            );
        }

        // OTP is valid - reset counter and mark as verified
        user.otp.verified = true;
        user.otp.attempts = 0;

        await user.save();

        // Generate JWT token after successful verification
        const token = user.generateAuthToken();

        // Return user without sensitive information
        const userObject = user.toObject();
        delete userObject.otp.code;

        return {
            user: userObject,
            token,
        };
    }

    /**
     * Resend OTP to user
     * @param {string} email - User email address
     * @param {string} [role="user"] - User role
     * @returns {Promise<Object>} New OTP code
     */
    async resendOTP(email, role = "user") {
        // Find user by email
        const user = await User.findOne({ email, role });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Generate new OTP
        const otpCode = generateOTP();
        const otpExpiry = getOTPExpiry();

        // Update user OTP
        user.otp.code = otpCode;
        user.otp.expiresAt = otpExpiry;
        user.otp.verified = false;

        await user.save();

        // Generate a temporary session token
        const sessionToken = this.generateSessionToken(user.id);

        // Send OTP email
        try {
            await emailService.sendEmail(
                email,
                "New Verification Code",
                "otp-verification",
                {
                    name: user.name,
                    otpCode,
                    purpose: "account verification",
                    expiryTime: 10, // OTP expires in 10 minutes
                }
            );
        } catch (error) {
            console.error("Failed to send OTP email:", error);
            // Continue despite email failure
        }

        return {
            message: OTP_SENT,
        };
    }

    /**
     * Generate a temporary session token for OTP verification
     * This token has a shorter expiry and is only valid for OTP verification
     * @param {string} userId - User ID
     * @returns {string} Session token
     */
    generateSessionToken(userId) {
        return jwt.sign(
            { id: userId, scope: "otp-verification" },
            process.env.JWT_SECRET,
            { expiresIn: "15m" } // Short expiry for security
        );
    }

    /**
     * Request password reset by sending OTP
     * @param {string} email - User email address
     * @returns {Promise<Object>} Message and OTP for testing
     */
    async forgotPassword(email, role) {
        // Find user by email
        const query = { email };
        if (role) {
            query.role = role;
        }
        const user = await User.findOne(query);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Generate new OTP for password reset
        const otpCode = generateOTP();
        const otpExpiry = getOTPExpiry();

        // Update user OTP and reset attempts counter
        user.otp.code = otpCode;
        user.otp.expiresAt = otpExpiry;
        user.otp.verified = false;
        user.otp.attempts = 0;

        await user.save();

        // Send password reset email with OTP
        try {
            await emailService.sendEmail(
                email,
                "Password Reset Request",
                "password-reset",
                {
                    name: user.name,
                    otpCode,
                    expiryTime: 10, // OTP expires in 10 minutes
                }
            );
        } catch (error) {
            console.error("Failed to send password reset email:", error);
            // Continue despite email failure
        }

        return {
            message: PASSWORD_RESET_REQUEST,
        };
    }

    /**
     * Reset password using email, OTP, and new password
     * @param {string} email - User email address
     * @param {string} otpCode - OTP code entered by user
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} User object with token
     */
    async resetPassword(email, otpCode, newPassword, role) {
        // Find user by email with OTP fields
        const query = { email };
        if (role) {
            query.role = role;
        }
        const user = await User.findOne(query).select(
            "+otp.code +otp.expiresAt +password"
        );

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Check if user has exceeded maximum attempts (5)
        if (user.otp.attempts >= 5) {
            // Reset OTP and throw error
            user.otp.code = null;
            user.otp.expiresAt = null;
            user.otp.attempts = 0;
            await user.save();
            throw new AppError(
                "Maximum OTP verification attempts exceeded. Please request a new password reset.",
                400
            );
        }

        // Increment attempt counter
        user.otp.attempts += 1;

        // Check if OTP is valid
        if (!verifyOTP(otpCode, user.otp.code, user.otp.expiresAt)) {
            // Save the incremented attempt counter
            await user.save();
            // Throw error with remaining attempts info
            const remainingAttempts = 5 - user.otp.attempts;
            throw new AppError(
                `Invalid or expired OTP. ${remainingAttempts} attempts remaining.`,
                400
            );
        }

        // OTP is valid - update password and reset counter
        user.password = newPassword;
        user.otp.verified = true;
        user.otp.attempts = 0;
        user.passwordChangedAt = Date.now();

        await user.save();

        // Generate JWT token after successful password reset
        const token = user.generateAuthToken();

        // Return user without sensitive information
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.otp.code;

        return {
            user: userObject,
            token,
        };
    }

    /**
     * Sign in or register user with Google
     * @param {string} idToken - Google ID token from Firebase Auth
     * @returns {Promise<Object>} User object with JWT token
     */
    async googleSignIn(idToken) {
        try {
            // Verify the Google ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            // Extract user information from the token
            const { email, name, picture, uid: googleId } = decodedToken;

            if (!email) {
                throw new AppError(
                    "Google authentication failed: No email provided",
                    400
                );
            }

            // Check if user already exists
            let user = await User.findOne({ email });

            if (user) {
                // Update existing user's Google information if needed
                user.googleId = googleId || user.googleId;
                user.name = name || user.name;
                user.profilePicture = picture || user.profilePicture;
                // Mark as verified since Google already verified their email
                user.otp.verified = true;

                await user.save();
            } else {
                // Create a new user
                user = new User({
                    email,
                    name: name || email.split("@")[0], // Use part of email as name if not provided
                    googleId,
                    profilePicture: picture,
                    // No password for Google users
                    // Set a random phoneNumber placeholder if required by your schema
                    phoneNumber: `google_${Date.now().toString()}`,
                    otp: {
                        code: null,
                        expiresAt: null,
                        verified: true, // Google users are pre-verified
                    },
                });

                await user.save();
            }

            // Generate JWT token
            const token = user.generateAuthToken();

            // Return user (without sensitive info) and token
            const userObject = user.toObject();
            delete userObject.password;
            if (userObject.otp) delete userObject.otp.code;

            return {
                user: userObject,
                token,
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            console.error("Google sign-in error:", error);
            throw new AppError(
                `Google authentication failed: ${error.message}`,
                401
            );
        }
    }

    async claimGuest(id, name, email, phoneNumber, password, role = "user") {
        const existingUser = await User.findOne({
            email,
            role,
        });

        if (existingUser) {
            throw new AppError("User with this email already exists", 400);
        }

        // Check if user with this phone number already exists (only if phoneNumber is provided)
        if (phoneNumber) {
            const existingPhone = await User.findOne({
                phoneNumber,
                role,
            });

            if (existingPhone) {
                throw new AppError(
                    "User with this phone number already exists",
                    400
                );
            }
        }

        const user = await User.findOne({ _id: id, isGuest: true });

        if (!user) {
            throw new AppError("Guest user not found", 404);
        }

        // Generate OTP for verification
        const otpCode = generateOTP();
        const otpExpiry = getOTPExpiry();

        user.name = name;
        user.email = email;
        user.phoneNumber = phoneNumber;
        user.password = password;
        user.isGuest = false;

        user.otp.code = otpCode;
        user.otp.expiresAt = otpExpiry;
        user.otp.verified = false;

        await user.save();

        // Send OTP verification email
        try {
            await emailService.sendEmail(
                userData.email,
                "Verify Your Account",
                "otp-verification",
                {
                    name: userData.name,
                    otpCode,
                    purpose: "account verification",
                    expiryTime: 10, // OTP expires in 10 minutes
                }
            );
        } catch (error) {
            console.error("Failed to send OTP email:", error);
            // Continue despite email failure - we'll still return the OTP for testing
        }

        // Return user (without sensitive info) and token
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.otp.code;

        return {
            user: userObject,
            message: OTP_SENT,
        };
    }

    async guest() {
        const uniqueEmail = `guest-${Date.now()}@abamba.com`;
        const user = new User({
            name: "Guest",
            email: uniqueEmail,
            phoneNumber: "1234567890",
            password: "guest123",
            role: "user",
            isGuest: true,
        });

        await user.save();

        // Generate JWT token
        const token = user.generateAuthToken();

        // Return user (without sensitive info) and token
        const userObject = user.toObject();
        delete userObject.password;
        if (userObject.otp) delete userObject.otp.code;

        return {
            user: userObject,
            token,
        };
    }
}

export default new AuthService();
