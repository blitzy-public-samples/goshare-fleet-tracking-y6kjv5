// Third-party imports
import { jest } from '@jest/globals'; // ^29.6.0
import { Pool } from 'pg'; // ^8.11.0
import mongoose from 'mongoose'; // ^7.4.0

// Internal imports
import { DatabaseConfig } from '../../src/common/config/database';
import { FleetModel } from '../../src/services/fleet/models/fleetModel';
import LocationModel from '../../src/services/location/models/locationModel';

// Test constants
const TEST_TIMEOUT = 30000;
const POSTGRES_TEST_QUERY = 'SELECT NOW()';
const TEST_VEHICLE_DATA = {
  id: 'test-vehicle-1',
  status: 'ACTIVE',
  type: 'DELIVERY_VAN',
  registrationNumber: 'TEST123'
};
const TEST_LOCATION_DATA = {
  latitude: 40.7128,
  longitude: -74.006,
  speed: 30,
  heading: 90,
  accuracy: 10
};

// Human Tasks:
// 1. Configure test database credentials in .env.test
// 2. Set up test database instances with replica configuration
// 3. Configure test data cleanup policy
// 4. Set up monitoring for test database connections
// 5. Configure test environment network access rules

describe('Database Integration Tests', () => {
  let postgresPool: Pool;
  let fleetModel: FleetModel;

  // Requirement: Database Architecture - Setup database connections before tests
  beforeAll(async () => {
    // Initialize PostgreSQL connection pool with read replica support
    postgresPool = await DatabaseConfig.createPostgresPool();

    // Connect to MongoDB test database with replica set configuration
    await DatabaseConfig.connectMongoDB();

    // Initialize fleet model for testing
    fleetModel = new FleetModel();

    // Clear test data from previous runs
    await postgresPool.query('DELETE FROM vehicles WHERE registration_number LIKE \'TEST%\'');
    await LocationModel.deleteMany({ vehicleId: { $regex: /^test-/ } });

    // Set up test indexes and collections
    await LocationModel.createIndexes();
  }, TEST_TIMEOUT);

  // Requirement: High Availability - Cleanup database connections after tests
  afterAll(async () => {
    // Close PostgreSQL connection pool
    await postgresPool.end();

    // Close MongoDB connection
    await mongoose.connection.close();

    // Clean up test data
    await postgresPool.query('DELETE FROM vehicles WHERE registration_number LIKE \'TEST%\'');
    await LocationModel.deleteMany({ vehicleId: { $regex: /^test-/ } });

    // Remove test indexes
    await LocationModel.collection.dropIndexes();
  }, TEST_TIMEOUT);

  // Requirement: System Performance - Test PostgreSQL connection and operations
  describe('PostgreSQL Connection Tests', () => {
    test('should verify PostgreSQL connection pool is active', async () => {
      // Verify connection pool is active
      expect(postgresPool.totalCount).toBeGreaterThan(0);
      expect(postgresPool.idleCount).toBeGreaterThan(0);

      // Test primary connection
      const result = await postgresPool.query(POSTGRES_TEST_QUERY);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].now).toBeDefined();
    }, TEST_TIMEOUT);

    test('should handle connection timeouts and retries', async () => {
      // Mock a connection timeout
      const originalConnect = postgresPool.connect;
      postgresPool.connect = jest.fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockImplementationOnce(originalConnect);

      // Attempt query with retry
      const result = await postgresPool.query(POSTGRES_TEST_QUERY);
      expect(result.rows).toHaveLength(1);
      
      // Restore original connect method
      postgresPool.connect = originalConnect;
    }, TEST_TIMEOUT);

    test('should validate query timeout settings', async () => {
      // Test query with timeout validation
      await expect(async () => {
        await postgresPool.query('SELECT pg_sleep(11)');
      }).rejects.toThrow('query_timeout');
    }, TEST_TIMEOUT);
  });

  // Requirement: Data Persistence - Test MongoDB connection and operations
  describe('MongoDB Connection Tests', () => {
    test('should verify MongoDB connection is active', async () => {
      // Test replica set configuration
      expect(mongoose.connection.readyState).toBe(1);
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      expect(result.ok).toBe(1);
    }, TEST_TIMEOUT);

    test('should handle MongoDB failover scenarios', async () => {
      // Mock a primary node failure
      const originalWrite = mongoose.connection.db.collection('test').insertOne;
      mongoose.connection.db.collection('test').insertOne = jest.fn()
        .mockRejectedValueOnce(new Error('Primary not available'))
        .mockImplementationOnce(originalWrite);

      // Attempt write operation with failover
      const result = await mongoose.connection.db.collection('test').insertOne({ test: true });
      expect(result.acknowledged).toBe(true);

      // Restore original write method
      mongoose.connection.db.collection('test').insertOne = originalWrite;
    }, TEST_TIMEOUT);

    test('should verify geospatial indexes', async () => {
      // Test geospatial indexes
      const indexes = await LocationModel.collection.indexes();
      const geoIndex = indexes.find(index => index.key.location === '2dsphere');
      expect(geoIndex).toBeDefined();
    }, TEST_TIMEOUT);
  });

  // Requirement: Fleet Management - Test fleet operations with transaction support
  describe('Fleet Operations Tests', () => {
    test('should create vehicle with transaction support', async () => {
      // Create test vehicle with transaction
      const vehicle = await fleetModel.createVehicle({
        ...TEST_VEHICLE_DATA,
        lastLocation: {
          latitude: TEST_LOCATION_DATA.latitude,
          longitude: TEST_LOCATION_DATA.longitude
        }
      });

      expect(vehicle.id).toBeDefined();
      expect(vehicle.registrationNumber).toBe(TEST_VEHICLE_DATA.registrationNumber);

      // Verify in PostgreSQL
      const pgResult = await postgresPool.query(
        'SELECT * FROM vehicles WHERE registration_number = $1',
        [TEST_VEHICLE_DATA.registrationNumber]
      );
      expect(pgResult.rows).toHaveLength(1);

      // Verify initial location in MongoDB
      const locationDoc = await LocationModel.findOne({ vehicleId: vehicle.id });
      expect(locationDoc).toBeDefined();
    }, TEST_TIMEOUT);

    test('should update vehicle location with interval validation', async () => {
      // Get test vehicle
      const pgResult = await postgresPool.query(
        'SELECT id FROM vehicles WHERE registration_number = $1',
        [TEST_VEHICLE_DATA.registrationNumber]
      );
      const vehicleId = pgResult.rows[0].id;

      // Update location with 30-second interval validation
      await fleetModel.updateVehicleLocation({
        vehicleId,
        coordinates: {
          latitude: TEST_LOCATION_DATA.latitude + 0.001,
          longitude: TEST_LOCATION_DATA.longitude + 0.001
        },
        timestamp: new Date(),
        speed: TEST_LOCATION_DATA.speed,
        heading: TEST_LOCATION_DATA.heading
      });

      // Verify location update
      const location = await fleetModel.getVehicleLocation(vehicleId);
      expect(location.latitude).toBeCloseTo(TEST_LOCATION_DATA.latitude + 0.001, 6);
      expect(location.longitude).toBeCloseTo(TEST_LOCATION_DATA.longitude + 0.001, 6);
    }, TEST_TIMEOUT);

    test('should enforce 30-second interval between updates', async () => {
      // Get test vehicle
      const pgResult = await postgresPool.query(
        'SELECT id FROM vehicles WHERE registration_number = $1',
        [TEST_VEHICLE_DATA.registrationNumber]
      );
      const vehicleId = pgResult.rows[0].id;

      // Attempt rapid location updates
      await expect(async () => {
        await fleetModel.updateVehicleLocation({
          vehicleId,
          coordinates: {
            latitude: TEST_LOCATION_DATA.latitude + 0.002,
            longitude: TEST_LOCATION_DATA.longitude + 0.002
          },
          timestamp: new Date(),
          speed: TEST_LOCATION_DATA.speed,
          heading: TEST_LOCATION_DATA.heading
        });
      }).rejects.toThrow('Location updates must be at least 30 seconds apart');
    }, TEST_TIMEOUT);
  });

  // Requirement: Real-time Location Tracking - Test location tracking functionality
  describe('Location Tracking Tests', () => {
    test('should store and retrieve location history', async () => {
      // Get test vehicle
      const pgResult = await postgresPool.query(
        'SELECT id FROM vehicles WHERE registration_number = $1',
        [TEST_VEHICLE_DATA.registrationNumber]
      );
      const vehicleId = pgResult.rows[0].id;

      // Wait for 30 seconds to allow new location update
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Create location history
      const locationUpdate = {
        vehicleId,
        coordinates: {
          latitude: TEST_LOCATION_DATA.latitude + 0.003,
          longitude: TEST_LOCATION_DATA.longitude + 0.003
        },
        timestamp: new Date(),
        speed: TEST_LOCATION_DATA.speed + 10,
        heading: TEST_LOCATION_DATA.heading + 45
      };

      await fleetModel.updateVehicleLocation(locationUpdate);

      // Verify location history
      const locations = await LocationModel.find({ vehicleId }).sort({ timestamp: -1 });
      expect(locations).toHaveLength(3); // Initial + 2 updates
      expect(locations[0].speed).toBe(TEST_LOCATION_DATA.speed + 10);
      expect(locations[0].heading).toBe(TEST_LOCATION_DATA.heading + 45);
    }, TEST_TIMEOUT);

    test('should handle concurrent location updates', async () => {
      // Get test vehicle
      const pgResult = await postgresPool.query(
        'SELECT id FROM vehicles WHERE registration_number = $1',
        [TEST_VEHICLE_DATA.registrationNumber]
      );
      const vehicleId = pgResult.rows[0].id;

      // Wait for 30 seconds to allow new location updates
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Attempt concurrent updates
      const updates = Array(5).fill(null).map((_, i) => ({
        vehicleId,
        coordinates: {
          latitude: TEST_LOCATION_DATA.latitude + (0.001 * i),
          longitude: TEST_LOCATION_DATA.longitude + (0.001 * i)
        },
        timestamp: new Date(Date.now() + (i * 31000)), // 31 seconds apart
        speed: TEST_LOCATION_DATA.speed + (i * 5),
        heading: (TEST_LOCATION_DATA.heading + (i * 45)) % 360
      }));

      await Promise.all(updates.map(update => fleetModel.updateVehicleLocation(update)));

      // Verify all updates were stored
      const locations = await LocationModel.find({ vehicleId }).sort({ timestamp: -1 });
      expect(locations.length).toBeGreaterThanOrEqual(updates.length);
    }, TEST_TIMEOUT);
  });
});