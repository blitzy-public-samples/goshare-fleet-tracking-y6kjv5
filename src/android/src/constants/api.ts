/**
 * HUMAN TASKS:
 * 1. Verify API endpoints are correctly configured in backend services
 * 2. Ensure SSL certificates are properly installed for all environments
 * 3. Configure WebSocket server endpoints in infrastructure
 * 4. Set up proper CORS policies on backend for all endpoints
 */

import { APP_CONFIG } from './config';

// API version and timeout configuration
export const API_VERSION = 'v1';
export const API_TIMEOUT = 30000; // 30 seconds

// Environment-specific API base URLs
// Requirement: Backend service communication endpoints
export const API_BASE_URL = {
  development: 'https://api.dev.fleettracker.com',
  staging: 'https://api.staging.fleettracker.com',
  production: 'https://api.fleettracker.com',
} as const;

// WebSocket URLs for real-time communication
// Requirement: Two-way communication system between drivers and dispatch
export const WEBSOCKET_URL = {
  development: 'wss://ws.dev.fleettracker.com',
  staging: 'wss://ws.staging.fleettracker.com',
  production: 'wss://ws.fleettracker.com',
} as const;

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
} as const;

// Location tracking endpoints
// Requirement: Real-time GPS tracking with batch updates support
export const LOCATION_ENDPOINTS = {
  UPDATE: '/location/update',
  BATCH_UPDATE: '/location/batch-update', // For offline data sync
} as const;

// Delivery management endpoints
// Requirement: Digital proof of delivery endpoints
export const DELIVERY_ENDPOINTS = {
  LIST: '/deliveries',
  DETAILS: '/deliveries/:id',
  UPDATE_STATUS: '/deliveries/:id/status',
  SUBMIT_PROOF: '/deliveries/:id/proof', // For signature and photo upload
} as const;

// Route management endpoints
export const ROUTE_ENDPOINTS = {
  ACTIVE: '/routes/active',
  START: '/routes/:id/start',
  COMPLETE: '/routes/:id/complete',
  OPTIMIZE: '/routes/:id/optimize',
} as const;

// Data synchronization endpoints
// Requirement: Offline-first architecture with sync support
export const SYNC_ENDPOINTS = {
  UPLOAD: '/sync/upload',
  DOWNLOAD: '/sync/download',
} as const;

// Common API headers
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
} as const;

// API request configuration based on environment
export const getApiConfig = () => ({
  baseURL: API_BASE_URL[APP_CONFIG.environment],
  timeout: API_TIMEOUT,
  headers: {
    [API_HEADERS.CONTENT_TYPE]: 'application/json',
  },
});

// WebSocket configuration based on environment
export const getWebSocketConfig = () => ({
  url: WEBSOCKET_URL[APP_CONFIG.environment],
  options: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
  },
});

// Batch update configuration for offline sync
export const BATCH_CONFIG = {
  maxBatchSize: 100, // Maximum number of records per batch
  retryAttempts: 3, // Number of retry attempts for failed syncs
  syncInterval: 300000, // 5 minutes in milliseconds
} as const;

// API error codes and messages
export const API_ERRORS = {
  NETWORK_ERROR: 'Network error occurred',
  TIMEOUT_ERROR: 'Request timed out',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Internal server error',
} as const;

// Content types for file uploads
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
} as const;