// @material-ui/core version: ^4.12.0
// @material-ui/icons version: ^4.11.3
// react version: ^18.0.0
// react-redux version: ^8.1.0

/* HUMAN TASKS:
1. Verify Google Maps API key is configured for displaying vehicle locations
2. Test real-time location updates with different network conditions
3. Validate vehicle status color scheme with design team
4. Ensure proper error handling for location update failures
*/

import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Typography, Grid, Button } from '@material-ui/core';
import { DirectionsCar, Person, Schedule } from '@material-ui/icons';
import Card from '../common/Card';
import { Vehicle } from '../../types';
import { updateVehicleLocation, setSelectedVehicle } from '../../store/slices/fleetSlice';

/**
 * Props interface for VehicleDetails component
 * Implements requirement: Interactive fleet management dashboard
 */
interface VehicleDetailsProps {
  vehicleId: string;
  onClose?: () => void;
}

/**
 * VehicleDetails component that displays detailed information about a selected vehicle
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Interactive fleet management dashboard
 * - Digital proof of delivery access
 */
const VehicleDetails: React.FC<VehicleDetailsProps> = ({ vehicleId, onClose }) => {
  const dispatch = useDispatch();

  // Select vehicle data from Redux store
  const vehicle = useSelector((state: any) => 
    state.fleet.vehicles.find((v: Vehicle) => v.id === vehicleId)
  );

  /**
   * Custom hook to manage real-time location updates
   * Implements requirement: Real-time GPS tracking with 30-second intervals
   */
  const useLocationUpdates = useCallback((vehicleId: string) => {
    useEffect(() => {
      // Initial location update
      dispatch(updateVehicleLocation(vehicleId));

      // Set up 30-second interval for location updates
      const intervalId = setInterval(() => {
        dispatch(updateVehicleLocation(vehicleId));
      }, 30000); // 30 seconds

      // Cleanup interval on component unmount
      return () => {
        clearInterval(intervalId);
        dispatch(setSelectedVehicle(''));
      };
    }, [vehicleId, dispatch]);
  }, [dispatch]);

  // Initialize location updates
  useLocationUpdates(vehicleId);

  // Early return if vehicle data is not available
  if (!vehicle) {
    return (
      <Card title="Vehicle Details">
        <Typography color="error">Vehicle not found</Typography>
      </Card>
    );
  }

  /**
   * Format the last update time in a human-readable format
   */
  const formatLastUpdate = (date: Date): string => {
    return new Date(date).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  /**
   * Render vehicle status with appropriate styling
   */
  const renderStatus = (status: string) => {
    const statusColors: { [key: string]: string } = {
      active: '#4caf50',
      inactive: '#f44336',
      maintenance: '#ff9800',
      assigned: '#2196f3'
    };

    return (
      <Typography
        variant="subtitle2"
        style={{
          color: statusColors[status.toLowerCase()] || '#757575',
          fontWeight: 'bold'
        }}
      >
        {status.toUpperCase()}
      </Typography>
    );
  };

  return (
    <Card
      title="Vehicle Details"
      actions={
        <Button
          variant="outlined"
          color="primary"
          onClick={onClose}
          size="small"
        >
          Close
        </Button>
      }
    >
      <Grid container spacing={3}>
        {/* Vehicle Registration */}
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <DirectionsCar color="primary" />
            </Grid>
            <Grid item>
              <Typography variant="h6">
                {vehicle.registrationNumber}
              </Typography>
            </Grid>
          </Grid>
        </Grid>

        {/* Vehicle Status */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" color="textSecondary">
            Status
          </Typography>
          {renderStatus(vehicle.status)}
        </Grid>

        {/* Current Location */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" color="textSecondary">
            Current Location
          </Typography>
          <Typography>
            Lat: {vehicle.currentLocation.latitude.toFixed(6)}
            <br />
            Long: {vehicle.currentLocation.longitude.toFixed(6)}
          </Typography>
        </Grid>

        {/* Last Update Time */}
        <Grid item xs={12}>
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <Schedule color="action" />
            </Grid>
            <Grid item>
              <Typography variant="body2" color="textSecondary">
                Last Updated: {formatLastUpdate(vehicle.lastUpdate)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<DirectionsCar />}
                onClick={() => {
                  // Handle view route details
                  // Implementation pending based on route management requirements
                }}
              >
                View Route
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Person />}
                onClick={() => {
                  // Handle view delivery history
                  // Implementation pending based on delivery history requirements
                }}
              >
                Delivery History
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
};

export default VehicleDetails;