const socialService = require('../services/socialService');

/**
 * Comments and follows. Mounted under the content and auth routers so the
 * public URLs stay resource-shaped: /api/contents/:id/comments and
 * /api/auth/users/:id/follow.
 */
class SocialController {
  /** GET /api/contents/:id/comments */
  async getComments(req, res) {
    try {
      const comments = await socialService.getComments(req.params.id);
      res.json({ success: true, data: comments });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch comments'
      });
    }
  }

  /** POST /api/contents/:id/comments */
  async addComment(req, res) {
    try {
      const { body, parentCommentId } = req.body;
      const comment = await socialService.addComment(
        req.params.id,
        req.user.id,
        body,
        parentCommentId ? parseInt(parentCommentId, 10) : null
      );
      res.status(201).json({ success: true, message: 'Comment added', data: comment });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to add comment'
      });
    }
  }

  /** DELETE /api/contents/comments/:commentId */
  async deleteComment(req, res) {
    try {
      await socialService.deleteComment(parseInt(req.params.commentId, 10), req.user.id);
      res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to delete comment'
      });
    }
  }

  /** POST /api/auth/users/:id/follow */
  async follow(req, res) {
    try {
      const stats = await socialService.follow(req.user.id, parseInt(req.params.id, 10));
      res.json({ success: true, message: 'Followed', data: stats });
    } catch (error) {
      console.error('Follow error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to follow'
      });
    }
  }

  /** DELETE /api/auth/users/:id/follow */
  async unfollow(req, res) {
    try {
      const stats = await socialService.unfollow(req.user.id, parseInt(req.params.id, 10));
      res.json({ success: true, message: 'Unfollowed', data: stats });
    } catch (error) {
      console.error('Unfollow error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to unfollow'
      });
    }
  }

  /** GET /api/auth/users/:id/follow-stats */
  async followStats(req, res) {
    try {
      const stats = await socialService.getFollowStats(
        parseInt(req.params.id, 10),
        req.user ? req.user.id : null
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Follow stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch follow stats' });
    }
  }
}

module.exports = new SocialController();
