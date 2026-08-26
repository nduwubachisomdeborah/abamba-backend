import Joi from "joi";
import validate from "../middlewares/validate.js";

// Schema for creating a review
const createReviewSchema = Joi.object({
    rating: Joi.number().required().min(1).max(5).messages({
        "number.base": "Rating must be a number",
        "number.min": "Rating must be at least 1",
        "number.max": "Rating cannot exceed 5",
        "any.required": "Rating is required"
    }),
    title: Joi.string().trim().max(100).messages({
        "string.base": "Title must be a string",
        "string.max": "Title cannot exceed 100 characters"
    }),
    comment: Joi.string().required().trim().max(1000).messages({
        "string.base": "Comment must be a string",
        "string.empty": "Comment is required",
        "string.max": "Comment cannot exceed 1000 characters",
        "any.required": "Comment is required"
    }),
    variant: Joi.string().optional().messages({
        "string.base": "Variant ID must be a string"
    }),
    photos: Joi.array().items(
        Joi.object({
            url: Joi.string().required().messages({
                "string.base": "Photo URL must be a string",
                "string.empty": "Photo URL is required",
                "any.required": "Photo URL is required"
            }),
            caption: Joi.string().default("Product review photo")
        })
    )
});

// Schema for updating a review
const updateReviewSchema = Joi.object({
    rating: Joi.number().min(1).max(5).messages({
        "number.base": "Rating must be a number",
        "number.min": "Rating must be at least 1",
        "number.max": "Rating cannot exceed 5"
    }),
    title: Joi.string().trim().max(100).messages({
        "string.base": "Title must be a string",
        "string.max": "Title cannot exceed 100 characters"
    }),
    comment: Joi.string().trim().max(1000).messages({
        "string.base": "Comment must be a string",
        "string.max": "Comment cannot exceed 1000 characters"
    }),
    photos: Joi.array().items(
        Joi.object({
            url: Joi.string().required().messages({
                "string.base": "Photo URL must be a string",
                "string.empty": "Photo URL is required",
                "any.required": "Photo URL is required"
            }),
            caption: Joi.string()
        })
    )
});

// Schema for adding a reply to a review
const replySchema = Joi.object({
    content: Joi.string().required().trim().max(1000).messages({
        "string.base": "Reply must be a string",
        "string.empty": "Reply is required",
        "string.max": "Reply cannot exceed 1000 characters",
        "any.required": "Reply is required"
    })
});

// Schema for updating review status
const statusSchema = Joi.object({
    status: Joi.string().required().valid("published", "pending", "rejected").messages({
        "string.base": "Status must be a string",
        "string.empty": "Status is required",
        "any.only": "Status must be one of: published, pending, rejected",
        "any.required": "Status is required"
    })
});

// Create validation middleware functions for easier use in routes
export const validateCreateReview = validate(createReviewSchema);
export const validateUpdateReview = validate(updateReviewSchema);
export const validateReviewReply = validate(replySchema);
export const validateReviewStatus = validate(statusSchema);
