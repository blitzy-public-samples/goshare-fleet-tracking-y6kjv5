// Human Tasks:
// 1. Configure rate limiting for route optimization endpoints
// 2. Set up monitoring for route optimization performance
// 3. Configure caching strategy for frequently accessed routes
// 4. Set up webhook endpoints for route status notifications
// 5. Configure proper error tracking integration

// Third-party imports
import express, { Router } from 'express'; // ^4.18.2

// Internal imports
import { RouteController } from '../controllers/routeController';
import { authenticateToken, authorizeRoles } from '../../auth/middleware/authMiddleware';
import { validateRouteData } from '../../../common/middleware/validator';

/**
 * Express router configuration for route management endpoints
 * Implements route creation, optimization, status updates, and delivery tracking
 * with secure authentication and validation
 */
const router: Router = express.Router();

/**
 * POST /routes
 * Create a new delivery route with optimized sequence
 * Requirements addressed:
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 */
router.post(
  '/routes',
  authenticateToken,
  authorizeRoles(['FLEET_MANAGER', 'DISPATCHER']),
  validateRouteData,
  RouteController.createRoute
);

/**
 * GET /routes/:id
 * Get route details by ID with real-time status
 * Requirements addressed:
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 */
router.get(
  '/routes/:id',
  authenticateToken,
  authorizeRoles(['FLEET_MANAGER', 'DISPATCHER', 'DRIVER']),
  RouteController.getRoute
);

/**
 * PUT /routes/:id/status
 * Update route status with transaction support
 * Requirements addressed:
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 */
router.put(
  '/routes/:id/status',
  authenticateToken,
  authorizeRoles(['FLEET_MANAGER', 'DISPATCHER', 'DRIVER']),
  RouteController.updateRouteStatus
);

/**
 * GET /routes/active
 * Get all active routes with real-time tracking
 * Requirements addressed:
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 */
router.get(
  '/routes/active',
  authenticateToken,
  authorizeRoles(['FLEET_MANAGER', 'DISPATCHER']),
  RouteController.getActiveRoutes
);

/**
 * PUT /routes/:id/deliveries/:deliveryId/status
 * Update delivery status with proof of delivery support
 * Requirements addressed:
 * - Digital proof of delivery (1.2 Scope/Core Functionality)
 */
router.put(
  '/routes/:id/deliveries/:deliveryId/status',
  authenticateToken,
  authorizeRoles(['FLEET_MANAGER', 'DISPATCHER', 'DRIVER']),
  RouteController.updateDeliveryStatus
);

/**
 * POST /routes/:id/optimize
 * Optimize route sequence using VRP algorithm
 * Requirements addressed:
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 */
router.post(
  '/routes/:id/optimize',
  authenticateToken,
  authorizeRoles(['FLEET_MANAGER', 'DISPATCHER']),
  RouteController.optimizeRoute
);

// Export configured router
export default router;