import Joi from "joi";
import validate from "../middlewares/validate.js";

const objectId = Joi.string().length(24).hex().messages({
    "string.length": "ID must be a valid 24-character hex string",
    "string.hex": "ID must be a valid hex string",
});

const createNotificationSchema = Joi.object({
    title: Joi.string().trim().max(160).required(),
    description: Joi.string().trim().required(),
    user: objectId.required().messages({
        "any.required": "Recipient user ID is required",
    }),
    read: Joi.boolean().default(false),
});

const updateNotificationSchema = Joi.object({
    title: Joi.string().trim().max(160),
    description: Joi.string().trim(),
    user: objectId,
    read: Joi.boolean(),
})
    .min(1)
    .messages({
        "object.min": "Provide at least one field to update",
    });

export const validateCreateNotification = validate(createNotificationSchema);
export const validateUpdateNotification = validate(updateNotificationSchema);
