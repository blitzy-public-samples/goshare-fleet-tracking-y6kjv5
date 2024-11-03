// Human Tasks:
// 1. Configure rate limiting thresholds for route optimization endpoints
// 2. Set up monitoring alerts for route optimization performance
// 3. Configure database connection pooling parameters
// 4. Set up webhook endpoints for route status notifications
// 5. Configure caching strategy for frequently accessed routes

// Third-party imports
import express, { Express } from 'express'; // ^4.18.2

// Internal imports
import router from './routes/routeRoutes';
import { RouteModel } from './models/routeModel';
import { RouteController } from './controllers/routeController';

/**
 * Initializes the route management service with its dependencies
 * Requirements addressed:
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 * - Digital proof of delivery (1.2 Scope/Core Functionality)
 */
export const initializeRouteService = (app: Express): void => {
  // Initialize route model with database connections
  const routeModel = new RouteModel();

  // Mount authenticated route endpoints
  app.use('/api/v1', router);

  // Error handling for route operations
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`Route Service Error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error in route service',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });
};

// Export route-related functionality for use by other services
export {
  // Export RouteModel for database operations
  RouteModel,
  
  // Export RouteController for route management operations
  RouteController
};