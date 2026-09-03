import Joi from "joi";
import validate from "../middlewares/validate.js";

const coordinatesSchema = Joi.object({
    longitude: Joi.number(),
    latitude: Joi.number(),
});

// Schema for creating/updating an address
export const addressSchema = Joi.object({
    fullName: Joi.string().allow("", null).optional().trim().max(100).default("Customer"),
    addressLine1: Joi.string().required().trim().max(100).messages({
        "string.base": "Address line 1 must be a string",
        "string.empty": "Address line 1 is required",
        "string.max": "Address line 1 cannot exceed 100 characters",
        "any.required": "Address line 1 is required",
    }),
    addressLine2: Joi.string().allow("", null).optional().trim().max(100),
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
    zipCode: Joi.string().allow("", null).optional().trim().max(20).default("460001"),
    country: Joi.string().allow("", null).optional().trim().max(50).default("Nigeria"),
    phoneNumber: Joi.string().required().trim().max(20).messages({
        "string.base": "Phone number must be a string",
        "string.empty": "Phone number is required",
        "string.max": "Phone number cannot exceed 20 characters",
        "any.required": "Phone number is required",
    }),
    isDefault: Joi.boolean().default(false),
    coordinates: coordinatesSchema.optional().allow(null),
});

// Schema for updating an address (all fields optional)
export const updateAddressSchema = Joi.object({
    fullName: Joi.string().trim().max(100).messages({
        "string.base": "Full name must be a string",
        "string.max": "Full name cannot exceed 100 characters",
    }),
    addressLine1: Joi.string().trim().max(100).messages({
        "string.base": "Address line 1 must be a string",
        "string.max": "Address line 1 cannot exceed 100 characters",
    }),
    addressLine2: Joi.string().allow("").trim().max(100).messages({
        "string.base": "Address line 2 must be a string",
        "string.max": "Address line 2 cannot exceed 100 characters",
    }),
    city: Joi.string().trim().max(50).messages({
        "string.base": "City must be a string",
        "string.max": "City cannot exceed 50 characters",
    }),
    state: Joi.string().trim().max(50).messages({
        "string.base": "State must be a string",
        "string.max": "State cannot exceed 50 characters",
    }),
    zipCode: Joi.string().trim().max(20).messages({
        "string.base": "Zip code must be a string",
        "string.max": "Zip code cannot exceed 20 characters",
    }),
    country: Joi.string().trim().max(50).messages({
        "string.base": "Country must be a string",
        "string.max": "Country cannot exceed 50 characters",
    }),
    phoneNumber: Joi.string().trim().max(20).messages({
        "string.base": "Phone number must be a string",
        "string.max": "Phone number cannot exceed 20 characters",
    }),
    isDefault: Joi.boolean().messages({
        "boolean.base": "isDefault must be a boolean",
    }),
    coordinates: coordinatesSchema.optional(),
})
    .min(1)
    .messages({
        "object.min": "At least one field is required for update",
    });

// Create validation middleware functions
export const validateAddress = validate(addressSchema);
export const validateUpdateAddress = validate(updateAddressSchema);
