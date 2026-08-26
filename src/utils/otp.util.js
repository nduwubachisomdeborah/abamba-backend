/**
 * Utility for OTP generation and verification
 */

/**
 * Generate a random OTP code
 * @param {number} length - Length of the OTP
 * @returns {string} - Generated OTP
 */
export const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/**
 * Get OTP expiry time
 * @param {number} minutes - Minutes until OTP expiry
 * @returns {Date} - OTP expiry date
 */
export const getOTPExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if OTP is expired
 * @param {Date} expiryDate - OTP expiry date
 * @returns {boolean} - True if OTP is expired
 */
export const isOTPExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Verify OTP code
 * @param {string} inputOTP - OTP entered by user
 * @param {string} storedOTP - OTP stored in database
 * @param {Date} expiryDate - OTP expiry date
 * @returns {boolean} - True if OTP is valid
 */
export const verifyOTP = (inputOTP, storedOTP, expiryDate) => {
  if (isOTPExpired(expiryDate)) {
    return false;
  }
  
  return inputOTP === storedOTP;
};
