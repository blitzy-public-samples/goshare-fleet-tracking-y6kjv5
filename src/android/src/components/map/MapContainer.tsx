/**
 * HUMAN TASKS:
 * 1. Verify Google Maps API key is properly configured in AndroidManifest.xml
 * 2. Test offline map caching behavior
 * 3. Verify location permissions are properly configured
 * 4. Test map performance with large route datasets
 */

// Third-party imports - versions specified for security and compatibility
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { StyleSheet, View, Platform } from 'react-native'; // ^0.72.0
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps'; // ^1.7.1

// Internal imports
import CurrentLocation from './CurrentLocation';
import RoutePolyline from './RoutePolyline';
import DeliveryMarker from './DeliveryMarker';
import { useLocation } from '../../hooks/useLocation';
import { Route, Delivery, Location } from '../../types';

// Default map region (centered at 0,0 with reasonable zoom level)
const DEFAULT_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421
};

/**
 * Props interface for MapContainer component
 */
interface MapContainerProps {
  route: Route | null;
  onDeliverySelect: (delivery: Delivery) => void;
  selectedDeliveryId: string | null;
  followsUserLocation?: boolean;
}

/**
 * Main map container component for the driver application
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Interactive mapping using Google Maps Platform
 * - Visual representation of optimized delivery routes
 * - Maintains functionality during offline operation
 */
const MapContainer: React.FC<MapContainerProps> = ({
  route,
  onDeliverySelect,
  selectedDeliveryId,
  followsUserLocation = true
}) => {
  // Map state
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = React.useRef<MapView>(null);

  // Use location hook for real-time tracking
  const {
    currentLocation,
    isTracking,
    error,
    startTracking
  } = useLocation({
    enableHighAccuracy: true,
    interval: 30000, // 30-second intervals as per requirements
    distanceFilter: 10 // 10 meters minimum movement
  });

  /**
   * Handles map region changes
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  /**
   * Handles delivery marker press events
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleDeliveryPress = useCallback((delivery: Delivery) => {
    onDeliverySelect(delivery);
    
    // Center map on selected delivery
    if (mapRef.current && delivery.coordinates) {
      mapRef.current.animateToRegion({
        latitude: delivery.coordinates.latitude,
        longitude: delivery.coordinates.longitude,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta
      }, 500);
    }
  }, [onDeliverySelect, mapRegion]);

  /**
   * Adjusts map viewport to show entire route
   * Implements requirement: Visual representation of optimized delivery routes
   */
  const fitToRoute = useCallback(() => {
    if (!mapRef.current || !route?.deliveries?.length) return;

    const coordinates = route.deliveries.map(delivery => ({
      latitude: delivery.coordinates.latitude,
      longitude: delivery.coordinates.longitude
    }));

    // Include current location in bounds calculation
    if (currentLocation) {
      coordinates.push(currentLocation.coordinates);
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      },
      animated: true
    });
  }, [route, currentLocation]);

  /**
   * Handles location updates
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  const handleLocationChange = useCallback((location: Location) => {
    if (followsUserLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...mapRegion,
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude
      }, 500);
    }
  }, [followsUserLocation, mapRegion]);

  /**
   * Start location tracking on component mount
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  useEffect(() => {
    startTracking().catch(err => {
      console.error('Failed to start location tracking:', err);
    });
  }, [startTracking]);

  /**
   * Fit to route when route changes or map becomes ready
   * Implements requirement: Visual representation of optimized delivery routes
   */
  useEffect(() => {
    if (mapReady && route) {
      fitToRoute();
    }
  }, [mapReady, route, fitToRoute]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={false} // We use custom CurrentLocation marker
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        rotateEnabled={true}
        loadingEnabled={true}
        moveOnMarkerPress={false}
        // Enable offline map caching
        cacheEnabled={Platform.OS === 'android'}
        minZoomLevel={4}
        maxZoomLevel={20}
      >
        {/* Current location marker with 30-second updates */}
        <CurrentLocation
          followsUserLocation={followsUserLocation}
          onLocationChange={handleLocationChange}
        />

        {/* Route polyline visualization */}
        {route && currentLocation && (
          <RoutePolyline
            route={route}
            currentLocation={currentLocation}
            onRouteUpdate={() => {}} // Handle route updates if needed
          />
        )}

        {/* Delivery markers */}
        {route?.deliveries?.map(delivery => (
          <DeliveryMarker
            key={delivery.id}
            delivery={delivery}
            onPress={handleDeliveryPress}
            isSelected={delivery.id === selectedDeliveryId}
          />
        ))}
      </MapView>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    width: '100%',
    height: '100%'
  }
});

export default MapContainer;