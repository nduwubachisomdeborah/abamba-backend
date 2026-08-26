import Joi from 'joi';

// Schema for subscribing to emails
export const subscribeSchema = Joi.object({
  email: Joi.string().required().email().trim().lowercase().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

// Removed update preferences schema as we no longer store preferences

// Export middleware function for validation
export const validateSubscribe = (req, res, next) => {
  const { error } = subscribeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      error: error.details[0].message
    });
  }
  next();
};
