import Joi from 'joi';
import validate from '../middlewares/validate.js';

// Schema for updating customer profile
export const updateCustomerProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50)
    .messages({
      'string.base': 'Name must be a string',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must be less than 50 characters'
    }),
  phoneNumber: Joi.string().pattern(/^\+?[0-9]{10,15}$/)
    .messages({
      'string.base': 'Phone number must be a string',
      'string.pattern.base': 'Phone number must be valid (10-15 digits, can start with +)'
    }),
  dob: Joi.string().pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/)
    .messages({
      'string.base': 'Date of birth must be a string',
      'string.pattern.base': 'Date of birth must be in format DD/MM/YYYY'
    }),
  profilePicture: Joi.string()
    .messages({
      'string.base': 'Profile picture must be a string URL or file ID'
    })
});

// Schema for adding a customer address
export const addAddressSchema = Joi.object({
  fullName: Joi.string().required().trim().min(2).max(100)
    .messages({
      'string.base': 'Full name must be a string',
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name must be less than 100 characters',
      'any.required': 'Full name is required'
    }),
  addressLine1: Joi.string().required().trim().min(5).max(100)
    .messages({
      'string.base': 'Address line 1 must be a string',
      'string.empty': 'Address line 1 is required',
      'string.min': 'Address line 1 must be at least 5 characters long',
      'string.max': 'Address line 1 must be less than 100 characters',
      'any.required': 'Address line 1 is required'
    }),
  addressLine2: Joi.string().trim().allow('').max(100)
    .messages({
      'string.base': 'Address line 2 must be a string',
      'string.max': 'Address line 2 must be less than 100 characters'
    }),
  city: Joi.string().required().trim().min(2).max(50)
    .messages({
      'string.base': 'City must be a string',
      'string.empty': 'City is required',
      'string.min': 'City must be at least 2 characters long',
      'string.max': 'City must be less than 50 characters',
      'any.required': 'City is required'
    }),
  state: Joi.string().required().trim().min(2).max(50)
    .messages({
      'string.base': 'State must be a string',
      'string.empty': 'State is required',
      'string.min': 'State must be at least 2 characters long',
      'string.max': 'State must be less than 50 characters',
      'any.required': 'State is required'
    }),
  zipCode: Joi.string().trim().allow('').max(10)
    .messages({
      'string.base': 'Zip code must be a string',
      'string.max': 'Zip code must be less than 10 characters'
    }),
  country: Joi.string().trim().min(2).max(50).default('NG')
    .messages({
      'string.base': 'Country must be a string',
      'string.min': 'Country must be at least 2 characters long',
      'string.max': 'Country must be less than 50 characters'
    }),
  phoneNumber: Joi.string().required().pattern(/^\+?[0-9]{10,15}$/)
    .messages({
      'string.base': 'Phone number must be a string',
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be valid (10-15 digits, can start with +)',
      'any.required': 'Phone number is required'
    }),
  isDefault: Joi.boolean().default(false)
    .messages({
      'boolean.base': 'isDefault must be a boolean'
    })
});

// Schema for updating a customer address
export const updateAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100)
    .messages({
      'string.base': 'Full name must be a string',
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name must be less than 100 characters'
    }),
  addressLine1: Joi.string().trim().min(5).max(100)
    .messages({
      'string.base': 'Address line 1 must be a string',
      'string.min': 'Address line 1 must be at least 5 characters long',
      'string.max': 'Address line 1 must be less than 100 characters'
    }),
  addressLine2: Joi.string().trim().allow('').max(100)
    .messages({
      'string.base': 'Address line 2 must be a string',
      'string.max': 'Address line 2 must be less than 100 characters'
    }),
  city: Joi.string().trim().min(2).max(50)
    .messages({
      'string.base': 'City must be a string',
      'string.min': 'City must be at least 2 characters long',
      'string.max': 'City must be less than 50 characters'
    }),
  state: Joi.string().trim().min(2).max(50)
    .messages({
      'string.base': 'State must be a string',
      'string.min': 'State must be at least 2 characters long',
      'string.max': 'State must be less than 50 characters'
    }),
  zipCode: Joi.string().trim().allow('').max(10)
    .messages({
      'string.base': 'Zip code must be a string',
      'string.max': 'Zip code must be less than 10 characters'
    }),
  country: Joi.string().trim().min(2).max(50)
    .messages({
      'string.base': 'Country must be a string',
      'string.min': 'Country must be at least 2 characters long',
      'string.max': 'Country must be less than 50 characters'
    }),
  phoneNumber: Joi.string().pattern(/^\+?[0-9]{10,15}$/)
    .messages({
      'string.base': 'Phone number must be a string',
      'string.pattern.base': 'Phone number must be valid (10-15 digits, can start with +)'
    }),
  isDefault: Joi.boolean()
    .messages({
      'boolean.base': 'isDefault must be a boolean'
    })
});

// Export schemas directly to use with validate middleware in routes
// Example usage: router.put('/profile', validate(updateCustomerProfileSchema), CustomerController.updateProfile);
