// Human Tasks:
// 1. Configure rate limiting for route optimization endpoints
// 2. Set up monitoring alerts for optimization performance
// 3. Configure caching parameters for route queries
// 4. Set up automated testing for route optimization scenarios
// 5. Configure webhook endpoints for route status notifications

// Third-party imports
import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { StatusCodes } from 'http-status-codes'; // ^2.2.0

// Internal imports
import { RouteModel } from '../models/routeModel';
import { optimizeDeliverySequence, reoptimizeRoute } from '../utils/optimizationUtils';
import { Route, RouteStatus, Delivery, DeliveryStatus } from '../../../common/types';
import errorHandler from '../../../common/middleware/errorHandler';

// Initialize RouteModel instance
const routeModel = new RouteModel();

/**
 * Route Controller implementing route management operations
 * Requirement: Route optimization and planning capabilities for efficient delivery management
 */
export const RouteController = {
  /**
   * Creates a new delivery route with optimization
   * Requirement: Route optimization and planning capabilities
   */
  createRoute: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const routeData: Route = req.body;

      // Validate required route data
      if (!routeData.vehicleId || !routeData.driverId || !routeData.deliveries?.length) {
        const error = new Error('Invalid route data');
        error.name = 'ValidationError';
        throw error;
      }

      // Set initial route status
      routeData.status = RouteStatus.PENDING;
      routeData.startTime = new Date(routeData.startTime);
      routeData.endTime = new Date(routeData.endTime);

      // Optimize delivery sequence
      const optimizedDeliveries = await optimizeDeliverySequence(routeData);
      routeData.deliveries = optimizedDeliveries;

      // Create route with optimized sequence
      const createdRoute = await routeModel.createRoute(routeData);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: createdRoute
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieves route details by ID with real-time delivery status
   * Requirement: Real-time Data Synchronization
   */
  getRoute: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId } = req.params;

      if (!routeId) {
        const error = new Error('Route ID is required');
        error.name = 'ValidationError';
        throw error;
      }

      const route = await routeModel.getRouteById(routeId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: route
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates the status of a route
   * Requirement: Real-time route optimization and status updates
   */
  updateRouteStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId } = req.params;
      const { status } = req.body;

      if (!routeId || !Object.values(RouteStatus).includes(status)) {
        const error = new Error('Invalid route ID or status');
        error.name = 'ValidationError';
        throw error;
      }

      const updatedRoute = await routeModel.updateRouteStatus(routeId, status);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: updatedRoute
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieves all active routes with real-time status
   * Requirement: Real-time Data Synchronization
   */
  getActiveRoutes: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeRoutes = await routeModel.getActiveRoutes();

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: activeRoutes
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates delivery status with proof of delivery
   * Requirements: Digital proof of delivery tracking and management
   */
  updateDeliveryStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId, deliveryId } = req.params;
      const { status, proofOfDelivery } = req.body;

      if (!routeId || !deliveryId || !Object.values(DeliveryStatus).includes(status)) {
        const error = new Error('Invalid route ID, delivery ID, or status');
        error.name = 'ValidationError';
        throw error;
      }

      // Update delivery status
      const updatedDelivery = await routeModel.updateDeliveryStatus(
        routeId,
        deliveryId,
        status
      );

      // Check if route needs reoptimization based on new status
      if (status === DeliveryStatus.CANCELLED || status === DeliveryStatus.FAILED) {
        const route = await routeModel.getRouteById(routeId);
        const reoptimizedDeliveries = await reoptimizeRoute(route, {
          trafficFactor: 1.2 // Consider current traffic conditions
        });

        // Update route with reoptimized sequence
        if (reoptimizedDeliveries.length > 0) {
          await routeModel.optimizeRoute(routeId);
        }
      }

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: updatedDelivery
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Optimizes or reoptimizes a route's delivery sequence
   * Requirement: Route optimization and planning capabilities
   */
  optimizeRoute: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId } = req.params;
      const { considerTraffic = true } = req.body;

      if (!routeId) {
        const error = new Error('Route ID is required');
        error.name = 'ValidationError';
        throw error;
      }

      // Get current route data
      const route = await routeModel.getRouteById(routeId);

      // Perform route optimization
      const optimizedRoute = await routeModel.optimizeRoute(routeId);

      // If traffic consideration is enabled, apply real-time optimization
      if (considerTraffic && route.status === RouteStatus.IN_PROGRESS) {
        const reoptimizedDeliveries = await reoptimizeRoute(optimizedRoute, {
          trafficFactor: 1.2, // Consider current traffic conditions
          roadClosures: [] // Could be populated from traffic service
        });
        optimizedRoute.deliveries = reoptimizedDeliveries;
      }

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: optimizedRoute
      });
    } catch (error) {
      next(error);
    }
  }
};