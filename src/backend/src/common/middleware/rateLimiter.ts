// Express rate limiter middleware v4.18.0
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { createRedisClient } from '../config/redis';

// Human Tasks:
// 1. Configure DEFAULT_RATE_LIMIT and DEFAULT_WINDOW_MS in environment variables if different values are needed
// 2. Set up monitoring alerts for high rate limit violations
// 3. Configure custom error responses in the rate limit handler if needed
// 4. Implement IP allow/block lists if required for certain clients

// Global constants for rate limiting configuration
const DEFAULT_RATE_LIMIT = 100; // Maximum requests per window
const DEFAULT_WINDOW_MS = 60000; // Time window in milliseconds (1 minute)
const RATE_LIMIT_PREFIX = 'ratelimit:';

// Interface for rate limiter configuration options
export interface RateLimiterOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Maximum number of requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator function
  handler?: (req: Request, res: Response) => void; // Custom rate limit exceeded handler
  skipFailedRequests?: boolean; // Whether to skip failed requests
  requestPropertyName?: string; // Property name to store rate limit info on request object
}

/**
 * Extracts unique client identifier from request
 * Requirement: Security - API Gateway with request validation and throttling
 */
function getClientIdentifier(req: Request): string {
  // Check for API key in header
  const apiKey = req.header('X-API-Key');
  if (apiKey) {
    return `apikey:${apiKey}`;
  }

  // Check for forwarded IP (when behind proxy/load balancer)
  const forwardedFor = req.header('X-Forwarded-For');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  // Fallback to direct IP
  return `ip:${req.ip}`;
}

/**
 * Factory function that creates a rate limiter middleware instance
 * Requirement: API Rate Limiting - Load balancer and API gateway with rate limiting capabilities
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  // Initialize Redis client
  const redis = createRedisClient();
  
  // Merge options with defaults
  const {
    windowMs = DEFAULT_WINDOW_MS,
    max = DEFAULT_RATE_LIMIT,
    keyGenerator = getClientIdentifier,
    handler = (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skipFailedRequests = false,
    requestPropertyName = 'rateLimit'
  } = options;

  /**
   * Rate limiter middleware function
   * Requirement: Performance Requirements - Support for 10,000+ concurrent users
   * Requirement: Scalability - Distributed service instances with Redis cluster
   */
  return async function rateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Generate unique key for the client
      const key = `${RATE_LIMIT_PREFIX}${keyGenerator(req)}`;
      
      // Get current timestamp
      const now = Date.now();
      
      // Start Redis transaction
      const multi = redis.multi();
      
      // Clean old requests and add new request atomically
      multi
        .zremrangebyscore(key, 0, now - windowMs) // Remove expired entries
        .zadd(key, now, `${now}`) // Add current request
        .zcard(key) // Get total requests in window
        .pexpire(key, windowMs); // Set key expiration
      
      // Execute transaction
      const [, , requestCount] = await multi.exec() as [any, any, [null | Error, number]];
      
      // Check if we have valid results
      if (!requestCount || requestCount[0]) {
        throw requestCount[0] || new Error('Redis transaction failed');
      }

      // Store rate limit info on request object
      if (requestPropertyName) {
        (req as any)[requestPropertyName] = {
          limit: max,
          current: requestCount[1],
          remaining: Math.max(0, max - requestCount[1]),
          resetTime: now + windowMs
        };
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestCount[1]));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      // Check if limit is exceeded
      if (requestCount[1] > max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return handler(req, res);
      }

      // Continue to next middleware
      return next();
    } catch (error) {
      // Log error and continue if skipFailedRequests is true
      console.error('Rate limiter error:', error);
      if (skipFailedRequests) {
        return next();
      }
      
      // Otherwise, send 500 error
      res.status(500).json({
        error: 'Internal server error in rate limiter'
      });
    }
  };
}