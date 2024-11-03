/**
 * HUMAN TASKS:
 * 1. Verify proper configuration of location tracking permissions in AndroidManifest.xml
 * 2. Configure offline storage limits in app settings
 * 3. Set up proper error handling and retry mechanisms for location updates
 * 4. Ensure background location tracking is properly configured
 */

// Third-party imports - versions specified for security and compatibility
import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5

// Internal imports
import { Location } from '../../types';
import { LocationService } from '../../services/location';

// Global constants for location tracking configuration
export const UPDATE_INTERVAL = 30000; // 30 seconds
export const MAX_HISTORY_SIZE = 1000; // Maximum number of location history entries

/**
 * Interface defining the location slice state structure
 * Implements requirement: Offline operation support
 */
interface LocationState {
  currentLocation: Location | null;
  locationHistory: Location[];
  isTracking: boolean;
  error: string | null;
}

/**
 * Initial state for the location slice
 */
const initialState: LocationState = {
  currentLocation: null,
  locationHistory: [],
  isTracking: false,
  error: null
};

/**
 * Redux slice for managing location state
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Offline location data handling and state management
 */
const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    /**
     * Updates current location and maintains location history
     * Implements requirement: Real-time GPS tracking with 30-second update intervals
     */
    updateLocation: (state: LocationState, action: PayloadAction<Location>) => {
      const location = action.payload;

      // Validate location data
      if (!location.coordinates || !location.timestamp || 
          typeof location.accuracy !== 'number' || 
          typeof location.speed !== 'number') {
        state.error = 'Invalid location data received';
        return;
      }

      // Update current location
      state.currentLocation = location;

      // Add to location history with timestamp
      state.locationHistory.push({
        ...location,
        timestamp: Date.now()
      });

      // Trim history if it exceeds maximum size
      if (state.locationHistory.length > MAX_HISTORY_SIZE) {
        state.locationHistory = state.locationHistory.slice(-MAX_HISTORY_SIZE);
      }

      // Clear any previous error state
      state.error = null;
    },

    /**
     * Updates location tracking status
     * Implements requirement: Real-time GPS tracking with 30-second update intervals
     */
    setTrackingStatus: (state: LocationState, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;

      // Clear error state when tracking is enabled
      if (action.payload) {
        state.error = null;
      } else {
        // Reset current location when tracking is disabled
        state.currentLocation = null;
      }
    },

    /**
     * Clears location history while maintaining current location
     * Implements requirement: Offline location data handling and state management
     */
    clearLocationHistory: (state: LocationState) => {
      // Preserve current location
      const currentLocation = state.currentLocation;

      // Reset location history
      state.locationHistory = [];

      // Restore current location
      state.currentLocation = currentLocation;

      // Maintain tracking status
      state.isTracking = state.isTracking;
    },

    /**
     * Updates error state for location tracking
     * Implements requirement: Error handling for location tracking
     */
    setError: (state: LocationState, action: PayloadAction<string>) => {
      state.error = action.payload;
    }
  }
});

// Export action creators
export const {
  updateLocation,
  setTrackingStatus,
  clearLocationHistory,
  setError
} = locationSlice.actions;

// Export reducer as default
export default locationSlice.reducer;

/**
 * Selector for getting current location
 */
export const selectCurrentLocation = (state: { location: LocationState }) => 
  state.location.currentLocation;

/**
 * Selector for getting location history
 */
export const selectLocationHistory = (state: { location: LocationState }) => 
  state.location.locationHistory;

/**
 * Selector for getting tracking status
 */
export const selectIsTracking = (state: { location: LocationState }) => 
  state.location.isTracking;

/**
 * Selector for getting error state
 */
export const selectLocationError = (state: { location: LocationState }) => 
  state.location.error;