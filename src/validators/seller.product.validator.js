import Joi from "joi";

// Variant schema for validation
const variantSchema = Joi.object({
    attributes: Joi.object()
        .pattern(Joi.string(), Joi.string())
        .required()
        .messages({
            "object.base": "Attributes must be an object",
            "any.required": "Attributes are required",
        }),
    weight: Joi.number().min(0).default(0).messages({
        "number.base": "Weight must be a number",
        "number.min": "Weight must be a positive number",
    }),
    quantity: Joi.number().min(0).integer().default(0).messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "number.integer": "Quantity must be an integer",
    }),
    price: Joi.number().required().min(0).messages({
        "number.base": "Price must be a number",
        "number.min": "Price must be a positive number",
        "any.required": "Price is required",
    }),
    promoPrice: Joi.number().min(0).allow(null, "").optional().messages({
        "number.base": "Promotional price must be a number",
        "number.min": "Promotional price must be a positive number",
    }),
    bonusPrice: Joi.number()
        .min(1)
        .allow(null, "")
        .optional()
        .messages({
            "number.base": "Variant bonus price must be a number",
            "number.min": "Variant bonus price must be greater than 0",
        }),
    sku: Joi.string().trim().allow("").optional().messages({
        "string.base": "SKU must be a string",
    }),
    images: Joi.array()
        .items(
            Joi.alternatives().try(
                Joi.object({
                    url: Joi.string().required().messages({
                        "string.base": "Image URL must be a string",
                        "string.empty": "Image URL is required",
                        "any.required": "Image URL is required",
                    }),
                    thumbnail: Joi.string().allow("", null).optional(),
                    medium: Joi.string().allow("", null).optional(),
                    altText: Joi.string()
                        .allow("", null)
                        .default("Variant image")
                        .messages({
                            "string.base": "Image alt text must be a string",
                        }),
                }),
                Joi.string().required()
            )
        )
        .optional()
        .messages({
            "array.base": "Images must be an array",
        }),
}).unknown(true);

// Product schema for creation
const productSchema = Joi.object({
    name: Joi.string().required().trim().max(100).messages({
        "string.base": "Name must be a string",
        "string.empty": "Name is required",
        "string.max": "Name cannot exceed 100 characters",
        "any.required": "Name is required",
    }),
    weight: Joi.number().min(0).default(0).optional().messages({
        "number.base": "Weight must be a number",
        "number.min": "Weight must be a positive number",
    }),
    quantity: Joi.number().min(0).integer().default(1).optional().messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "number.integer": "Quantity must be an integer",
    }),
    description: Joi.string().allow("", null).optional().max(1000).messages({
        "string.base": "Description must be a string",
        "string.max": "Description cannot exceed 1000 characters",
    }),
    basePrice: Joi.number().min(0).optional().messages({
        "number.base": "Base price must be a number",
        "number.min": "Base price must be a positive number",
    }),
    price: Joi.number().min(0).optional().messages({
        "number.base": "Price must be a number",
        "number.min": "Price must be a positive number",
    }),
    promoPrice: Joi.number().min(0).allow(null, "").optional().messages({
        "number.base": "Promotional price must be a number",
        "number.min": "Promotional price must be a positive number",
    }),
    bonusPrice: Joi.number()
        .min(1)
        .allow(null, "")
        .optional()
        .messages({
            "number.base": "Bonus price must be a number",
            "number.min": "Bonus price must be greater than 0",
        }),
    onSale: Joi.boolean().optional().messages({
        "boolean.base": "On sale flag must be a boolean",
    }),
    saleStartDate: Joi.date().allow(null, "").optional().messages({
        "date.base": "Sale start date must be a valid date",
    }),
    saleEndDate: Joi.date().allow(null, "").optional().messages({
        "date.base": "Sale end date must be a valid date",
    }),
    category: Joi.string().required().messages({
        "string.base": "Category must be a string",
        "string.empty": "Category is required",
        "any.required": "Category is required",
    }),
    brand: Joi.string().trim().allow("", null).optional().messages({
        "string.base": "Brand must be a string",
    }),
    images: Joi.array()
        .items(
            Joi.alternatives().try(
                Joi.object({
                    url: Joi.string().required().messages({
                        "string.base": "Image URL must be a string",
                        "string.empty": "Image URL is required",
                        "any.required": "Image URL is required",
                    }),
                    thumbnail: Joi.string().allow("", null).optional(),
                    medium: Joi.string().allow("", null).optional(),
                    altText: Joi.string()
                        .allow("", null)
                        .default("Product image")
                        .messages({
                            "string.base": "Image alt text must be a string",
                        }),
                }),
                Joi.string().required()
            )
        )
        .optional()
        .messages({
            "array.base": "Images must be an array",
        }),
    thumbnail: Joi.string().allow("", null).optional(),
    image: Joi.string().allow("", null).optional(),
    lowStockAlert: Joi.number()
        .integer()
        .min(1)
        .max(2)
        .default(2)
        .optional()
        .messages({
            "number.base": "Low stock alert must be a number",
            "number.min": "Low stock alert must be at least 1",
            "number.max": "Low stock alert threshold cannot exceed 2",
        }),
    featured: Joi.boolean().optional().messages({
        "boolean.base": "Featured flag must be a boolean",
    }),
    variants: Joi.array().items(variantSchema).optional().messages({
        "array.base": "Variants must be an array",
    }),
}).unknown(true);

// Product schema for updating existing products (all fields optional)
const updateProductSchema = Joi.object({
    name: Joi.string().trim().max(100).optional().messages({
        "string.base": "Name must be a string",
        "string.max": "Name cannot exceed 100 characters",
    }),
    weight: Joi.number().min(0).optional().messages({
        "number.base": "Weight must be a number",
        "number.min": "Weight must be a positive number",
    }),
    quantity: Joi.number().min(0).integer().optional().messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "number.integer": "Quantity must be an integer",
    }),
    description: Joi.string().allow("", null).optional().max(1000).messages({
        "string.base": "Description must be a string",
        "string.max": "Description cannot exceed 1000 characters",
    }),
    basePrice: Joi.number().min(0).optional().messages({
        "number.base": "Base price must be a number",
        "number.min": "Base price must be a positive number",
    }),
    price: Joi.number().min(0).optional().messages({
        "number.base": "Price must be a number",
        "number.min": "Price must be a positive number",
    }),
    promoPrice: Joi.number().min(0).allow(null, "").optional().messages({
        "number.base": "Promotional price must be a number",
        "number.min": "Promotional price must be a positive number",
    }),
    bonusPrice: Joi.number()
        .min(1)
        .allow(null, "")
        .optional()
        .messages({
            "number.base": "Bonus price must be a number",
            "number.min": "Bonus price must be greater than 0",
        }),
    onSale: Joi.boolean().optional().messages({
        "boolean.base": "On sale flag must be a boolean",
    }),
    saleStartDate: Joi.date().allow(null, "").optional().messages({
        "date.base": "Sale start date must be a valid date",
    }),
    saleEndDate: Joi.date().allow(null, "").optional().messages({
        "date.base": "Sale end date must be a valid date",
    }),
    category: Joi.string().optional().messages({
        "string.base": "Category must be a string",
    }),
    brand: Joi.string().trim().allow("", null).optional().messages({
        "string.base": "Brand must be a string",
    }),
    images: Joi.array()
        .items(
            Joi.alternatives().try(
                Joi.object({
                    url: Joi.string().required().messages({
                        "string.base": "Image URL must be a string",
                        "string.empty": "Image URL is required",
                        "any.required": "Image URL is required",
                    }),
                    thumbnail: Joi.string().allow("", null).optional(),
                    medium: Joi.string().allow("", null).optional(),
                    altText: Joi.string()
                        .allow("", null)
                        .default("Product image")
                        .messages({
                            "string.base": "Image alt text must be a string",
                        }),
                }),
                Joi.string().required()
            )
        )
        .optional()
        .messages({
            "array.base": "Images must be an array",
        }),
    thumbnail: Joi.string().allow("", null).optional(),
    image: Joi.string().allow("", null).optional(),
    lowStockAlert: Joi.number()
        .integer()
        .min(1)
        .max(2)
        .optional()
        .messages({
            "number.base": "Low stock alert must be a number",
            "number.min": "Low stock alert must be at least 1",
            "number.max": "Low stock alert threshold cannot exceed 2",
        }),
    featured: Joi.boolean().optional().messages({
        "boolean.base": "Featured flag must be a boolean",
    }),
    variants: Joi.array().items(variantSchema).optional().messages({
        "array.base": "Variants must be an array",
    }),
}).unknown(true);

// Promotion schema for validation
const promotionSchema = Joi.object({
    promoPrice: Joi.number().required().min(0).messages({
        "number.base": "Promotional price must be a number",
        "number.min": "Promotional price must be a positive number",
        "any.required": "Promotional price is required",
    }),
    saleStartDate: Joi.date().allow(null).messages({
        "date.base": "Sale start date must be a valid date",
    }),
    saleEndDate: Joi.date().allow(null).messages({
        "date.base": "Sale end date must be a valid date",
    }),
}).unknown(true);

export { promotionSchema, variantSchema, productSchema, updateProductSchema };
