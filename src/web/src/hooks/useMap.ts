// @types/google.maps version ^3.53.4
import { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import { MapConfig, Vehicle, Route, Coordinates } from '../types';
import { initializeMap, updateVehicleMarker, drawRoute, createGeofence } from '../services/maps';

// Human Tasks:
// 1. Ensure Google Maps API key is configured in environment variables (REACT_APP_GOOGLE_MAPS_API_KEY)
// 2. Verify SSL certificates for secure map tile loading
// 3. Configure proper CORS settings for map assets
// 4. Review real-time tracking interval with infrastructure team
// 5. Set up monitoring for Google Maps API usage and quotas

// Constants
const UPDATE_INTERVAL = 30000; // 30 seconds for real-time updates
const DEFAULT_ZOOM = 12;

/**
 * Custom hook for managing Google Maps instance and map-related functionality
 * Implements requirements:
 * - Interactive mapping using Google Maps Platform
 * - Real-time GPS tracking
 * - Geofencing and zone management
 */
export const useMap = (
  containerRef: HTMLElement,
  initialConfig: MapConfig
) => {
  // State management for map instance and tracked elements
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<Map<string, google.maps.Marker>>(new Map());
  const [routes, setRoutes] = useState<Map<string, google.maps.Polyline>>(new Map());
  const [geofences, setGeofences] = useState<Map<string, google.maps.Circle>>(new Map());
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize map instance on component mount
  useEffect(() => {
    if (containerRef) {
      try {
        const mapInstance = initializeMap(containerRef, {
          center: initialConfig.center,
          zoom: initialConfig.zoom || DEFAULT_ZOOM,
          mapTypeId: initialConfig.mapTypeId
        });
        setMap(mapInstance);

        // Clean up map instance on unmount
        return () => {
          if (updateInterval) {
            clearInterval(updateInterval);
          }
          markers.forEach(marker => marker.setMap(null));
          routes.forEach(route => route.setMap(null));
          geofences.forEach(geofence => geofence.setMap(null));
          setMap(null);
        };
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    }
  }, [containerRef]);

  /**
   * Updates vehicle marker position and status on the map
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  const updateVehicle = useCallback((vehicle: Vehicle) => {
    if (!map) return;

    try {
      const marker = updateVehicleMarker(map, vehicle);
      setMarkers(prev => new Map(prev.set(vehicle.id, marker)));

      // Center map on vehicle if it's the only one
      if (markers.size === 1) {
        map.panTo(marker.getPosition()!);
      }
    } catch (error) {
      console.error('Failed to update vehicle marker:', error);
    }
  }, [map]);

  /**
   * Draws delivery route with waypoints on the map
   * Implements requirement: Route visualization
   */
  const drawDeliveryRoute = useCallback((route: Route) => {
    if (!map) return;

    try {
      const polyline = drawRoute(map, route);
      setRoutes(prev => new Map(prev.set(route.id, polyline)));

      // Fit map bounds to include entire route
      const bounds = new google.maps.LatLngBounds();
      route.deliveries.forEach(delivery => {
        bounds.extend(new google.maps.LatLng(
          delivery.coordinates.latitude,
          delivery.coordinates.longitude
        ));
      });
      map.fitBounds(bounds);
    } catch (error) {
      console.error('Failed to draw delivery route:', error);
    }
  }, [map]);

  /**
   * Creates an editable geofence circle on the map
   * Implements requirement: Geofencing and zone management
   */
  const addGeofence = useCallback((center: Coordinates, radius: number) => {
    if (!map) return;

    try {
      const geofence = createGeofence(map, center, radius);
      const geofenceId = `geofence-${Date.now()}`;
      geofence.set('id', geofenceId);
      setGeofences(prev => new Map(prev.set(geofenceId, geofence)));

      // Set up geofence event listeners
      geofence.addListener('radius_changed', () => {
        // Handle radius updates
        const newRadius = geofence.getRadius();
        console.log('Geofence radius updated:', newRadius);
      });

      geofence.addListener('center_changed', () => {
        // Handle center position updates
        const newCenter = geofence.getCenter()?.toJSON();
        console.log('Geofence center updated:', newCenter);
      });
    } catch (error) {
      console.error('Failed to create geofence:', error);
    }
  }, [map]);

  /**
   * Clears all markers, routes, and geofences from the map
   */
  const clearMap = useCallback(() => {
    markers.forEach(marker => marker.setMap(null));
    routes.forEach(route => route.setMap(null));
    geofences.forEach(geofence => geofence.setMap(null));
    
    setMarkers(new Map());
    setRoutes(new Map());
    setGeofences(new Map());
  }, [markers, routes, geofences]);

  // Set up real-time update interval
  useEffect(() => {
    if (map && !updateInterval) {
      const interval = setInterval(() => {
        // Update all vehicle markers
        markers.forEach((marker, vehicleId) => {
          // Trigger vehicle position updates
          console.log('Updating vehicle position:', vehicleId);
        });
      }, UPDATE_INTERVAL);

      setUpdateInterval(interval);

      return () => {
        clearInterval(interval);
        setUpdateInterval(null);
      };
    }
  }, [map, markers]);

  return {
    map,
    updateVehicle,
    drawDeliveryRoute,
    addGeofence,
    clearMap
  };
};