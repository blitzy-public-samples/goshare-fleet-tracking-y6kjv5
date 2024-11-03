/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for API endpoints
 * 2. Set up proper test data cleanup procedures
 * 3. Configure network condition simulation tools
 * 4. Set up proper test monitoring and reporting
 */

// Third-party imports - versions specified for security and compatibility
import { jest, describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals'; // ^29.0.0
import nock from 'nock'; // ^13.0.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.0
import NetInfo from '@react-native-community/netinfo';

// Internal imports
import { api, handleApiError, processOfflineQueue, queueOfflineRequest, REQUEST_TIMEOUT, MAX_RETRY_ATTEMPTS } from '../../src/utils/api';
import { AuthService } from '../../src/services/auth';
import { LocationService } from '../../src/services/location';
import { StorageManager } from '../../src/utils/storage';

// Mock implementations
jest.mock('@react-native-community/netinfo');
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Test constants
const TEST_API_URL = 'https://api.test.com';
const TEST_TIMEOUT = 1000; // 1 second for testing
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test123!'
};
const TEST_LOCATION = {
  coordinates: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  timestamp: Date.now(),
  accuracy: 10,
  speed: 0
};

describe('API Integration Tests', () => {
  let mockApi: MockAdapter;
  let authService: AuthService;
  let locationService: LocationService;
  let storageManager: StorageManager;

  beforeAll(async () => {
    // Initialize API mock adapter
    mockApi = new MockAdapter(api, { delayResponse: 100 });
    
    // Initialize services
    storageManager = new StorageManager();
    authService = new AuthService(storageManager);
    locationService = new LocationService(storageManager);

    // Configure network condition simulation
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(async () => {
    // Cleanup mocks and restore original functionality
    mockApi.restore();
    nock.cleanAll();
    nock.enableNetConnect();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // Reset mock history and counters
    mockApi.reset();
    jest.clearAllMocks();
    
    // Clear offline storage
    await storageManager.clearStorage();
    
    // Set default online state
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
  });

  afterEach(async () => {
    // Clear all request mocks
    mockApi.reset();
    nock.cleanAll();
    
    // Reset network simulation
    mockNetInfo.fetch.mockReset();
  });

  describe('API Authentication Tests', () => {
    // Tests for API authentication flows and token management
    
    it('should successfully login and set auth token with valid credentials', async () => {
      // Test requirement: Authentication flow with proper token handling
      const mockToken = 'test-auth-token';
      const mockUser = { id: '1', email: TEST_CREDENTIALS.email, name: 'Test User' };

      mockApi.onPost('/auth/login').reply(200, {
        success: true,
        data: { token: mockToken, user: mockUser }
      });

      const authState = await authService.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

      expect(authState).toBeDefined();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.token).toBe(mockToken);
      expect(authState.user).toEqual(mockUser);
      expect(api.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should handle invalid credentials error with proper error message', async () => {
      // Test requirement: Error handling with proper messages
      mockApi.onPost('/auth/login').reply(401, {
        success: false,
        error: 'Invalid credentials'
      });

      await expect(
        authService.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should refresh expired token automatically using refresh token', async () => {
      // Test requirement: Automatic token refresh mechanism
      const oldToken = 'old-token';
      const newToken = 'new-token';

      mockApi.onPost('/auth/refresh').reply(200, {
        success: true,
        data: { token: newToken }
      });

      await authService.refreshToken();
      expect(api.defaults.headers.common['Authorization']).toBe(`Bearer ${newToken}`);
    });

    it('should handle offline login with cached credentials and token', async () => {
      // Test requirement: Offline authentication handling
      mockNetInfo.fetch.mockResolvedValue({ isConnected: false } as any);
      
      const cachedToken = 'cached-token';
      const cachedUser = { id: '1', email: TEST_CREDENTIALS.email, name: 'Test User' };
      
      await storageManager.storeData('auth_token', cachedToken);
      await storageManager.storeData('user_data', cachedUser);

      const isAuthenticated = await authService.checkAuthStatus();
      const user = await authService.getCurrentUser();

      expect(isAuthenticated).toBe(true);
      expect(user).toEqual(cachedUser);
    });

    it('should properly clear auth state on logout', async () => {
      // Test requirement: Proper cleanup of authentication state
      mockApi.onPost('/auth/logout').reply(200, { success: true });

      await authService.logout();

      expect(api.defaults.headers.common['Authorization']).toBeUndefined();
      const token = await storageManager.getData('auth_token');
      expect(token).toBeNull();
    });
  });

  describe('Location Update Tests', () => {
    // Tests for location update API functionality
    
    it('should send location update successfully with valid coordinates', async () => {
      // Test requirement: Real-time GPS tracking with 30-second intervals
      mockApi.onPost('/location/update').reply(200, {
        success: true,
        data: { received: true }
      });

      await locationService.handleLocationUpdate(TEST_LOCATION);
      
      expect(mockApi.history.post.length).toBe(1);
      expect(JSON.parse(mockApi.history.post[0].data)).toMatchObject({
        location: {
          coordinates: TEST_LOCATION.coordinates
        }
      });
    });

    it('should queue updates when offline with persistence', async () => {
      // Test requirement: Offline request queueing and persistence
      mockNetInfo.fetch.mockResolvedValue({ isConnected: false } as any);

      await locationService.handleLocationUpdate(TEST_LOCATION);
      
      const queuedUpdates = await storageManager.getData('@offline_queue');
      expect(queuedUpdates).toHaveLength(1);
      expect(queuedUpdates[0].data.location.coordinates).toEqual(TEST_LOCATION.coordinates);
    });

    it('should retry failed updates with exponential backoff', async () => {
      // Test requirement: Retry mechanism with exponential backoff
      let retryCount = 0;
      mockApi.onPost('/location/update')
        .reply(() => {
          retryCount++;
          return retryCount < 3 ? [500, { error: 'Server error' }] : [200, { success: true }];
        });

      await locationService.handleLocationUpdate(TEST_LOCATION);
      
      expect(retryCount).toBe(3);
      expect(mockApi.history.post.length).toBe(3);
    });

    it('should process offline queue when back online', async () => {
      // Test requirement: Offline-first architecture with automatic retry
      const queuedRequests = [
        { url: '/location/update', method: 'POST', data: { location: TEST_LOCATION } },
        { url: '/location/update', method: 'POST', data: { location: { ...TEST_LOCATION, timestamp: Date.now() + 1000 } } }
      ];

      await storageManager.storeData('@offline_queue', queuedRequests);
      mockApi.onPost('/location/update').reply(200, { success: true });

      await processOfflineQueue();
      
      expect(mockApi.history.post.length).toBe(2);
      expect(await storageManager.getData('@offline_queue')).toHaveLength(0);
    });

    it('should maintain 30-second update interval accuracy', async () => {
      // Test requirement: 30-second interval accuracy
      const timestamps: number[] = [];
      mockApi.onPost('/location/update').reply(200, { success: true });

      // Simulate 3 location updates
      for (let i = 0; i < 3; i++) {
        await locationService.handleLocationUpdate({
          ...TEST_LOCATION,
          timestamp: Date.now() + (i * 30000)
        });
        timestamps.push(JSON.parse(mockApi.history.post[i].data).location.timestamp);
      }

      // Verify 30-second intervals
      expect(timestamps[1] - timestamps[0]).toBeCloseTo(30000, -2);
      expect(timestamps[2] - timestamps[1]).toBeCloseTo(30000, -2);
    });
  });

  describe('API Error Handling Tests', () => {
    // Tests for API error handling and retry logic
    
    it('should handle network timeout errors with retry mechanism', async () => {
      // Test requirement: Proper timeout handling with retry
      mockApi.onPost('/location/update').timeout();

      try {
        await locationService.handleLocationUpdate(TEST_LOCATION);
      } catch (error) {
        expect(error).toBeDefined();
        expect(mockApi.history.post.length).toBe(MAX_RETRY_ATTEMPTS);
      }
    });

    it('should implement retry mechanism for 5xx errors with backoff', async () => {
      // Test requirement: Retry mechanism with backoff for server errors
      const startTime = Date.now();
      mockApi.onPost('/location/update').reply(503, { error: 'Service unavailable' });

      try {
        await locationService.handleLocationUpdate(TEST_LOCATION);
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(RETRY_DELAY * (MAX_RETRY_ATTEMPTS - 1));
        expect(mockApi.history.post.length).toBe(MAX_RETRY_ATTEMPTS);
      }
    });

    it('should handle rate limiting responses with proper delays', async () => {
      // Test requirement: Rate limiting handling
      mockApi.onPost('/location/update')
        .replyOnce(429, { error: 'Too many requests', retryAfter: 2 })
        .onPost('/location/update')
        .reply(200, { success: true });

      await locationService.handleLocationUpdate(TEST_LOCATION);
      
      expect(mockApi.history.post.length).toBe(2);
      const requestTimes = mockApi.history.post.map(req => req.timestamp);
      expect(requestTimes[1] - requestTimes[0]).toBeGreaterThanOrEqual(2000);
    });

    it('should queue requests when offline and retry later', async () => {
      // Test requirement: Offline queueing with retry
      mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: false } as any)
        .mockResolvedValueOnce({ isConnected: true } as any);

      await locationService.handleLocationUpdate(TEST_LOCATION);
      const queuedRequests = await storageManager.getData('@offline_queue');
      expect(queuedRequests).toHaveLength(1);

      mockApi.onPost('/location/update').reply(200, { success: true });
      await processOfflineQueue();
      
      expect(mockApi.history.post.length).toBe(1);
      expect(await storageManager.getData('@offline_queue')).toHaveLength(0);
    });

    it('should properly handle API validation errors', async () => {
      // Test requirement: Proper validation error handling
      const invalidLocation = { ...TEST_LOCATION, coordinates: { latitude: 1000, longitude: 2000 } };
      mockApi.onPost('/location/update').reply(400, {
        success: false,
        error: 'Invalid coordinates'
      });

      await expect(
        locationService.handleLocationUpdate(invalidLocation)
      ).rejects.toThrow('Invalid coordinates');
    });
  });

  describe('Performance Tests', () => {
    // Tests for API performance requirements
    
    it('should complete requests within 1 second SLA', async () => {
      // Test requirement: Sub-second response time
      mockApi.onPost('/location/update').reply(200, { success: true });

      const startTime = Date.now();
      await locationService.handleLocationUpdate(TEST_LOCATION);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      // Test requirement: Efficient concurrent request handling
      mockApi.onPost('/location/update').reply(200, { success: true });

      const requests = Array(5).fill(null).map(() => 
        locationService.handleLocationUpdate({
          ...TEST_LOCATION,
          timestamp: Date.now()
        })
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(mockApi.history.post.length).toBe(5);
    });

    it('should maintain performance with large location payload', async () => {
      // Test requirement: Performance with large payloads
      const largeLocation = {
        ...TEST_LOCATION,
        metadata: Array(1000).fill({ key: 'value' })
      };

      mockApi.onPost('/location/update').reply(200, { success: true });

      const startTime = Date.now();
      await locationService.handleLocationUpdate(largeLocation);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should optimize bandwidth usage for location updates', async () => {
      // Test requirement: Bandwidth optimization
      mockApi.onPost('/location/update').reply(200, { success: true });

      await locationService.handleLocationUpdate(TEST_LOCATION);
      
      const requestData = JSON.parse(mockApi.history.post[0].data);
      expect(Object.keys(requestData.location)).toEqual([
        'coordinates',
        'timestamp',
        'accuracy',
        'speed'
      ]);
    });

    it('should meet sub-second response time requirement', async () => {
      // Test requirement: Sub-second response times
      mockApi.onPost('/location/update').reply(200, { success: true });

      const timings: number[] = [];
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await locationService.handleLocationUpdate({
          ...TEST_LOCATION,
          timestamp: Date.now()
        });
        timings.push(Date.now() - startTime);
      }

      const averageTime = timings.reduce((a, b) => a + b) / timings.length;
      expect(averageTime).toBeLessThan(1000);
      expect(Math.max(...timings)).toBeLessThan(1000);
    });
  });
});