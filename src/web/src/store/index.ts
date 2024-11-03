// @reduxjs/toolkit version ^1.9.5
// redux-thunk version ^2.4.2
// redux-logger version ^3.0.6

// Human Tasks:
// 1. Configure environment variables for Redux DevTools enablement
// 2. Set up monitoring for Redux state changes in production
// 3. Review middleware configuration with performance team
// 4. Verify WebSocket connection settings for real-time updates
// 5. Configure logging levels for different environments

import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

// Import reducers from feature slices
import analyticsReducer from './slices/analyticsSlice';
import authReducer from './slices/authSlice';
import locationReducer from './slices/locationSlice';
import fleetReducer from './slices/fleetSlice';
import routeReducer from './slices/routeSlice';
import notificationReducer from './slices/notificationSlice';

/**
 * Interface for store configuration options
 * Implements requirement: State Management - Redux State Management for web dashboard
 */
interface StoreConfig {
  enableDevTools: boolean;
  enableLogger: boolean;
  additionalMiddleware: any[];
}

/**
 * Configures and creates the Redux store with all reducers and middleware
 * Implements requirements:
 * - Real-time data visualization (1.1 System Overview/Web Dashboard)
 * - State Management (4.2.1 Frontend Components)
 * - Real-time communications (1.1 System Overview/Core Backend Services)
 */
const configureAppStore = (config: Partial<StoreConfig> = {}) => {
  const {
    enableDevTools = process.env.NODE_ENV !== 'production',
    enableLogger = process.env.NODE_ENV === 'development',
    additionalMiddleware = []
  } = config;

  // Configure middleware array based on environment
  const middleware = [
    thunk, // For handling async actions and real-time updates
    ...additionalMiddleware
  ];

  // Add logger middleware in development environment only
  if (enableLogger) {
    middleware.push(logger);
  }

  // Create store with combined reducers and middleware
  const store = configureStore({
    reducer: {
      analytics: analyticsReducer,    // Analytics state management
      auth: authReducer,              // Authentication state with JWT tokens
      location: locationReducer,      // Location tracking with 30-second updates
      fleet: fleetReducer,            // Fleet management state
      route: routeReducer,            // Route management and optimization
      notification: notificationReducer // Real-time system notifications
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore certain action types for date handling
          ignoredActions: ['location/updateVehicleLocation'],
          // Ignore certain paths in the state for date objects
          ignoredPaths: [
            'location.lastUpdate',
            'fleet.vehicles.lastUpdate',
            'notification.lastUpdated'
          ]
        },
        // Enable immutability check in development only
        immutableCheck: process.env.NODE_ENV === 'development'
      }).concat(middleware),
    devTools: enableDevTools && {
      // Configure Redux DevTools options
      name: 'Fleet Tracking Dashboard',
      trace: true,
      traceLimit: 25
    }
  });

  return store;
};

// Create the store instance
export const store = configureAppStore();

// Export RootState type for use in components and hooks
export type RootState = ReturnType<typeof store.getState>;

// Export Dispatch type for use in components and hooks
export type AppDispatch = typeof store.dispatch;

// Export store configuration function for testing and custom initialization
export default configureAppStore;

/**
 * Type guard to check if an error is a serializable error object
 */
export const isSerializableError = (error: unknown): error is { message: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
};

/**
 * Constants for store configuration
 */
export const STORE_CONFIG = {
  // Maximum number of actions to keep in DevTools history
  MAX_HISTORY_LENGTH: 50,
  // Interval for state persistence (ms)
  PERSISTENCE_INTERVAL: 1000 * 60, // 1 minute
  // Maximum size of persisted state (bytes)
  MAX_PERSISTED_STATE_SIZE: 1024 * 1024, // 1MB
  // Throttle interval for real-time updates (ms)
  REAL_TIME_UPDATE_THROTTLE: 1000 // 1 second
} as const;