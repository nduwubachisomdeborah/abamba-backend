import Joi from "joi";

export const ObjectIdSchema = Joi.string().pattern(
    new RegExp("^[0-9a-fA-F]{24}$")
);
