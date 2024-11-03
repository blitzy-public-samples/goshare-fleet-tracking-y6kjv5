// @types/google.maps version ^3.53.4
import React, { useEffect, useCallback } from 'react'; // ^18.0.0
import { Coordinates } from '../../types';
import { createGeofence } from '../../services/maps';
import { useMap } from '../../hooks/useMap';

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Ensure geofence coordinates are properly validated before creation
// 3. Review geofence update interval with infrastructure team
// 4. Set up monitoring for geofence events and alerts

/**
 * Props interface for GeofenceLayer component
 * Implements requirement: Geofencing and zone management
 */
interface GeofenceLayerProps {
  center: Coordinates;
  radius: number;
  editable: boolean;
  onChange: (coordinates: Coordinates) => void;
}

/**
 * Styles for geofence visualization
 */
const GEOFENCE_STYLES = {
  fillColor: '#4285f4',
  fillOpacity: 0.35,
  strokeColor: '#4285f4',
  strokeWeight: 2
};

/**
 * React component for rendering and managing geofence zones on the Google Maps instance
 * Implements requirements:
 * - Geofencing and zone management
 * - Interactive mapping using Google Maps Platform
 */
const GeofenceLayer: React.FC<GeofenceLayerProps> = ({
  center,
  radius,
  editable,
  onChange
}) => {
  // Get map instance and functions from useMap hook
  const { map, addGeofence } = useMap(
    document.getElementById('map-container')!,
    {
      center,
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
  );

  /**
   * Handles geofence shape editing events and updates coordinates
   * Implements requirement: Real-time editing capabilities
   */
  const handleGeofenceEdit = useCallback((
    geofence: google.maps.Circle | google.maps.Polygon,
    event: google.maps.MouseEvent
  ) => {
    if (geofence instanceof google.maps.Circle) {
      const center = geofence.getCenter()?.toJSON();
      if (center) {
        const coordinates: Coordinates = {
          latitude: center.lat,
          longitude: center.lng
        };
        onChange(coordinates);
      }
    }
  }, [onChange]);

  /**
   * Renders a geofence shape on the map with edit capabilities
   * Implements requirement: Geofencing visualization
   */
  const renderGeofence = useCallback((
    center: Coordinates,
    radius: number,
    editable: boolean
  ): google.maps.Circle => {
    if (!map) {
      throw new Error('Map instance not initialized');
    }

    // Create geofence using map service
    const geofence = createGeofence(map, center, radius);

    // Apply styling and configuration
    geofence.setOptions({
      ...GEOFENCE_STYLES,
      editable,
      draggable: editable,
      clickable: true
    });

    // Set up edit event listeners if editable
    if (editable) {
      geofence.addListener('center_changed', () => {
        handleGeofenceEdit(geofence, new google.maps.MouseEvent('center_changed'));
      });

      geofence.addListener('radius_changed', () => {
        handleGeofenceEdit(geofence, new google.maps.MouseEvent('radius_changed'));
      });

      geofence.addListener('dragend', (e: google.maps.MouseEvent) => {
        handleGeofenceEdit(geofence, e);
      });
    }

    return geofence;
  }, [map, handleGeofenceEdit]);

  // Initialize geofence on component mount and center/radius changes
  useEffect(() => {
    if (map) {
      try {
        // Create new geofence instance
        const geofence = renderGeofence(center, radius, editable);

        // Clean up geofence on unmount or updates
        return () => {
          geofence.setMap(null);
        };
      } catch (error) {
        console.error('Failed to render geofence:', error);
      }
    }
  }, [map, center, radius, editable, renderGeofence]);

  // Component doesn't render any visible elements as it manages map overlays
  return null;
};

export default GeofenceLayer;