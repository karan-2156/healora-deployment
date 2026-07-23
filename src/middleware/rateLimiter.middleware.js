/**
 * Rate Limiter Middleware
 *
 * DESIGN DECISIONS:
 *
 * 1. WHY RATE-LIMIT AI ROUTES SPECIFICALLY?
 *    Each Gemini API call costs money and consumes quota. Without limits:
 *      - A single user (or malicious script) could exhaust the monthly quota.
 *      - A poorly written frontend loop could call /symptoms/analyze hundreds
 *        of times per minute.
 *      - Competitor scraping would be free.
 *    AI routes (/symptoms, /diet, /reports) are the only high-cost endpoints.
 *    Auth and CRUD routes are cheap — no rate limiting needed there for v1.
 *
 * 2. SEPARATE LIMITERS FOR DIFFERENT COST TIERS:
 *    - aiStandardLimiter: for symptom checker and diet (text-only, cheaper)
 *    - aiUploadLimiter:   for report upload (PDF parsing + Gemini, more expensive)
 *    This prevents a user from using up their report quota on chat messages.
 *
 * 3. RATE LIMIT KEY — IP ADDRESS:
 *    By default, express-rate-limit uses the IP address (req.ip) as the key.
 *    This means limits apply per-IP, not per-user. A VPN user could bypass this.
 *
 *    IMPROVEMENT: Use `keyGenerator: (req) => req.user?.id || req.ip` to apply
 *    limits per authenticated user ID (after the protect middleware runs). This
 *    requires applying the rate limiter AFTER `protect` in the middleware chain.
 *
 * 4. BEHIND A PROXY (AWS App Runner):
 *    When deployed behind AWS App Runner or a load balancer, req.ip may be
 *    the proxy's IP, not the client's IP. Set `app.set('trust proxy', 1)` in
 *    app.js to read the real IP from the X-Forwarded-For header.
 *    IMPROVEMENT: Add `app.set('trust proxy', 1)` in app.js for production.
 */

const rateLimit = require('express-rate-limit');

// ── Standard AI Limiter (Symptom Checker + Diet) ─────────────
/**
 * 20 requests per 15-minute window per IP.
 * A normal user having a symptom conversation might send 5-10 messages.
 * 20 gives comfortable headroom while blocking abuse.
 */
const aiStandardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // Max 20 requests per window
  standardHeaders: true,      // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,       // Disable X-RateLimit-* headers (deprecated)
  message: {
    success: false,
    message:
      'Too many requests. You have exceeded the limit of 20 AI queries per 15 minutes. ' +
      'Please wait before trying again.',
    data: null
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test'
});

// ── Upload Limiter (Report Analysis — PDF + AI) ───────────────
/**
 * 5 report uploads per hour per IP.
 * PDF parsing + Gemini analysis is the most expensive operation.
 * 5/hour is generous for legitimate use, strict for abuse.
 */
const aiUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                     // Max 100 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many report uploads. You have exceeded the limit of 5 report uploads per hour. ' +
      'Please wait before uploading again.',
    data: null
  },
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = { aiStandardLimiter, aiUploadLimiter };
