const { query } = require('../config/database');

/**
 * Comments and follows.
 *
 * The comments table shipped in init.sql but nothing in the backend ever
 * referenced it, and follows did not exist at all until migration 0005.
 * contents.comment_count is maintained by a database trigger, so nothing here
 * touches that counter directly.
 */
class SocialService {
  /**
   * Content is addressable by numeric id or slug everywhere else, so the
   * comment endpoints accept both rather than 500-ing on a slug.
   *
   * Only published content resolves. Without the status filter a draft or
   * archived item leaked through here -- its comments were readable and
   * writable even though contentService.getContentById 404s on it.
   */
  async resolveContentId(idOrSlug) {
    const key = String(idOrSlug);
    const { rows } = await query(
      `SELECT id FROM contents
        WHERE status = 'published'
          AND (slug = $1 OR ($1 ~ '^[0-9]+$' AND id = $1::int))
        LIMIT 1`,
      [key]
    );
    if (rows.length === 0) {
      const err = new Error('Content not found');
      err.status = 404;
      throw err;
    }
    return rows[0].id;
  }

  /**
   * Threaded comments, newest root first, replies oldest first beneath.
   */
  async getComments(idOrSlug) {
    const contentId = await this.resolveContentId(idOrSlug);
    const result = await query(
      `SELECT c.id, c.content_id, c.parent_comment_id, c.body, c.like_count,
              c.created_at, u.id AS user_id, u.username, u.avatar_url
         FROM comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.content_id = $1
        ORDER BY COALESCE(c.parent_comment_id, c.id) DESC, c.created_at ASC`,
      [contentId]
    );
    return result.rows;
  }

  async addComment(idOrSlug, userId, body, parentCommentId = null) {
    const contentId = await this.resolveContentId(idOrSlug);
    const text = String(body || '').trim();
    if (!text) {
      const err = new Error('Comment body is required');
      err.status = 400;
      throw err;
    }

    // A reply must belong to the same content, otherwise a crafted parent id
    // would graft a thread onto an unrelated article.
    if (parentCommentId) {
      const parent = await query(
        'SELECT 1 FROM comments WHERE id = $1 AND content_id = $2',
        [parentCommentId, contentId]
      );
      if (parent.rows.length === 0) {
        const err = new Error('Parent comment not found on this content');
        err.status = 400;
        throw err;
      }
    }

    const result = await query(
      `INSERT INTO comments (content_id, user_id, parent_comment_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content_id, parent_comment_id, body, like_count, created_at`,
      [contentId, userId, parentCommentId, text]
    );
    return result.rows[0];
  }

  async deleteComment(commentId, userId) {
    const result = await query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );
    if (result.rows.length === 0) {
      const err = new Error('Comment not found or unauthorized');
      err.status = 404;
      throw err;
    }
    return true;
  }

  async follow(followerId, followingId) {
    if (Number(followerId) === Number(followingId)) {
      const err = new Error('You cannot follow yourself');
      err.status = 400;
      throw err;
    }
    await query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [followerId, followingId]
    );
    return this.getFollowStats(followingId, followerId);
  }

  async unfollow(followerId, followingId) {
    await query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return this.getFollowStats(followingId, followerId);
  }

  /**
   * Counts for a profile, plus whether the viewer follows them.
   */
  async getFollowStats(userId, viewerId = null) {
    const result = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers,
         (SELECT COUNT(*)::int FROM follows WHERE follower_id  = $1) AS following,
         EXISTS(
           SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1
         ) AS is_following`,
      [userId, viewerId]
    );
    return result.rows[0];
  }
}

module.exports = new SocialService();
