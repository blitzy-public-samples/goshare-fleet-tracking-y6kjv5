// @version: mongoose ^7.4.0

/**
 * Human Tasks:
 * 1. Ensure MongoDB replica set is configured with proper write concern for location data
 * 2. Verify geospatial indexes are created and optimized for query patterns
 * 3. Monitor TTL index effectiveness and adjust retention period if needed
 * 4. Set up monitoring for collection size and performance metrics
 */

import mongoose from 'mongoose';
import { LocationUpdate, Coordinates } from '../../common/types';
import { mongoConnection } from '../../common/config/database';

// Global constants for location data management
const LOCATION_COLLECTION = 'vehicle_locations';
const LOCATION_TTL_DAYS = 90;

// Requirement: Location Data Storage - MongoDB schema for location tracking
const LocationSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    index: true, // Index for faster vehicle-based queries
  },
  // Requirement: Real-time GPS tracking - GeoJSON location storage
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords: number[]) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    }
  },
  // Requirement: Real-time GPS tracking - Timestamp for each location update
  timestamp: {
    type: Date,
    required: true,
    index: true, // Index for time-based queries
    expires: LOCATION_TTL_DAYS * 24 * 60 * 60 // TTL index for automatic cleanup
  },
  // Requirement: Real-time GPS tracking - Vehicle telemetry data
  speed: {
    type: Number,
    required: true,
    min: 0,
    max: 300 // Maximum realistic speed in km/h
  },
  heading: {
    type: Number,
    required: true,
    min: 0,
    max: 360 // Degrees
  },
  accuracy: {
    type: Number,
    required: true,
    min: 0
  },
  // Optional metadata for additional vehicle information
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: LOCATION_COLLECTION,
  // Optimize for write-heavy workload
  writeConcern: {
    w: 'majority',
    j: true
  }
});

// Requirement: Location Data Storage - Geospatial indexing for location queries
LocationSchema.index({ location: '2dsphere' });

// Requirement: Historical Tracking - Convert document to LocationUpdate type
LocationSchema.methods.toLocationUpdate = function(): LocationUpdate {
  return {
    vehicleId: this.vehicleId,
    coordinates: {
      latitude: this.location.coordinates[1],
      longitude: this.location.coordinates[0]
    },
    timestamp: this.timestamp,
    speed: this.speed,
    heading: this.heading,
    accuracy: this.accuracy
  };
};

// Create location model with replica set support
const createLocationModel = (): mongoose.Model<any> => {
  // Ensure we're using the replica set connection
  const connection = mongoConnection;
  
  // Create and configure model
  const LocationModel = connection.model(LOCATION_COLLECTION, LocationSchema);

  // Ensure indexes are created
  LocationModel.createIndexes().catch(error => {
    console.error('Failed to create location model indexes:', error);
    throw error;
  });

  return LocationModel;
};

// Export the schema and model
export const LocationModel = createLocationModel();
export { LocationSchema };

export default LocationModel;