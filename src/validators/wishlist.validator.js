import Joi from 'joi';
import mongoose from 'mongoose';

// Helper function to validate object IDs
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid', { value });
  }
  return value;
};

// Create custom validator function
const validateObjectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid', { message: 'Invalid ObjectId format' });
  }
  return value;
};

// Schema for creating a wishlist
export const createWishlistSchema = Joi.object({
  name: Joi.string().trim().max(50).optional().allow(''),
  productId: Joi.string().optional(),
  id: Joi.string().optional(),
  product: Joi.string().optional(),
}).unknown(true);

// Schema for updating a wishlist
export const updateWishlistSchema = Joi.object({
  name: Joi.string().trim().max(50).optional(),
}).unknown(true);

// Schema for adding a product to a wishlist
export const addProductSchema = Joi.object({
  productId: Joi.string().optional(),
  id: Joi.string().optional(),
  product: Joi.string().optional(),
  notes: Joi.string().trim().max(200).optional().allow(''),
}).unknown(true);

// Export a function to validate middleware
export const validateCreateWishlist = (req, res, next) => {
  const { error } = createWishlistSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      error: error.details[0].message
    });
  }
  next();
};

export const validateUpdateWishlist = (req, res, next) => {
  const { error } = updateWishlistSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      error: error.details[0].message
    });
  }
  next();
};

export const validateAddProduct = (req, res, next) => {
  const { error } = addProductSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      error: error.details[0].message
    });
  }
  next();
};
