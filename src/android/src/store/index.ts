/**
 * HUMAN TASKS:
 * 1. Configure proper offline storage limits in app settings
 * 2. Set up proper SSL pinning for API communication
 * 3. Verify proper permissions for location tracking
 * 4. Configure proper token refresh intervals
 */

// Third-party imports with versions
import { configureStore, combineReducers } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'; // ^6.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

// Import reducers from feature slices
import authReducer from './slices/authSlice';
import locationReducer from './slices/locationSlice';
import routeReducer from './slices/routeSlice';
import deliveryReducer from './slices/deliverySlice';

// Global constants
export const UPDATE_INTERVAL = 30000; // 30-second update interval for location tracking

/**
 * Root reducer combining all feature slices
 * Requirement: Centralized state management for the mobile driver app
 */
const rootReducer = combineReducers({
  auth: authReducer,
  location: locationReducer,
  route: routeReducer,
  delivery: deliveryReducer
});

/**
 * Redux persist configuration
 * Requirement: Offline-first architecture with persistence using AsyncStorage
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // Whitelist specific reducers for persistence
  whitelist: ['auth', 'location', 'route', 'delivery'],
  // Blacklist specific state slices from persistence
  blacklist: []
};

/**
 * Create persisted reducer with offline support
 * Requirement: Implements offline-first state management
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Configure and create Redux store with middleware
 * Requirements:
 * - Offline-first architecture
 * - Real-time data synchronization
 * - Mobile driver applications state management
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific action types in serializability check
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Ignore specific paths in state serialization check
        ignoredPaths: ['location.currentLocation.timestamp']
      },
      // Enable thunk middleware for async actions
      thunk: true
    }),
  // Enable Redux DevTools in development
  devTools: __DEV__
});

/**
 * Create persistor for offline state management
 * Requirement: Offline-first architecture with persistence
 */
export const persistor = persistStore(store);

/**
 * Initialize location tracking interval
 * Requirement: Real-time data synchronization with 30-second intervals
 */
if (store.getState().auth.isAuthenticated) {
  setInterval(() => {
    const state = store.getState();
    if (state.location.isTracking) {
      // Dispatch location update action
      store.dispatch({ 
        type: 'location/updateLocation',
        payload: {
          timestamp: Date.now(),
          // Additional location data will be added by the location service
        }
      });
    }
  }, UPDATE_INTERVAL);
}

/**
 * Export RootState type for TypeScript support
 * Requirement: Type safety for state management
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Export AppDispatch type for TypeScript support
 */
export type AppDispatch = typeof store.dispatch;

// Export store instance and persistor
export default { store, persistor };