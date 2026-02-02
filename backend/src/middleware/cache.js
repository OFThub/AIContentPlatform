const { getCache, setCache } = require('../config/redis');

/**
 * Cache Middleware
 * Automatically cache GET requests
 * 
 * Cache-Aside pattern implementation
 */

/**
 * Create cache middleware
 * 
 * @param {Object} options
 * @param {number} options.ttl - Cache TTL in seconds
 * @param {Function} options.keyGenerator - Custom key generator function
 */
const createCacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`
  } = options;
  
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    try {
      const cacheKey = keyGenerator(req);
      
      // Try to get from cache
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        // Cache hit
        return res.json({
          ...cachedData,
          cached: true,
          cacheKey
        });
      }
      
      // Cache miss - capture response
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Store in cache (only successful responses)
        if (res.statusCode === 200 && data.success !== false) {
          setCache(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        // Send response
        return originalJson({
          ...data,
          cached: false
        });
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Cache invalidation helper
 */
const invalidateCache = (pattern) => {
  const { delCachePattern } = require('../config/redis');
  return delCachePattern(pattern);
};

/**
 * Predefined cache strategies
 */

// Short cache (5 minutes) - For frequently changing data
const shortCache = createCacheMiddleware({
  ttl: parseInt(process.env.CACHE_TTL_SHORT || '300')
});

// Medium cache (30 minutes) - For moderately changing data
const mediumCache = createCacheMiddleware({
  ttl: parseInt(process.env.CACHE_TTL_MEDIUM || '1800')
});

// Long cache (1 hour) - For rarely changing data
const longCache = createCacheMiddleware({
  ttl: parseInt(process.env.CACHE_TTL_LONG || '3600')
});

// User-specific cache
const userCache = createCacheMiddleware({
  ttl: 300,
  keyGenerator: (req) => `cache:user:${req.user?.id}:${req.originalUrl}`
});

module.exports = {
  createCacheMiddleware,
  shortCache,
  mediumCache,
  longCache,
  userCache,
  invalidateCache
};