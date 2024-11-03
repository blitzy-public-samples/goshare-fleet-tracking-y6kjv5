/**
 * Human Tasks:
 * 1. Configure rate limiting rules for location endpoints in production
 * 2. Set up monitoring for real-time location update latency
 * 3. Configure geofencing alert thresholds
 * 4. Review and optimize MongoDB indexes for location queries
 * 5. Set up backup strategy for location data
 */

// @version: express ^4.18.2
import { Router } from 'express';
import {
  updateVehicleLocation,
  getVehicleLocation,
  getVehicleHistory,
  getVehiclesInArea,
  checkGeofence
} from '../controllers/locationController';
import {
  authenticateToken,
  authorizeRoles
} from '../../auth/middleware/authMiddleware';
import { validateLocationUpdate } from '../../../common/middleware/validator';

/**
 * Configures and returns an Express router with all location-related routes
 * and their respective middleware chains
 * 
 * Requirements addressed:
 * - Real-time GPS tracking (1.2 Scope/Core Functionality)
 * - Geofencing (1.2 Scope/Core Functionality)
 * - API Security (8.1 Authentication and Authorization)
 */
const configureLocationRoutes = (): Router => {
  const router = Router();

  /**
   * POST /location/update
   * Updates vehicle location in real-time
   * Access: DRIVER, ADMIN
   * Requirement: Real-time GPS tracking with 30-second update intervals
   */
  router.post(
    '/location/update',
    authenticateToken,
    authorizeRoles(['DRIVER', 'ADMIN']),
    validateLocationUpdate,
    updateVehicleLocation
  );

  /**
   * GET /location/vehicle/:vehicleId
   * Gets current location for specific vehicle
   * Access: DISPATCHER, ADMIN
   * Requirement: Real-time GPS tracking
   */
  router.get(
    '/location/vehicle/:vehicleId',
    authenticateToken,
    authorizeRoles(['DISPATCHER', 'ADMIN']),
    getVehicleLocation
  );

  /**
   * GET /location/history/:vehicleId
   * Gets location history for specific vehicle
   * Access: DISPATCHER, ADMIN
   * Requirement: Real-time GPS tracking - historical data
   */
  router.get(
    '/location/history/:vehicleId',
    authenticateToken,
    authorizeRoles(['DISPATCHER', 'ADMIN']),
    getVehicleHistory
  );

  /**
   * GET /location/area
   * Finds vehicles within specified geographic area
   * Access: DISPATCHER, ADMIN
   * Requirement: Geofencing and zone management
   */
  router.get(
    '/location/area',
    authenticateToken,
    authorizeRoles(['DISPATCHER', 'ADMIN']),
    getVehiclesInArea
  );

  /**
   * POST /location/geofence/check
   * Checks if vehicle is within defined geofence
   * Access: DISPATCHER, ADMIN
   * Requirement: Geofencing and zone management
   */
  router.post(
    '/location/geofence/check',
    authenticateToken,
    authorizeRoles(['DISPATCHER', 'ADMIN']),
    checkGeofence
  );

  return router;
};

// Export configured router as locationRouter
export const locationRouter = configureLocationRoutes();
export default locationRouter;