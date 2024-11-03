/**
 * Human Tasks:
 * 1. Configure test environment variables in .env.test
 * 2. Set up test database instances with proper indexes
 * 3. Configure test JWT signing keys
 * 4. Set up test data backup/restore procedures
 * 5. Configure test rate limiting thresholds
 */

// Third-party imports
import request from 'supertest'; // ^6.3.3
import express from 'express'; // ^4.18.2
import { jest } from '@jest/globals'; // ^29.6.0

// Internal imports
import { LocationUpdate } from '../../src/common/types';
import { DatabaseConfig } from '../../src/common/config/database';
import locationRouter from '../../src/services/location/routes/locationRoutes';

// Test application setup
const app = express();
app.use(express.json());
app.use('/api', locationRouter);

// Test data
const validLocationUpdate: LocationUpdate = {
  vehicleId: 'test-vehicle-1',
  coordinates: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  timestamp: new Date(),
  speed: 45.5,
  heading: 180
};

// Test suite setup and teardown
beforeAll(async () => {
  // Requirement: System Performance - Database setup for testing
  await setupTestDatabase();
});

afterAll(async () => {
  // Clean up test data and close connections
  await cleanupTestDatabase();
});

beforeEach(async () => {
  // Reset test state and seed data
  await resetTestState();
  await seedTestData();
});

afterEach(async () => {
  // Clear test data
  await clearTestData();
  jest.clearAllMocks();
});

// Helper functions
async function setupTestDatabase(): Promise<void> {
  try {
    // Create PostgreSQL test database connection pool
    await DatabaseConfig.createPostgresPool();
    
    // Connect to MongoDB test database with replica set
    await DatabaseConfig.connectMongoDB();
    
    // Apply test migrations and seed initial data
    await applyTestMigrations();
    await seedTestData();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

async function cleanupTestDatabase(): Promise<void> {
  try {
    // Remove test data
    await clearTestData();
    
    // Close database connections
    await closeTestConnections();
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  }
}

async function generateTestToken(role: string): Promise<string> {
  // Create test credentials and generate JWT token
  return 'test-jwt-token';
}

// Test Suites

describe('Location API Endpoints', () => {
  // Requirement: API Testing - Location update endpoint
  describe('POST /api/location/update', () => {
    it('should update vehicle location with valid LocationUpdate data', async () => {
      const token = await generateTestToken('DRIVER');
      
      const response = await request(app)
        .post('/api/location/update')
        .set('Authorization', `Bearer ${token}`)
        .send(validLocationUpdate)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.vehicleId).toBe(validLocationUpdate.vehicleId);
    });

    // Requirement: Data Validation - Input validation testing
    it('should reject location update with invalid coordinates', async () => {
      const token = await generateTestToken('DRIVER');
      const invalidUpdate = {
        ...validLocationUpdate,
        coordinates: {
          latitude: 200, // Invalid latitude
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/location/update')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid coordinates');
    });

    // Requirement: System Performance - Concurrent request handling
    it('should handle concurrent location updates with rate limiting', async () => {
      const token = await generateTestToken('DRIVER');
      const updates = Array(10).fill(validLocationUpdate).map((update, index) => ({
        ...update,
        vehicleId: `test-vehicle-${index}`
      }));

      const responses = await Promise.all(
        updates.map(update =>
          request(app)
            .post('/api/location/update')
            .set('Authorization', `Bearer ${token}`)
            .send(update)
        )
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  // Requirement: API Testing - Location history endpoint
  describe('GET /api/location/history/:vehicleId', () => {
    it('should return vehicle location history with pagination', async () => {
      const token = await generateTestToken('DISPATCHER');
      const vehicleId = 'test-vehicle-1';

      const response = await request(app)
        .get(`/api/location/history/${vehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.pagination).toBeDefined();
    });
  });

  // Requirement: API Testing - Geofence validation
  describe('POST /api/location/geofence/check', () => {
    it('should validate geofence boundaries with coordinates', async () => {
      const token = await generateTestToken('DISPATCHER');
      const geofenceData = {
        vehicleId: 'test-vehicle-1',
        geofence: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.0060, 40.7128],
              [-74.0050, 40.7128],
              [-74.0050, 40.7138],
              [-74.0060, 40.7138],
              [-74.0060, 40.7128]
            ]
          ]
        }
      };

      const response = await request(app)
        .post('/api/location/geofence/check')
        .set('Authorization', `Bearer ${token}`)
        .send(geofenceData)
        .expect(200);

      expect(response.body.data.isWithinGeofence).toBeDefined();
    });
  });
});

describe('Authentication and Authorization', () => {
  // Requirement: API Testing - Authentication validation
  it('should reject requests without valid JWT token', async () => {
    const response = await request(app)
      .post('/api/location/update')
      .send(validLocationUpdate)
      .expect(401);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Authentication required');
  });

  // Requirement: API Testing - Role-based access control
  it('should enforce role-based access control for routes', async () => {
    const customerToken = await generateTestToken('CUSTOMER');

    const response = await request(app)
      .post('/api/location/update')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(validLocationUpdate)
      .expect(403);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Insufficient permissions');
  });

  // Requirement: API Testing - Token validation
  it('should handle token expiration correctly', async () => {
    const expiredToken = 'expired.jwt.token';

    const response = await request(app)
      .post('/api/location/update')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send(validLocationUpdate)
      .expect(401);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Token expired');
  });
});

describe('Error Handling', () => {
  // Requirement: API Testing - Error response validation
  it('should return appropriate HTTP error codes', async () => {
    const token = await generateTestToken('DRIVER');
    const invalidVehicleId = 'non-existent-vehicle';

    const response = await request(app)
      .get(`/api/location/vehicle/${invalidVehicleId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Vehicle not found');
  });

  // Requirement: System Performance - Database error handling
  it('should handle database connection failures gracefully', async () => {
    // Simulate database connection failure
    jest.spyOn(DatabaseConfig, 'createPostgresPool').mockRejectedValueOnce(new Error('Connection failed'));

    const token = await generateTestToken('DRIVER');

    const response = await request(app)
      .post('/api/location/update')
      .set('Authorization', `Bearer ${token}`)
      .send(validLocationUpdate)
      .expect(500);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Internal server error');
  });

  // Requirement: Data Validation - Schema validation
  it('should validate request payload against LocationUpdate interface', async () => {
    const token = await generateTestToken('DRIVER');
    const invalidPayload = {
      vehicleId: 'test-vehicle-1',
      // Missing required fields
      timestamp: new Date()
    };

    const response = await request(app)
      .post('/api/location/update')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidPayload)
      .expect(400);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Invalid request payload');
  });

  // Requirement: System Performance - Rate limiting
  it('should handle rate limiting for concurrent requests', async () => {
    const token = await generateTestToken('DRIVER');
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .post('/api/location/update')
        .set('Authorization', `Bearer ${token}`)
        .send(validLocationUpdate)
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
    expect(tooManyRequests[0].body.message).toContain('Too many requests');
  });
});