/**
 * HUMAN TASKS:
 * 1. Verify that location permissions are properly configured in AndroidManifest.xml
 * 2. Ensure background location tracking is enabled in app capabilities
 * 3. Test location tracking behavior with different Android versions
 * 4. Configure proper location accuracy settings based on device capabilities
 */

// Third-party imports - versions specified for security and compatibility
import Geolocation from '@react-native-community/geolocation'; // ^3.0.6
import { PermissionsAndroid } from 'react-native'; // ^0.72.0

// Internal imports
import { Location } from '../types';
import { LOCATION_CONFIG } from '../constants/config';

/**
 * Requirement: GPS and sensor integration
 * Requests location permission from the user for GPS tracking
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS !== 'android') {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Fleet Tracker needs access to your location for real-time tracking',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Requirement: GPS and sensor integration
 * Gets the current device location using GPS
 */
export const getCurrentLocation = async (
  options: LocationOptions = {}
): Promise<Location> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 15000,
        maximumAge: 10000,
      }
    );
  });
};

/**
 * Requirement: Real-time GPS tracking
 * Starts continuous location tracking with 30-second intervals
 */
export const startLocationTracking = (
  callback: (location: Location) => void,
  options: LocationOptions = {}
): number => {
  const watchOptions = {
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    distanceFilter: options.distanceFilter ?? LOCATION_CONFIG.distanceFilter,
    interval: options.interval ?? LOCATION_CONFIG.updateInterval,
    timeout: options.timeout ?? 15000,
  };

  return Geolocation.watchPosition(
    (position) => {
      const location: Location = {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || 0,
      };
      callback(location);
    },
    (error) => {
      console.error('Location tracking error:', error);
    },
    watchOptions
  );
};

/**
 * Requirement: Real-time GPS tracking
 * Stops location tracking and cleans up resources
 */
export const stopLocationTracking = (watcherId: number): void => {
  Geolocation.clearWatch(watcherId);
};

/**
 * Requirement: GPS and sensor integration
 * Calculates distance between two coordinates using Haversine formula
 */
export const calculateDistance = (start: Location, end: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (start.coordinates.latitude * Math.PI) / 180;
  const φ2 = (end.coordinates.latitude * Math.PI) / 180;
  const Δφ = ((end.coordinates.latitude - start.coordinates.latitude) * Math.PI) / 180;
  const Δλ = ((end.coordinates.longitude - start.coordinates.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Type definition for location tracking configuration options
interface LocationOptions {
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
  interval?: number;
  timeout?: number;
}