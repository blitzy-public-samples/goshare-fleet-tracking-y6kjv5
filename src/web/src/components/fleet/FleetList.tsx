// @mui/material version ^5.0.0
// react version ^18.0.0
// react-redux version ^8.0.0

import React, { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import Table from '../common/Table';
import { Vehicle } from '../../types';
import {
  fetchVehicles,
  updateVehicleLocation,
  setSelectedVehicle,
  selectVehicles,
  selectLoading,
  LOCATION_POLLING_INTERVAL
} from '../../store/slices/fleetSlice';

// Human Tasks:
// 1. Verify real-time update interval (30 seconds) is properly configured
// 2. Ensure WebSocket connection is established for live updates
// 3. Review table column configuration with UX team
// 4. Validate location format display with business requirements

interface FleetListProps {
  onVehicleSelect: (vehicleId: string) => void;
}

// Main fleet list component with real-time location updates
// Implements requirement: Interactive fleet management dashboard - Provides an interactive list view of fleet vehicles
const FleetList: React.FC<FleetListProps> = ({ onVehicleSelect }) => {
  const dispatch = useDispatch();
  const vehicles = useSelector(selectVehicles);
  const loading = useSelector(selectLoading);

  // Fetch initial vehicles data
  // Implements requirement: Interactive fleet management dashboard
  useEffect(() => {
    dispatch(fetchVehicles());
  }, [dispatch]);

  // Setup 30-second interval for location updates
  // Implements requirement: Real-time GPS tracking - Displays vehicle locations with 30-second update intervals
  useEffect(() => {
    const updateLocations = () => {
      vehicles.forEach(vehicle => {
        dispatch(updateVehicleLocation(vehicle.id));
      });
    };

    const intervalId = setInterval(updateLocations, LOCATION_POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [dispatch, vehicles]);

  // Handle vehicle selection
  const handleVehicleClick = useCallback((vehicle: Vehicle) => {
    dispatch(setSelectedVehicle(vehicle.id));
    onVehicleSelect(vehicle.id);
  }, [dispatch, onVehicleSelect]);

  // Table columns configuration
  // Implements requirement: Dashboard Layout - Implements data grid component for fleet management view
  const tableColumns = useMemo(() => [
    {
      id: 'registrationNumber',
      label: 'Vehicle',
      sortable: true
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      format: (value: string) => value.toUpperCase()
    },
    {
      id: 'currentLocation',
      label: 'Location',
      sortable: false,
      format: (location: { latitude: number; longitude: number }) => 
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    },
    {
      id: 'lastUpdate',
      label: 'Last Update',
      sortable: true,
      format: (date: Date) => new Date(date).toLocaleString()
    }
  ], []);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      p: 2
    }}>
      <Table
        columns={tableColumns}
        data={vehicles}
        onRowClick={handleVehicleClick}
      />
    </Box>
  );
};

export default FleetList;