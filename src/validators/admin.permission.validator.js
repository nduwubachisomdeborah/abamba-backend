import Joi from "joi";
import validate from "../middlewares/validate.js";

export const setPermissionsSchema = Joi.object({
  pages: Joi.array()
    .items(Joi.string().trim().min(1))
    .required()
    .messages({
      "array.base": "pages must be an array of strings",
      "any.required": "pages is required",
    }),
  full: Joi.boolean().optional().default(false),
});

export const validateSetPermissions = validate(setPermissionsSchema);
