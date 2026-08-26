import Joi from "joi";
import validate from "../middlewares/validate.js";

export const createStoreLocationSchema = Joi.object({
    name: Joi.string().required().trim(),
    address: Joi.string().required().trim(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    firstName: Joi.string().optional().trim(),
    lastName: Joi.string().optional().trim(),
    phoneNumber: Joi.string().optional().trim(),
    email: Joi.string().email().optional().trim(),
    disabled: Joi.boolean().optional().default(false),
});

export const updateStoreLocationSchema = Joi.object({
    name: Joi.string().trim().optional(),
    address: Joi.string().trim().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    firstName: Joi.string().optional().trim(),
    lastName: Joi.string().optional().trim(),
    phoneNumber: Joi.string().optional().trim(),
    email: Joi.string().email().optional().trim(),
    disabled: Joi.boolean().optional(),
});

export const validateCreateStoreLocation = validate(createStoreLocationSchema);
export const validateUpdateStoreLocation = validate(updateStoreLocationSchema);
