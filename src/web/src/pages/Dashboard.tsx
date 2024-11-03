// react version: ^18.0.0
// @mui/material version: ^5.0.0
// react-redux version: ^8.1.0

// Human Tasks:
// 1. Configure Google Maps API key in environment variables
// 2. Set up monitoring for real-time data latency
// 3. Review analytics refresh intervals with stakeholders
// 4. Configure socket connection timeouts
// 5. Verify SSL certificates for WebSocket connections

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Box, Alert } from '@mui/material';
import { MainLayout } from '../components/layout/MainLayout';
import MapContainer from '../components/map/MapContainer';
import KPICards from '../components/analytics/KPICards';
import { useSocket } from '../hooks/useSocket';

// Requirement: Interactive fleet management dashboard
// Location: 1.2 Scope/Core Functionality
interface DashboardState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  activeRoute: Route | null;
  error: string | null;
  dateRange: { start: Date; end: Date };
}

/**
 * Main dashboard page component that provides real-time fleet monitoring and analytics
 * Implements requirements:
 * - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
 * - Real-time GPS tracking with 30-second updates (1.2 Scope/Core Functionality)
 * - Analytics and reporting (1.2 Scope/Core Functionality)
 */
const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  
  // Initialize socket connection for real-time updates
  const { socket, isConnected, error: socketError } = useSocket();

  // Initialize dashboard state
  const [state, setState] = useState<DashboardState>({
    vehicles: [],
    selectedVehicle: null,
    activeRoute: null,
    error: null,
    dateRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    }
  });

  // Select fleet data from Redux store
  const fleetData = useSelector((state: any) => state.fleet);
  const geofences = useSelector((state: any) => state.fleet.geofences);

  /**
   * Handle vehicle selection on map
   * Implements requirement: Interactive fleet management dashboard
   */
  const handleVehicleSelect = useCallback((vehicleId: string) => {
    try {
      const selectedVehicle = state.vehicles.find(v => v.id === vehicleId);
      if (selectedVehicle) {
        setState(prev => ({
          ...prev,
          selectedVehicle,
          activeRoute: selectedVehicle.activeRoute || null
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Failed to select vehicle'
      }));
    }
  }, [state.vehicles]);

  /**
   * Handle socket connection errors
   * Implements requirement: Real-time data synchronization
   */
  const handleSocketError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error: `Connection error: ${error.message}`
    }));
  }, []);

  /**
   * Handle geofence creation
   * Implements requirement: Geofencing and zone management
   */
  const handleGeofenceCreate = useCallback((geofence: Geofence) => {
    try {
      dispatch({ type: 'fleet/createGeofence', payload: geofence });
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Failed to create geofence'
      }));
    }
  }, [dispatch]);

  /**
   * Set up real-time vehicle location updates
   * Implements requirement: Real-time GPS tracking with 30-second updates
   */
  useEffect(() => {
    if (socket && isConnected) {
      // Subscribe to vehicle location updates
      socket.on('vehicle_location', (data: { vehicleId: string; location: Location }) => {
        setState(prev => ({
          ...prev,
          vehicles: prev.vehicles.map(vehicle => 
            vehicle.id === data.vehicleId
              ? { ...vehicle, location: data.location }
              : vehicle
          )
        }));
      });

      // Subscribe to vehicle status updates
      socket.on('vehicle_status', (data: { vehicleId: string; status: string }) => {
        setState(prev => ({
          ...prev,
          vehicles: prev.vehicles.map(vehicle =>
            vehicle.id === data.vehicleId
              ? { ...vehicle, status: data.status }
              : vehicle
          )
        }));
      });

      return () => {
        socket.off('vehicle_location');
        socket.off('vehicle_status');
      };
    }
  }, [socket, isConnected]);

  /**
   * Initialize fleet data
   * Implements requirement: Interactive fleet management dashboard
   */
  useEffect(() => {
    if (fleetData?.vehicles) {
      setState(prev => ({
        ...prev,
        vehicles: fleetData.vehicles
      }));
    }
  }, [fleetData]);

  return (
    <MainLayout>
      {/* Error notifications */}
      {(state.error || socketError) && (
        <Box mb={2}>
          <Alert severity="error" onClose={() => setState(prev => ({ ...prev, error: null }))}>
            {state.error || socketError}
          </Alert>
        </Box>
      )}

      {/* Connection status notification */}
      {!isConnected && (
        <Box mb={2}>
          <Alert severity="warning">
            Attempting to reconnect to real-time updates...
          </Alert>
        </Box>
      )}

      {/* Real-time analytics dashboard */}
      <Grid container spacing={3}>
        {/* KPI Cards Section */}
        <Grid item xs={12}>
          <KPICards
            dateRange={state.dateRange}
            fleetId={fleetData?.fleetId}
            refreshInterval={30000} // 30-second refresh
          />
        </Grid>

        {/* Interactive Map Section */}
        <Grid item xs={12} style={{ height: 'calc(100vh - 300px)' }}>
          <MapContainer
            vehicles={state.vehicles}
            activeRoute={state.activeRoute}
            geofences={geofences}
            onVehicleClick={handleVehicleSelect}
            onGeofenceCreate={handleGeofenceCreate}
          />
        </Grid>
      </Grid>
    </MainLayout>
  );
};

export default Dashboard;