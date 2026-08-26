import Joi from "joi";
import { ObjectIdSchema } from "./index.js";

const addressSchema = Joi.object({
    addressLine1: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().optional().default("NG"),
});

const bankSchema = Joi.object({
    bankName: Joi.string().required(),
    accountNumber: Joi.number().required(),
    accountName: Joi.string().required(),
    bankCode: Joi.string().required(),
    // bvn: Joi.string().required(),
});

export const sellerUpdateBankSchema = Joi.object({
    bank: bankSchema.required(),
    otp: Joi.string().required().length(6),
});

export const sellerOnBoardingSchema = Joi.object({
    // User details
    name: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    dob: Joi.string()
        .pattern(/^(0[1-9]|1[0-9]|2[0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/)
        .message("Invalid date format eg 01/01/2000")
        .required(),
    // Address details
    address: addressSchema.required(),

    // Bank details
    bank: bankSchema.required(),

    // Onboarding details
    businessName: Joi.string().required(),
    businessType: Joi.string().required(),
    businessAddress: addressSchema.required(),
    businessPhone: Joi.string().required(),
    businessEmail: Joi.string().email().required(),
    documentType: Joi.string()
        .valid("nin", "nationalId", "driverLicense", "other")
        .optional(),
    personalDocument: ObjectIdSchema.optional(),
    businessDocument: ObjectIdSchema.optional(),
    storeLocation: ObjectIdSchema.required(),
});

export const sellerSignUpSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    password: Joi.string().required(),
    dob: Joi.string()
        .pattern(/^(0[1-9]|1[0-9]|2[0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/)
        .message("Invalid date format eg 01/01/2000")
        .required(),
});

export const sellerUpdateProfilePictureSchema = Joi.object({
    profilePicture: Joi.string().uri().required(),
});

export const sellerUpdatePasswordSchema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
        .required()
        .min(8)
        .pattern(
            new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"),
        )
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base":
                "Password must include uppercase, lowercase, number, and special character",
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref("newPassword"))
        .required()
        .messages({
            "any.only": "Passwords do not match",
        }),
});

export const sellerUpdateNotificationSettingsSchema = Joi.object({
    orderConfirmation: Joi.boolean(),
    orderStatusChange: Joi.boolean(),
    orderDelivered: Joi.boolean(),
    emailNotification: Joi.boolean(),
})
    .min(1)
    .messages({
        "object.min": "Provide at least one notification preference to update",
    });
