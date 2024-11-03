// @material-ui/core version ^4.12.0
// @material-ui/icons version ^4.12.0
// react version ^18.0.0

import React, { useState, useCallback } from 'react';
import { styled } from '@material-ui/core/styles';
import { IconButton } from '@material-ui/core';
import { Add, Remove } from '@material-ui/icons';
import { useMap } from '../../hooks/useMap';
import { CustomButton } from '../common/Button';

// Human Tasks:
// 1. Ensure Google Maps API key is properly configured
// 2. Verify geofence radius limits with business requirements
// 3. Review map control positioning with UX team
// 4. Confirm zoom level restrictions with product team
// 5. Test touch interactions on mobile devices

/**
 * Props interface for MapControls component
 * Implements requirement: Interactive mapping using Google Maps Platform
 */
interface MapControlsProps {
  onGeofenceCreate: (center: google.maps.LatLng, radius: number) => void;
  onRouteToggle: (visible: boolean) => void;
  onVehicleTrackingToggle: (enabled: boolean) => void;
}

/**
 * Styled container for map controls
 * Implements requirement: Material-UI component framework implementation
 */
const ControlsContainer = styled('div')({
  position: 'absolute',
  top: '10px',
  right: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  zIndex: 1000,
  backgroundColor: 'white',
  padding: '8px',
  borderRadius: '4px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
});

/**
 * MapControls component for interactive map control
 * Implements requirements:
 * - Interactive mapping using Google Maps Platform
 * - Geofencing and zone management
 * - Route optimization and planning
 */
const MapControls: React.FC<MapControlsProps> = ({
  onGeofenceCreate,
  onRouteToggle,
  onVehicleTrackingToggle
}) => {
  // State for control modes
  const [isGeofenceMode, setIsGeofenceMode] = useState(false);
  const [isRouteVisible, setIsRouteVisible] = useState(true);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  
  // Get map instance from hook
  const { map, addGeofence, clearMap } = useMap();

  /**
   * Handle zoom in functionality
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleZoomIn = useCallback(() => {
    if (map) {
      const currentZoom = map.getZoom() || 0;
      map.setZoom(currentZoom + 1);
    }
  }, [map]);

  /**
   * Handle zoom out functionality
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleZoomOut = useCallback(() => {
    if (map) {
      const currentZoom = map.getZoom() || 0;
      if (currentZoom > 0) {
        map.setZoom(currentZoom - 1);
      }
    }
  }, [map]);

  /**
   * Toggle geofence creation mode
   * Implements requirement: Geofencing and zone management
   */
  const handleGeofenceToggle = useCallback(() => {
    const newGeofenceMode = !isGeofenceMode;
    setIsGeofenceMode(newGeofenceMode);

    if (newGeofenceMode && map) {
      // Enable click listener for geofence creation
      const clickListener = map.addListener('click', (event) => {
        const center = event.latLng;
        const defaultRadius = 1000; // 1km default radius
        addGeofence(center, defaultRadius);
        onGeofenceCreate(center, defaultRadius);
        
        // Disable geofence mode after creation
        setIsGeofenceMode(false);
        google.maps.event.removeListener(clickListener);
      });
    }
  }, [isGeofenceMode, map, addGeofence, onGeofenceCreate]);

  /**
   * Toggle route visibility
   * Implements requirement: Route optimization and planning
   */
  const handleRouteToggle = useCallback(() => {
    const newRouteVisible = !isRouteVisible;
    setIsRouteVisible(newRouteVisible);
    onRouteToggle(newRouteVisible);
  }, [isRouteVisible, onRouteToggle]);

  /**
   * Toggle vehicle tracking
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleTrackingToggle = useCallback(() => {
    const newTrackingEnabled = !isTrackingEnabled;
    setIsTrackingEnabled(newTrackingEnabled);
    onVehicleTrackingToggle(newTrackingEnabled);
  }, [isTrackingEnabled, onVehicleTrackingToggle]);

  /**
   * Clear all map overlays
   * Implements requirement: Interactive mapping using Google Maps Platform
   */
  const handleClearMap = useCallback(() => {
    clearMap();
    setIsGeofenceMode(false);
    setIsRouteVisible(true);
  }, [clearMap]);

  return (
    <ControlsContainer>
      {/* Zoom controls */}
      <IconButton onClick={handleZoomIn} size="small" aria-label="Zoom in">
        <Add />
      </IconButton>
      <IconButton onClick={handleZoomOut} size="small" aria-label="Zoom out">
        <Remove />
      </IconButton>

      {/* Geofence controls */}
      <CustomButton
        variant={isGeofenceMode ? 'primary' : 'outlined'}
        size="small"
        onClick={handleGeofenceToggle}
      >
        {isGeofenceMode ? 'Cancel Geofence' : 'Add Geofence'}
      </CustomButton>

      {/* Route visibility toggle */}
      <CustomButton
        variant={isRouteVisible ? 'primary' : 'outlined'}
        size="small"
        onClick={handleRouteToggle}
      >
        {isRouteVisible ? 'Hide Routes' : 'Show Routes'}
      </CustomButton>

      {/* Vehicle tracking toggle */}
      <CustomButton
        variant={isTrackingEnabled ? 'primary' : 'outlined'}
        size="small"
        onClick={handleTrackingToggle}
      >
        {isTrackingEnabled ? 'Disable Tracking' : 'Enable Tracking'}
      </CustomButton>

      {/* Clear map button */}
      <CustomButton
        variant="outlined"
        size="small"
        onClick={handleClearMap}
      >
        Clear Map
      </CustomButton>
    </ControlsContainer>
  );
};

export { MapControls };
export type { MapControlsProps };