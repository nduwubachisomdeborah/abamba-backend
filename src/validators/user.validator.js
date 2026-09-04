import Joi from "joi";
import validate from "../middlewares/validate.js";

// Schema for creating a user
export const createUserSchema = Joi.object({
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
    role: Joi.string().valid("user", "seller").default("user").messages({
        "string.base": "Role must be a string",
        "any.only": "Role must be either user or seller",
    }),
});

// Schema for updating a user
export const updateUserSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).messages({
        "string.base": "Name must be a string",
        "string.min": "Name must be at least 2 characters long",
        "string.max": "Name must be less than 50 characters",
    }),
    email: Joi.string().email().messages({
        "string.base": "Email must be a string",
        "string.email": "Email must be valid",
    }),
    role: Joi.string().valid("user", "seller").messages({
        "string.base": "Role must be a string",
        "any.only": "Role must be either user or seller",
    }),
});

// Schema for user login
export const loginUserSchema = Joi.object({
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

// Schema for disabling an account
export const disableAccountSchema = Joi.object({
    reason: Joi.string().trim().max(500).messages({
        "string.base": "Reason must be a string",
        "string.max": "Reason must be less than 500 characters",
    }),
});

// Schema for updating user password
export const updatePasswordSchema = Joi.object({
    oldPassword: Joi.string().required().messages({
        "string.empty": "Old password is required",
        "any.required": "Old password is required",
    }),
    newPassword: Joi.string()
        .required()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base":
                "Password must include uppercase, lowercase, number, and special character",
            "any.required": "New password is required",
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref("newPassword"))
        .required()
        .messages({
            "any.only": "Passwords do not match",
            "any.required": "Confirm password is required",
        }),
});

// Schema for payout request
export const payoutRequestSchema = Joi.object({
    amount: Joi.number().required().min(1).messages({
        "number.base": "Amount must be a number",
        "number.min": "Amount must be at least 1",
        "any.required": "Amount is required",
    }),
    description: Joi.string().trim().optional().allow(""),
    note: Joi.string().trim().optional().allow(""),
    notes: Joi.string().trim().optional().allow(""),
    narration: Joi.string().trim().optional().allow(""),
}).unknown(true);

// Export schemas directly to use with validate middleware in routes
// Example usage: router.post('/users', validate(createUserSchema), UserController.createUser);
