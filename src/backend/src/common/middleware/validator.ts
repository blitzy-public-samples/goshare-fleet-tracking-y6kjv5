// Human Tasks:
// 1. Configure rate limiting for validation endpoints in production
// 2. Set up monitoring for validation error rates
// 3. Review and adjust validation rules periodically based on business needs
// 4. Configure proper error tracking integration for validation errors

// joi v17.9.2 - Schema validation
import Joi from 'joi';
// express v4.18.2 - Express middleware types
import { Request, Response, NextFunction } from 'express';
// http-status-codes v2.2.0 - HTTP status codes
import { StatusCodes } from 'http-status-codes';

// Import logger for validation error logging
import logger from '../utils/logger';

// Import types for validation
import {
  LocationUpdate,
  Vehicle,
  Route,
  Delivery,
  Coordinates,
  VehicleStatus,
  RouteStatus,
  DeliveryStatus
} from '../types';

// Validation types enum for request data location
export enum ValidationTypes {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params'
}

// Default validation options
export const DEFAULT_VALIDATION_OPTIONS = {
  abortEarly: false,      // Return all errors instead of stopping at first
  allowUnknown: true,     // Allow unknown keys that will be removed
  stripUnknown: true      // Remove unknown keys
};

/**
 * Creates a middleware function that validates request data against a Joi schema
 * Requirement: API Request Validation - Validate incoming API requests
 * 
 * @param schema - Joi validation schema
 * @param validationType - Type of request data to validate (body, query, params)
 * @returns Express middleware function
 */
export const validateSchema = (
  schema: Joi.Schema,
  validationType: ValidationTypes = ValidationTypes.BODY
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[validationType];

    const { error, value } = schema.validate(data, DEFAULT_VALIDATION_OPTIONS);

    if (error) {
      logger.error('Validation error', {
        path: req.path,
        method: req.method,
        validationType,
        errors: error.details
      });

      res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }

    // Attach validated data back to request
    req[validationType] = value;
    next();
  };
};

/**
 * Validates location update data ensuring GPS data integrity
 * Requirement: Security - Input validation for location data
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const validateLocationUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const schema = Joi.object<LocationUpdate>({
    vehicleId: Joi.string().required(),
    coordinates: Joi.object<Coordinates>({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    timestamp: Joi.date().max('now').required(),
    speed: Joi.number().min(0).max(200),
    heading: Joi.number().min(0).max(360),
    accuracy: Joi.number().min(0).max(100)
  });

  const { error } = schema.validate(req.body, DEFAULT_VALIDATION_OPTIONS);

  if (error) {
    logger.error('Location update validation error', {
      vehicleId: req.body.vehicleId,
      errors: error.details
    });

    res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: 'Invalid location update data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

/**
 * Validates route data including delivery information
 * Requirement: API Request Validation - Validate route and delivery data
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const validateRouteData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const deliverySchema = Joi.object<Delivery>({
    location: Joi.object<Coordinates>({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    scheduledTime: Joi.date().required(),
    status: Joi.string().valid(...Object.values(DeliveryStatus))
  });

  const routeSchema = Joi.object<Route>({
    vehicleId: Joi.string().required(),
    driverId: Joi.string().required(),
    deliveries: Joi.array().items(deliverySchema).min(1).required(),
    status: Joi.string().valid(...Object.values(RouteStatus)),
    startTime: Joi.date().required(),
    endTime: Joi.date().greater(Joi.ref('startTime')).required()
  });

  const { error } = routeSchema.validate(req.body, DEFAULT_VALIDATION_OPTIONS);

  if (error) {
    logger.error('Route data validation error', {
      vehicleId: req.body.vehicleId,
      driverId: req.body.driverId,
      errors: error.details
    });

    res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: 'Invalid route data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  // Validate delivery schedule sequence
  const deliveries = req.body.deliveries as Delivery[];
  let previousTime = new Date(req.body.startTime);

  for (const delivery of deliveries) {
    const scheduledTime = new Date(delivery.scheduledTime);
    if (scheduledTime < previousTime) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid delivery sequence',
        error: 'Delivery times must be in chronological order'
      });
      return;
    }
    previousTime = scheduledTime;
  }

  next();
};

// Export validation middleware functions
export {
  validateSchema,
  validateLocationUpdate,
  validateRouteData
};