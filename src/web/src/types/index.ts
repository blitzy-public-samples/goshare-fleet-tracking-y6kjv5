// @types/google.maps version ^3.53.4
import { DELIVERY_STATUS, ROUTE_STATUS } from '../constants';

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Ensure all coordinates are properly validated before use
// 3. Confirm date formats are consistent across the application
// 4. Review real-time tracking interval with infrastructure team

/**
 * Geographic coordinate type definition for location tracking
 * Implements requirement 1.2: Real-time GPS tracking
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Vehicle data structure for fleet management
 * Implements requirement 1.2: Fleet Management Dashboard
 */
export interface Vehicle {
  id: string;
  registrationNumber: string;
  currentLocation: Coordinates;
  status: string;
  lastUpdate: Date;
}

/**
 * Driver data structure for personnel management
 * Implements requirement 1.2: Fleet Management Dashboard
 */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
  currentVehicle: string;
}

/**
 * Delivery task data structure for tracking individual deliveries
 * Implements requirement 1.2: Route Optimization
 */
export interface Delivery {
  id: string;
  address: string;
  coordinates: Coordinates;
  status: DELIVERY_STATUS;
  scheduledTime: Date;
  completedTime: Date;
}

/**
 * Route data structure with deliveries for route optimization
 * Implements requirement 1.2: Route Optimization
 */
export interface Route {
  id: string;
  vehicleId: string;
  driverId: string;
  deliveries: Delivery[];
  status: ROUTE_STATUS;
  startTime: Date;
  endTime: Date;
}

/**
 * Google Maps configuration type for map visualization
 * Implements requirement 1.2: Fleet Management Dashboard
 */
export interface MapConfig {
  center: Coordinates;
  zoom: number;
  mapTypeId: google.maps.MapTypeId;
}