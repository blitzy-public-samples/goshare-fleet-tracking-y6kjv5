// react v18.2.0
import { useState, useEffect, useCallback } from 'react';

// Internal imports for permission utilities
import {
  checkLocationPermission,
  requestLocationPermission,
  checkCameraPermission,
  requestCameraPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  checkStoragePermission,
  requestStoragePermission,
} from '../utils/permissions';

/**
 * HUMAN TASKS:
 * 1. Verify AndroidManifest.xml includes all required permission declarations
 * 2. Test permission flows on Android 10+ for background location
 * 3. Implement proper error handling in components using this hook
 * 4. Add proper permission denied handling in UI components
 */

/**
 * Custom hook for managing Android runtime permissions with state management
 * Implements permission checks and requests for location, camera, storage, and notifications
 */
export const usePermissions = () => {
  // Permission states
  const [locationPermission, setLocationPermission] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [storagePermission, setStoragePermission] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);

  // Initial permission checks on mount
  useEffect(() => {
    const checkPermissions = async () => {
      // Requirement: GPS and sensor integration - Check location permission status
      const locationGranted = await checkLocationPermission();
      setLocationPermission(locationGranted);

      // Requirement: Digital proof of delivery - Check camera and storage permissions
      const cameraGranted = await checkCameraPermission();
      setCameraPermission(cameraGranted);

      const storageGranted = await checkStoragePermission();
      setStoragePermission(storageGranted);

      // Requirement: Two-way communication system - Check notification permission
      const notificationGranted = await checkNotificationPermission();
      setNotificationPermission(notificationGranted);
    };

    checkPermissions();
  }, []);

  // Memoized permission request handlers
  const requestLocation = useCallback(async (): Promise<boolean> => {
    // Requirement: GPS and sensor integration - Request location permission with background option
    const granted = await requestLocationPermission(true);
    setLocationPermission(granted);
    return granted;
  }, []);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    // Requirement: Digital proof of delivery - Request camera permission for proof photos
    const granted = await requestCameraPermission();
    setCameraPermission(granted);
    return granted;
  }, []);

  const requestStorage = useCallback(async (): Promise<boolean> => {
    // Requirement: Digital proof of delivery - Request storage permission for offline storage
    const granted = await requestStoragePermission();
    setStoragePermission(granted);
    return granted;
  }, []);

  const requestNotifications = useCallback(async (): Promise<boolean> => {
    // Requirement: Two-way communication system - Request notification permission for delivery updates
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted);
    return granted;
  }, []);

  return {
    // Current permission states
    locationPermission,
    cameraPermission,
    storagePermission,
    notificationPermission,
    // Permission request handlers
    requestLocation,
    requestCamera,
    requestStorage,
    requestNotifications,
  };
};