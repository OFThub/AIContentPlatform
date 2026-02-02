const authService = require('../services/authService');

/**
 * Auth Controller
 * Handles authentication-related HTTP requests
 */

class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { username, email, password, fullName } = req.body;
      
      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }
      
      // Password strength check
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      
      // Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      
      const result = await authService.register({
        username,
        email,
        password,
        fullName
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }
  
  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      const result = await authService.login({ username, password });
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }
  
  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      const profile = await authService.getUserProfile(req.user.id);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }
  
  /**
   * Get user profile by ID
   * GET /api/users/:id
   */
  async getUserProfile(req, res) {
    try {
      const { id } = req.params;
      
      const profile = await authService.getUserProfile(id);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'User not found'
      });
    }
  }
  
  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const updates = req.body;
      
      const profile = await authService.updateProfile(req.user.id, updates);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }
  
  /**
   * Change password
   * PUT /api/auth/password
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Old and new passwords are required'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }
      
      await authService.changePassword(req.user.id, oldPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to change password'
      });
    }
  }
}

module.exports = new AuthController();