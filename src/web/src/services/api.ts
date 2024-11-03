// axios version ^1.4.0
import { AxiosResponse } from 'axios';
import { apiClient, handleApiError } from '../config/api';
import { Vehicle, Driver, Route, Delivery, Coordinates } from '../types';

// Human Tasks:
// 1. Verify API endpoint URLs in environment configuration
// 2. Set up monitoring for 30-second update intervals
// 3. Configure SSL certificates for secure API communication
// 4. Review retry mechanism thresholds for real-time updates

/**
 * Core API service module for fleet tracking system
 * Implements REQ-6.3.1: RESTful API endpoints for fleet management
 */

/**
 * Retrieves list of all vehicles with real-time location data
 * Implements requirement: Real-time data synchronization with 30-second intervals
 */
export const getVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response: AxiosResponse<Vehicle[]> = await apiClient.get('/api/v1/vehicles');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Gets real-time location for a specific vehicle
 * Implements requirement: Real-time GPS tracking with location updates
 */
export const getVehicleLocation = async (vehicleId: string): Promise<Coordinates> => {
  try {
    const response: AxiosResponse<Coordinates> = await apiClient.get(
      `/api/v1/vehicles/${vehicleId}/location`
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Creates a new optimized delivery route
 * Implements requirement: Route optimization and management
 */
interface RouteInput {
  vehicleId: string;
  driverId: string;
  deliveries: string[];
}

export const createRoute = async (routeData: RouteInput): Promise<Route> => {
  try {
    const response: AxiosResponse<Route> = await apiClient.post(
      '/api/v1/routes',
      routeData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Updates delivery status with validation
 * Implements requirement: Real-time delivery status tracking
 */
export const updateDeliveryStatus = async (
  deliveryId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
): Promise<Delivery> => {
  try {
    const response: AxiosResponse<Delivery> = await apiClient.put(
      `/api/v1/deliveries/${deliveryId}/status`,
      { status },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Retrieves current route assignments for a driver
 * Implements requirement: Driver route management and tracking
 */
export const getDriverAssignments = async (driverId: string): Promise<Route[]> => {
  try {
    const response: AxiosResponse<Route[]> = await apiClient.get(
      `/api/v1/drivers/${driverId}/assignments`
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Polling interval for real-time updates (30 seconds)
export const LOCATION_UPDATE_INTERVAL = 30000;

// WebSocket event types for real-time updates
export const WS_EVENTS = {
  VEHICLE_LOCATION: 'vehicle:location:update',
  DELIVERY_STATUS: 'delivery:status:update',
  ROUTE_UPDATE: 'route:update',
  DRIVER_ASSIGNMENT: 'driver:assignment:update'
};

// API endpoint version
export const API_VERSION = 'v1';

// Error message constants
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connectivity error occurred',
  UNAUTHORIZED: 'Authentication required',
  INVALID_REQUEST: 'Invalid request parameters',
  SERVER_ERROR: 'Server error occurred',
  TIMEOUT: 'Request timeout exceeded'
};