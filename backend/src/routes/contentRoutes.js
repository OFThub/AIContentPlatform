const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const socialController = require('../controllers/socialController');
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

// AI generation. Same limiter as manual creation: both mint content.
router.post(
  '/generate',
  authMiddleware,
  createContentLimiter,
  contentController.generateContent
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

// Comments. The comments table existed from day one but had no endpoints.
// Placed before '/:id' style routes is unnecessary here because the segment
// after the id is literal, so Express matches them unambiguously.
router.get(
  '/:id/comments',
  socialController.getComments
);

router.post(
  '/:id/comments',
  authMiddleware,
  socialController.addComment
);

router.delete(
  '/comments/:commentId',
  authMiddleware,
  socialController.deleteComment
);

// Bookmarks
router.get(
  '/bookmarks/me',
  authMiddleware,
  contentController.getUserBookmarks
);

module.exports = router;