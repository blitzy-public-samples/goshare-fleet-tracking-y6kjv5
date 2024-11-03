/**
 * Human Tasks:
 * 1. Configure Socket.io client connection pool size and timeout settings
 * 2. Set up monitoring for real-time location update latency
 * 3. Configure geofencing alert thresholds in production
 * 4. Review and optimize MongoDB indexes for location queries
 * 5. Set up backup strategy for location data
 */

// @version: express ^4.18.2
// @version: socket.io ^4.7.1
// @version: mongoose ^7.4.0

import { Request, Response } from 'express';
import { Server as SocketServer } from 'socket.io';
import { LocationModel, toLocationUpdate } from '../models/locationModel';
import {
  calculateDistance,
  validateCoordinates,
  isPointInPolygon,
  calculateBoundingBox
} from '../utils/geoUtils';
import { validateLocationUpdate } from '../../../common/middleware/validator';
import errorHandler, { formatErrorResponse, determineHttpStatus } from '../../../common/middleware/errorHandler';

// Initialize Socket.io instance for real-time updates
let io: SocketServer;

// Initialize Socket.io server
export const initializeSocketServer = (socketServer: SocketServer) => {
  io = socketServer;
};

/**
 * Requirement: Real-time GPS tracking
 * Updates vehicle location and broadcasts to connected clients
 */
export const updateVehicleLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const locationUpdate = req.body;

    // Validate coordinates
    if (!validateCoordinates(locationUpdate.coordinates)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid coordinates provided'
      });
      return;
    }

    // Convert to MongoDB GeoJSON format
    const locationDocument = {
      vehicleId: locationUpdate.vehicleId,
      location: {
        type: 'Point',
        coordinates: [
          locationUpdate.coordinates.longitude,
          locationUpdate.coordinates.latitude
        ]
      },
      timestamp: locationUpdate.timestamp,
      speed: locationUpdate.speed,
      heading: locationUpdate.heading,
      accuracy: locationUpdate.accuracy
    };

    // Save location update to MongoDB
    const savedLocation = await LocationModel.create(locationDocument);

    // Broadcast location update to connected clients
    if (io) {
      io.to(`vehicle:${locationUpdate.vehicleId}`).emit('locationUpdate', savedLocation.toLocationUpdate());
    }

    res.status(200).json({
      status: 'success',
      data: savedLocation.toLocationUpdate()
    });
  } catch (error) {
    errorHandler(error, req, res, null);
  }
};

/**
 * Requirement: Real-time GPS tracking
 * Retrieves current location for a specific vehicle
 */
export const getVehicleLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params;

    const location = await LocationModel
      .findOne({ vehicleId })
      .sort({ timestamp: -1 });

    if (!location) {
      res.status(404).json({
        status: 'error',
        message: 'Vehicle location not found'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: location.toLocationUpdate()
    });
  } catch (error) {
    errorHandler(error, req, res, null);
  }
};

/**
 * Requirement: Location Data Storage
 * Retrieves historical location data for a vehicle within a time range
 */
export const getVehicleHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params;
    const { startTime, endTime } = req.query;

    // Validate time range
    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid time range provided'
      });
      return;
    }

    const locations = await LocationModel
      .find({
        vehicleId,
        timestamp: {
          $gte: start,
          $lte: end
        }
      })
      .sort({ timestamp: 1 });

    res.status(200).json({
      status: 'success',
      data: locations.map(loc => loc.toLocationUpdate())
    });
  } catch (error) {
    errorHandler(error, req, res, null);
  }
};

/**
 * Requirement: Geofencing
 * Finds all vehicles within a specified geographic area
 */
export const getVehiclesInArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, radius } = req.query;

    const center = {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string)
    };

    const radiusInMeters = parseFloat(radius as string);

    // Validate coordinates and radius
    if (!validateCoordinates(center) || isNaN(radiusInMeters) || radiusInMeters <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid area parameters provided'
      });
      return;
    }

    // Calculate bounding box for efficient querying
    const boundingBox = calculateBoundingBox(center, radiusInMeters);

    // Query vehicles within the area using MongoDB's geospatial operators
    const vehicles = await LocationModel
      .find({
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [
              [center.longitude, center.latitude],
              radiusInMeters / 6371000 // Convert meters to radians
            ]
          }
        },
        timestamp: {
          $gte: new Date(Date.now() - 5 * 60 * 1000) // Only include updates from last 5 minutes
        }
      })
      .sort({ timestamp: -1 });

    res.status(200).json({
      status: 'success',
      data: vehicles.map(vehicle => vehicle.toLocationUpdate())
    });
  } catch (error) {
    errorHandler(error, req, res, null);
  }
};

/**
 * Requirement: Geofencing
 * Checks if a vehicle is within a defined geofence area
 */
export const checkGeofence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params;
    const { vertices } = req.body;

    // Validate geofence polygon
    if (!Array.isArray(vertices) || vertices.length < 3) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid geofence polygon provided'
      });
      return;
    }

    // Get vehicle's current location
    const vehicleLocation = await LocationModel
      .findOne({ vehicleId })
      .sort({ timestamp: -1 });

    if (!vehicleLocation) {
      res.status(404).json({
        status: 'error',
        message: 'Vehicle location not found'
      });
      return;
    }

    const point = {
      latitude: vehicleLocation.location.coordinates[1],
      longitude: vehicleLocation.location.coordinates[0]
    };

    // Check if vehicle is within geofence
    const isInside = isPointInPolygon(point, vertices);

    // Calculate distance to geofence if outside
    let distanceToFence = null;
    if (!isInside) {
      // Find closest polygon edge
      let minDistance = Infinity;
      for (let i = 0; i < vertices.length; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % vertices.length];
        const distance = calculateDistance(point, start);
        minDistance = Math.min(minDistance, distance);
      }
      distanceToFence = minDistance;
    }

    res.status(200).json({
      status: 'success',
      data: {
        vehicleId,
        timestamp: vehicleLocation.timestamp,
        isInsideGeofence: isInside,
        distanceToFence
      }
    });
  } catch (error) {
    errorHandler(error, req, res, null);
  }
};

// Export controller functions
export {
  updateVehicleLocation,
  getVehicleLocation,
  getVehicleHistory,
  getVehiclesInArea,
  checkGeofence
};