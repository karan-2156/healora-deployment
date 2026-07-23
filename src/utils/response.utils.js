/**
 * Standardized API Response Helpers
 *
 * DESIGN DECISION:
 * All API responses in this project follow a single envelope shape:
 *   { success: boolean, message: string, data: object | null }
 *
 * Why a consistent envelope?
 *   - The frontend can always check `response.success` before reading `response.data`.
 *   - It prevents a mix of flat responses and nested responses across endpoints.
 *   - Makes error handling on the client side predictable and reusable.
 *
 * Usage in a controller:
 *   return sendSuccess(res, { user }, 'Login successful');
 *   return sendError(res, 'Invalid credentials', 401);
 */

/**
 * Send a successful JSON response.
 * @param {object} res       - Express response object
 * @param {object} data      - Payload to return (default: empty object)
 * @param {string} message   - Human-readable success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = {}, message = 'Request successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error JSON response.
 * @param {object} res       - Express response object
 * @param {string} message   - Human-readable error message
 * @param {number} statusCode - HTTP status code (default: 400)
 */
const sendError = (res, message = 'Something went wrong', statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null
  });
};

module.exports = { sendSuccess, sendError };
