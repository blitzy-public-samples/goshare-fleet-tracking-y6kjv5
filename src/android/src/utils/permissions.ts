// react-native-permissions v3.8.0
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
// react-native v0.72.0
import { PermissionsAndroid, Platform } from 'react-native';
import { FEATURE_FLAGS } from '../constants/config';

/**
 * HUMAN TASKS:
 * 1. Verify AndroidManifest.xml includes all required permission declarations
 * 2. Configure notification channels in Android for Android 8.0+
 * 3. Ensure proper Google Play Store permission declarations
 * 4. Test permissions on different Android API levels (especially 29+)
 */

// Permission rationale messages
const PERMISSION_RATIONALE = {
  location: 'Location access is required to track deliveries and provide accurate ETAs to customers.',
  locationBackground: 'Background location allows continuous route tracking even when the app is minimized.',
  camera: 'Camera access is needed to capture proof of delivery photos.',
  storage: 'Storage access is required to save delivery proof photos and offline data.',
  notifications: 'Notifications keep you updated with new deliveries and important updates.',
} as const;

/**
 * Checks if location permission is granted based on feature flags configuration
 * Requirement: GPS and sensor integration - Location permission checks
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  try {
    if (FEATURE_FLAGS.enableBackgroundTracking) {
      const backgroundPermission = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
      const finePermission = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      
      return backgroundPermission === RESULTS.GRANTED && finePermission === RESULTS.GRANTED;
    } else {
      const finePermission = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      return finePermission === RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};

/**
 * Requests location permission from the user with appropriate rationale
 * Requirement: GPS and sensor integration - Location permission requests
 */
export const requestLocationPermission = async (background: boolean = false): Promise<boolean> => {
  try {
    const rationale = {
      title: 'Location Permission',
      message: PERMISSION_RATIONALE.location,
      buttonPositive: 'Grant Permission',
    };

    const fineLocationGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      rationale
    );

    if (fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED && background) {
      if (Platform.Version >= 29 && FEATURE_FLAGS.enableBackgroundTracking) {
        const backgroundRationale = {
          title: 'Background Location',
          message: PERMISSION_RATIONALE.locationBackground,
          buttonPositive: 'Grant Permission',
        };

        const backgroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          backgroundRationale
        );

        return backgroundGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    return fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Checks if camera permission is granted for proof of delivery photos
 * Requirement: Digital proof of delivery - Camera permission checks
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    const permission = await check(PERMISSIONS.ANDROID.CAMERA);
    return permission === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

/**
 * Requests camera permission for proof of delivery functionality
 * Requirement: Digital proof of delivery - Camera permission requests
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const rationale = {
      title: 'Camera Permission',
      message: PERMISSION_RATIONALE.camera,
      buttonPositive: 'Grant Permission',
    };

    const granted = await request(PERMISSIONS.ANDROID.CAMERA);
    return granted === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Checks if notification permission is granted based on feature flags
 * Requirement: Push Notifications - Notification permission checks
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!FEATURE_FLAGS.enablePushNotifications) {
      return false;
    }

    if (Platform.Version >= 33) {
      const permission = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      return permission === RESULTS.GRANTED;
    }
    
    return true; // Notifications automatically granted below Android 13
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Requests notification permission for delivery updates
 * Requirement: Push Notifications - Notification permission requests
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!FEATURE_FLAGS.enablePushNotifications || Platform.Version < 33) {
      return true;
    }

    const rationale = {
      title: 'Notification Permission',
      message: PERMISSION_RATIONALE.notifications,
      buttonPositive: 'Grant Permission',
    };

    const granted = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
    return granted === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Checks if storage permission is granted for offline data and proof images
 * Requirement: Digital proof of delivery - Storage permission checks
 */
export const checkStoragePermission = async (): Promise<boolean> => {
  try {
    const permission = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
    return permission === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking storage permission:', error);
    return false;
  }
};

/**
 * Requests storage permission for offline functionality
 * Requirement: Digital proof of delivery - Storage permission requests
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  try {
    const rationale = {
      title: 'Storage Permission',
      message: PERMISSION_RATIONALE.storage,
      buttonPositive: 'Grant Permission',
    };

    const granted = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
    return granted === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting storage permission:', error);
    return false;
  }
};