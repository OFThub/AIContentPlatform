const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { searchLimiter, createContentLimiter } = require('../middleware/rateLimiter');
const { shortCache, mediumCache, longCache } = require('../middleware/cache');

/**
 * Content Routes
 * All content-related endpoints
 */

// Public routes (with optional auth for personalization)
router.get(
  '/',
  optionalAuth,
  mediumCache,
  contentController.getContents
);

router.get(
  '/popular',
  longCache,
  contentController.getPopularContents
);

router.get(
  '/trending',
  mediumCache,
  contentController.getTrendingContents
);

router.get(
  '/:id',
  optionalAuth,
  shortCache,
  contentController.getContent
);

router.get(
  '/:id/analytics',
  shortCache,
  contentController.getContentAnalytics
);

// Search endpoints
router.post(
  '/search/semantic',
  searchLimiter,
  contentController.semanticSearch
);

// Protected routes (require authentication)
router.post(
  '/',
  authMiddleware,
  createContentLimiter,
  contentController.createContent
);

router.put(
  '/:id',
  authMiddleware,
  contentController.updateContent
);

router.delete(
  '/:id',
  authMiddleware,
  contentController.deleteContent
);

// Interaction endpoints
router.post(
  '/:id/like',
  authMiddleware,
  contentController.likeContent
);

router.post(
  '/:id/share',
  authMiddleware,
  contentController.shareContent
);

router.post(
  '/:id/bookmark',
  authMiddleware,
  contentController.bookmarkContent
);

router.delete(
  '/:id/bookmark',
  authMiddleware,
  contentController.removeBookmark
);

// Bookmarks
router.get(
  '/bookmarks/me',
  authMiddleware,
  contentController.getUserBookmarks
);

module.exports = router;