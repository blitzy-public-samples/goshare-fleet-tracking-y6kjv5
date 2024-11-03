// @reduxjs/toolkit version ^1.9.5
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vehicle, Coordinates } from '../../types';
import { SOCKET_EVENTS, LOCATION_UPDATE_INTERVAL } from '../../constants';
import { subscribeToVehicleUpdates } from '../../services/socket';

// Human Tasks:
// 1. Configure geofencing boundaries in environment variables
// 2. Set up monitoring alerts for tracking data latency
// 3. Review data retention policies with compliance team
// 4. Verify real-time update interval with infrastructure capacity
// 5. Set up alerts for geofence violations

interface LocationState {
  vehicles: {
    [id: string]: Vehicle;
  };
  trackingHistory: {
    [vehicleId: string]: {
      coordinates: Coordinates[];
      timestamps: Date[];
    };
  };
  geofenceAlerts: {
    [vehicleId: string]: {
      timestamp: Date;
      violation: string;
      location: Coordinates;
    }[];
  };
  lastUpdate: Date | null;
  isTracking: boolean;
  error: string | null;
}

const initialState: LocationState = {
  vehicles: {},
  trackingHistory: {},
  geofenceAlerts: {},
  lastUpdate: null,
  isTracking: false,
  error: null
};

// Maximum history entries to keep per vehicle
const MAX_HISTORY_ENTRIES = 1000;

// Maximum age of history entries in milliseconds (24 hours)
const MAX_HISTORY_AGE = 24 * 60 * 60 * 1000;

/**
 * Redux slice for managing real-time vehicle location state
 * Implements requirements:
 * - Real-time GPS tracking (1.2 Scope/Core Functionality)
 * - Geofencing and zone management (1.2 Scope/Core Functionality)
 * - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
 */
const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    /**
     * Updates the location of a specific vehicle and manages tracking history
     * Implements requirement: Real-time GPS tracking with 30-second update intervals
     */
    updateVehicleLocation: (
      state,
      action: PayloadAction<{ vehicleId: string; location: Coordinates }>
    ) => {
      const { vehicleId, location } = action.payload;
      const currentTime = new Date();

      // Update vehicle location
      if (state.vehicles[vehicleId]) {
        state.vehicles[vehicleId].currentLocation = location;
        state.vehicles[vehicleId].lastUpdate = currentTime;
      }

      // Initialize tracking history if needed
      if (!state.trackingHistory[vehicleId]) {
        state.trackingHistory[vehicleId] = {
          coordinates: [],
          timestamps: []
        };
      }

      // Add to tracking history
      state.trackingHistory[vehicleId].coordinates.push(location);
      state.trackingHistory[vehicleId].timestamps.push(currentTime);

      // Trim history if exceeds maximum entries
      if (state.trackingHistory[vehicleId].coordinates.length > MAX_HISTORY_ENTRIES) {
        state.trackingHistory[vehicleId].coordinates.shift();
        state.trackingHistory[vehicleId].timestamps.shift();
      }

      // Remove old entries beyond retention period
      const oldestAllowedTime = new Date(currentTime.getTime() - MAX_HISTORY_AGE);
      while (
        state.trackingHistory[vehicleId].timestamps.length > 0 &&
        state.trackingHistory[vehicleId].timestamps[0] < oldestAllowedTime
      ) {
        state.trackingHistory[vehicleId].coordinates.shift();
        state.trackingHistory[vehicleId].timestamps.shift();
      }

      state.lastUpdate = currentTime;
      state.error = null;
    },

    /**
     * Checks for geofence violations and creates alerts
     * Implements requirement: Geofencing alerts and zone management
     */
    checkGeofenceViolation: (
      state,
      action: PayloadAction<{
        vehicleId: string;
        location: Coordinates;
        geofence: {
          coordinates: Coordinates[];
          type: 'inclusion' | 'exclusion';
        };
      }>
    ) => {
      const { vehicleId, location, geofence } = action.payload;
      const isInside = isPointInPolygon(location, geofence.coordinates);

      // Check for violation based on geofence type
      const violation =
        (geofence.type === 'inclusion' && !isInside) ||
        (geofence.type === 'exclusion' && isInside);

      if (violation) {
        if (!state.geofenceAlerts[vehicleId]) {
          state.geofenceAlerts[vehicleId] = [];
        }

        state.geofenceAlerts[vehicleId].push({
          timestamp: new Date(),
          violation: `Vehicle ${vehicleId} ${
            geofence.type === 'inclusion' ? 'left' : 'entered'
          } restricted zone`,
          location
        });
      }
    },

    /**
     * Clears location history for specified vehicles
     * Implements requirement: Real-time location visualization on dashboard
     */
    clearLocationHistory: (state, action: PayloadAction<string[]>) => {
      const vehicleIds = action.payload;
      vehicleIds.forEach(vehicleId => {
        if (state.trackingHistory[vehicleId]) {
          delete state.trackingHistory[vehicleId];
        }
        if (state.geofenceAlerts[vehicleId]) {
          delete state.geofenceAlerts[vehicleId];
        }
      });
    },

    setTrackingStatus: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }
  }
});

// Helper function to check if a point is inside a polygon using ray casting algorithm
const isPointInPolygon = (point: Coordinates, polygon: Coordinates[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude <
        ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
};

// Export actions and reducer
export const {
  updateVehicleLocation,
  checkGeofenceViolation,
  clearLocationHistory,
  setTrackingStatus,
  setError
} = locationSlice.actions;

// Async thunk for subscribing to vehicle updates
export const subscribeToVehicles = (vehicleIds: string[]) => async (dispatch: any) => {
  try {
    // Set up socket subscription
    subscribeToVehicleUpdates(vehicleIds);
    dispatch(setTrackingStatus(true));

    // Set up interval for regular updates
    const updateInterval = setInterval(() => {
      vehicleIds.forEach(vehicleId => {
        const vehicle = store.getState().location.vehicles[vehicleId];
        if (vehicle) {
          // Check for stale data
          const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
          const currentTime = new Date().getTime();
          if (currentTime - lastUpdateTime > LOCATION_UPDATE_INTERVAL * 2) {
            dispatch(setError(`Vehicle ${vehicleId} location data is stale`));
          }
        }
      });
    }, LOCATION_UPDATE_INTERVAL);

    // Clean up function
    return () => {
      clearInterval(updateInterval);
      dispatch(setTrackingStatus(false));
    };
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to subscribe to vehicle updates'));
    dispatch(setTrackingStatus(false));
  }
};

export default locationSlice.reducer;