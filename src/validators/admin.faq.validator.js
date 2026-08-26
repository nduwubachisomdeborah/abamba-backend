import Joi from "joi";
import validate from "../middlewares/validate.js";

export const createFaqSchema = Joi.object({
    question: Joi.string().trim().min(5).max(500).required(),
    answer: Joi.string().trim().min(5).max(2000).required(),
    category: Joi.string().trim().max(100).optional().default("General"),
    order: Joi.number().integer().min(0).optional().default(0),
    isPublished: Joi.boolean().optional().default(true),
});

export const updateFaqSchema = Joi.object({
    question: Joi.string().trim().min(5).max(500).optional(),
    answer: Joi.string().trim().min(5).max(2000).optional(),
    category: Joi.string().trim().max(100).optional(),
    order: Joi.number().integer().min(0).optional(),
    isPublished: Joi.boolean().optional(),
});

export const validateCreateFaq = validate(createFaqSchema);
export const validateUpdateFaq = validate(updateFaqSchema);
