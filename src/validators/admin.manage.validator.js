import Joi from "joi";
import validate from "../middlewares/validate.js";

/**
 * Folds the shape the super-admin dashboard sends into the shape the schemas
 * below expect. The form collects the name as two fields, labels the admin's
 * job title as "role", and lets the browser autofill spaced phone numbers —
 * all of which Joi would otherwise reject as unknown or malformed keys.
 */
const normalizeAdminBody = (req, res, next) => {
    const body = req.body;

    if (!body || typeof body !== "object") {
        return next();
    }

    if (!body.name) {
        const name = [body.firstName, body.lastName]
            .filter((part) => typeof part === "string" && part.trim())
            .map((part) => part.trim())
            .join(" ");

        if (name) body.name = name;
    }
    delete body.firstName;
    delete body.lastName;

    if (typeof body.phoneNumber === "string") {
        body.phoneNumber = body.phoneNumber.replace(/[\s().-]/g, "");
    }

    // The role dropdown is a display label — every admin is stored as role "admin"
    if (body.role !== undefined) {
        if (!body.title && typeof body.role === "string" && body.role.trim()) {
            body.title = body.role.trim();
        }
        delete body.role;
    }

    next();
};

export const createAdminSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string()
        .optional()
        .pattern(/^\+?[0-9]{10,15}$/),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .required(),
    pages: Joi.array().items(Joi.string().trim().min(1)).optional().default([]),
    full: Joi.boolean().optional().default(false),
    active: Joi.boolean().optional().default(true),
    title: Joi.string().trim().optional(),
});

export const updateAdminSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string()
        .optional()
        .pattern(/^\+?[0-9]{10,15}$/),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .optional(),
    pages: Joi.array().items(Joi.string().trim().min(1)).optional(),
    full: Joi.boolean().optional(),
    active: Joi.boolean().optional(),
    title: Joi.string().trim().optional(),
});

export const validateCreateAdmin = [
    normalizeAdminBody,
    validate(createAdminSchema),
];
export const validateUpdateAdmin = [
    normalizeAdminBody,
    validate(updateAdminSchema),
];
