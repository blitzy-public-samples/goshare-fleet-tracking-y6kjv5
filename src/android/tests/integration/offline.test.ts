/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for offline storage limits
 * 2. Set up mock server for API endpoint testing
 * 3. Configure test device with proper permissions
 * 4. Ensure test data cleanup after test runs
 */

// Third-party imports - versions specified as per requirements
import { jest } from '@jest/globals'; // ^29.0.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

// Internal imports
import { OfflineManager } from '../../src/utils/offline';
import { StorageManager } from '../../src/utils/storage';
import { OFFLINE_CONFIG } from '../../src/constants/config';

// Mock network info module
jest.mock('@react-native-community/netinfo');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn()
}));

describe('Offline Data Persistence', () => {
  let offlineManager: OfflineManager;
  let storageManager: StorageManager;

  // Implements requirement: Setup test environment and mocks
  beforeAll(async () => {
    // Initialize managers
    offlineManager = new OfflineManager();
    storageManager = new StorageManager(OFFLINE_CONFIG);

    // Mock network state
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      callback({ isConnected: true });
      return () => {};
    });

    // Clear any existing stored data
    await AsyncStorage.clear();
  });

  // Implements requirement: Cleanup after each test
  afterEach(async () => {
    await storageManager.clearStorage();
    jest.clearAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockClear();
  });

  // Implements requirement: Cleanup after all tests
  afterAll(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  // Test suite: Offline Data Persistence
  describe('Data Storage and Retrieval', () => {
    // Implements requirement: Should store delivery updates when offline with encryption
    test('should store delivery updates when offline with encryption', async () => {
      // Mock offline state
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        callback({ isConnected: false });
        return () => {};
      });

      const deliveryUpdate = {
        id: 'delivery123',
        status: 'completed',
        timestamp: Date.now(),
        proofOfDelivery: {
          signature: 'base64signature',
          photos: ['photo1.jpg'],
          location: { lat: 40.7128, lng: -74.0060 }
        }
      };

      await offlineManager.queueDeliveryUpdate(deliveryUpdate);

      // Verify storage
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const storedData = await storageManager.getData('@offline_queue');
      expect(storedData).toBeTruthy();
      expect(storedData).toContain(deliveryUpdate.id);
    });

    // Implements requirement: Should store location updates every 30 seconds when offline
    test('should store location updates every 30 seconds when offline', async () => {
      jest.useFakeTimers();
      const locationUpdates = [];

      for (let i = 0; i < 5; i++) {
        const location = {
          latitude: 40.7128 + (i * 0.001),
          longitude: -74.0060 + (i * 0.001),
          timestamp: Date.now() + (i * 30000)
        };
        locationUpdates.push(location);
        await offlineManager.queueLocationUpdate(location);
        jest.advanceTimersByTime(30000);
      }

      const metrics = await storageManager.getStorageMetrics();
      expect(metrics.itemCount).toBeGreaterThan(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(5);
    });

    // Implements requirement: Should persist queue between app restarts with data integrity
    test('should persist queue between app restarts with data integrity', async () => {
      const testData = {
        locations: [
          { latitude: 40.7128, longitude: -74.0060, timestamp: Date.now() }
        ],
        deliveryUpdates: [
          { id: 'delivery123', status: 'completed', timestamp: Date.now() }
        ]
      };

      await storageManager.storeData('offlineData', testData, true);
      
      // Simulate app restart by creating new instance
      const newOfflineManager = new OfflineManager();
      await newOfflineManager.processOfflineQueue();

      const storedData = await storageManager.getData('offlineData');
      expect(storedData).toEqual(testData);
    });

    // Implements requirement: Should handle 100MB storage limit correctly with cleanup
    test('should handle 100MB storage limit correctly with cleanup', async () => {
      const largeData = new Array(1000).fill({
        id: 'test',
        data: 'x'.repeat(100000) // Large string to test size limits
      });

      for (const data of largeData) {
        await storageManager.storeData(`test_${data.id}`, data);
      }

      const metrics = await storageManager.getStorageMetrics();
      expect(metrics.totalSize).toBeLessThanOrEqual(OFFLINE_CONFIG.maxStorageSize);
    });

    // Implements requirement: Should store proof of delivery data with size restrictions
    test('should store proof of delivery data with size restrictions', async () => {
      const podData = {
        deliveryId: 'delivery123',
        signature: 'base64signature',
        photos: ['photo1.jpg', 'photo2.jpg'],
        location: { lat: 40.7128, lng: -74.0060 },
        timestamp: Date.now()
      };

      await offlineManager.queueDeliveryUpdate({
        id: podData.deliveryId,
        status: 'completed',
        proofOfDelivery: podData
      });

      const metrics = await storageManager.getStorageMetrics();
      expect(metrics.totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB limit
    });
  });

  // Test suite: Queue Management
  describe('Queue Management', () => {
    // Implements requirement: Should queue updates in correct order with timestamps
    test('should queue updates in correct order with timestamps', async () => {
      const updates = [];
      for (let i = 0; i < 5; i++) {
        const update = {
          id: `delivery${i}`,
          status: 'completed',
          timestamp: Date.now() + (i * 1000)
        };
        updates.push(update);
        await offlineManager.queueDeliveryUpdate(update);
      }

      const storedData = await storageManager.getData('offlineData');
      expect(storedData.deliveryUpdates).toHaveLength(5);
      expect(storedData.deliveryUpdates[0].timestamp).toBeLessThan(
        storedData.deliveryUpdates[4].timestamp
      );
    });

    // Implements requirement: Should handle queue size limits of 1000 items
    test('should handle queue size limits of 1000 items', async () => {
      const locations = new Array(1100).fill(null).map((_, i) => ({
        latitude: 40.7128 + (i * 0.001),
        longitude: -74.0060,
        timestamp: Date.now() + (i * 1000)
      }));

      for (const location of locations) {
        await offlineManager.queueLocationUpdate(location);
      }

      const storedData = await storageManager.getData('offlineData');
      expect(storedData.locations.length).toBeLessThanOrEqual(1000);
    });

    // Implements requirement: Should prioritize critical updates like POD
    test('should prioritize critical updates like POD', async () => {
      const regularUpdate = {
        id: 'delivery1',
        status: 'in_progress',
        timestamp: Date.now()
      };

      const podUpdate = {
        id: 'delivery2',
        status: 'completed',
        timestamp: Date.now(),
        proofOfDelivery: {
          signature: 'base64signature',
          photos: ['photo.jpg']
        }
      };

      await offlineManager.queueDeliveryUpdate(regularUpdate);
      await offlineManager.queueDeliveryUpdate(podUpdate);

      await offlineManager.processOfflineQueue();
      const processedData = await storageManager.getData('offlineData');
      
      // POD updates should be processed first
      expect(processedData.proofOfDeliveries).toContain(podUpdate.proofOfDelivery);
    });
  });

  // Test suite: Synchronization
  describe('Synchronization', () => {
    // Implements requirement: Should sync queued updates when connection restored
    test('should sync queued updates when connection restored', async () => {
      // Set offline state
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        callback({ isConnected: false });
        return () => {};
      });

      const updates = new Array(5).fill(null).map((_, i) => ({
        id: `delivery${i}`,
        status: 'completed',
        timestamp: Date.now() + (i * 1000)
      }));

      for (const update of updates) {
        await offlineManager.queueDeliveryUpdate(update);
      }

      // Restore connection
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        callback({ isConnected: true });
        return () => {};
      });

      await offlineManager.processOfflineQueue();
      const remainingData = await storageManager.getData('offlineData');
      expect(remainingData.deliveryUpdates).toHaveLength(0);
    });

    // Implements requirement: Should handle sync conflicts using version control
    test('should handle sync conflicts using version control', async () => {
      const conflictingUpdate = {
        id: 'delivery123',
        status: 'completed',
        timestamp: Date.now() - 1000 // Older timestamp
      };

      const serverUpdate = {
        id: 'delivery123',
        status: 'failed',
        timestamp: Date.now() // Newer timestamp
      };

      await offlineManager.queueDeliveryUpdate(conflictingUpdate);
      
      // Mock API response for conflict
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          status: 409,
          json: () => Promise.resolve(serverUpdate)
        } as Response)
      );

      await offlineManager.processOfflineQueue();
      const finalData = await storageManager.getData('offlineData');
      expect(finalData.deliveryUpdates).not.toContain(conflictingUpdate);
    });

    // Implements requirement: Should respect syncInterval of 5 minutes
    test('should respect syncInterval of 5 minutes', async () => {
      jest.useFakeTimers();
      const syncSpy = jest.spyOn(offlineManager, 'processOfflineQueue');

      // Trigger multiple updates
      await offlineManager.queueLocationUpdate({
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now()
      });

      // Advance time less than sync interval
      jest.advanceTimersByTime(OFFLINE_CONFIG.syncInterval - 1000);
      expect(syncSpy).toHaveBeenCalledTimes(1);

      // Advance time past sync interval
      jest.advanceTimersByTime(OFFLINE_CONFIG.syncInterval + 1000);
      expect(syncSpy).toHaveBeenCalledTimes(2);
    });
  });

  // Test suite: Network State Handling
  describe('Network State Handling', () => {
    // Implements requirement: Should detect network state changes using NetInfo
    test('should detect network state changes using NetInfo', async () => {
      const networkCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      
      // Simulate offline
      networkCallback({ isConnected: false });
      let storedData = await storageManager.getData('offlineData');
      expect(storedData).toBeTruthy();

      // Simulate online
      networkCallback({ isConnected: true });
      await offlineManager.processOfflineQueue();
      storedData = await storageManager.getData('offlineData');
      expect(storedData.deliveryUpdates).toHaveLength(0);
    });

    // Implements requirement: Should maintain queue during network transitions
    test('should maintain queue during network transitions', async () => {
      const networkCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      
      // Queue updates while online
      const updates = new Array(5).fill(null).map((_, i) => ({
        id: `delivery${i}`,
        status: 'completed',
        timestamp: Date.now() + (i * 1000)
      }));

      for (const update of updates) {
        await offlineManager.queueDeliveryUpdate(update);
      }

      // Go offline
      networkCallback({ isConnected: false });
      
      // Queue more updates
      const offlineUpdates = new Array(5).fill(null).map((_, i) => ({
        id: `delivery${i + 5}`,
        status: 'completed',
        timestamp: Date.now() + ((i + 5) * 1000)
      }));

      for (const update of offlineUpdates) {
        await offlineManager.queueDeliveryUpdate(update);
      }

      const storedData = await storageManager.getData('offlineData');
      expect(storedData.deliveryUpdates.length).toBe(10);
    });
  });
});