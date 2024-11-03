// @types/google.maps version ^3.53.4
// react version ^18.0.0
// @material-ui/core/styles version ^4.12.0

// Human Tasks:
// 1. Ensure Google Maps API key is configured in environment variables (REACT_APP_GOOGLE_MAPS_API_KEY)
// 2. Verify SSL certificates for secure map tile loading
// 3. Configure proper CORS settings for map assets
// 4. Review real-time tracking interval with infrastructure team
// 5. Set up monitoring for Google Maps API usage and quotas
// 6. Validate geofence radius limits with business requirements

import React, { useRef, useEffect, useCallback } from 'react';
import { styled } from '@material-ui/core/styles';
import { useMap } from '../../hooks/useMap';
import { VehicleMarker } from './VehicleMarker';
import { RoutePolyline } from './RoutePolyline';
import { GeofenceLayer } from './GeofenceLayer';
import { MapControls } from './MapControls';
import { Vehicle, Route, Geofence } from '../../types';

// Styled components for map layout
const MapWrapper = styled('div')({
  width: '100%',
  height: '100%',
  position: 'relative'
});

const MapContainer = styled('div')({
  width: '100%',
  height: '100%'
});

// Props interface for MapContainer component
interface MapContainerProps {
  vehicles: Vehicle[];
  activeRoute: Route | null;
  geofences: Geofence[];
  onVehicleClick: (vehicleId: string) => void;
  onGeofenceCreate: (geofence: Geofence) => void;
}

/**
 * Main map container component that integrates all map-related functionality
 * Implements requirements:
 * - Interactive mapping using Google Maps Platform (1.1 System Overview/Web Dashboard)
 * - Real-time GPS tracking (1.2 Scope/Core Functionality)
 * - Geofencing and zone management (1.2 Scope/Core Functionality)
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 */
const MapContainer: React.FC<MapContainerProps> = ({
  vehicles,
  activeRoute,
  geofences,
  onVehicleClick,
  onGeofenceCreate
}) => {
  // Create ref for map container element
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize map instance and controls using useMap hook
  const {
    map,
    updateVehicle,
    drawDeliveryRoute,
    addGeofence,
    clearMap
  } = useMap(mapContainerRef.current!, {
    center: { lat: 0, lng: 0 },
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  /**
   * Handle vehicle marker click events
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleVehicleClick = useCallback((vehicleId: string) => {
    onVehicleClick(vehicleId);
  }, [onVehicleClick]);

  /**
   * Handle geofence creation events
   * Implements requirement: Geofencing and zone management
   */
  const handleGeofenceCreate = useCallback((
    center: google.maps.LatLng,
    radius: number
  ) => {
    const newGeofence: Geofence = {
      id: `geofence-${Date.now()}`,
      center: {
        latitude: center.lat(),
        longitude: center.lng()
      },
      radius,
      createdAt: new Date().toISOString()
    };
    onGeofenceCreate(newGeofence);
  }, [onGeofenceCreate]);

  /**
   * Handle route visibility toggle
   * Implements requirement: Route optimization and planning
   */
  const handleRouteToggle = useCallback((visible: boolean) => {
    if (visible && activeRoute) {
      drawDeliveryRoute(activeRoute);
    } else {
      clearMap();
    }
  }, [activeRoute, drawDeliveryRoute, clearMap]);

  /**
   * Handle vehicle tracking toggle
   * Implements requirement: Real-time GPS tracking
   */
  const handleVehicleTrackingToggle = useCallback((enabled: boolean) => {
    if (enabled) {
      vehicles.forEach(vehicle => updateVehicle(vehicle));
    } else {
      clearMap();
    }
  }, [vehicles, updateVehicle, clearMap]);

  // Update vehicle markers when vehicles array changes
  useEffect(() => {
    if (map) {
      vehicles.forEach(vehicle => updateVehicle(vehicle));
    }
  }, [map, vehicles, updateVehicle]);

  // Update route polyline when active route changes
  useEffect(() => {
    if (map && activeRoute) {
      drawDeliveryRoute(activeRoute);
    }
  }, [map, activeRoute, drawDeliveryRoute]);

  // Update geofence layers when geofences array changes
  useEffect(() => {
    if (map) {
      geofences.forEach(geofence => {
        addGeofence(geofence.center, geofence.radius);
      });
    }
  }, [map, geofences, addGeofence]);

  return (
    <MapWrapper>
      <MapContainer ref={mapContainerRef}>
        {map && (
          <>
            {/* Render vehicle markers */}
            {vehicles.map(vehicle => (
              <VehicleMarker
                key={vehicle.id}
                vehicle={vehicle}
                map={map}
                onClick={() => handleVehicleClick(vehicle.id)}
              />
            ))}

            {/* Render active route polyline */}
            {activeRoute && (
              <RoutePolyline
                map={map}
                route={activeRoute}
              />
            )}

            {/* Render geofence layers */}
            {geofences.map(geofence => (
              <GeofenceLayer
                key={geofence.id}
                center={geofence.center}
                radius={geofence.radius}
                editable={false}
                onChange={() => {}}
              />
            ))}

            {/* Render map controls */}
            <MapControls
              onGeofenceCreate={handleGeofenceCreate}
              onRouteToggle={handleRouteToggle}
              onVehicleTrackingToggle={handleVehicleTrackingToggle}
            />
          </>
        )}
      </MapContainer>
    </MapWrapper>
  );
};

export default MapContainer;