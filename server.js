/**
 * server.js — Application Entry Point
 *
 * EXECUTION ORDER (critical — do not reorder):
 *   1. Load .env file into process.env  (dotenv)
 *   2. Validate all required env vars   (env.js — exits if anything is missing)
 *   3. Connect to MongoDB Atlas         (db.js)
 *   4. Start the HTTP server            (app.js)
 *
 * DESIGN DECISION — why this order?
 *   dotenv must run before env.js, because env.js reads process.env.
 *   Both must run before connectDB, because connectDB reads MONGODB_URI.
 *   The HTTP server must start only after the DB is confirmed connected,
 *   so the app never receives requests it cannot serve.
 *
 * PROCESS SIGNAL HANDLING:
 *   - uncaughtException  — synchronous errors that were not caught anywhere
 *   - unhandledRejection — async errors (rejected Promises) with no .catch()
 *   - SIGTERM            — graceful shutdown signal from Docker, AWS, or OS
 *
 * IMPROVEMENT:
 *   For production, add a more robust graceful shutdown that:
 *     1. Stops accepting new requests
 *     2. Waits for in-flight requests to complete (connection draining)
 *     3. Closes the DB connection
 *     4. Then exits
 */

// ── Step 1: Load environment variables ────────────────────────
require('dotenv').config();

// ── Step 2: Validate environment variables (exits if invalid) ─
const validateEnv = require('./src/config/env');
validateEnv();

// ── Step 3 & 4: Import app and DB connector ───────────────────
const app                    = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// ── Handle synchronous uncaught exceptions ────────────────────
// These are bugs — log and crash immediately so the process manager restarts cleanly.
process.on('uncaughtException', (err) => {
  console.error('❌  UNCAUGHT EXCEPTION — shutting down immediately.');
  console.error(`   ${err.name}: ${err.message}`);
  process.exit(1); // Exit code 1 = abnormal termination
});

// ── Bootstrap the server ──────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB first — server does not start if this fails
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(
        `\n🚀  Server running in [${process.env.NODE_ENV}] mode on port ${PORT}\n`
      );
    });

    // ── Handle async unhandled promise rejections ──────────────
    // e.g. an await inside a route handler that throws but has no try/catch
    // and no asyncWrapper around it.
    // IMPROVEMENT: In Phase 7, every controller will use an asyncWrapper,
    // making this a genuine last-resort safety net rather than a common path.
    process.on('unhandledRejection', (err) => {
      console.error('❌  UNHANDLED REJECTION — shutting down gracefully.');
      console.error(`   ${err.name}: ${err.message}`);
      // Close the server gracefully before exiting
      server.close(() => {
        process.exit(1);
      });
    });

    // ── Handle SIGTERM (Docker stop, AWS App Runner scale-down) ─
    // This is the standard shutdown signal from container orchestrators.
    // We close the HTTP server, then the DB connection, then exit.
    process.on('SIGTERM', async () => {
      console.log('⚠️   SIGTERM received — shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        console.log('✅  HTTP server and DB closed. Process exiting.');
        process.exit(0); // Exit code 0 = clean termination
      });
    });

  } catch (err) {
    console.error(`❌  Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
