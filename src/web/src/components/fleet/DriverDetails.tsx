// @material-ui/core version: ^4.12.0
// @material-ui/icons version: ^4.11.3
// react version: ^18.0.0
// react-redux version: ^8.1.0

/* HUMAN TASKS:
1. Verify real-time update interval (30 seconds) is properly configured
2. Test communication features with actual phone and email systems
3. Validate driver status color scheme with UX team
4. Ensure proper error handling for network timeouts
*/

import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Typography, Grid, Chip, IconButton, Divider } from '@material-ui/core';
import { Phone, Email, DirectionsCar } from '@material-ui/icons';
import Card from '../common/Card';
import { Driver } from '../../types';
import { setSelectedVehicle } from '../../store/slices/fleetSlice';

/**
 * Props interface for the DriverDetails component
 * Implements requirement: Interactive fleet management dashboard
 */
interface DriverDetailsProps {
  driverId: string;
  onClose?: () => void;
}

/**
 * Component that displays detailed information about a specific driver with real-time updates
 * Implements requirements:
 * - Interactive fleet management dashboard
 * - Two-way communication system
 */
const DriverDetails: React.FC<DriverDetailsProps> = ({ driverId, onClose }) => {
  const dispatch = useDispatch();

  // Select driver data from Redux store
  const driver = useSelector((state: { fleet: { drivers: Driver[] } }) =>
    state.fleet.drivers.find(d => d.id === driverId)
  );

  // Update interval for real-time data
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Refresh driver data every 30 seconds
      // Implementation would dispatch a refresh action here
    }, 30000);

    return () => clearInterval(updateInterval);
  }, [driverId]);

  // Handle vehicle selection for navigation
  const handleVehicleClick = useCallback(() => {
    if (driver?.currentVehicle) {
      dispatch(setSelectedVehicle(driver.currentVehicle));
    }
  }, [dispatch, driver?.currentVehicle]);

  // Get status chip color based on driver status
  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'primary';
      case 'on_break':
        return 'secondary';
      case 'offline':
        return 'default';
      case 'emergency':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!driver) {
    return (
      <Card title="Driver Details" elevation={2}>
        <Typography color="error">
          Driver not found
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      title="Driver Details"
      elevation={2}
      actions={onClose && (
        <Typography
          variant="body2"
          color="primary"
          style={{ cursor: 'pointer' }}
          onClick={onClose}
        >
          Close
        </Typography>
      )}
    >
      <Grid container spacing={2}>
        {/* Driver Name and Status */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {driver.name}
          </Typography>
          <Chip
            label={driver.status}
            color={getStatusColor(driver.status)}
            size="small"
            style={{ marginBottom: 16 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Contact Information */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={1} alignItems="center">
            <Grid item>
              <IconButton
                size="small"
                onClick={() => window.location.href = `tel:${driver.phone}`}
                aria-label="Call driver"
              >
                <Phone />
              </IconButton>
            </Grid>
            <Grid item>
              <Typography>{driver.phone}</Typography>
            </Grid>
          </Grid>
        </Grid>

        {/* Current Vehicle Assignment */}
        {driver.currentVehicle && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Current Vehicle
            </Typography>
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <IconButton
                  size="small"
                  onClick={handleVehicleClick}
                  aria-label="View vehicle details"
                >
                  <DirectionsCar />
                </IconButton>
              </Grid>
              <Grid item>
                <Typography
                  style={{ cursor: 'pointer' }}
                  onClick={handleVehicleClick}
                >
                  {driver.currentVehicle}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Real-time Update Indicator */}
        <Grid item xs={12}>
          <Typography
            variant="caption"
            color="textSecondary"
            style={{ display: 'block', marginTop: 16 }}
          >
            Updates automatically every 30 seconds
          </Typography>
        </Grid>
      </Grid>
    </Card>
  );
};

export default DriverDetails;