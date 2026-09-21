import Joi from "joi";
import validate from "../middlewares/validate.js";
import mongoose from "mongoose";

// Schema for adding an item to cart
export const addItemSchema = Joi.object({
    productId: Joi.string()
        .required()
        .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error("string.objectId", { value });
            }
            return value;
        })
        .messages({
            "string.empty": "Product ID is required",
            "any.required": "Product ID is required",
            "string.objectId": "Invalid product ID format",
        }),
    variantId: Joi.string()
        .allow(null)
        .custom((value, helpers) => {
            if (value && !mongoose.Types.ObjectId.isValid(value)) {
                return helpers.error("string.objectId", { value });
            }
            return value;
        })
        .messages({
            "string.objectId": "Invalid variant ID format",
        }),
    quantity: Joi.number().integer().min(1).default(1).optional().messages({
        "number.base": "Quantity must be a number",
        "number.integer": "Quantity must be an integer",
        "number.min": "Quantity must be at least 1",
    }),
    carrierId: Joi.string().allow(null, "").optional(),
    request_token: Joi.string().allow(null, "").optional(),
}).unknown(true);

// Schema for updating cart item quantity
export const updateQuantitySchema = Joi.object({
    quantity: Joi.number().integer().min(1).required().messages({
        "number.base": "Quantity must be a number",
        "number.integer": "Quantity must be an integer",
        "number.min": "Quantity must be at least 1",
        "any.required": "Quantity is required",
    }),
});

// Schema for merging guest cart
export const mergeCartSchema = Joi.object({
    guestToken: Joi.string().allow(null, "").optional(),
    guestId: Joi.string().allow(null, "").optional(),
    items: Joi.array()
        .items(
            Joi.object({
                productId: Joi.string().required(),
                variantId: Joi.string().allow(null, "").optional(),
                quantity: Joi.number().integer().min(1).default(1).optional(),
                price: Joi.number().min(0).optional(),
                shipping: Joi.any().optional(),
            }).unknown(true)
        )
        .optional(),
    cartItems: Joi.array().items(Joi.object().unknown(true)).optional(),
}).unknown(true);

// Create validation middleware functions
export const validateAddItem = validate(addItemSchema);
export const validateUpdateQuantity = validate(updateQuantitySchema);
export const validateMergeCart = validate(mergeCartSchema);
