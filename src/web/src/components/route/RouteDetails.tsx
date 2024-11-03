// @material-ui/core version ^4.12.0
// react version ^18.0.0
// react-redux version ^8.0.5

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Ensure real-time update interval (30 seconds) is configured in environment
// 3. Review route status transition rules with business team
// 4. Set up monitoring for real-time updates performance
// 5. Confirm error notification settings with UX team

import React, { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  Typography,
  Button,
  Grid,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@material-ui/core';
import { selectRouteById, updateRouteStatus } from '../../store/slices/routeSlice';
import { Route, Delivery } from '../../types';
import Loading from '../common/Loading';
import MapContainer from '../map/MapContainer';
import RoutePolyline from '../map/RoutePolyline';

// Props interface for RouteDetails component
interface RouteDetailsProps {
  routeId: string;
}

/**
 * RouteDetails Component
 * Displays detailed information about a specific delivery route with real-time updates
 * Implements requirements:
 * - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 * - Interactive mapping using Google Maps Platform (1.1 System Overview/Web Dashboard)
 */
const RouteDetails: React.FC<RouteDetailsProps> = ({ routeId }) => {
  // Redux hooks
  const dispatch = useDispatch();
  const route = useSelector(state => selectRouteById(state, routeId));
  
  // Local state for loading and error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Set up real-time updates with 30-second interval
   * Implements requirement: Real-time data synchronization
   */
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (route?.status === 'ACTIVE') {
        // Re-fetch route data for real-time updates
        dispatch(selectRouteById(routeId));
      }
    }, 30000); // 30 seconds interval

    return () => clearInterval(updateInterval);
  }, [dispatch, routeId, route?.status]);

  /**
   * Handle route status updates with validation
   * Implements requirement: Route status tracking
   */
  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await dispatch(updateRouteStatus({ 
        routeId, 
        status: newStatus 
      })).unwrap();
      
    } catch (err) {
      setError('Failed to update route status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dispatch, routeId]);

  /**
   * Format delivery time window for display
   */
  const formatTimeWindow = (delivery: Delivery) => {
    const scheduled = new Date(delivery.scheduledTime);
    return scheduled.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Show loading state while fetching initial data
  if (!route) {
    return <Loading size={40} overlay={true} />;
  }

  return (
    <Grid container spacing={3}>
      {/* Route Status Card */}
      <Grid item xs={12}>
        <Card>
          <Box p={2}>
            <Typography variant="h5" gutterBottom>
              Route Details #{route.id}
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Chip
                  label={route.status}
                  color={route.status === 'ACTIVE' ? 'primary' : 'default'}
                />
              </Grid>
              
              <Grid item>
                <Typography variant="body2" color="textSecondary">
                  Vehicle: {route.vehicleId}
                </Typography>
              </Grid>
              
              <Grid item>
                <Typography variant="body2" color="textSecondary">
                  Driver: {route.driverId}
                </Typography>
              </Grid>
            </Grid>

            {/* Route Control Buttons */}
            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                disabled={loading || route.status === 'ACTIVE'}
                onClick={() => handleStatusUpdate('ACTIVE')}
              >
                Start Route
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                disabled={loading || route.status !== 'ACTIVE'}
                onClick={() => handleStatusUpdate('COMPLETED')}
                style={{ marginLeft: 8 }}
              >
                Complete Route
              </Button>
            </Box>

            {/* Error Message Display */}
            {error && (
              <Typography color="error" variant="body2" style={{ marginTop: 8 }}>
                {error}
              </Typography>
            )}
          </Box>
        </Card>
      </Grid>

      {/* Map Visualization */}
      <Grid item xs={12} md={8}>
        <Card style={{ height: '500px' }}>
          <MapContainer
            vehicles={[]}
            activeRoute={route}
            geofences={[]}
            onVehicleClick={() => {}}
          />
          {route && (
            <RoutePolyline
              map={google.maps.Map}
              route={route}
              options={{
                strokeWeight: 4,
                strokeOpacity: 0.9
              }}
            />
          )}
        </Card>
      </Grid>

      {/* Delivery Points List */}
      <Grid item xs={12} md={4}>
        <Card>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Delivery Points
            </Typography>
            
            <List>
              {route.deliveries.map((delivery, index) => (
                <React.Fragment key={delivery.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={delivery.address}
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            Scheduled: {formatTimeWindow(delivery)}
                          </Typography>
                          <Chip
                            size="small"
                            label={delivery.status}
                            style={{ marginTop: 4 }}
                          />
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Card>
      </Grid>

      {/* Route Timing Information */}
      <Grid item xs={12}>
        <Card>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Route Schedule
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Start Time
                </Typography>
                <Typography variant="body1">
                  {new Date(route.startTime).toLocaleString()}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Expected End Time
                </Typography>
                <Typography variant="body1">
                  {new Date(route.endTime).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
};

export default RouteDetails;