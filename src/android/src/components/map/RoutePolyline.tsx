/**
 * HUMAN TASKS:
 * 1. Verify that the Google Maps API key is properly configured in AndroidManifest.xml
 * 2. Ensure proper location permissions are granted for background tracking
 * 3. Test polyline rendering performance with large datasets
 * 4. Configure proper map styling in theme configuration
 */

// Third-party imports
import React, { useEffect, useState, useCallback } from 'react'; // ^18.2.0
import { StyleSheet } from 'react-native'; // ^0.72.0
import { Polyline } from 'react-native-maps'; // ^1.7.1

// Internal imports
import { Route, Location, LatLng, Delivery, RouteStatus } from '../../types';
import { calculateDistance } from '../../utils/geolocation';
import { RouteService } from '../../services/route';

// Initialize route service
const routeService = new RouteService();

// Props interface for the RoutePolyline component
interface RoutePolylineProps {
  route: Route;
  currentLocation: Location;
  strokeWidth?: number;
  strokeColor?: string;
  onRouteUpdate: (route: Route) => void;
}

/**
 * RoutePolyline component that renders the delivery route path on the map
 * Implements requirements: Interactive mapping, Route optimization and planning, Real-time data synchronization
 */
const RoutePolyline: React.FC<RoutePolylineProps> = ({
  route,
  currentLocation,
  strokeWidth = 3,
  strokeColor = '#2196F3',
  onRouteUpdate
}) => {
  // State for polyline coordinates and visibility
  const [coordinates, setCoordinates] = useState<LatLng[]>([]);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0);

  /**
   * Formats route delivery coordinates into a polyline path
   * Implements requirement: Interactive mapping with real-time polyline updates
   */
  const formatCoordinates = useCallback((route: Route, currentLocation: Location): LatLng[] => {
    if (!route || !route.deliveries || route.deliveries.length === 0) {
      return [];
    }

    // Extract and sort deliveries based on optimal order
    const sortedDeliveries = [...route.deliveries].sort((a, b) => {
      const aIndex = route.deliveries.indexOf(a);
      const bIndex = route.deliveries.indexOf(b);
      return aIndex - bIndex;
    });

    // Create coordinate array including current location
    const coords: LatLng[] = [currentLocation.coordinates];

    // Add delivery coordinates in order
    sortedDeliveries.forEach((delivery: Delivery) => {
      if (delivery.status !== 'COMPLETED') {
        coords.push({
          latitude: delivery.coordinates.latitude,
          longitude: delivery.coordinates.longitude
        });
      }
    });

    return coords;
  }, []);

  /**
   * Updates the polyline when route or location changes
   * Implements requirement: Real-time data synchronization with 30-second location intervals
   */
  const updatePolyline = useCallback(async (
    updatedRoute: Route,
    currentLocation: Location
  ): Promise<void> => {
    try {
      const currentTime = Date.now();
      
      // Enforce 30-second update interval
      if (currentTime - lastUpdateTimestamp < 30000) {
        return;
      }

      // Format coordinates for the polyline
      const newCoordinates = formatCoordinates(updatedRoute, currentLocation);
      setCoordinates(newCoordinates);

      // Calculate distances between points for optimization
      if (newCoordinates.length > 1) {
        const distances = newCoordinates.slice(1).map((coord, index) => {
          const start = { coordinates: newCoordinates[index], timestamp: currentTime } as Location;
          const end = { coordinates: coord, timestamp: currentTime } as Location;
          return calculateDistance(start, end);
        });

        // Optimize route if significant distance changes detected
        if (updatedRoute.status === RouteStatus.IN_PROGRESS) {
          const optimizedRoute = await routeService.optimizeRoute(
            updatedRoute.id,
            currentLocation
          );
          onRouteUpdate(optimizedRoute);
        }
      }

      // Update timestamp and location
      setLastUpdateTimestamp(currentTime);
      await routeService.updateLocation(currentLocation);

      // Show polyline after update
      setIsVisible(true);
    } catch (error) {
      console.error('Error updating polyline:', error);
      setIsVisible(false);
    }
  }, [formatCoordinates, lastUpdateTimestamp, onRouteUpdate]);

  // Effect to update polyline when route or location changes
  useEffect(() => {
    if (route && currentLocation) {
      updatePolyline(route, currentLocation);
    }
  }, [route, currentLocation, updatePolyline]);

  // Effect to clean up route service on unmount
  useEffect(() => {
    return () => {
      routeService.dispose();
    };
  }, []);

  // Render polyline if visible and coordinates exist
  if (!isVisible || coordinates.length < 2) {
    return null;
  }

  return (
    <Polyline
      coordinates={coordinates}
      strokeWidth={strokeWidth}
      strokeColor={strokeColor}
      lineDashPattern={[1]}
      lineCap="round"
      lineJoin="round"
      geodesic={true}
      zIndex={1}
      tappable={false}
      style={styles.polyline}
    />
  );
};

// Styles for the polyline component
const styles = StyleSheet.create({
  polyline: {
    position: 'absolute'
  }
});

export default RoutePolyline;