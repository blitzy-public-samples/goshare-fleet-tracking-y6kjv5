/**
 * HUMAN TASKS:
 * 1. Configure Mapbox API key in environment variables
 * 2. Set up offline map storage limits in app configuration
 * 3. Test navigation behavior with different network conditions
 * 4. Verify turn-by-turn navigation accuracy in various regions
 */

// Third-party imports - versions specified for security and compatibility
import MapboxNavigation from '@mapbox/react-native-mapbox-navigation'; // ^2.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

// Internal imports
import { Location, Route, Delivery } from '../types';
import { ROUTE_ENDPOINTS } from '../constants/api';
import { getCurrentLocation, calculateDistance } from '../utils/geolocation';

// Navigation service class implementing required interfaces and functionality
export class NavigationService {
  private static instance: NavigationService;
  private isInitialized: boolean = false;
  private navigationState: NavigationState = {
    isNavigating: false,
    currentLeg: 0,
    distanceRemaining: 0,
    durationRemaining: 0,
    currentLocation: null
  };

  // Singleton pattern implementation
  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Requirement: Route optimization and planning
   * Initializes the navigation service with configuration options
   */
  public async initializeNavigation(options: NavigationOptions): Promise<void> {
    try {
      await MapboxNavigation.initialize({
        simulateRoute: options.simulateRoute || false,
        language: options.language || 'en',
        units: options.units || 'metric',
        offlineMode: options.offlineMode || false
      });

      if (options.offlineMode) {
        await this.verifyOfflineMapData();
      }

      this.setupNavigationListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('Navigation initialization failed:', error);
      throw new Error('Failed to initialize navigation service');
    }
  }

  /**
   * Requirement: Digital proof of delivery
   * Starts turn-by-turn navigation to a delivery point
   */
  public async startNavigation(delivery: Delivery, options: NavigationOptions): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Navigation service not initialized');
    }

    try {
      const currentLocation = await getCurrentLocation();
      
      // Validate delivery coordinates
      if (!delivery?.customer?.address) {
        throw new Error('Invalid delivery destination');
      }

      // Initialize turn-by-turn navigation
      await MapboxNavigation.startNavigation({
        origin: currentLocation.coordinates,
        destination: {
          latitude: delivery.coordinates.latitude,
          longitude: delivery.coordinates.longitude
        },
        profile: 'driving',
        simulateRoute: options.simulateRoute,
        language: options.language,
        units: options.units
      });

      this.navigationState = {
        isNavigating: true,
        currentLeg: 0,
        distanceRemaining: 0,
        durationRemaining: 0,
        currentLocation
      };

      // Cache route data for offline use
      await this.cacheRouteData(delivery);
    } catch (error) {
      console.error('Failed to start navigation:', error);
      throw new Error('Navigation start failed');
    }
  }

  /**
   * Requirement: Route optimization and planning
   * Stops the current navigation session
   */
  public async stopNavigation(): Promise<void> {
    try {
      await MapboxNavigation.stopNavigation();
      this.navigationState.isNavigating = false;
      this.removeNavigationListeners();
      await this.cleanupCachedData();
    } catch (error) {
      console.error('Failed to stop navigation:', error);
      throw new Error('Navigation stop failed');
    }
  }

  /**
   * Requirement: Route optimization and planning
   * Optimizes the delivery route sequence
   */
  public async optimizeRoute(route: Route): Promise<Route> {
    try {
      const currentLocation = await getCurrentLocation();
      
      // Send optimization request to backend
      const response = await fetch(`${ROUTE_ENDPOINTS.OPTIMIZE}/${route.id}`, {
        method: 'POST',
        body: JSON.stringify({
          currentLocation: currentLocation.coordinates,
          deliveries: route.deliveries
        })
      });

      const optimizedRoute = await response.json();

      // Cache optimized route data
      await AsyncStorage.setItem(
        `route_${route.id}`,
        JSON.stringify(optimizedRoute)
      );

      return optimizedRoute;
    } catch (error) {
      console.error('Route optimization failed:', error);
      throw new Error('Failed to optimize route');
    }
  }

  /**
   * Requirement: Route optimization and planning
   * Gets the current navigation state
   */
  public getNavigationState(): NavigationState {
    if (!this.isInitialized) {
      throw new Error('Navigation service not initialized');
    }
    return this.navigationState;
  }

  /**
   * Requirement: Offline operation support
   * Downloads map data for offline use
   */
  public async downloadOfflineMaps(route: Route): Promise<void> {
    try {
      // Calculate bounding box for route area
      const bounds = this.calculateRouteBounds(route);
      
      // Estimate storage requirements
      const estimatedSize = await MapboxNavigation.estimateOfflineMapSize(bounds);
      
      // Check available storage
      if (!await this.hasEnoughStorage(estimatedSize)) {
        throw new Error('Insufficient storage for offline maps');
      }

      // Download offline map data
      await MapboxNavigation.downloadOfflineMap({
        bounds,
        minZoom: 12,
        maxZoom: 18
      });

      // Store offline availability status
      await AsyncStorage.setItem(
        `offline_map_${route.id}`,
        JSON.stringify({ downloaded: true, timestamp: Date.now() })
      );
    } catch (error) {
      console.error('Offline map download failed:', error);
      throw new Error('Failed to download offline maps');
    }
  }

  // Private helper methods
  private setupNavigationListeners(): void {
    MapboxNavigation.addProgressChangeListener((event) => {
      this.navigationState = {
        ...this.navigationState,
        distanceRemaining: event.distanceRemaining,
        durationRemaining: event.durationRemaining,
        currentLocation: {
          coordinates: event.location,
          timestamp: Date.now(),
          accuracy: event.horizontalAccuracy,
          speed: event.speed
        }
      };
    });
  }

  private removeNavigationListeners(): void {
    MapboxNavigation.removeProgressChangeListener();
  }

  private async verifyOfflineMapData(): Promise<void> {
    try {
      const offlineStatus = await MapboxNavigation.isOfflineMapDownloaded();
      if (!offlineStatus) {
        throw new Error('Offline map data not available');
      }
    } catch (error) {
      console.error('Offline map verification failed:', error);
      throw error;
    }
  }

  private async cacheRouteData(delivery: Delivery): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `delivery_route_${delivery.id}`,
        JSON.stringify({
          delivery,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error('Route data caching failed:', error);
    }
  }

  private async cleanupCachedData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const outdatedKeys = keys.filter(key => 
        key.startsWith('delivery_route_') &&
        this.isDataOutdated(key)
      );
      await AsyncStorage.multiRemove(outdatedKeys);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  private calculateRouteBounds(route: Route): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const coordinates = route.deliveries.map(d => d.coordinates);
    return {
      north: Math.max(...coordinates.map(c => c.latitude)),
      south: Math.min(...coordinates.map(c => c.latitude)),
      east: Math.max(...coordinates.map(c => c.longitude)),
      west: Math.min(...coordinates.map(c => c.longitude))
    };
  }

  private async hasEnoughStorage(requiredSize: number): Promise<boolean> {
    try {
      const { available } = await AsyncStorage.getItem('@storage_info');
      return available > requiredSize * 1.2; // 20% buffer
    } catch {
      return false;
    }
  }

  private async isDataOutdated(key: string): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return true;
      
      const { timestamp } = JSON.parse(data);
      const ONE_DAY = 24 * 60 * 60 * 1000;
      return Date.now() - timestamp > ONE_DAY;
    } catch {
      return true;
    }
  }
}

// Type definitions for navigation service
interface NavigationOptions {
  simulateRoute?: boolean;
  language?: string;
  units?: string;
  offlineMode?: boolean;
}

interface NavigationState {
  isNavigating: boolean;
  currentLeg: number;
  distanceRemaining: number;
  durationRemaining: number;
  currentLocation: Location | null;
}

// Export singleton instance
export default NavigationService.getInstance();