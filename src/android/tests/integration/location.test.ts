/**
 * HUMAN TASKS:
 * 1. Configure test environment with proper location permissions
 * 2. Set up mock location provider for testing
 * 3. Configure test database with proper storage limits
 * 4. Verify network state mocking configuration
 */

// Third-party imports - versions specified for security and compatibility
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // ^29.0.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { LocationService } from '../../src/services/location';
import { getCurrentLocation, startLocationTracking, stopLocationTracking } from '../../src/utils/geolocation';
import { OfflineManager } from '../../src/utils/offline';

// Mock the geolocation module
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock NetInfo for network state testing
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('Location Service Integration Tests', () => {
  let locationService: LocationService;
  let offlineManager: OfflineManager;
  let mockLocation: any;
  let mockNetInfoListener: (state: any) => void;

  // Setup before all tests
  beforeAll(async () => {
    // Initialize mock location data
    mockLocation = {
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      timestamp: Date.now(),
      accuracy: 10,
      speed: 5,
    };

    // Initialize offline manager with 100MB storage limit
    offlineManager = new OfflineManager();

    // Initialize location service
    locationService = new LocationService(offlineManager);

    // Setup NetInfo mock
    NetInfo.addEventListener.mockImplementation((listener) => {
      mockNetInfoListener = listener;
      return () => {};
    });

    // Configure initial network state
    mockNetInfoListener({ isConnected: true });
  });

  // Cleanup after all tests
  afterAll(async () => {
    locationService.dispose();
    offlineManager.dispose();
    jest.clearAllMocks();
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Location tracking initialization with 30-second intervals
   * Requirement: Real-time GPS tracking with 30-second intervals
   */
  it('should start location tracking successfully with 30-second intervals', async () => {
    // Mock getCurrentLocation
    (getCurrentLocation as jest.Mock).mockResolvedValueOnce(mockLocation);

    // Mock startLocationTracking
    (startLocationTracking as jest.Mock).mockReturnValue(123);

    // Start tracking
    await locationService.startTracking();

    // Verify tracking started
    expect(locationService.isLocationTracking()).toBe(true);

    // Verify initial location was fetched
    expect(getCurrentLocation).toHaveBeenCalledWith({
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 30000,
      timeout: 30000,
    });

    // Verify continuous tracking was started
    expect(startLocationTracking).toHaveBeenCalledWith(
      expect.any(Function),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 30000,
        timeout: 30000,
      }
    );
  });

  /**
   * Test: Offline mode handling with data persistence
   * Requirement: Offline operation support
   */
  it('should handle offline mode correctly with data persistence', async () => {
    // Simulate offline state
    mockNetInfoListener({ isConnected: false });

    // Mock location update
    const offlineLocation = { ...mockLocation, timestamp: Date.now() };

    // Start tracking in offline mode
    await locationService.startTracking();

    // Simulate location update
    await locationService.handleLocationUpdate(offlineLocation);

    // Verify location was queued offline
    expect(offlineManager.queueLocationUpdate).toHaveBeenCalledWith(offlineLocation);

    // Simulate coming back online
    mockNetInfoListener({ isConnected: true });

    // Verify offline queue processing
    expect(offlineManager.processOfflineQueue).toHaveBeenCalled();
  });

  /**
   * Test: Location update interval compliance
   * Requirement: Real-time GPS tracking with 30-second intervals
   */
  it('should respect location update interval of 30 seconds', async () => {
    const locationUpdates: any[] = [];
    let locationCallback: Function;

    // Mock startLocationTracking to capture callback
    (startLocationTracking as jest.Mock).mockImplementation((callback) => {
      locationCallback = callback;
      return 123;
    });

    // Start tracking
    await locationService.startTracking();

    // Simulate multiple location updates
    const update1 = { ...mockLocation, timestamp: Date.now() };
    await locationCallback(update1);
    locationUpdates.push(update1);

    // Fast-forward 15 seconds (should not trigger update)
    jest.advanceTimersByTime(15000);
    const update2 = { ...mockLocation, timestamp: Date.now() };
    await locationCallback(update2);
    
    // Fast-forward to 30 seconds (should trigger update)
    jest.advanceTimersByTime(15000);
    const update3 = { ...mockLocation, timestamp: Date.now() };
    await locationCallback(update3);
    locationUpdates.push(update3);

    // Verify update intervals
    expect(locationUpdates.length).toBe(2);
    expect(locationUpdates[1].timestamp - locationUpdates[0].timestamp).toBeGreaterThanOrEqual(30000);
  });

  /**
   * Test: Permission denial handling
   * Requirement: GPS and sensor integration
   */
  it('should handle permission denials gracefully', async () => {
    // Mock permission denial
    (getCurrentLocation as jest.Mock).mockRejectedValueOnce(new Error('Location permission denied'));

    // Attempt to start tracking
    try {
      await locationService.startTracking();
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('Failed to start location tracking');
      expect(locationService.isLocationTracking()).toBe(false);
    }

    // Verify cleanup occurred
    expect(stopLocationTracking).toHaveBeenCalled();
  });

  /**
   * Test: Location data validation
   * Requirement: GPS and sensor integration
   */
  it('should validate location data format and values', async () => {
    // Test invalid location data
    const invalidLocation = {
      coordinates: {
        latitude: 200, // Invalid latitude
        longitude: -122.4194,
      },
      timestamp: Date.now(),
      accuracy: 10,
      speed: 5,
    };

    try {
      await locationService.handleLocationUpdate(invalidLocation);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('Failed to handle location update');
    }

    // Test valid location data
    const validLocation = { ...mockLocation };
    await locationService.handleLocationUpdate(validLocation);
    expect(offlineManager.queueLocationUpdate).toHaveBeenCalledWith(validLocation);
  });

  /**
   * Test: Network state handling
   * Requirement: Offline operation support
   */
  it('should handle network state changes correctly', async () => {
    // Start with online state
    expect(locationService.isNetworkAvailable()).toBe(true);

    // Simulate network loss
    mockNetInfoListener({ isConnected: false });
    expect(locationService.isNetworkAvailable()).toBe(false);

    // Update location while offline
    const offlineLocation = { ...mockLocation, timestamp: Date.now() };
    await locationService.handleLocationUpdate(offlineLocation);

    // Verify offline queue was used
    expect(offlineManager.queueLocationUpdate).toHaveBeenCalledWith(offlineLocation);

    // Simulate network restoration
    mockNetInfoListener({ isConnected: true });
    expect(locationService.isNetworkAvailable()).toBe(true);

    // Verify queue processing was triggered
    expect(offlineManager.processOfflineQueue).toHaveBeenCalled();
  });

  /**
   * Test: Resource cleanup
   * Requirement: Clean resource management
   */
  it('should clean up resources properly when stopping tracking', async () => {
    // Start tracking
    await locationService.startTracking();
    expect(locationService.isLocationTracking()).toBe(true);

    // Stop tracking
    await locationService.stopTracking();

    // Verify cleanup
    expect(locationService.isLocationTracking()).toBe(false);
    expect(stopLocationTracking).toHaveBeenCalled();

    // Verify offline queue processing
    expect(offlineManager.processOfflineQueue).toHaveBeenCalled();
  });
});