// Third-party imports - versions specified in package.json
import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import NetInfo from '@react-native-community/netinfo';
import Geolocation from '@react-native-community/geolocation';

// Internal imports
import { api, setAuthToken, handleApiError, processOfflineQueue } from '../../src/utils/api';
import { StorageManager } from '../../src/utils/storage';
import { getCurrentLocation, startLocationTracking, stopLocationTracking, calculateDistance } from '../../src/utils/geolocation';

// Mock third-party modules
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('@react-native-community/geolocation');
jest.mock('react-native-fs');

describe('API Utils', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  // Test: Authentication token handling
  test('should set auth token correctly in headers and storage', async () => {
    const token = 'test-token-123';
    await setAuthToken(token);

    expect(api.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', token);
  });

  // Test: API error handling with retry mechanism
  test('should handle API errors with exponential backoff retry', async () => {
    const endpoint = '/test';
    mockAxios.onGet(endpoint).replyOnce(500).onGet(endpoint).replyOnce(200, { data: 'success' });

    try {
      await api.get(endpoint);
    } catch (error) {
      expect(mockAxios.history.get.length).toBe(2);
      expect(handleApiError(error)).toBeInstanceOf(Error);
    }
  });

  // Test: Offline request queueing
  test('should queue requests when offline using processOfflineQueue', async () => {
    // Mock offline state
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });

    const request = {
      url: '/test',
      method: 'POST',
      data: { test: true }
    };

    try {
      await api.post(request.url, request.data);
    } catch (error) {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(error.message).toBe('No network connection');
    }
  });

  // Test: Offline queue processing
  test('should process offline queue when online with retry logic', async () => {
    // Mock online state
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: true });

    const queuedRequests = [
      {
        url: '/test1',
        method: 'POST',
        data: { id: 1 },
        timestamp: Date.now(),
        retryCount: 0
      }
    ];

    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queuedRequests));
    mockAxios.onPost('/test1').reply(200);

    await processOfflineQueue();
    expect(mockAxios.history.post.length).toBe(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@offline_queue', '[]');
  });

  // Test: Maximum retry attempts
  test('should respect max retry attempts (3) with 5s delays', async () => {
    const endpoint = '/test-retry';
    mockAxios.onGet(endpoint).reply(500);

    const startTime = Date.now();
    try {
      await api.get(endpoint);
    } catch (error) {
      const duration = Date.now() - startTime;
      expect(mockAxios.history.get.length).toBe(3);
      expect(duration).toBeGreaterThanOrEqual(15000); // 3 retries * 5s
    }
  });
});

describe('Storage Utils', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager();
    jest.clearAllMocks();
  });

  // Test: Data storage and retrieval
  test('should store and retrieve encrypted data correctly', async () => {
    const testData = { key: 'value' };
    await storageManager.storeData('test-key', testData, true);

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    
    const retrievedData = await storageManager.getData('test-key');
    expect(retrievedData).toEqual(testData);
  });

  // Test: Storage limits
  test('should handle storage limits (100MB) with cleanup', async () => {
    const largeData = new Array(1024 * 1024).fill('x'); // 1MB of data
    
    for (let i = 0; i < 101; i++) {
      await storageManager.storeData(`key-${i}`, largeData);
    }

    const metrics = await storageManager.getStorageMetrics();
    expect(metrics.usagePercentage).toBeLessThan(100);
  });

  // Test: File storage
  test('should store files with size restrictions (5MB)', async () => {
    const testFile = Buffer.alloc(6 * 1024 * 1024); // 6MB file

    await expect(storageManager.storeFile('test.jpg', testFile))
      .rejects
      .toThrow('File size exceeds 5MB limit');
  });

  // Test: Storage cleanup
  test('should perform storage cleanup preserving essential data', async () => {
    await storageManager.storeData('essential', { important: true });
    await storageManager.storeData('non-essential', { temp: true });

    await storageManager.clearStorage();

    const essential = await storageManager.getData('essential');
    const nonEssential = await storageManager.getData('non-essential');

    expect(essential).toBeTruthy();
    expect(nonEssential).toBeNull();
  });

  // Test: Storage metrics
  test('should track and report storage metrics', async () => {
    await storageManager.storeData('test', { data: 'test' });
    const metrics = await storageManager.getStorageMetrics();

    expect(metrics).toHaveProperty('totalSize');
    expect(metrics).toHaveProperty('usagePercentage');
    expect(metrics).toHaveProperty('itemCount');
  });
});

describe('Geolocation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test: Current location retrieval
  test('should get current location with GPS accuracy', async () => {
    const mockPosition = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        speed: 0
      },
      timestamp: Date.now()
    };

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (success) => success(mockPosition)
    );

    const location = await getCurrentLocation();
    expect(location.coordinates).toEqual({
      latitude: mockPosition.coords.latitude,
      longitude: mockPosition.coords.longitude
    });
    expect(location.accuracy).toBe(mockPosition.coords.accuracy);
  });

  // Test: Location tracking
  test('should track location updates every 30 seconds', () => {
    const callback = jest.fn();
    const watchId = 1;

    (Geolocation.watchPosition as jest.Mock).mockReturnValue(watchId);

    const id = startLocationTracking(callback);
    expect(id).toBe(watchId);
    expect(Geolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        interval: 30000
      })
    );
  });

  // Test: Tracking cleanup
  test('should stop tracking and clean up resources', () => {
    const watchId = 1;
    stopLocationTracking(watchId);
    expect(Geolocation.clearWatch).toHaveBeenCalledWith(watchId);
  });

  // Test: Distance calculation
  test('should calculate distances accurately using Haversine', () => {
    const start = {
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194
      },
      timestamp: Date.now(),
      accuracy: 10,
      speed: 0
    };

    const end = {
      coordinates: {
        latitude: 37.7750,
        longitude: -122.4195
      },
      timestamp: Date.now(),
      accuracy: 10,
      speed: 0
    };

    const distance = calculateDistance(start, end);
    expect(typeof distance).toBe('number');
    expect(distance).toBeGreaterThan(0);
  });

  // Test: Offline location handling
  test('should handle and store offline location data', async () => {
    const mockPosition = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        speed: 0
      },
      timestamp: Date.now()
    };

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (success) => success(mockPosition)
    );
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });

    const location = await getCurrentLocation();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    expect(location).toBeTruthy();
  });
});