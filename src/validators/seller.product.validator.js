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
    weight: Joi.number().required().min(0).messages({
        "number.base": "Weight must be a number",
        "number.min": "Weight must be a positive number",
        "any.required": "Weight is required",
    }),
    quantity: Joi.number().required().min(0).messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "any.required": "Quantity is required",
    }),
    price: Joi.number().required().min(0).messages({
        "number.base": "Price must be a number",
        "number.min": "Price must be a positive number",
        "any.required": "Price is required",
    }),
    promoPrice: Joi.number().min(0).allow(null).messages({
        "number.base": "Promotional price must be a number",
        "number.min": "Promotional price must be a positive number",
    }),
    quantity: Joi.number().required().min(0).messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "any.required": "Quantity is required",
    }),
    sku: Joi.string().trim().allow("").messages({
        "string.base": "SKU must be a string",
    }),
    images: Joi.array()
        .items(
            Joi.object({
                url: Joi.string().required().messages({
                    "string.base": "Image URL must be a string",
                    "string.empty": "Image URL is required",
                    "any.required": "Image URL is required",
                }),
                altText: Joi.string()
                    .allow("")
                    .default("Variant image")
                    .messages({
                        "string.base": "Image alt text must be a string",
                    }),
            })
        )
        .messages({
            "array.base": "Images must be an array",
        }),
});

// Product schema for validation
const productSchema = Joi.object({
    name: Joi.string().required().trim().max(100).messages({
        "string.base": "Name must be a string",
        "string.empty": "Name is required",
        "string.max": "Name cannot exceed 100 characters",
        "any.required": "Name is required",
    }),
    weight: Joi.number().required().min(0).messages({
        "number.base": "Weight must be a number",
        "number.min": "Weight must be a positive number",
        "any.required": "Weight is required",
    }),
    quantity: Joi.number().required().min(0).messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity must be a positive number",
        "any.required": "Quantity is required",
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
    promoPrice: Joi.number().min(0).allow(null).messages({
        "number.base": "Promotional price must be a number",
        "number.min": "Promotional price must be a positive number",
    }),
    onSale: Joi.boolean().messages({
        "boolean.base": "On sale flag must be a boolean",
    }),
    saleStartDate: Joi.date().allow(null).messages({
        "date.base": "Sale start date must be a valid date",
    }),
    saleEndDate: Joi.date().allow(null).messages({
        "date.base": "Sale end date must be a valid date",
    }),
    category: Joi.string().required().messages({
        "string.base": "Category must be a string",
        "string.empty": "Category is required",
        "any.required": "Category is required",
    }),
    brand: Joi.string().trim().allow("").messages({
        "string.base": "Brand must be a string",
    }),
    images: Joi.array()
        .items(
            Joi.object({
                url: Joi.string().required().messages({
                    "string.base": "Image URL must be a string",
                    "string.empty": "Image URL is required",
                    "any.required": "Image URL is required",
                }),
                altText: Joi.string()
                    .allow("")
                    .default("Product image")
                    .messages({
                        "string.base": "Image alt text must be a string",
                    }),
            })
        )
        .messages({
            "array.base": "Images must be an array",
        }),
    lowStockAlert: Joi.number().allow(null).default(null).messages({
        "number.base": "Low stock alert must be a number",
    }),
    featured: Joi.boolean().messages({
        "boolean.base": "Featured flag must be a boolean",
    }),
    variants: Joi.array().items(variantSchema).messages({
        "array.base": "Variants must be an array",
    }),
});

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
});

export { promotionSchema, variantSchema, productSchema };
