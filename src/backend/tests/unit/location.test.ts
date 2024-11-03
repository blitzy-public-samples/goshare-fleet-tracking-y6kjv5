// @version: jest ^29.6.0
// @version: mongoose ^7.4.0
// @version: supertest ^6.3.3

/**
 * Human Tasks:
 * 1. Configure MongoDB test database with replica set for proper testing
 * 2. Set up test environment variables for database connection
 * 3. Ensure test data cleanup after test runs
 * 4. Monitor test coverage and maintain >90% coverage
 */

import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { LocationModel } from '../../src/services/location/models/locationModel';
import { 
  updateVehicleLocation,
  getVehicleLocation,
  getVehicleHistory,
  checkGeofence
} from '../../src/services/location/controllers/locationController';
import {
  calculateDistance,
  validateCoordinates,
  isPointInPolygon,
  calculateBoundingBox
} from '../../src/services/location/utils/geoUtils';
import { LocationUpdate, Coordinates } from '../../src/common/types';

// Test constants
const TEST_VEHICLE_ID = 'test-vehicle-123';
const TEST_COORDINATES: Coordinates = { latitude: 40.7128, longitude: -74.006 };
const TEST_POLYGON = [
  { latitude: 40.7128, longitude: -74.006 },
  { latitude: 40.7129, longitude: -74.0061 },
  { latitude: 40.713, longitude: -74.0062 },
  { latitude: 40.7128, longitude: -74.006 }
];
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds in milliseconds

let mongoServer: MongoMemoryReplSet;

// Setup and teardown
beforeAll(async () => {
  // Start in-memory MongoDB server with replica set
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  });
  
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await LocationModel.deleteMany({});
});

describe('Location Model', () => {
  // Requirement: Location Data Storage - Test location document creation
  test('should create location document with required fields', async () => {
    const locationData = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]
      },
      timestamp: new Date(),
      speed: 50,
      heading: 180,
      accuracy: 10
    };

    const location = await LocationModel.create(locationData);
    expect(location.vehicleId).toBe(TEST_VEHICLE_ID);
    expect(location.location.coordinates).toEqual([TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]);
    expect(location.speed).toBe(50);
  });

  // Requirement: Location Data Storage - Test geospatial indexing
  test('should have geospatial index for location queries', async () => {
    const indexes = await LocationModel.collection.getIndexes();
    expect(indexes.location_2dsphere).toBeDefined();
  });

  // Requirement: Location Data Storage - Test TTL index
  test('should have TTL index for 90-day data retention', async () => {
    const indexes = await LocationModel.collection.getIndexes();
    const ttlIndex = Object.values(indexes).find(index => index.expireAfterSeconds);
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(90 * 24 * 60 * 60);
  });

  // Requirement: Location Data Storage - Test validation rules
  test('should enforce validation rules for location data', async () => {
    const invalidLocation = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [200, 100] // Invalid coordinates
      },
      timestamp: new Date(),
      speed: 50,
      heading: 180,
      accuracy: 10
    };

    await expect(LocationModel.create(invalidLocation)).rejects.toThrow();
  });

  // Requirement: Location Data Storage - Test GeoJSON format
  test('should store coordinates in GeoJSON format', async () => {
    const locationData = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]
      },
      timestamp: new Date(),
      speed: 50,
      heading: 180,
      accuracy: 10
    };

    const location = await LocationModel.create(locationData);
    expect(location.location.type).toBe('Point');
    expect(location.location.coordinates).toHaveLength(2);
  });

  // Requirement: Location Data Storage - Test toLocationUpdate conversion
  test('should convert document to LocationUpdate type', async () => {
    const timestamp = new Date();
    const locationData = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]
      },
      timestamp,
      speed: 50,
      heading: 180,
      accuracy: 10
    };

    const location = await LocationModel.create(locationData);
    const locationUpdate = location.toLocationUpdate();

    expect(locationUpdate).toEqual({
      vehicleId: TEST_VEHICLE_ID,
      coordinates: TEST_COORDINATES,
      timestamp,
      speed: 50,
      heading: 180,
      accuracy: 10
    });
  });
});

describe('Location Controller', () => {
  // Requirement: Real-time GPS tracking - Test location update
  test('should update vehicle location with valid data', async () => {
    const mockReq = {
      body: {
        vehicleId: TEST_VEHICLE_ID,
        coordinates: TEST_COORDINATES,
        timestamp: new Date(),
        speed: 50,
        heading: 180,
        accuracy: 10
      }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await updateVehicleLocation(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.any(Object)
      })
    );
  });

  // Requirement: Real-time GPS tracking - Test location update validation
  test('should reject invalid location updates', async () => {
    const mockReq = {
      body: {
        vehicleId: TEST_VEHICLE_ID,
        coordinates: { latitude: 100, longitude: 200 }, // Invalid coordinates
        timestamp: new Date(),
        speed: 50,
        heading: 180,
        accuracy: 10
      }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await updateVehicleLocation(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  // Requirement: Real-time GPS tracking - Test current location retrieval
  test('should retrieve current vehicle location', async () => {
    // Create test location
    const locationData = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]
      },
      timestamp: new Date(),
      speed: 50,
      heading: 180,
      accuracy: 10
    };
    await LocationModel.create(locationData);

    const mockReq = {
      params: { vehicleId: TEST_VEHICLE_ID }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getVehicleLocation(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.any(Object)
      })
    );
  });

  // Requirement: Location Data Storage - Test historical location retrieval
  test('should retrieve historical location data with time range', async () => {
    const startTime = new Date(Date.now() - 3600000); // 1 hour ago
    const endTime = new Date();

    // Create test locations
    const locationData = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]
      },
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      speed: 50,
      heading: 180,
      accuracy: 10
    };
    await LocationModel.create(locationData);

    const mockReq = {
      params: { vehicleId: TEST_VEHICLE_ID },
      query: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getVehicleHistory(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.any(Array)
      })
    );
  });

  // Requirement: Geofencing - Test geofence checking
  test('should check if vehicle is within geofence', async () => {
    // Create test location
    const locationData = {
      vehicleId: TEST_VEHICLE_ID,
      location: {
        type: 'Point',
        coordinates: [TEST_COORDINATES.longitude, TEST_COORDINATES.latitude]
      },
      timestamp: new Date(),
      speed: 50,
      heading: 180,
      accuracy: 10
    };
    await LocationModel.create(locationData);

    const mockReq = {
      params: { vehicleId: TEST_VEHICLE_ID },
      body: { vertices: TEST_POLYGON }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await checkGeofence(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          isInsideGeofence: expect.any(Boolean)
        })
      })
    );
  });
});

describe('Geospatial Utils', () => {
  // Requirement: Real-time GPS tracking - Test distance calculation
  test('should calculate distance between two points accurately', () => {
    const point1: Coordinates = { latitude: 40.7128, longitude: -74.006 };
    const point2: Coordinates = { latitude: 40.7580, longitude: -73.9855 };
    
    const distance = calculateDistance(point1, point2);
    
    // Known distance between these points is approximately 5.12 km
    expect(distance).toBeCloseTo(5120, -2); // Within 100 meters
  });

  // Requirement: Location Processing - Test coordinate validation
  test('should validate geographic coordinates', () => {
    const validCoords: Coordinates = { latitude: 40.7128, longitude: -74.006 };
    const invalidLat: Coordinates = { latitude: 100, longitude: -74.006 };
    const invalidLon: Coordinates = { latitude: 40.7128, longitude: -200 };

    expect(validateCoordinates(validCoords)).toBe(true);
    expect(validateCoordinates(invalidLat)).toBe(false);
    expect(validateCoordinates(invalidLon)).toBe(false);
  });

  // Requirement: Geofencing - Test polygon containment
  test('should check if point is inside polygon', () => {
    const point: Coordinates = { latitude: 40.7129, longitude: -74.0061 };
    
    const result = isPointInPolygon(point, TEST_POLYGON);
    
    expect(result).toBe(true);
  });

  // Requirement: Location Processing - Test bounding box calculation
  test('should calculate bounding box around point', () => {
    const center: Coordinates = { latitude: 40.7128, longitude: -74.006 };
    const radiusInMeters = 1000;

    const bbox = calculateBoundingBox(center, radiusInMeters);

    expect(bbox).toEqual(expect.objectContaining({
      minLat: expect.any(Number),
      maxLat: expect.any(Number),
      minLng: expect.any(Number),
      maxLng: expect.any(Number)
    }));

    // Verify bbox dimensions are reasonable
    expect(bbox.maxLat).toBeGreaterThan(bbox.minLat);
    expect(bbox.maxLng).toBeGreaterThan(bbox.minLng);
  });
});