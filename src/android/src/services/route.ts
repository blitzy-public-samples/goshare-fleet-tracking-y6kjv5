/**
 * HUMAN TASKS:
 * 1. Configure proper SSL pinning for API communication
 * 2. Set up proper offline storage limits in app configuration
 * 3. Configure location tracking permissions in AndroidManifest.xml
 * 4. Set up proper error tracking and monitoring
 */

// Third-party imports
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { 
  Route, 
  RouteStatus, 
  Location, 
  Delivery, 
  ProofOfDelivery 
} from '../types';
import { ROUTE_ENDPOINTS } from '../constants/api';
import { api, handleApiError, processOfflineQueue } from '../utils/api';
import { OfflineManager } from '../utils/offline';

/**
 * Route management service for the mobile driver application
 * Implements requirements: Route optimization and planning, Offline operation support, Real-time data synchronization
 */
export class RouteService {
  private activeRoute: Route | null = null;
  private offlineManager: OfflineManager;
  private isOnline: boolean = true;
  private lastLocationUpdate: number = 0;
  private locationUpdateInterval: NodeJS.Timer | null = null;
  private readonly LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.offlineManager = new OfflineManager();
    this.initializeService();
  }

  /**
   * Initializes the route service with network monitoring and data loading
   * Implements requirement: Offline-first architecture with automatic synchronization
   */
  private async initializeService(): Promise<void> {
    try {
      // Setup network monitoring
      NetInfo.addEventListener(state => {
        this.isOnline = state.isConnected || false;
        if (this.isOnline) {
          this.syncRouteUpdates().catch(console.error);
        }
      });

      // Load active route from storage if exists
      await this.loadActiveRoute();

      // Setup location tracking if route is active
      if (this.activeRoute && this.activeRoute.status === RouteStatus.IN_PROGRESS) {
        this.startLocationTracking();
      }
    } catch (error) {
      console.error('Error initializing route service:', error);
      throw new Error('Failed to initialize route service');
    }
  }

  /**
   * Retrieves the current active route with offline support
   * Implements requirement: Offline operation support
   */
  public async getActiveRoute(): Promise<Route | null> {
    try {
      if (this.isOnline) {
        const response = await api.get<Route>(ROUTE_ENDPOINTS.ACTIVE);
        this.activeRoute = response.data;
        return this.activeRoute;
      }
      return this.activeRoute;
    } catch (error) {
      console.error('Error getting active route:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Starts a new route or resumes an existing one with offline support
   * Implements requirement: Route optimization and planning
   */
  public async startRoute(routeId: string): Promise<Route> {
    try {
      if (!routeId) {
        throw new Error('Route ID is required');
      }

      const endpoint = ROUTE_ENDPOINTS.START.replace(':id', routeId);
      
      if (this.isOnline) {
        const response = await api.post<Route>(endpoint);
        this.activeRoute = response.data;
      } else {
        // Queue start route request for offline processing
        await this.offlineManager.queueDeliveryUpdate({
          id: routeId,
          status: RouteStatus.IN_PROGRESS,
          timestamp: Date.now(),
          location: null
        });
      }

      // Start location tracking
      this.startLocationTracking();

      return this.activeRoute!;
    } catch (error) {
      console.error('Error starting route:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Completes the current route with proof of delivery validation
   * Implements requirement: Digital proof of delivery support
   */
  public async completeRoute(routeId: string): Promise<Route> {
    try {
      if (!this.activeRoute || this.activeRoute.id !== routeId) {
        throw new Error('No active route found');
      }

      // Validate all deliveries have proof of delivery
      const incompleteDeliveries = this.activeRoute.deliveries.filter(
        delivery => delivery.status !== 'COMPLETED' || !delivery.proofOfDelivery
      );

      if (incompleteDeliveries.length > 0) {
        throw new Error('All deliveries must be completed with proof of delivery');
      }

      const endpoint = ROUTE_ENDPOINTS.COMPLETE.replace(':id', routeId);

      if (this.isOnline) {
        const response = await api.post<Route>(endpoint);
        this.activeRoute = response.data;
      } else {
        // Queue completion for offline processing
        await this.offlineManager.queueDeliveryUpdate({
          id: routeId,
          status: RouteStatus.COMPLETED,
          timestamp: Date.now(),
          location: null
        });
      }

      // Stop location tracking
      this.stopLocationTracking();

      // Trigger final sync
      await this.syncRouteUpdates();

      return this.activeRoute;
    } catch (error) {
      console.error('Error completing route:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Optimizes route based on current location and remaining deliveries
   * Implements requirement: Route optimization and planning
   */
  public async optimizeRoute(routeId: string, currentLocation: Location): Promise<Route> {
    try {
      if (!this.activeRoute || this.activeRoute.id !== routeId) {
        throw new Error('No active route found');
      }

      const endpoint = ROUTE_ENDPOINTS.OPTIMIZE.replace(':id', routeId);

      if (this.isOnline) {
        const response = await api.post<Route>(endpoint, { currentLocation });
        this.activeRoute = response.data;
      } else {
        // Store optimization request for later processing
        await this.offlineManager.queueLocationUpdate(currentLocation);
      }

      return this.activeRoute;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Updates driver location with 30-second interval tracking
   * Implements requirement: Real-time data synchronization with 30-second location update intervals
   */
  public async updateLocation(location: Location): Promise<void> {
    try {
      const currentTime = Date.now();
      
      // Enforce 30-second interval
      if (currentTime - this.lastLocationUpdate < this.LOCATION_UPDATE_INTERVAL) {
        return;
      }

      this.lastLocationUpdate = currentTime;

      // Queue location update for processing
      await this.offlineManager.queueLocationUpdate(location);

      // Trigger route optimization if needed
      if (this.activeRoute && this.isOnline) {
        await this.optimizeRoute(this.activeRoute.id, location);
      }
    } catch (error) {
      console.error('Error updating location:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Synchronizes offline route updates with the server
   * Implements requirement: Real-time data synchronization
   */
  public async syncRouteUpdates(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    try {
      // Process any queued offline updates
      await processOfflineQueue();
      
      // Fetch latest route data if active
      if (this.activeRoute) {
        await this.getActiveRoute();
      }
    } catch (error) {
      console.error('Error syncing route updates:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Loads active route from storage during initialization
   */
  private async loadActiveRoute(): Promise<void> {
    try {
      const route = await this.getActiveRoute();
      if (route && route.status === RouteStatus.IN_PROGRESS) {
        this.activeRoute = route;
      }
    } catch (error) {
      console.error('Error loading active route:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Starts location tracking at 30-second intervals
   */
  private startLocationTracking(): void {
    if (!this.locationUpdateInterval) {
      this.locationUpdateInterval = setInterval(() => {
        // Location updates are handled by the location service
        // This interval ensures regular optimization checks
        if (this.activeRoute) {
          this.syncRouteUpdates().catch(console.error);
        }
      }, this.LOCATION_UPDATE_INTERVAL);
    }
  }

  /**
   * Stops location tracking
   */
  private stopLocationTracking(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  /**
   * Cleans up resources when service is destroyed
   */
  public dispose(): void {
    this.stopLocationTracking();
    this.offlineManager.dispose();
  }
}