const { createClient } = require('redis');
require('dotenv').config();

/**
 * Redis Client Configuration
 * 
 * Redis kullanım alanları bu projede:
 * 1. Session management
 * 2. API response caching
 * 3. Rate limiting
 * 4. Popular content lists cache
 * 5. User activity tracking
 */

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return retries * 100; // Exponential backoff
    }
  }
});

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

/**
 * Awaited by server.js at boot. The previous floating IIFE let module import
 * resolve before the socket was up, so a failed connect produced a running
 * server whose every cache read silently returned null.
 */
const initRedis = async () => {
  if (redisClient.isOpen) return redisClient;
  await redisClient.connect();
  return redisClient;
};


/**
 * Cache Helper Functions
 */

/**
 * Get cached data
 */
const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

/**
 * Set cache with TTL
 */
const setCache = async (key, value, ttl = 3600) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

/**
 * Delete cache
 */
const delCache = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 */
const delCachePattern = async (pattern) => {
  try {
    // SCAN instead of KEYS: KEYS blocks the Redis main thread across the
    // entire keyspace, and this runs on every content create/update/delete.
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      await redisClient.del(key);
    }
    return true;
  } catch (error) {
    console.error('Redis pattern delete error:', error);
    return false;
  }
};

/**
 * Increment counter (for rate limiting)
 */
const incrementCounter = async (key, ttl = 60) => {
  try {
    const value = await redisClient.incr(key);
    if (value === 1) {
      await redisClient.expire(key, ttl);
    }
    return value;
  } catch (error) {
    console.error('Redis INCR error:', error);
    return 0;
  }
};

/**
 * Add to sorted set (for leaderboards, trending)
 */
const addToSortedSet = async (key, score, member) => {
  try {
    await redisClient.zAdd(key, { score, value: member });
    return true;
  } catch (error) {
    console.error('Redis ZADD error:', error);
    return false;
  }
};

/**
 * Get top items from sorted set
 */
const getTopFromSortedSet = async (key, limit = 10) => {
  try {
    return await redisClient.zRange(key, 0, limit - 1, { REV: true });
  } catch (error) {
    console.error('Redis ZRANGE error:', error);
    return [];
  }
};

/**
 * Cache Strategies Implementation
 */

/**
 * Cache-Aside Pattern
 * 1. Check cache first
 * 2. If miss, fetch from DB
 * 3. Store in cache
 */
const cacheAside = async (key, fetchFunction, ttl = 3600) => {
  // Try cache first
  let data = await getCache(key);
  
  if (data) {
    return { data, cached: true };
  }
  
  // Cache miss - fetch from source
  data = await fetchFunction();
  
  // Store in cache
  if (data) {
    await setCache(key, data, ttl);
  }
  
  return { data, cached: false };
};

/**
 * Write-Through Pattern
 * Write to cache and DB simultaneously
 */
const writeThrough = async (key, value, dbWriteFunction, ttl = 3600) => {
  // Write to DB
  const result = await dbWriteFunction(value);
  
  // Write to cache
  if (result) {
    await setCache(key, result, ttl);
  }
  
  return result;
};

module.exports = {
  redisClient,
  initRedis,
  getCache,
  setCache,
  delCache,
  delCachePattern,
  incrementCounter,
  addToSortedSet,
  getTopFromSortedSet,
  cacheAside,
  writeThrough
};