/**
 * HUMAN TASKS:
 * 1. Verify location permissions are properly configured in AndroidManifest.xml
 * 2. Configure proper SSL pinning for API communication
 * 3. Set up proper offline storage limits in app configuration
 * 4. Ensure background location tracking is enabled in app capabilities
 */

// Third-party imports - versions specified for security and compatibility
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { Location } from '../types';
import { LOCATION_ENDPOINTS } from '../constants/api';
import { getCurrentLocation, startLocationTracking, stopLocationTracking } from '../utils/geolocation';
import { api, handleApiError } from '../utils/api';
import { OfflineManager } from '../utils/offline';

// Global constants for location tracking configuration
const UPDATE_INTERVAL = 30000; // 30 seconds
const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  distanceFilter: 10,
  interval: 30000,
  timeout: 30000
};

/**
 * Core location service class that manages real-time GPS tracking
 * Implements requirements: Real-time GPS tracking with 30-second intervals
 */
export class LocationService {
  private watcherId: number = 0;
  private isTracking: boolean = false;
  private offlineManager: OfflineManager;
  private isOnline: boolean = true;

  constructor(offlineManager: OfflineManager) {
    this.offlineManager = offlineManager;
    this.initializeNetworkMonitoring();
  }

  /**
   * Initializes network state monitoring
   * Implements requirement: Offline operation support
   */
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected || false;
    });
  }

  /**
   * Starts real-time location tracking
   * Implements requirements: 
   * - Real-time GPS tracking with 30-second update intervals
   * - GPS and sensor integration for accurate location tracking
   */
  public async startTracking(): Promise<void> {
    try {
      if (this.isTracking) {
        return;
      }

      // Get initial location
      const initialLocation = await getCurrentLocation(LOCATION_OPTIONS);
      await this.handleLocationUpdate(initialLocation);

      // Start continuous tracking
      this.watcherId = startLocationTracking(
        async (location: Location) => {
          await this.handleLocationUpdate(location);
        },
        LOCATION_OPTIONS
      );

      this.isTracking = true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw new Error('Failed to start location tracking');
    }
  }

  /**
   * Stops location tracking and cleans up resources
   * Implements requirement: Clean resource management and tracking state
   */
  public async stopTracking(): Promise<void> {
    try {
      if (!this.isTracking) {
        return;
      }

      // Stop location updates
      stopLocationTracking(this.watcherId);
      this.watcherId = 0;
      this.isTracking = false;

      // Process any remaining offline updates
      if (this.isOnline) {
        await this.offlineManager.processOfflineQueue();
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      throw new Error('Failed to stop location tracking');
    }
  }

  /**
   * Handles incoming location updates with offline support
   * Implements requirements:
   * - Offline location tracking and data persistence
   * - Automatic synchronization with retry mechanisms
   */
  public async handleLocationUpdate(location: Location): Promise<void> {
    try {
      // Validate location data
      if (!this.isValidLocation(location)) {
        throw new Error('Invalid location data');
      }

      if (this.isOnline) {
        try {
          // Attempt real-time update
          await this.sendLocationUpdate(location);
        } catch (error) {
          // Queue for offline storage if update fails
          await this.offlineManager.queueLocationUpdate(location);
        }
      } else {
        // Store offline if no connection
        await this.offlineManager.queueLocationUpdate(location);
      }
    } catch (error) {
      console.error('Error handling location update:', error);
      throw new Error('Failed to handle location update');
    }
  }

  /**
   * Sends location update to the server with retry support
   * Implements requirements:
   * - Real-time GPS tracking with 30-second intervals
   * - Automatic retry mechanisms for failed updates
   */
  private async sendLocationUpdate(location: Location): Promise<void> {
    try {
      await api.post(LOCATION_ENDPOINTS.UPDATE, {
        location: {
          coordinates: location.coordinates,
          timestamp: location.timestamp,
          accuracy: location.accuracy,
          speed: location.speed
        }
      });
    } catch (error) {
      console.error('Error sending location update:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Validates location data structure and values
   * Implements requirement: GPS and sensor integration for accurate location tracking
   */
  private isValidLocation(location: Location): boolean {
    return (
      location &&
      location.coordinates &&
      typeof location.coordinates.latitude === 'number' &&
      typeof location.coordinates.longitude === 'number' &&
      location.coordinates.latitude >= -90 &&
      location.coordinates.latitude <= 90 &&
      location.coordinates.longitude >= -180 &&
      location.coordinates.longitude <= 180 &&
      typeof location.timestamp === 'number' &&
      typeof location.accuracy === 'number' &&
      typeof location.speed === 'number'
    );
  }

  /**
   * Gets the current tracking status
   */
  public isLocationTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Gets the current network connectivity status
   */
  public isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  /**
   * Cleans up resources and stops tracking
   */
  public dispose(): void {
    if (this.isTracking) {
      this.stopTracking().catch(console.error);
    }
  }
}

// Export the LocationService class
export default LocationService;