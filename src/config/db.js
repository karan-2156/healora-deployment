/**
 * Database Connection — MongoDB Atlas via Mongoose
 *
 * DESIGN DECISIONS:
 *
 * 1. Mongoose over native MongoDB driver:
 *    - Schema-level validation (type checks, required fields, enums) runs before
 *      any data hits the database.
 *    - Pre/post hooks enable cross-cutting concerns (password hashing, date checks).
 *
 * 2. Models imported inside connectDB (not at the top of this file):
 *    - Ensures Mongoose schemas are registered AFTER the connection is established.
 *    - Prevents the "model not registered" error in test environments where
 *      connectDB may not be called.
 *
 * 3. Index sync in development:
 *    - `mongoose.set('autoIndex', ...)` controls whether Mongoose calls
 *      `ensureIndexes()` automatically on model load.
 *    - In development: true — creates indexes on startup (convenient).
 *    - In production: false — indexes should be managed via Atlas UI or migrations
 *      to avoid performance impact during high-traffic periods.
 *
 * IMPROVEMENT:
 *   Add exponential backoff retry logic here for transient Atlas connection failures.
 *   Libraries like `mongoose-connect-retry` or a manual setTimeout loop work well.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ── Index Strategy ───────────────────────────────────────
    // Auto-create indexes in development; disable in production for safety
    mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

    // ── Establish Connection ─────────────────────────────────
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
    console.log(`    Database: ${conn.connection.name}`);
    console.log(`    Auto-index: ${process.env.NODE_ENV !== 'production'}`);

    // ── Register All Models ──────────────────────────────────
    // Importing here ensures models are registered after the connection
    // is ready. The barrel export registers all 7 models at once.
    require('../models/index');

    const registeredModels = Object.keys(mongoose.models);
    console.log(`    Models registered: ${registeredModels.join(', ')}`);

    // ── Connection Event Listeners ───────────────────────────
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️   MongoDB disconnected. Mongoose will attempt to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅  MongoDB reconnected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌  MongoDB runtime error: ${err.message}`);
    });

  } catch (err) {
    console.error(`\n❌  MongoDB connection failed: ${err.message}\n`);
    // Exit the process — the app cannot function without a DB connection
    process.exit(1);
  }
};

/**
 * Gracefully closes the MongoDB connection.
 * Called during SIGTERM shutdown in server.js.
 *
 * IMPROVEMENT: Integrate this into the SIGTERM handler in server.js (Phase 7).
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅  MongoDB connection closed gracefully.');
  } catch (err) {
    console.error(`❌  Error closing MongoDB connection: ${err.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
