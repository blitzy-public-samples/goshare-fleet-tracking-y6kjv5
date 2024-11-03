// @types/google.maps version ^3.53.4
// react version ^18.0.0

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Ensure vehicle icon assets are available in public/assets/icons directory
// 3. Review real-time tracking interval with infrastructure team
// 4. Configure monitoring for marker update frequency
// 5. Validate vehicle status color scheme with UI/UX team

import React, { useEffect, useRef, useState } from 'react';
import { Vehicle } from '../../types';
import { updateVehicleMarker } from '../../services/maps';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  map: google.maps.Map;
  onClick?: (vehicle: Vehicle) => void;
}

/**
 * React component for rendering and managing vehicle markers on Google Maps
 * Implements requirements:
 * - Real-time GPS tracking (1.2 Scope/Core Functionality)
 * - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
 */
const VehicleMarker: React.FC<VehicleMarkerProps> = ({ vehicle, map, onClick }) => {
  // Refs to store marker and info window instances
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // State to track last update time for optimization
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initialize marker and info window
    if (!markerRef.current) {
      markerRef.current = updateVehicleMarker(map, vehicle);
      infoWindowRef.current = new google.maps.InfoWindow();

      // Set up click handler for marker
      markerRef.current.addListener('click', () => {
        if (onClick) {
          onClick(vehicle);
        }

        // Update and open info window
        if (infoWindowRef.current && markerRef.current) {
          infoWindowRef.current.setContent(`
            <div class="vehicle-info">
              <h3>Vehicle ${vehicle.registrationNumber}</h3>
              <p>Status: ${vehicle.status}</p>
              <p>Last Update: ${new Date(vehicle.lastUpdate).toLocaleString()}</p>
              <p>Location: ${vehicle.currentLocation.latitude.toFixed(6)}, 
                          ${vehicle.currentLocation.longitude.toFixed(6)}</p>
            </div>
          `);
          infoWindowRef.current.open(map, markerRef.current);
        }
      });
    }

    // Cleanup function to remove marker and info window
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [map]); // Only re-run if map instance changes

  useEffect(() => {
    // Update marker position and properties when vehicle data changes
    if (markerRef.current && shouldUpdateMarker()) {
      const updatedMarker = updateVehicleMarker(map, vehicle);
      markerRef.current = updatedMarker;
      setLastUpdate(new Date());

      // Update info window content if it's open
      if (infoWindowRef.current && infoWindowRef.current.getMap()) {
        infoWindowRef.current.setContent(`
          <div class="vehicle-info">
            <h3>Vehicle ${vehicle.registrationNumber}</h3>
            <p>Status: ${vehicle.status}</p>
            <p>Last Update: ${new Date(vehicle.lastUpdate).toLocaleString()}</p>
            <p>Location: ${vehicle.currentLocation.latitude.toFixed(6)}, 
                        ${vehicle.currentLocation.longitude.toFixed(6)}</p>
          </div>
        `);
      }
    }
  }, [vehicle, map]); // Re-run when vehicle data or map changes

  // Set up 30-second interval for marker updates
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (markerRef.current && shouldUpdateMarker()) {
        const updatedMarker = updateVehicleMarker(map, vehicle);
        markerRef.current = updatedMarker;
        setLastUpdate(new Date());
      }
    }, 30000); // 30-second interval as per requirements

    return () => clearInterval(updateInterval);
  }, [vehicle, map]);

  /**
   * Determines if marker should be updated based on time and position changes
   * Implements optimization to prevent unnecessary updates
   */
  const shouldUpdateMarker = (): boolean => {
    const timeSinceLastUpdate = new Date().getTime() - lastUpdate.getTime();
    const currentPosition = markerRef.current?.getPosition();
    
    // Update if 30 seconds have passed or position has changed
    return timeSinceLastUpdate >= 30000 || 
           currentPosition?.lat() !== vehicle.currentLocation.latitude ||
           currentPosition?.lng() !== vehicle.currentLocation.longitude ||
           markerRef.current?.getTitle() !== vehicle.registrationNumber;
  };

  // Component doesn't render any visible elements directly
  return null;
};

export default VehicleMarker;