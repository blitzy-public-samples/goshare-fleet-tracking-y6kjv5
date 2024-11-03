// @types/google.maps version ^3.53.4
// react version ^18.0.0

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Ensure proper error boundaries are set up for map rendering failures
// 3. Review polyline update frequency with infrastructure team
// 4. Confirm color scheme matches design system

import React, { useEffect, useCallback } from 'react';
import { Route } from '../../types';
import { drawRoute } from '../../services/maps';

// Status-based polyline colors
const POLYLINE_COLORS = {
  ACTIVE: '#4CAF50',    // Green for active routes
  COMPLETED: '#2196F3', // Blue for completed routes
  PLANNED: '#FFC107'    // Amber for planned routes
};

// Default polyline styling options
const POLYLINE_OPTIONS = {
  strokeWeight: 3,
  strokeOpacity: 0.8,
  clickable: true,
  zIndex: 1
};

interface RoutePolylineProps {
  map: google.maps.Map;
  route: Route;
  options?: {
    strokeWeight?: number;
    strokeOpacity?: number;
    clickable?: boolean;
    zIndex?: number;
  };
}

/**
 * RoutePolyline Component
 * Renders and manages route polylines on Google Maps with status-based styling
 * Implements requirements:
 * - Interactive mapping using Google Maps Platform
 * - Route visualization on interactive maps with real-time updates and status indicators
 */
const RoutePolyline: React.FC<RoutePolylineProps> = ({ map, route, options = {} }) => {
  // Memoized polyline update function to prevent unnecessary re-renders
  const updatePolyline = useCallback((polyline: google.maps.Polyline, route: Route) => {
    if (!polyline || !route.deliveries.length) return;

    // Extract coordinates from route deliveries
    const path = route.deliveries.map(delivery => 
      new google.maps.LatLng(
        delivery.coordinates.latitude,
        delivery.coordinates.longitude
      )
    );

    // Update polyline path
    polyline.setPath(path);

    // Update polyline styling based on route status
    const strokeColor = POLYLINE_COLORS[route.status] || POLYLINE_COLORS.PLANNED;
    polyline.setOptions({
      ...POLYLINE_OPTIONS,
      ...options,
      strokeColor,
      path
    });
  }, [options]);

  useEffect(() => {
    if (!map || !route) return;

    // Create or update route polyline
    const polyline = drawRoute(map, route);

    // Set up polyline click handler for route selection
    polyline.addListener('click', () => {
      // Highlight selected route
      polyline.setOptions({
        strokeWeight: POLYLINE_OPTIONS.strokeWeight + 2,
        strokeOpacity: 1.0,
        zIndex: POLYLINE_OPTIONS.zIndex + 1
      });
    });

    // Update polyline when route changes
    updatePolyline(polyline, route);

    // Cleanup polyline on unmount
    return () => {
      polyline.setMap(null);
      google.maps.event.clearInstanceListeners(polyline);
    };
  }, [map, route, updatePolyline]);

  // Component doesn't render visible elements
  return null;
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(RoutePolyline);