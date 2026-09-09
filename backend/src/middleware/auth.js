const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Authentication Middleware
 * Checks JWT token in Authorization header
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Optional auth middleware
 * Doesn't fail if no token, just adds user if token exists
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email
      };
    }
    
    next();
  } catch {
    // Continue without auth
    next();
  }
};

/**
 * Admin guard. The role is read from the database rather than the JWT so that
 * revoking admin takes effect immediately instead of at token expiry.
 * Must run after authMiddleware.
 */
const adminMiddleware = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (rows[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminMiddleware
};
