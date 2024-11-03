// Redis client library v5.3.0
import Redis from 'ioredis';
import { CACHE_KEYS, LOCATION_CONSTANTS } from '../constants';

// Human Tasks:
// 1. Configure Redis credentials in environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
// 2. Set up Redis Sentinel/Cluster configuration if using high availability setup
// 3. Adjust connection pool settings based on load testing results
// 4. Configure Redis key prefix in environment variables to isolate different environments

// Requirement: Data Layer Configuration - Redis caching layer configuration
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'fleet:',
  retryStrategy: (times: number): number => {
    // Exponential backoff with max 30 second delay
    return Math.min(times * 1000, 30000);
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true
};

// Requirement: Performance Requirements - Efficient resource utilization
let redisClient: Redis;

// Requirement: Real-time Processing - Redis for caching and real-time processing
export function createRedisClient(): Redis {
  const client = new Redis(REDIS_CONFIG);

  // Error handling for connection failures
  client.on('error', (error: Error) => {
    console.error('Redis connection error:', error);
  });

  // Reconnection event handling
  client.on('reconnecting', (times: number) => {
    console.warn(`Redis reconnecting... Attempt ${times}`);
  });

  // Connection success handling
  client.on('connect', () => {
    console.info('Redis client connected successfully');
  });

  // Connection ready handling
  client.on('ready', () => {
    console.info('Redis client ready to accept commands');
  });

  return client;
}

// Requirement: Caching Architecture - Redis Cache implementation for performance optimization
export function getRedisKeyTTL(keyType: string): number {
  switch (keyType) {
    case CACHE_KEYS.VEHICLE_LOCATION:
      // Use location cache TTL from constants for vehicle locations
      return LOCATION_CONSTANTS.LOCATION_CACHE_TTL;
    case CACHE_KEYS.ACTIVE_ROUTES:
      // Cache active routes for 1 hour
      return 3600;
    case CACHE_KEYS.USER_SESSION:
      // Cache user sessions for 24 hours
      return 86400;
    default:
      // Default TTL of 5 minutes for other keys
      return 300;
  }
}

// Initialize Redis client as singleton
if (!redisClient) {
  redisClient = createRedisClient();
}

export { redisClient };