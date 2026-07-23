/**
 * AppError — Custom Operational Error Class
 *
 * DESIGN DECISION — AppError vs plain Error:
 *
 * Node's built-in `Error` has no `statusCode`. Without a custom class, every
 * controller would need to manually build an error object and call res.status()
 * before passing it to next(). That is repetitive and inconsistent.
 *
 * With AppError, a controller can do:
 *   throw new AppError('Email already registered', 409);
 * or:
 *   return next(new AppError('Not authenticated', 401));
 *
 * The global error handler in app.js reads `err.statusCode` and `err.isOperational`
 * to decide what to return to the client.
 *
 * isOperational FLAG:
 *   - true  → Predictable, user-caused errors (wrong password, missing field, etc.)
 *             Safe to return the message to the client.
 *   - false → Programmer errors (ReferenceError, SyntaxError, unexpected crashes).
 *             These should return a generic "Internal Server Error" message — never
 *             expose stack traces or internal details to the client in production.
 *
 * The global error handler (Phase 7) will use this flag to decide the response.
 * For now, app.js handles it with a basic fallback.
 */

class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message (sent to client)
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 409, 500, etc.)
   */
  constructor(message, statusCode) {
    // Call the parent Error constructor to set this.message and capture the stack
    super(message);

    this.statusCode  = statusCode;
    this.isOperational = true; // Marks this as a known, safe-to-expose error

    // Captures the stack trace excluding the AppError constructor itself
    // Makes debugging easier — the trace points to the throw site, not here
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
