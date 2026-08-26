import Joi from "joi";
import validate from "../middlewares/validate.js";

const updateSellerApprovalSchema = Joi.object({
    approved: Joi.boolean().required(),
    message: Joi.when("approved", {
        is: false,
        then: Joi.string().trim().min(5).max(500).required(),
        otherwise: Joi.string().trim().max(500).allow("").optional(),
    }),
});

export const validateUpdateSellerApproval = validate(updateSellerApprovalSchema);
