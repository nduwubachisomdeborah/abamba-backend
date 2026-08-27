import Joi from "joi";
import validate from "../middlewares/validate.js";

// Schema for user signup
export const signupSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(50).messages({
        "string.base": "Name must be a string",
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters long",
        "string.max": "Name must be less than 50 characters",
        "any.required": "Name is required",
    }),
    email: Joi.string().required().email().messages({
        "string.base": "Email must be a string",
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
        "any.required": "Email is required",
    }),
    phoneNumber: Joi.string()
        .optional()
        .pattern(/^\+?[0-9]{10,15}$/)
        .messages({
            "string.base": "Phone number must be a string",
            "string.empty": "Phone number is required",
            "string.pattern.base":
                "Phone number must be valid (10-15 digits, can start with +)",
        }),
    password: Joi.string()
        .required()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .messages({
            "string.base": "Password must be a string",
            "string.empty": "Password is required",
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base":
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
            "any.required": "Password is required",
        }),
});

// Schema for user login
export const loginSchema = Joi.object({
    email: Joi.string().required().email().messages({
        "string.base": "Email must be a string",
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
        "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
        "string.base": "Password must be a string",
        "string.empty": "Password is required",
        "any.required": "Password is required",
    }),
});

// Schema for OTP verification
export const verifyOTPSchema = Joi.object({
    email: Joi.string().required().email().messages({
        "string.base": "Email must be a string",
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
        "any.required": "Email is required",
    }),
    otpCode: Joi.string()
        .required()
        .length(6)
        .pattern(/^[0-9]+$/)
        .messages({
            "string.base": "OTP must be a string",
            "string.empty": "OTP is required",
            "string.length": "OTP must be 6 digits",
            "string.pattern.base": "OTP must only contain numbers",
            "any.required": "OTP is required",
        }),
});

// Schema for forgot password request
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().required().email().messages({
        "string.base": "Email must be a string",
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
        "any.required": "Email is required",
    }),
});

// Schema for reset password with OTP
export const resetPasswordSchema = Joi.object({
    email: Joi.string().required().email().messages({
        "string.base": "Email must be a string",
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
        "any.required": "Email is required",
    }),
    otpCode: Joi.string()
        .required()
        .length(6)
        .pattern(/^[0-9]+$/)
        .messages({
            "string.base": "OTP must be a string",
            "string.empty": "OTP is required",
            "string.length": "OTP must be 6 digits",
            "string.pattern.base": "OTP must only contain numbers",
            "any.required": "OTP is required",
        }),
    newPassword: Joi.string()
        .required()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .messages({
            "string.base": "Password must be a string",
            "string.empty": "Password is required",
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base":
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
            "any.required": "Password is required",
        }),
    confirmPassword: Joi.string()
        .required()
        .valid(Joi.ref("newPassword"))
        .messages({
            "string.base": "Confirm password must be a string",
            "string.empty": "Confirm password is required",
            "any.only": "Passwords do not match",
            "any.required": "Confirm password is required",
        }),
});

// Export schemas directly to use with validate middleware in routes
// Example usage: router.post('/signup', validate(signupSchema), AuthController.signup);
