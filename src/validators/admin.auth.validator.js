import Joi from "joi";

// Admin signup schema (same rules as user, but used for admin routes)
export const adminSignupSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(50),
  email: Joi.string().required().email(),
  phoneNumber: Joi.string().optional().pattern(/^\+?[0-9]{10,15}$/),
  password: Joi.string()
    .required()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/),
});

// Admin login schema
export const adminLoginSchema = Joi.object({
  email: Joi.string().required().email(),
  password: Joi.string().required(),
});

// Admin verify OTP schema
export const adminVerifyOTPSchema = Joi.object({
  email: Joi.string().required().email(),
  otpCode: Joi.string().required().length(6).pattern(/^[0-9]+$/),
});

// Admin resend OTP schema
export const adminResendOTPSchema = Joi.object({
  email: Joi.string().required().email(),
});
