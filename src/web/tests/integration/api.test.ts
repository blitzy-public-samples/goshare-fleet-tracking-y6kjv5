// @jest/globals version ^29.0.0
// axios-mock-adapter version ^1.21.0
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, handleApiError } from '../../src/config/api';
import { Vehicle, Route, Delivery } from '../../src/types';
import { DELIVERY_STATUS, ROUTE_STATUS } from '../../src/constants';

// Human Tasks:
// 1. Configure test environment variables in CI/CD pipeline
// 2. Set up test database with sample data
// 3. Configure test JWT tokens for authentication testing
// 4. Review rate limiting settings for API endpoints

// Mock API instance
let mockApi: MockAdapter;

// Test data
const testVehicleData: Vehicle = {
  id: 'v-test-001',
  registrationNumber: 'TEST123',
  currentLocation: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  status: 'ACTIVE',
  lastUpdate: new Date()
};

const testDeliveryData: Delivery = {
  id: 'd-test-001',
  address: '123 Test St, Test City',
  coordinates: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  status: DELIVERY_STATUS.PENDING,
  scheduledTime: new Date(),
  completedTime: new Date()
};

const testRouteData: Route = {
  id: 'r-test-001',
  vehicleId: 'v-test-001',
  driverId: 'dr-test-001',
  deliveries: [testDeliveryData],
  status: ROUTE_STATUS.ACTIVE,
  startTime: new Date(),
  endTime: new Date()
};

// Test setup and teardown
beforeAll(() => {
  // Initialize mock adapter with 2000ms timeout
  mockApi = new MockAdapter(apiClient, { delayResponse: 100, timeout: 2000 });
  
  // Configure environment variables for testing
  process.env.REACT_APP_API_URL = 'http://test-api.example.com';
  
  // Configure mock JWT token
  localStorage.setItem('auth_token', 'test-jwt-token');
});

afterAll(() => {
  // Reset mock adapter and cleanup
  mockApi.reset();
  mockApi.restore();
  localStorage.clear();
});

describe('Vehicle API Integration Tests', () => {
  // Testing implementation of RESTful API endpoints requirement
  it('should fetch vehicles with pagination and filters', async () => {
    // Mock GET vehicles endpoint
    mockApi.onGet('/api/v1/vehicles').reply(200, {
      data: [testVehicleData],
      meta: { total: 1, page: 1, limit: 10 }
    });

    const response = await apiClient.get('/api/v1/vehicles', {
      params: { page: 1, limit: 10, status: 'ACTIVE' }
    });

    expect(response.status).toBe(200);
    expect(response.data.data[0].id).toBe(testVehicleData.id);
    expect(response.data.meta.total).toBe(1);
  });

  // Testing real-time data synchronization requirement
  it('should update vehicle location with retry mechanism', async () => {
    const locationUpdate = {
      latitude: 40.7129,
      longitude: -74.0061
    };

    // Mock first attempt to fail, second to succeed
    mockApi
      .onPut(`/api/v1/vehicles/${testVehicleData.id}/location`)
      .replyOnce(500)
      .onPut(`/api/v1/vehicles/${testVehicleData.id}/location`)
      .replyOnce(200, { ...testVehicleData, currentLocation: locationUpdate });

    const response = await apiClient.put(
      `/api/v1/vehicles/${testVehicleData.id}/location`,
      locationUpdate
    );

    expect(response.status).toBe(200);
    expect(response.data.currentLocation).toEqual(locationUpdate);
  });
});

describe('Route API Integration Tests', () => {
  it('should create new route with delivery assignments', async () => {
    // Mock POST route endpoint
    mockApi.onPost('/api/v1/routes').reply(201, testRouteData);

    const response = await apiClient.post('/api/v1/routes', {
      vehicleId: testRouteData.vehicleId,
      driverId: testRouteData.driverId,
      deliveries: testRouteData.deliveries
    });

    expect(response.status).toBe(201);
    expect(response.data.id).toBe(testRouteData.id);
    expect(response.data.deliveries).toHaveLength(1);
  });

  it('should handle validation errors for invalid route data', async () => {
    const invalidRouteData = { ...testRouteData, vehicleId: undefined };

    mockApi.onPost('/api/v1/routes').reply(400, {
      message: 'Validation Error',
      details: ['vehicleId is required']
    });

    try {
      await apiClient.post('/api/v1/routes', invalidRouteData);
    } catch (error: any) {
      const errorResponse = handleApiError(error);
      expect(errorResponse).toHaveProperty('code', 400);
      expect(errorResponse).toHaveProperty('message', 'Validation Error');
    }
  });
});

describe('Delivery API Integration Tests', () => {
  it('should update delivery status with proper validation', async () => {
    const statusUpdate = {
      status: DELIVERY_STATUS.COMPLETED,
      timestamp: new Date().toISOString()
    };

    mockApi
      .onPut(`/api/v1/deliveries/${testDeliveryData.id}/status`)
      .reply(200, { ...testDeliveryData, status: statusUpdate.status });

    const response = await apiClient.put(
      `/api/v1/deliveries/${testDeliveryData.id}/status`,
      statusUpdate
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe(DELIVERY_STATUS.COMPLETED);
  });

  it('should handle concurrent delivery updates', async () => {
    const update1 = { status: DELIVERY_STATUS.IN_PROGRESS };
    const update2 = { status: DELIVERY_STATUS.COMPLETED };

    mockApi
      .onPut(`/api/v1/deliveries/${testDeliveryData.id}/status`)
      .replyOnce(409, {
        message: 'Concurrent update detected',
        details: 'Delivery status was modified by another request'
      });

    try {
      await Promise.all([
        apiClient.put(`/api/v1/deliveries/${testDeliveryData.id}/status`, update1),
        apiClient.put(`/api/v1/deliveries/${testDeliveryData.id}/status`, update2)
      ]);
    } catch (error: any) {
      const errorResponse = handleApiError(error);
      expect(errorResponse.code).toBe(409);
      expect(errorResponse.message).toContain('Concurrent update detected');
    }
  });
});

describe('API Security Integration Tests', () => {
  // Testing security and encryption protocols requirement
  it('should handle authentication failures', async () => {
    localStorage.removeItem('auth_token');

    mockApi.onGet('/api/v1/vehicles').reply(401, {
      message: 'Authentication required',
      code: 401
    });

    try {
      await apiClient.get('/api/v1/vehicles');
    } catch (error: any) {
      const errorResponse = handleApiError(error);
      expect(errorResponse.code).toBe(401);
      expect(errorResponse.message).toBe('Authentication required');
    }
  });

  it('should refresh expired JWT tokens', async () => {
    const newToken = 'new-test-jwt-token';
    
    mockApi.onPost('/api/v1/auth/refresh').reply(200, { token: newToken });
    mockApi.onGet('/api/v1/vehicles').replyOnce(401).onGet('/api/v1/vehicles').reply(200, [testVehicleData]);

    const response = await apiClient.get('/api/v1/vehicles');
    
    expect(response.status).toBe(200);
    expect(localStorage.getItem('auth_token')).toBe(newToken);
  });

  it('should handle API rate limiting', async () => {
    mockApi.onGet('/api/v1/vehicles').reply(429, {
      message: 'Too Many Requests',
      retryAfter: 30
    });

    try {
      await apiClient.get('/api/v1/vehicles');
    } catch (error: any) {
      const errorResponse = handleApiError(error);
      expect(errorResponse.code).toBe(429);
      expect(errorResponse.message).toBe('Too Many Requests');
    }
  });
});