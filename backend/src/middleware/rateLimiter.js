const rateLimit = require('express-rate-limit');

/**
 * Rate limiters.
 *
 * This file used to also export its own copies of authMiddleware and
 * optionalAuth, duplicating middleware/auth.js. Nothing imported them, so the
 * two would have drifted silently. Authentication lives in auth.js only.
 */

const jsonMessage = (message) => ({ success: false, message });

// Credential endpoints. 100 attempts per 15 minutes was effectively no limit
// for an online guessing attack.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: jsonMessage('Too many authentication attempts. Try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: jsonMessage('Too many requests.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Semantic search costs an embedding call per request, so it is kept tight.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: jsonMessage('Searching too quickly. Please wait a moment.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Content creation and AI generation, to blunt spam.
const createContentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage('You have published a lot recently. Please take a break.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  searchLimiter,
  createContentLimiter,
};
