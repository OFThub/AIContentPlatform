const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Authentication Service
 * Handles user registration, login, and JWT token management
 */

class AuthService {
  /**
   * Register new user
   */
  async register(userData) {
    const { username, email, password, fullName } = userData;
    
    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      throw new Error('Username or email already exists');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert user
    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name, created_at`,
      [username, email, passwordHash, fullName]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      },
      token
    };
  }
  
  /**
   * Login user
   */
  async login(credentials) {
    const { username, password } = credentials;
    
    // Find user
    const result = await query(
      `SELECT id, username, email, password_hash, full_name, avatar_url, reputation_score
       FROM users 
       WHERE username = $1 OR email = $1`,
      [username]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        reputationScore: user.reputation_score
      },
      token
    };
  }
  
  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );
  }
  
  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const result = await query(
      `SELECT 
         u.id,
         u.username,
         u.email,
         u.full_name,
         u.avatar_url,
         u.bio,
         u.reputation_score,
         u.created_at,
         COUNT(DISTINCT c.id) as content_count,
         SUM(c.view_count) as total_views,
         SUM(c.like_count) as total_likes
       FROM users u
       LEFT JOIN contents c ON u.id = c.user_id AND c.status = 'published'
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    return result.rows[0];
  }
  
  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const { fullName, bio, avatarUrl } = updates;
    
    const updateFields = [];
    const params = [userId];
    let paramIndex = 2;
    
    if (fullName !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      params.push(fullName);
    }
    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex}`);
      params.push(bio);
    }
    if (avatarUrl !== undefined) {
      updateFields.push(`avatar_url = $${paramIndex++}`);
      params.push(avatarUrl);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    const result = await query(
      `UPDATE users 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, email, full_name, avatar_url, bio`,
      params
    );
    
    return result.rows[0];
  }
  
  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    
    if (!isValid) {
      throw new Error('Invalid current password');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );
    
    return true;
  }
}

module.exports = new AuthService();