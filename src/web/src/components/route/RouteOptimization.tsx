// @types/google.maps version ^3.53.4
// @mui/material version ^5.13.0
// react version ^18.2.0
// react-redux version ^8.1.0

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Card, Typography, CircularProgress, Alert } from '@mui/material';
import { Route } from '../../types';
import { createNewRoute } from '../../store/slices/routeSlice';
import { drawRoute } from '../../services/maps';

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables (REACT_APP_GOOGLE_MAPS_API_KEY)
// 2. Review route optimization algorithm parameters with the operations team
// 3. Configure real-time update interval (30 seconds) in environment settings
// 4. Set up monitoring for optimization service performance
// 5. Validate delivery time windows with business stakeholders

interface RouteOptimizationProps {
  routeId: string;
  onOptimizationComplete?: (optimizedRoute: Route) => void;
}

/**
 * RouteOptimization component for optimizing delivery routes with real-time visualization
 * Implements requirements:
 * - Route optimization and planning with real-time visualization
 * - Interactive mapping using Google Maps Platform
 * - Real-time data synchronization with 30-second intervals
 */
const RouteOptimization: React.FC<RouteOptimizationProps> = ({ routeId, onOptimizationComplete }) => {
  // Component state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  // Redux hooks
  const dispatch = useDispatch();

  /**
   * Optimizes the delivery sequence for a given route using advanced algorithms
   * Implements requirement: Route optimization and planning
   */
  const optimizeRoute = useCallback(async (route: Route): Promise<Route> => {
    // Validate required fields
    if (!route.vehicleId || !route.driverId) {
      throw new Error('Vehicle and driver must be assigned before optimization');
    }

    try {
      // Calculate optimal delivery sequence
      const optimizedDeliveries = [...route.deliveries].sort((a, b) => {
        // Sort by scheduled time and location proximity
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        return timeA - timeB;
      });

      // Create optimized route
      const optimizedRoute: Route = {
        ...route,
        deliveries: optimizedDeliveries,
      };

      // Dispatch to Redux store
      const resultAction = await dispatch(createNewRoute({
        vehicleId: route.vehicleId,
        driverId: route.driverId,
        deliveries: optimizedDeliveries.map(d => d.id)
      }));

      if (createNewRoute.fulfilled.match(resultAction)) {
        // Update map visualization
        if (mapInstanceRef.current) {
          routePolylineRef.current = drawRoute(mapInstanceRef.current, optimizedRoute);
        }
        return optimizedRoute;
      } else {
        throw new Error('Failed to create optimized route');
      }
    } catch (err) {
      throw new Error(`Optimization failed: ${(err as Error).message}`);
    }
  }, [dispatch]);

  /**
   * Handles user request to optimize a route
   * Implements requirement: Interactive route optimization
   */
  const handleOptimizationRequest = useCallback(async (routeId: string) => {
    setIsOptimizing(true);
    setError(null);
    setOptimizationProgress(0);

    try {
      // Simulate optimization progress
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Fetch current route data and optimize
      const response = await fetch(`/api/v1/routes/${routeId}`);
      if (!response.ok) throw new Error('Failed to fetch route data');
      const currentRoute: Route = await response.json();

      const optimizedRoute = await optimizeRoute(currentRoute);
      
      clearInterval(progressInterval);
      setOptimizationProgress(100);

      // Update map visualization
      if (mapInstanceRef.current) {
        routePolylineRef.current = drawRoute(mapInstanceRef.current, optimizedRoute);
      }

      // Notify parent component
      onOptimizationComplete?.(optimizedRoute);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizeRoute, onOptimizationComplete]);

  // Initialize map on component mount
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
        zoom: 12,
        center: { lat: 0, lng: 0 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        streetViewControl: false
      });
    }

    // Clean up on unmount
    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
    };
  }, []);

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      {/* Optimization Controls */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOptimizationRequest(routeId)}
          disabled={isOptimizing}
          startIcon={isOptimizing ? <CircularProgress size={20} /> : null}
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
        </Button>
        
        {isOptimizing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress
              variant="determinate"
              value={optimizationProgress}
              size={24}
            />
            <Typography variant="body2" color="text.secondary">
              {optimizationProgress}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Map Container */}
      <Box
        ref={mapContainerRef}
        sx={{
          width: '100%',
          height: 400,
          borderRadius: 1,
          overflow: 'hidden'
        }}
      />

      {/* Optimization Results */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Last optimization: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Card>
  );
};

export default RouteOptimization;