import Joi from "joi";
import validate from "../middlewares/validate.js";

// Schema for option value
const optionValueSchema = Joi.object({
    id: Joi.string().required().messages({
        "string.base": "Option ID must be a string",
        "string.empty": "Option ID is required",
        "any.required": "Option ID is required",
    }),
    name: Joi.string().required().messages({
        "string.base": "Option name must be a string",
        "string.empty": "Option name is required",
        "any.required": "Option name is required",
    }),
    values: Joi.array().items(Joi.string()).min(1).required().messages({
        "array.base": "Values must be an array",
        "array.min": "At least one value is required",
        "any.required": "Values are required",
    }),
    type: Joi.string()
        .valid("color", "dropdown", "text")
        .default("dropdown")
        .messages({
            "string.base": "Option type must be a string",
            "any.only": "Option type must be one of: color, dropdown, or text",
        }),
    immutable: Joi.boolean().default(false).messages({
        "boolean.base": "Immutable flag must be a boolean",
    }),
});

// Schema for updating category options
export const updateCategoryOptionsSchema = Joi.object({
    options: Joi.array().items(optionValueSchema).required().messages({
        "array.base": "Options must be an array",
        "any.required": "Options are required",
    }),
});

// Export schema to use with validate middleware in routes
// Example usage: router.put('/category-options/:category', validate(updateCategoryOptionsSchema), CategoryOptionsController.updateCategoryOptions);
