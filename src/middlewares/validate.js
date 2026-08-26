import { badResponse } from "../utils/response.util.js";

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return badResponse(res, error.details[0].message);
        }
        req.body = value;
        next();
    };
}

export default validate;
