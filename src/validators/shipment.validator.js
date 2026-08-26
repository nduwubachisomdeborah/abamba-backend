import Joi from "joi";
import validate from "../middlewares/validate.js";
import mongoose from "mongoose";

// Helper function to validate object IDs
const objectIdValidator = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("string.objectId", { value });
    }
    return value;
};

// Schema for package dimensions
const packageDimensionsSchema = Joi.object({
    length: Joi.number().min(0).messages({
        "number.base": "Length must be a number",
        "number.min": "Length cannot be negative",
    }),
    width: Joi.number().min(0).messages({
        "number.base": "Width must be a number",
        "number.min": "Width cannot be negative",
    }),
    height: Joi.number().min(0).messages({
        "number.base": "Height must be a number",
        "number.min": "Height cannot be negative",
    }),
    unit: Joi.string().valid("in", "cm").default("in").messages({
        "string.base": "Unit must be a string",
        "any.only": "Unit must be one of: in, cm",
    }),
});

// Schema for tracking update
export const trackingUpdateSchema = Joi.object({
    status: Joi.string()
        .required()
        .valid(
            "information_received",
            "in_transit",
            "out_for_delivery",
            "delivered",
            "failed_attempt",
            "exception",
            "returned"
        )
        .messages({
            "string.base": "Status must be a string",
            "string.empty": "Status is required",
            "any.only":
                "Status must be one of: information_received, in_transit, out_for_delivery, delivered, failed_attempt, exception, returned",
            "any.required": "Status is required",
        }),
    location: Joi.string().trim().max(100).messages({
        "string.base": "Location must be a string",
        "string.max": "Location cannot exceed 100 characters",
    }),
    description: Joi.string().trim().max(200).messages({
        "string.base": "Description must be a string",
        "string.max": "Description cannot exceed 200 characters",
    }),
});

// Schema for creating a shipment
export const createShipmentSchema = Joi.object({
    orderIds: Joi.array()
        .items(
            Joi.alternatives().try(
                Joi.number().integer().positive().messages({
                    "number.base": "Order ID must be a number",
                    "number.integer": "Order ID must be an integer",
                    "number.positive": "Order ID must be positive",
                }),
                Joi.string().custom(objectIdValidator).messages({
                    "string.base": "Order ID must be a string",
                    "string.objectId": "Invalid order ID format",
                })
            )
        )
        .min(1)
        .required()
        .messages({
            "array.base": "Order IDs must be an array",
            "array.min": "At least one order ID is required",
            "any.required": "Order IDs are required",
        }),
    carrier: Joi.string()
        .required()
        .valid("fedex", "ups", "usps", "dhl", "other")
        .messages({
            "string.base": "Carrier must be a string",
            "string.empty": "Carrier is required",
            "any.only": "Carrier must be one of: fedex, ups, usps, dhl, other",
            "any.required": "Carrier is required",
        }),
    trackingNumber: Joi.string().required().trim().max(50).messages({
        "string.base": "Tracking number must be a string",
        "string.empty": "Tracking number is required",
        "string.max": "Tracking number cannot exceed 50 characters",
        "any.required": "Tracking number is required",
    }),
    trackingUrl: Joi.string().uri().trim().max(500).messages({
        "string.base": "Tracking URL must be a string",
        "string.uri": "Tracking URL must be a valid URL",
        "string.max": "Tracking URL cannot exceed 500 characters",
    }),
    shippingMethod: Joi.string()
        .required()
        .valid("standard", "express", "priority", "overnight", "international")
        .messages({
            "string.base": "Shipping method must be a string",
            "string.empty": "Shipping method is required",
            "any.only":
                "Shipping method must be one of: standard, express, priority, overnight, international",
            "any.required": "Shipping method is required",
        }),
    estimatedDelivery: Joi.date().iso().messages({
        "date.base": "Estimated delivery must be a valid date",
        "date.format": "Estimated delivery must be in ISO format",
    }),
    shippingCost: Joi.number().min(0).default(0).messages({
        "number.base": "Shipping cost must be a number",
        "number.min": "Shipping cost cannot be negative",
    }),
    packageWeight: Joi.number().min(0).messages({
        "number.base": "Package weight must be a number",
        "number.min": "Package weight cannot be negative",
    }),
    packageDimensions: packageDimensionsSchema,
    notes: Joi.string().allow("").trim().max(500).messages({
        "string.base": "Notes must be a string",
        "string.max": "Notes cannot exceed 500 characters",
    }),
});

// Schema for updating shipment details
export const updateShipmentSchema = Joi.object({
    carrier: Joi.string()
        .valid("fedex", "ups", "usps", "dhl", "other")
        .messages({
            "string.base": "Carrier must be a string",
            "any.only": "Carrier must be one of: fedex, ups, usps, dhl, other",
        }),
    trackingNumber: Joi.string().trim().max(50).messages({
        "string.base": "Tracking number must be a string",
        "string.max": "Tracking number cannot exceed 50 characters",
    }),
    trackingUrl: Joi.string().uri().trim().max(500).messages({
        "string.base": "Tracking URL must be a string",
        "string.uri": "Tracking URL must be a valid URL",
        "string.max": "Tracking URL cannot exceed 500 characters",
    }),
    shippingMethod: Joi.string()
        .valid("standard", "express", "priority", "overnight", "international")
        .messages({
            "string.base": "Shipping method must be a string",
            "any.only":
                "Shipping method must be one of: standard, express, priority, overnight, international",
        }),
    estimatedDelivery: Joi.date().iso().messages({
        "date.base": "Estimated delivery must be a valid date",
        "date.format": "Estimated delivery must be in ISO format",
    }),
    shippingCost: Joi.number().min(0).messages({
        "number.base": "Shipping cost must be a number",
        "number.min": "Shipping cost cannot be negative",
    }),
    packageWeight: Joi.number().min(0).messages({
        "number.base": "Package weight must be a number",
        "number.min": "Package weight cannot be negative",
    }),
    packageDimensions: packageDimensionsSchema,
    notes: Joi.string().allow("").trim().max(500).messages({
        "string.base": "Notes must be a string",
        "string.max": "Notes cannot exceed 500 characters",
    }),
})
    .min(1)
    .messages({
        "object.min": "At least one field is required for shipment update",
    });

// Schema for creating a shipment
export const getCarriersSchema = Joi.object({
    productId: Joi.string().custom(objectIdValidator).required().messages({
        "string.base": "Product ID must be a string",
        "string.objectId": "Invalid product ID format",
        "any.required": "Product ID is required",
    }),
    shippingAddressId: Joi.string()
        .custom(objectIdValidator)
        .required()
        .messages({
            "string.base": "Shipping address ID must be a string",
            "string.objectId": "Invalid shipping address ID format",
            "any.required": "Shipping address ID is required",
        }),
    variantId: Joi.string().custom(objectIdValidator).allow(null).messages({
        "string.base": "Variant ID must be a string",
        "string.objectId": "Invalid variant ID format",
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        "number.base": "Quantity must be a number",
        "number.integer": "Quantity must be an integer",
        "number.min": "Quantity must be at least 1",
        "any.required": "Quantity is required",
    }),
});

// Create validation middleware functions
export const validateCreateShipment = validate(createShipmentSchema);
export const validateUpdateShipment = validate(updateShipmentSchema);
export const validateTrackingUpdate = validate(trackingUpdateSchema);
export const validateGetCarriers = validate(getCarriersSchema);
