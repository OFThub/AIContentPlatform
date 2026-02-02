const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * Auth Routes
 * Authentication and user management endpoints
 */

// Public routes
router.post(
  '/register',
  authLimiter,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  authController.login
);

// Protected routes
router.get(
  '/me',
  authMiddleware,
  authController.getMe
);

router.put(
  '/profile',
  authMiddleware,
  authController.updateProfile
);

router.put(
  '/password',
  authMiddleware,
  authController.changePassword
);

// Public user profile
router.get(
  '/users/:id',
  authController.getUserProfile
);

module.exports = router;