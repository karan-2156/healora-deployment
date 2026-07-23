/**
 * asyncWrapper (also called catchAsync in many codebases)
 *
 * PROBLEM IT SOLVES:
 * Every async Express controller needs a try/catch to forward errors to next().
 * Without it, an unhandled rejected Promise in a controller causes an
 * UnhandledPromiseRejection — the request hangs and the server may crash.
 *
 * WITHOUT asyncWrapper — every controller looks like this:
 * ─────────────────────────────────────────────────────────────
 *   exports.login = async (req, res, next) => {
 *     try {
 *       const user = await AuthService.loginUser(req.body);
 *       return sendSuccess(res, { user }, 'Login successful');
 *     } catch (err) {
 *       next(err); // ← easy to forget
 *     }
 *   };
 *
 * WITH asyncWrapper — controllers are clean:
 * ─────────────────────────────────────────────────────────────
 *   exports.login = asyncWrapper(async (req, res, next) => {
 *     const user = await AuthService.loginUser(req.body);
 *     return sendSuccess(res, { user }, 'Login successful');
 *   });
 *
 * HOW IT WORKS:
 * asyncWrapper is a higher-order function. It accepts an async function `fn`
 * and returns a new function that Express can use as a route handler.
 * When `fn` throws (or rejects), Promise.resolve().catch(next) intercepts it
 * and forwards it to Express's global error handler automatically.
 *
 * This pattern will be used by EVERY controller in Phases 3–6.
 */

/**
 * @param {Function} fn - An async Express route handler (req, res, next) => Promise
 * @returns {Function}  - A wrapped handler that forwards errors to next()
 */
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
