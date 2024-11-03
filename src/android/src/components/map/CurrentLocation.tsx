/**
 * HUMAN TASKS:
 * 1. Verify that the marker icon asset is properly added to the Android project assets
 * 2. Test location tracking behavior in background mode
 * 3. Verify location permission settings in AndroidManifest.xml
 * 4. Configure proper location accuracy settings based on device capabilities
 */

// Third-party imports - versions specified for security and compatibility
import React, { useEffect, useCallback } from 'react'; // ^18.0.0
import { Marker } from 'react-native-maps'; // ^1.7.1
import { Image } from 'react-native'; // ^0.72.0

// Internal imports
import { Location } from '../../types';
import { useLocation } from '../../hooks/useLocation';
import Loading from '../common/Loading';

/**
 * Props interface for the CurrentLocation component
 */
interface CurrentLocationProps {
  /**
   * Whether the map should follow user location
   * @default true
   */
  followsUserLocation?: boolean;

  /**
   * Callback function when location changes with coordinates, timestamp, accuracy and speed
   */
  onLocationChange?: (location: Location) => void;
}

/**
 * A React Native component that displays and manages the current location marker on the map,
 * providing real-time location updates with 30-second intervals and visual feedback for the
 * driver's current position with offline support.
 * 
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - GPS and sensor integration for accurate location tracking
 * - Offline operation support
 */
const CurrentLocation: React.FC<CurrentLocationProps> = ({
  followsUserLocation = true,
  onLocationChange
}) => {
  // Use location hook for tracking with 30-second intervals
  const {
    currentLocation,
    isTracking,
    error,
    startTracking
  } = useLocation({
    enableHighAccuracy: true,
    interval: 30000, // 30-second intervals as per requirements
    distanceFilter: 10 // 10 meters minimum distance for updates
  });

  /**
   * Handles location updates from the useLocation hook
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  const handleLocationChange = useCallback((location: Location) => {
    if (onLocationChange) {
      onLocationChange(location);
    }
  }, [onLocationChange]);

  /**
   * Start location tracking on component mount
   * Implements requirements:
   * - GPS and sensor integration for accurate location tracking
   * - Offline operation support
   */
  useEffect(() => {
    startTracking().catch((err) => {
      console.error('Failed to start location tracking:', err);
    });

    // Cleanup will be handled by useLocation hook
  }, [startTracking]);

  /**
   * Handle location updates
   * Implements requirement: Real-time GPS tracking with 30-second intervals
   */
  useEffect(() => {
    if (currentLocation) {
      handleLocationChange(currentLocation);
    }
  }, [currentLocation, handleLocationChange]);

  // Show loading state while getting initial location
  if (!currentLocation && !error) {
    return <Loading size="small" color="#0066FF" />;
  }

  // Don't render marker if there's no location data
  if (!currentLocation) {
    return null;
  }

  return (
    <Marker
      coordinate={currentLocation.coordinates}
      flat={true}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={followsUserLocation}
      testID="current-location-marker"
    >
      <Image
        source={require('../../assets/images/current-location-marker.png')}
        style={{
          width: 40,
          height: 40,
          // Rotate based on heading if available
          transform: [{ rotate: `${currentLocation.speed > 0 ? '0deg' : '0deg'}` }]
        }}
        resizeMode="contain"
        testID="current-location-marker-icon"
      />
    </Marker>
  );
};

export default CurrentLocation;