import Joi from "joi";

// Schema for validating disable reason
const disableReasonSchema = Joi.object({
    reason: Joi.string().required().trim().min(3).max(200).messages({
        "string.base": "Reason must be a string",
        "string.empty": "Reason is required",
        "string.min": "Reason must be at least 3 characters long",
        "string.max": "Reason cannot exceed 200 characters",
        "any.required": "Please provide a reason for disabling the product",
    }),
});

export const productRejectionSchema = Joi.object({
    message: Joi.string().required().trim().min(3).max(500).messages({
        "string.base": "Message must be a string",
        "string.empty": "Message is required",
        "string.min": "Message must be at least 3 characters long",
        "string.max": "Message cannot exceed 500 characters",
        "any.required": "Please provide a rejection message",
    }),
});

export const validateProductRejection = (req, res, next) => {
    const { error, value } = productRejectionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            error: error.details[0].message,
        });
    }
    req.body = value;
    next();
};

// Middleware function for validating disable reason
export const validateDisableReason = (req, res, next) => {
    const { error, value } = disableReasonSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            error: error.details[0].message,
        });
    }
    req.body = value;
    next();
};

export const payoutRejectionSchema = Joi.object({
    reason: Joi.string().required().trim().min(3).max(500).messages({
        "string.base": "Reason must be a string",
        "string.empty": "Reason is required",
        "string.min": "Reason must be at least 3 characters long",
        "string.max": "Reason cannot exceed 500 characters",
        "any.required": "Please provide a reason for rejecting the payout",
    }),
});

export const validatePayoutRejection = (req, res, next) => {
    const { error, value } = payoutRejectionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            error: error.details[0].message,
        });
    }
    req.body = value;
    next();
};
