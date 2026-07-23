/**
 * validateObjectId Middleware
 *
 * PROBLEM IT SOLVES:
 * Every route with a `:id` param makes a MongoDB query using that ID.
 * If the ID is not a valid 24-character hex ObjectId (e.g., the client
 * sends "abc" or "123"), Mongoose throws a CastError that bubbles up
 * as an unformatted 500 response instead of a clean 400.
 *
 * Without this middleware:
 *   GET /api/reminders/not-a-real-id
 *   → CastError: Cast to ObjectId failed for value "not-a-real-id"
 *   → 500 Internal Server Error (exposes internal stack trace)
 *
 * With this middleware:
 *   GET /api/reminders/not-a-real-id
 *   → AppError: Invalid ID format.
 *   → 400 Bad Request (clean, client-facing message)
 *
 * DESIGN DECISION — Factory function vs single middleware:
 *   We export a factory function `validateObjectId(paramName)` rather
 *   than a single fixed middleware. This allows it to work with any
 *   param name (:id, :sessionId, :contactId, etc.).
 *
 *   Usage:
 *     router.get('/:id', validateObjectId('id'), controller.getOne);
 *     router.get('/:reminderId', validateObjectId('reminderId'), controller.get);
 *
 * REUSE:
 *   Applied to every :id param route in all Phase 5 routers.
 *   Previously, report.controller.js did this check manually per handler —
 *   that logic is superseded by this shared middleware going forward.
 *
 * IMPROVEMENT:
 *   In Phase 7, apply this globally via a router-level param hook:
 *     router.param('id', validateObjectId('id'));
 *   so it runs automatically for every route with an :id segment.
 */

const mongoose = require('mongoose');
const AppError  = require('../utils/AppError');

/**
 * @param {string} paramName - The route param name to validate (default: 'id')
 * @returns {Function}        - Express middleware
 */
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const value = req.params[paramName];

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return next(
      new AppError(
        `Invalid ${paramName}: "${value}" is not a valid ID format.`,
        400
      )
    );
  }

  next();
};

module.exports = validateObjectId;
