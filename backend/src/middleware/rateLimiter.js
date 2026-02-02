const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum 100 istek
  message: {
    success: false,
    message: 'Çok fazla istek attınız, lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Genel limit daha yüksek olabilir
  message: { success: false, message: 'Çok fazla istek.' }
});

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

// Semantic Search (Vektör Arama) - 1 dakikada 10 istek
// AI aramaları maliyetli olduğu için sınırı düşük tutuyoruz
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    message: 'Çok hızlı arama yapıyorsunuz, lütfen biraz bekleyin.'
  }
});

// İçerik Oluşturma - 15 dakikada 5 içerik
// Spam içerik üretimini engellemek için
const createContentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  message: {
    success: false,
    message: 'Çok fazla içerik paylaştınız. Lütfen biraz mola verin.'
  }
});

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
  } catch (error) {
    // Continue without auth
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  authLimiter,
  searchLimiter,
  createContentLimiter,
  apiLimiter
};