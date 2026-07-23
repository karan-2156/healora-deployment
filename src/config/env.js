/**
 * Environment Variable Validator
 *
 * DESIGN DECISION:
 * This module runs synchronously before any other code (imported first in server.js).
 * If a required variable is missing, the process exits immediately with a clear error.
 * This is called "fail fast" — it prevents cryptic runtime errors like
 * "Cannot read property of undefined" appearing deep inside a request cycle.
 *
 * TRADE-OFF:
 * Option A (this approach) — Validate on startup. Simple, zero dependencies, immediate feedback.
 * Option B — Use a library like 'joi' or 'zod' for schema-based validation with type coercion.
 *   - Better for large teams or complex config, but adds a dependency.
 *   - Recommended upgrade if the project grows significantly.
 */

const REQUIRED_ENV_VARS = [
  'PORT',
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'FRONTEND_URL'
];

const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      '\n❌  STARTUP ERROR: The following required environment variables are missing:\n' +
      missing.map((k) => `   - ${k}`).join('\n') +
      '\n\n   Please check your .env file against .env.example and try again.\n'
    );
    process.exit(1);
  }

  // Validate NODE_ENV is one of the expected values
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.error(
      `\n❌  STARTUP ERROR: NODE_ENV must be one of: ${validEnvs.join(', ')}\n`
    );
    process.exit(1);
  }

  console.log('✅  Environment variables validated successfully.');
};

module.exports = validateEnv;
