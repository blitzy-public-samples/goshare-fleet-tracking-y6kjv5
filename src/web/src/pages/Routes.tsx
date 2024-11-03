// @mui/material version: ^5.0.0
// react version: ^18.0.0
// react-redux version: ^8.0.5

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Configure real-time update interval (30 seconds) in environment settings
// 3. Set up monitoring for route optimization service performance
// 4. Review map visualization settings with UX team
// 5. Validate delivery time windows with business stakeholders

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Grid, Paper } from '@mui/material';
import { MainLayout } from '../components/layout/MainLayout';
import RouteList from '../components/route/RouteList';
import RouteOptimization from '../components/route/RouteOptimization';
import MapContainer from '../components/map/MapContainer';
import { useMap } from '../hooks/useMap';
import { selectActiveVehicles } from '../store/slices/fleetSlice';
import { selectActiveRoute, setActiveRoute } from '../store/slices/routeSlice';
import { Vehicle, Route } from '../types';

/**
 * Routes page component for managing delivery routes with real-time tracking
 * Implements requirements:
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 * - Interactive mapping (1.1 System Overview/Web Dashboard)
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 */
const Routes: React.FC = () => {
  // Redux state management
  const dispatch = useDispatch();
  const vehicles = useSelector(selectActiveVehicles);
  const activeRoute = useSelector(selectActiveRoute);

  // Local state
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);

  // Initialize map hook
  const { map, drawDeliveryRoute } = useMap(mapRef!, {
    center: { lat: 0, lng: 0 },
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  /**
   * Handle route selection from the list
   * Implements requirement: Interactive route management
   */
  const handleRouteSelect = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
    dispatch(setActiveRoute(routeId));
  }, [dispatch]);

  /**
   * Handle vehicle selection on map
   * Implements requirement: Interactive mapping
   */
  const handleVehicleClick = useCallback((vehicleId: string) => {
    // Find associated route for vehicle
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle?.activeRouteId) {
      handleRouteSelect(vehicle.activeRouteId);
    }
  }, [vehicles, handleRouteSelect]);

  /**
   * Handle route optimization completion
   * Implements requirement: Route optimization and planning
   */
  const handleOptimizationComplete = useCallback((optimizedRoute: Route) => {
    if (map) {
      drawDeliveryRoute(optimizedRoute);
    }
  }, [map, drawDeliveryRoute]);

  // Set up real-time data synchronization
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Update vehicle positions and route status
      if (activeRoute) {
        dispatch(setActiveRoute(activeRoute.id)); // Refresh route data
      }
    }, 30000); // 30-second intervals

    return () => clearInterval(updateInterval);
  }, [dispatch, activeRoute]);

  // Update map visualization when active route changes
  useEffect(() => {
    if (map && activeRoute) {
      drawDeliveryRoute(activeRoute);
    }
  }, [map, activeRoute, drawDeliveryRoute]);

  return (
    <MainLayout>
      <Box sx={{ p: 3, height: 'calc(100vh - 64px)' }}>
        <Grid container spacing={3} sx={{ height: '100%' }}>
          {/* Route List Panel */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper sx={{ height: '100%', overflow: 'auto' }}>
              <RouteList onRouteSelect={handleRouteSelect} />
            </Paper>
          </Grid>

          {/* Map and Optimization Panel */}
          <Grid item xs={12} md={8} lg={9}>
            <Grid container spacing={2} sx={{ height: '100%' }}>
              {/* Route Optimization Controls */}
              {selectedRouteId && (
                <Grid item xs={12}>
                  <RouteOptimization
                    routeId={selectedRouteId}
                    onOptimizationComplete={handleOptimizationComplete}
                  />
                </Grid>
              )}

              {/* Interactive Map */}
              <Grid item xs={12} sx={{ flexGrow: 1 }}>
                <Paper 
                  sx={{ 
                    height: selectedRouteId ? 'calc(100% - 140px)' : '100%',
                    position: 'relative'
                  }}
                  ref={setMapRef}
                >
                  <MapContainer
                    vehicles={vehicles}
                    activeRoute={activeRoute}
                    geofences={[]}
                    onVehicleClick={handleVehicleClick}
                    onGeofenceCreate={() => {}}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default Routes;