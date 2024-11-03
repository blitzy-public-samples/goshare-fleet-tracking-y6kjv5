// Human Tasks:
// 1. Configure rate limiting rules for fleet management endpoints
// 2. Set up monitoring alerts for high-frequency location updates
// 3. Configure WebSocket SSL certificates for secure real-time updates
// 4. Review and adjust RBAC policies periodically
// 5. Set up backup strategy for fleet tracking data

// Third-party imports
import { Router } from 'express'; // ^4.18.2

// Internal imports
import { FleetController } from '../controllers/fleetController';
import { authenticateToken, authorizeRoles } from '../../auth/middleware/authMiddleware';
import { validateSchema, validateLocationUpdate } from '../../../common/middleware/validator';
import { VehicleSchema, VehicleStatusSchema, VehicleQuerySchema } from '../../../common/types';

/**
 * Initializes fleet management routes with security and validation
 * Requirements: Fleet Management, Real-time GPS Tracking, API Design, Security
 */
const initializeFleetRoutes = (fleetController: FleetController): Router => {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(authenticateToken);

    /**
     * POST /vehicles
     * Create a new vehicle in the fleet
     * Requirements: Fleet Management, Security
     */
    router.post(
        '/vehicles',
        authorizeRoles(['ADMIN', 'FLEET_MANAGER']),
        validateSchema(VehicleSchema),
        fleetController.createVehicle
    );

    /**
     * PUT /vehicles/:id/location
     * Update vehicle location with real-time tracking
     * Requirements: Real-time GPS Tracking, Security
     */
    router.put(
        '/vehicles/:id/location',
        validateLocationUpdate,
        fleetController.updateVehicleLocation
    );

    /**
     * GET /vehicles/:id/location
     * Get current location of a specific vehicle
     * Requirements: Fleet Management, Security
     */
    router.get(
        '/vehicles/:id/location',
        fleetController.getVehicleLocation
    );

    /**
     * PUT /vehicles/:id/status
     * Update operational status of a vehicle
     * Requirements: Fleet Management, Security
     */
    router.put(
        '/vehicles/:id/status',
        authorizeRoles(['ADMIN', 'FLEET_MANAGER']),
        validateSchema(VehicleStatusSchema),
        fleetController.updateVehicleStatus
    );

    /**
     * GET /vehicles
     * Get vehicles filtered by operational status
     * Requirements: Fleet Management, Security
     */
    router.get(
        '/vehicles',
        validateSchema(VehicleQuerySchema, 'query'),
        fleetController.getVehiclesByStatus
    );

    return router;
};

export default initializeFleetRoutes;