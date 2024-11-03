/**
 * HUMAN TASKS:
 * 1. Ensure environment variables are properly configured in the build system
 * 2. Update APP_VERSION and BUILD_NUMBER during CI/CD pipeline
 * 3. Verify GPS permissions are properly configured in AndroidManifest.xml
 * 4. Configure Firebase Cloud Messaging for push notifications
 */

// Global application version and build information
export const APP_VERSION: string = '1.0.0';
export const BUILD_NUMBER: string = '1';
export const DEBUG_MODE: boolean = __DEV__;

// Core application configuration
export const APP_CONFIG = {
  // Requirement: System configuration for environment management
  environment: __DEV__ ? 'development' : 'production',
  version: APP_VERSION,
  buildNumber: BUILD_NUMBER,
} as const;

// Location tracking configuration
export const LOCATION_CONFIG = {
  // Requirement 1.2 Scope/Core Functionality: Real-time GPS tracking with 30-second intervals
  updateInterval: DEFAULT_LOCATION_CONFIG.updateInterval, // 30000ms = 30 seconds
  accuracy: DEFAULT_LOCATION_CONFIG.accuracy, // 'high' for precise tracking
  distanceFilter: DEFAULT_LOCATION_CONFIG.distanceFilter, // 10 meters minimum distance between updates
} as const;

// Offline operation configuration
export const OFFLINE_CONFIG = {
  // Requirement 1.1 System Overview/Mobile Applications: Offline-first architecture
  maxStorageSize: DEFAULT_OFFLINE_CONFIG.maxStorageSize, // 100MB storage limit
  syncInterval: DEFAULT_OFFLINE_CONFIG.syncInterval, // 5 minutes sync interval
  retryAttempts: DEFAULT_OFFLINE_CONFIG.retryAttempts, // 3 retry attempts for failed syncs
} as const;

// System performance configuration
export const SYSTEM_CONFIG = {
  // Requirement 1.2 Scope/Performance Requirements: System performance parameters
  apiTimeout: DEFAULT_SYSTEM_CONFIG.apiTimeout, // 30 seconds API timeout
  maxImageSize: DEFAULT_SYSTEM_CONFIG.maxImageSize, // 5MB image size limit
  maxCacheSize: DEFAULT_SYSTEM_CONFIG.maxCacheSize, // 50MB cache limit
} as const;

// Feature flag configuration
export const FEATURE_FLAGS = {
  // Core feature toggles for application capabilities
  enableOfflineMode: true, // Enable offline operation capability
  enablePushNotifications: true, // Enable push notification system
  enableBackgroundTracking: true, // Enable background location tracking
} as const;

// Default configuration constants
const DEFAULT_LOCATION_CONFIG = {
  updateInterval: 30000, // 30 seconds in milliseconds
  accuracy: 'high' as const,
  distanceFilter: 10, // meters
} as const;

const DEFAULT_OFFLINE_CONFIG = {
  maxStorageSize: 104857600, // 100MB in bytes
  syncInterval: 300000, // 5 minutes in milliseconds
  retryAttempts: 3,
} as const;

const DEFAULT_SYSTEM_CONFIG = {
  apiTimeout: 30000, // 30 seconds in milliseconds
  maxImageSize: 5242880, // 5MB in bytes
  maxCacheSize: 52428800, // 50MB in bytes
} as const;