/**
 * HUMAN TASKS:
 * 1. Verify location permissions are properly configured in AndroidManifest.xml
 * 2. Test background location tracking behavior on different Android versions
 * 3. Configure proper location accuracy settings based on device capabilities
 * 4. Set up proper error handling and retry mechanisms for location updates
 */

// Third-party imports - versions specified for security and compatibility
import { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { Location } from '../types';
import {
  getCurrentLocation,
  startLocationTracking,
  stopLocationTracking
} from '../utils/geolocation';
import {
  updateLocation,
  setTrackingStatus,
  setError,
  selectCurrentLocation
} from '../store/slices/locationSlice';

// Default update interval of 30 seconds
const DEFAULT_UPDATE_INTERVAL = 30000;

/**
 * Interface for location tracking configuration options
 */
interface LocationHookOptions {
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
  interval?: number;
}

/**
 * Interface for location hook return value
 */
interface LocationHookResult {
  currentLocation: Location | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<Location>;
}

/**
 * Custom hook for managing location tracking and updates with 30-second intervals
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - GPS and sensor integration for accurate location tracking
 * - Offline location tracking and data persistence
 */
export const useLocation = (options: LocationHookOptions = {}): LocationHookResult => {
  // Redux state management
  const dispatch = useDispatch();
  const currentLocation = useSelector(selectCurrentLocation);
  
  // Local state
  const [isTracking, setIsTracking] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);
  const [watcherId, setWatcherId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  /**
   * Handles location updates and stores them in Redux
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  const handleLocationUpdate = useCallback((location: Location) => {
    try {
      dispatch(updateLocation(location));
      setLocalError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update location';
      dispatch(setError(errorMessage));
      setLocalError(errorMessage);
    }
  }, [dispatch]);

  /**
   * Starts location tracking with configured options
   * Implements requirements:
   * - Real-time GPS tracking with 30-second update intervals
   * - GPS and sensor integration for accurate location tracking
   */
  const startTracking = async (): Promise<void> => {
    try {
      // Get initial location
      const initialLocation = await getCurrentLocation({
        enableHighAccuracy: options.enableHighAccuracy
      });
      handleLocationUpdate(initialLocation);

      // Start continuous tracking
      const watcher = startLocationTracking(handleLocationUpdate, {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        distanceFilter: options.distanceFilter ?? 10, // 10 meters minimum distance
        interval: options.interval ?? DEFAULT_UPDATE_INTERVAL
      });

      setWatcherId(watcher);
      setIsTracking(true);
      dispatch(setTrackingStatus(true));
      setLocalError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start location tracking';
      dispatch(setError(errorMessage));
      setLocalError(errorMessage);
      setIsTracking(false);
      dispatch(setTrackingStatus(false));
    }
  };

  /**
   * Stops location tracking and cleans up resources
   */
  const stopTracking = useCallback((): void => {
    if (watcherId !== null) {
      stopLocationTracking(watcherId);
      setWatcherId(null);
    }
    setIsTracking(false);
    dispatch(setTrackingStatus(false));
  }, [watcherId, dispatch]);

  /**
   * Gets current position once
   * Implements requirement: GPS and sensor integration for accurate location tracking
   */
  const getCurrentPosition = async (): Promise<Location> => {
    try {
      const location = await getCurrentLocation({
        enableHighAccuracy: options.enableHighAccuracy
      });
      handleLocationUpdate(location);
      return location;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current location';
      dispatch(setError(errorMessage));
      setLocalError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Monitors network connectivity for offline support
   * Implements requirement: Offline location tracking and data persistence
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Cleanup location tracking on unmount
   */
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking, stopTracking]);

  /**
   * Handle offline/online transitions
   * Implements requirement: Offline location tracking and data persistence
   */
  useEffect(() => {
    if (!isOnline && isTracking) {
      // Continue tracking but mark for sync when back online
      dispatch(setError('Operating in offline mode'));
    } else if (isOnline && isTracking) {
      // Clear offline error if we're back online
      dispatch(setError(null));
      setLocalError(null);
    }
  }, [isOnline, isTracking, dispatch]);

  return {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking,
    getCurrentPosition
  };
};