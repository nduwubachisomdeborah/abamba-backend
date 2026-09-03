import Joi from "joi";
import validate from "../middlewares/validate.js";
import { ObjectIdSchema } from "./index.js";

// Schema for address (used for both shipping and billing)
const addressSchema = Joi.object({
    fullName: Joi.string().required().trim().max(100).messages({
        "string.base": "Full name must be a string",
        "string.empty": "Full name is required",
        "string.max": "Full name cannot exceed 100 characters",
        "any.required": "Full name is required",
    }),
    addressLine1: Joi.string().required().trim().max(100).messages({
        "string.base": "Address line 1 must be a string",
        "string.empty": "Address line 1 is required",
        "string.max": "Address line 1 cannot exceed 100 characters",
        "any.required": "Address line 1 is required",
    }),
    addressLine2: Joi.string().allow("").trim().max(100).messages({
        "string.base": "Address line 2 must be a string",
        "string.max": "Address line 2 cannot exceed 100 characters",
    }),
    city: Joi.string().required().trim().max(50).messages({
        "string.base": "City must be a string",
        "string.empty": "City is required",
        "string.max": "City cannot exceed 50 characters",
        "any.required": "City is required",
    }),
    state: Joi.string().required().trim().max(50).messages({
        "string.base": "State must be a string",
        "string.empty": "State is required",
        "string.max": "State cannot exceed 50 characters",
        "any.required": "State is required",
    }),
    zipCode: Joi.string().required().trim().max(20).messages({
        "string.base": "Zip code must be a string",
        "string.empty": "Zip code is required",
        "string.max": "Zip code cannot exceed 20 characters",
        "any.required": "Zip code is required",
    }),
    country: Joi.string().required().trim().max(50).messages({
        "string.base": "Country must be a string",
        "string.empty": "Country is required",
        "string.max": "Country cannot exceed 50 characters",
        "any.required": "Country is required",
    }),
    phoneNumber: Joi.string().required().trim().max(20).messages({
        "string.base": "Phone number must be a string",
        "string.empty": "Phone number is required",
        "string.max": "Phone number cannot exceed 20 characters",
        "any.required": "Phone number is required",
    }),
});

// Schema for payment details
const paymentDetailsSchema = Joi.object({}).pattern(
    Joi.string(), // Any key
    Joi.any() // Any value
);

// Schema for creating an order
export const createOrderSchema = Joi.object({
    shippingAddress: Joi.alternatives()
        .try(ObjectIdSchema, addressSchema, Joi.object().unknown(true), Joi.string())
        .optional()
        .messages({
            "any.required": "Shipping address is required",
        }),
    addressId: Joi.string().allow("", null).optional(),
    paymentMethod: Joi.string()
        .allow("", null)
        .default("bank_transfer")
        .optional(),
    method: Joi.string()
        .allow("", null)
        .default("bank_transfer")
        .optional(),
    provider: Joi.string()
        .allow("", null)
        .default("paystack")
        .optional(),
    items: Joi.array().items(Joi.object().unknown(true)).optional(),
    paymentDetails: paymentDetailsSchema.optional(),
    notes: Joi.string().allow("").default("").max(500).optional().messages({
        "string.base": "Notes must be a string",
        "string.max": "Notes cannot exceed 500 characters",
    }),
    callbackUrl: Joi.string().uri().trim().max(500).optional().messages({
        "string.base": "Callback URL must be a string",
        "string.uri": "Callback URL must be a valid URL",
        "string.max": "Callback URL cannot exceed 500 characters",
    }),
    carrierId: Joi.string().allow("", null).optional(),
    courierId: Joi.string().allow("", null).optional(),
    courierName: Joi.string().allow("", null).optional(),
    courierEmail: Joi.string().allow("", null).optional(),
    logisticsEmail: Joi.string().allow("", null).optional(),
    shippingFee: Joi.number().min(0).allow(null).optional(),
    shippingCost: Joi.number().min(0).allow(null).optional(),
    logisticsCompanyId: Joi.string().allow("", null).optional(),
    companyId: Joi.string().allow("", null).optional(),
    logisticsCompany: Joi.alternatives().try(Joi.string(), Joi.object().unknown(true)).optional(),
}).unknown(true);

// Schema for updating order status
export const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .required()
        .valid(
            "pending",
            "paid",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "refunded"
        )
        .messages({
            "string.base": "Status must be a string",
            "string.empty": "Status is required",
            "any.only":
                "Status must be one of: pending, paid, processing, shipped, delivered, cancelled, refunded",
            "any.required": "Status is required",
        }),
});

// Schema for updating payment information
export const updatePaymentSchema = Joi.object({
    status: Joi.string()
        .valid("pending", "completed", "failed", "refunded")
        .messages({
            "string.base": "Payment status must be a string",
            "any.only":
                "Payment status must be one of: pending, completed, failed, refunded",
        }),
    transactionId: Joi.string().allow("").trim().messages({
        "string.base": "Transaction ID must be a string",
    }),
    details: paymentDetailsSchema,
})
    .min(1)
    .messages({
        "object.min": "At least one field is required for payment update",
    });

// Create validation middleware functions
export const validateCreateOrder = validate(createOrderSchema);
export const validateUpdateOrderStatus = validate(updateOrderStatusSchema);
export const validateUpdatePayment = validate(updatePaymentSchema);
