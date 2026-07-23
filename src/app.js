/**
 * app.js — Express Application Bootstrap
 *
 * Responsibilities:
 *   - Configure and apply all middleware in the correct order.
 *   - Mount all API route groups.
 *   - Register the 404 handler and the global error handler (must be last).
 *
 * DESIGN DECISION — app.js vs server.js separation:
 *   - server.js handles process-level concerns: DB connection, port binding, signals.
 *   - app.js handles HTTP-level concerns: middleware, routes, error handling.
 *   - This separation makes the app independently importable in tests via `require('./app')`
 *     without actually starting a server or connecting to MongoDB.
 *
 * MIDDLEWARE ORDER (order matters in Express):
 *   1. Security headers (helmet)     — must be first
 *   2. CORS                          — before body parsers
 *   3. Body parsers                  — before routes
 *   4. Request logger (morgan)       — after parsers so body is available
 *   5. Routes
 *   6. 404 handler                   — after routes, catches unmatched paths
 *   7. Global error handler          — must be the absolute last middleware
 */
const path = require("path");
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const app = express();

// ─────────────────────────────────────────────
// 0.  PROXY TRUST (must be set before rate limiters)
// ─────────────────────────────────────────────
// AWS App Runner, ECS, and most cloud platforms run the app behind a
// reverse proxy/load balancer. Without this setting, req.ip returns the
// proxy's internal IP instead of the real client IP, breaking rate limiting.
// '1' means trust the first proxy hop in the X-Forwarded-For chain.
// IMPORTANT: Only set this if you are behind a trusted proxy.
// Setting it without a proxy allows clients to spoof their IP by
// sending a fake X-Forwarded-For header.
app.set('trust proxy', 1);

// ─────────────────────────────────────────────
// 1.  SECURITY HEADERS (Helmet)
// ─────────────────────────────────────────────
// Helmet sets ~15 HTTP headers that protect against common web vulnerabilities
// (XSS, clickjacking, MIME sniffing, etc.) by default.
// IMPROVEMENT: In production, configure a strict Content-Security-Policy here.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// ─────────────────────────────────────────────
// 2.  CORS
// ─────────────────────────────────────────────
// DESIGN DECISION:
// Only requests from FRONTEND_URL are allowed. This prevents other origins
// from calling the API directly in a browser context.
// For the health check endpoint specifically, no origin restriction is needed,
// but we keep it consistent for simplicity.
//
// IMPROVEMENT: For production, lock 'methods' down to only what each route uses
// (GET, POST, PUT, DELETE) rather than allowing all methods.
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Needed if the frontend sends cookies or Authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// ─────────────────────────────────────────────
// 3.  BODY PARSERS
// ─────────────────────────────────────────────
// DESIGN DECISION — 10kb JSON body limit:
// Prevents large payload attacks (a common DoS vector).
// PDF uploads bypass this limit because they use multipart/form-data (Multer),
// not JSON. Multer's own size limit is defined in upload.middleware.js.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads"))
);
// ─────────────────────────────────────────────
// 4.  REQUEST LOGGING (Morgan)
// ─────────────────────────────────────────────
// 'dev' format: colored, concise output — good for development.
// IMPROVEMENT: In production, switch to 'combined' format and pipe logs to a
// file or a logging service like AWS CloudWatch.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─────────────────────────────────────────────
// 5.  API HEALTH CHECK
// ─────────────────────────────────────────────
// A public endpoint used by AWS App Runner, Docker healthchecks, and load balancers
// to verify the service is alive without touching the database.
// IMPROVEMENT: Add a deeper health check at /health/db that pings MongoDB.
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Health Assistant API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// 6.  API ROUTES
// ─────────────────────────────────────────────
// Routes are mounted incrementally per phase.
// Each route file handles one resource under /api/<resource>.

// Phase 3: Authentication
app.use('/api/auth', require('./routes/auth.routes'));

// Test Route
app.use('/api/test', require('./routes/test.routes'));

// Phase 4: AI Module (Symptom Checker, Diet Advisor, Report Analysis)
app.use('/api/symptoms', require('./routes/symptom.routes'));
app.use('/api/diet',     require('./routes/diet.routes'));
app.use('/api/reports',  require('./routes/report.routes'));

// Phase 5: Core CRUD Feature Routes
// Phase 5: Core CRUD Feature Routes
app.use('/api/reminders',    require('./routes/reminder.routes'));
app.use('/api/appointments', require('./routes/appointment.routes'));
app.use('/api/health',       require('./routes/health.routes'));
app.use('/api/emergency',    require('./routes/emergency.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/water', require('./routes/water.routes'));
app.use(express.static(path.join(__dirname, "../Frontend")));
// ─────────────────────────────────────────────
// 7.  404 — NOT FOUND HANDLER
// ─────────────────────────────────────────────
// Catches any request that didn't match a route above.
// Must come AFTER all routes and BEFORE the error handler.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// Existing 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null
  });
});

// ─────────────────────────────────────────────
// 8.  GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
// Express identifies a 4-argument function as an error handler.
// Any controller that calls next(err) or throws inside an async wrapper
// will land here. Full implementation moved to Phase 7 (error.middleware.js).
//
// DESIGN DECISION — stack trace visibility:
// Stack traces are only sent in development. In production, internal details
// must never be exposed to the client (security + information leakage).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
    // Stack only visible in development — never expose in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
