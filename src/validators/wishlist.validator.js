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
  name: Joi.string().trim().max(50).messages({
    'string.base': 'Name must be a string',
    'string.max': 'Name cannot exceed 50 characters'
  })
});

// Schema for updating a wishlist
export const updateWishlistSchema = Joi.object({
  name: Joi.string().trim().max(50).messages({
    'string.base': 'Name must be a string',
    'string.max': 'Name cannot exceed 50 characters'
  })
});

// Schema for adding a product to a wishlist
export const addProductSchema = Joi.object({
  productId: Joi.string().custom(validateObjectId).required().messages({
    'string.base': 'Product ID must be a string',
    'string.empty': 'Product ID is required',
    'any.invalid': 'Product ID must be a valid Object ID',
    'any.required': 'Product ID is required'
  }),
  notes: Joi.string().trim().max(200).messages({
    'string.base': 'Notes must be a string',
    'string.max': 'Notes cannot exceed 200 characters'
  })
});

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
