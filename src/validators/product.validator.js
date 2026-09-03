import Joi from "joi";
import validate from "../middlewares/validate.js";

// Define schema for variant attributes (using Map in the model but object here for validation)
const variantAttributesSchema = Joi.object()
    .pattern(
        Joi.string().min(1), // Key (attribute name) must be a non-empty string
        Joi.string().min(1) // Value must be a non-empty string
    )
    .min(1)
    .messages({
        "object.min": "At least one attribute is required",
        "object.base":
            "Attributes must be an object with string keys and values",
    });

// Schema for a product variant
const variantSchema = Joi.object({
    attributes: variantAttributesSchema.required().messages({
        "any.required": "Variant attributes are required",
    }),
    price: Joi.number().required().min(0).messages({
        "number.base": "Variant price must be a number",
        "number.min": "Variant price must be a positive number",
        "any.required": "Variant price is required",
    }),
    promoPrice: Joi.number().min(0).allow(null).optional(),
    bonusPrice: Joi.number().min(0).allow(null).optional(),
    quantity: Joi.number().required().min(0).integer().messages({
        "number.base": "Variant quantity must be a number",
        "number.min": "Variant quantity cannot be negative",
        "number.integer": "Variant quantity must be an integer",
        "any.required": "Variant quantity is required",
    }),
    sku: Joi.string().trim(),
    expiryDate: Joi.date().allow(null).default(null),
    images: Joi.array().items(
        Joi.object({
            url: Joi.string().required().messages({
                "string.base": "Image URL must be a string",
                "string.empty": "Image URL is required",
                "any.required": "Image URL is required",
            }),
            altText: Joi.string().default("Variant image"),
        })
    ),
});

// Schema for creating a product
export const createProductSchema = Joi.object({
    name: Joi.string().required().trim().max(100).messages({
        "string.base": "Name must be a string",
        "string.empty": "Name is required",
        "string.max": "Name cannot exceed 100 characters",
        "any.required": "Name is required",
    }),
    description: Joi.string().required().max(1000).messages({
        "string.base": "Description must be a string",
        "string.empty": "Description is required",
        "string.max": "Description cannot exceed 1000 characters",
        "any.required": "Description is required",
    }),
    basePrice: Joi.number().required().min(0).messages({
        "number.base": "Base price must be a number",
        "number.min": "Base price must be a positive number",
        "any.required": "Base price is required",
    }),
    promoPrice: Joi.number().min(0).allow(null).optional(),
    bonusPrice: Joi.number().min(0).allow(null).optional(),
    category: Joi.string().required().messages({
        "string.base": "Category must be a string",
        "string.empty": "Category is required",
        "any.required": "Category is required",
    }),
    brand: Joi.string().trim(),
    expiryDate: Joi.date().allow(null).default(null),
    images: Joi.array().items(
        Joi.object({
            url: Joi.string().required().messages({
                "string.base": "Image URL must be a string",
                "string.empty": "Image URL is required",
                "any.required": "Image URL is required",
            }),
            altText: Joi.string().default("Product image"),
        })
    ),
    featured: Joi.boolean().default(false),
    rating: Joi.number().min(0).max(5).default(0).messages({
        "number.base": "Rating must be a number",
        "number.min": "Rating must be at least 0",
        "number.max": "Rating cannot exceed 5",
    }),
    numReviews: Joi.number().min(0).integer().default(0).messages({
        "number.base": "Number of reviews must be a number",
        "number.min": "Number of reviews cannot be negative",
        "number.integer": "Number of reviews must be an integer",
    }),
    variants: Joi.array().items(variantSchema),
    hasVariants: Joi.boolean().default(false),
});

// Schema for updating a product
export const updateProductSchema = Joi.object({
    name: Joi.string().trim().max(100).messages({
        "string.base": "Name must be a string",
        "string.max": "Name cannot exceed 100 characters",
    }),
    description: Joi.string().max(1000).messages({
        "string.base": "Description must be a string",
        "string.max": "Description cannot exceed 1000 characters",
    }),
    basePrice: Joi.number().min(0).messages({
        "number.base": "Base price must be a number",
        "number.min": "Base price must be a positive number",
    }),
    promoPrice: Joi.number().min(0).allow(null).optional(),
    bonusPrice: Joi.number().min(0).allow(null).optional(),
    category: Joi.string().messages({
        "string.base": "Category must be a string",
    }),
    brand: Joi.string().trim(),
    expiryDate: Joi.date().allow(null).default(null),
    images: Joi.array().items(
        Joi.object({
            url: Joi.string().required().messages({
                "string.base": "Image URL must be a string",
                "string.empty": "Image URL is required",
                "any.required": "Image URL is required",
            }),
            altText: Joi.string(),
        })
    ),
    featured: Joi.boolean(),
    rating: Joi.number().min(0).max(5).messages({
        "number.base": "Rating must be a number",
        "number.min": "Rating must be at least 0",
        "number.max": "Rating cannot exceed 5",
    }),
    numReviews: Joi.number().min(0).integer().messages({
        "number.base": "Number of reviews must be a number",
        "number.min": "Number of reviews cannot be negative",
        "number.integer": "Number of reviews must be an integer",
    }),
    variants: Joi.array().items(variantSchema),
    hasVariants: Joi.boolean(),
});

// Export variant schema for direct use in routes
export { variantSchema };

// Schema for updating variant stock
export const updateVariantStockSchema = Joi.object({
    quantity: Joi.number().required().min(0).integer().messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "number.integer": "Quantity must be an integer",
        "any.required": "Quantity is required",
    }),
});

// Create validation middleware functions for easier use in routes
export const validateCreateProduct = validate(createProductSchema);
export const validateUpdateProduct = validate(updateProductSchema);
export const validateVariant = validate(variantSchema);
export const validateVariantStock = validate(updateVariantStockSchema);
