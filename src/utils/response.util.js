/**
 * Send a custom response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {boolean} success - Success indicator
 * @param {string} message - Response message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const sendResponse = (
    res,
    status = 200,
    success = true,
    message = "",
    data = {}
) => {
    const response = {
        status,
        success,
        message,
        data,
    };

    return res.status(status).json(response);
};

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const successResponse = (res, message = "", data = {}) => {
    const response = {
        status: 200,
        success: true,
        message,
        data,
    };

    return res.status(200).json(response);
};

/**
 * Send a bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const badResponse = (res, message = "", data = {}) => {
    const response = {
        status: 400,
        success: false,
        message,
        data,
    };

    return res.status(400).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const errorResponse = (
    res,
    message = "Internal server error!",
    data = {},
    status = 500
) => {
    const response = {
        status,
        success: false,
        message,
        data,
    };

    return res.status(status).json(response);
};
