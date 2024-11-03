// Node.js process module - built-in
import { env } from 'process';

// Human Tasks:
// 1. Set up environment variables in .env file for production deployment
// 2. Configure JWT secret key in environment variables
// 3. Review and adjust performance-related constants based on load testing results
// 4. Ensure Redis cache TTL values align with infrastructure setup

// Requirement: System Performance - Sub-second response times and 30-second maximum data latency
export const APP_CONSTANTS = {
  PORT: parseInt(env.PORT || '3000', 10),
  API_VERSION: 'v1',
  NODE_ENV: env.NODE_ENV || 'development',
  API_TIMEOUT: 5000, // 5 seconds max API timeout for sub-second response requirement
  MAX_REQUEST_SIZE: '50mb',
  RATE_LIMIT: 1000, // requests per minute
  COMPRESSION_LEVEL: 6,
};

// Requirement: Real-time GPS tracking with 30-second update intervals
export const LOCATION_CONSTANTS = {
  UPDATE_INTERVAL: 30000, // 30 seconds in milliseconds
  LOCATION_CACHE_TTL: 60, // 60 seconds cache TTL for location data
  MAX_LOCATION_HISTORY: 1000, // Maximum location points to store per vehicle
  STALE_LOCATION_THRESHOLD: 90000, // 90 seconds threshold for stale location data
  GEOFENCE_PRECISION: 6, // Decimal places for geofence coordinates
  BATCH_SIZE: 100, // Batch size for location updates processing
};

// Constants for route optimization and management
export const ROUTE_CONSTANTS = {
  MAX_STOPS_PER_ROUTE: 50, // Maximum number of delivery stops per route
  MAX_ROUTE_DURATION: 43200, // 12 hours in seconds
  OPTIMIZATION_TIMEOUT: 30000, // 30 seconds timeout for route optimization
  MIN_STOP_DURATION: 180, // 3 minutes minimum stop duration
  MAX_OPTIMIZATION_ATTEMPTS: 3,
  ROUTE_CACHE_TTL: 300, // 5 minutes cache TTL for route data
};

// Requirement: Security protocols and configuration constants
export const SECURITY_CONSTANTS = {
  JWT_EXPIRY: '24h', // JWT token expiry time
  PASSWORD_MIN_LENGTH: 12, // Minimum password length
  MAX_LOGIN_ATTEMPTS: 5, // Maximum failed login attempts
  LOCKOUT_DURATION: 900, // 15 minutes account lockout duration
  TOKEN_REFRESH_WINDOW: '2h', // Token refresh window
  HASH_ROUNDS: 12, // Password hashing rounds
  SESSION_TIMEOUT: 3600, // 1 hour session timeout
};

// Standard HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER: 500,
};

// Standardized error messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED_ACCESS: 'You are not authorized to access this resource',
  RESOURCE_NOT_FOUND: 'The requested resource was not found',
  INVALID_REQUEST: 'Invalid request parameters',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later',
  LOCATION_UPDATE_FAILED: 'Failed to update location data',
  ROUTE_OPTIMIZATION_FAILED: 'Failed to optimize route',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
};

// Redis cache key patterns
export const CACHE_KEYS = {
  VEHICLE_LOCATION: 'vehicle:location:', // Prefix for vehicle location cache keys
  ACTIVE_ROUTES: 'route:active:', // Prefix for active route cache keys
  USER_SESSION: 'user:session:', // Prefix for user session cache keys
  RATE_LIMIT: 'rate:limit:', // Prefix for rate limiting keys
  GEOFENCE: 'geofence:', // Prefix for geofence cache keys
  OPTIMIZATION: 'optimization:', // Prefix for route optimization cache keys
};