/**
 * HUMAN TASKS:
 * 1. Configure proper encryption keys for offline data storage
 * 2. Set up background task scheduling for sync operations
 * 3. Configure proper SSL pinning for API communication
 * 4. Verify proper permissions are set in AndroidManifest.xml
 */

// Third-party imports - versions specified as per requirements
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

// Internal imports
import { storeData, getData, removeData } from './storage';
import { api, handleApiError } from './api';
import { Location, Delivery, Route, OfflineData } from '../types';
import { OFFLINE_CONFIG } from '../constants/config';

// Global constants
const QUEUE_STORAGE_KEY = '@offline_queue';
const MAX_QUEUE_SIZE = 1000;
const SYNC_INTERVAL = 30000; // 30 seconds

/**
 * Core offline manager class implementing offline-first architecture
 * Implements requirement: Offline-first architecture with automatic data persistence
 */
export class OfflineManager {
  private isOnline: boolean = true;
  private lastSyncTimestamp: number = 0;
  private offlineData: OfflineData = {
    locations: [],
    deliveryUpdates: [],
    proofOfDeliveries: []
  };
  private requestQueue: Array<any> = [];
  private syncTimer: NodeJS.Timer | null = null;

  constructor() {
    this.initializeOfflineManager();
  }

  /**
   * Initializes the offline manager and sets up network listeners
   * Implements requirement: Support for offline operation and data persistence
   */
  private async initializeOfflineManager(): Promise<void> {
    try {
      // Load persisted offline data
      const storedData = await getData<OfflineData>('offlineData');
      if (storedData) {
        this.offlineData = storedData;
      }

      // Load persisted queue
      const storedQueue = await getData<Array<any>>(QUEUE_STORAGE_KEY);
      if (storedQueue) {
        this.requestQueue = storedQueue;
      }

      // Setup network state listener
      NetInfo.addEventListener(state => {
        this.handleNetworkChange(state.isConnected || false);
      });

      // Start sync interval
      this.startSyncInterval();
    } catch (error) {
      console.error('Error initializing offline manager:', error);
      throw new Error('Failed to initialize offline manager');
    }
  }

  /**
   * Queues a location update for offline processing
   * Implements requirement: Location updates every 30 seconds
   */
  public async queueLocationUpdate(location: Location): Promise<void> {
    try {
      // Validate storage limits
      if (this.offlineData.locations.length >= MAX_QUEUE_SIZE) {
        // Remove oldest location
        this.offlineData.locations.shift();
      }

      // Add location update
      this.offlineData.locations.push({
        ...location,
        timestamp: Date.now()
      });

      // Persist updated offline data
      await this.persistOfflineData();

      // Attempt sync if online
      if (this.isOnline) {
        await this.processOfflineQueue();
      }
    } catch (error) {
      console.error('Error queueing location update:', error);
      throw new Error('Failed to queue location update');
    }
  }

  /**
   * Queues a delivery update for offline processing
   * Implements requirement: Digital proof of delivery with offline support
   */
  public async queueDeliveryUpdate(delivery: Delivery): Promise<void> {
    try {
      // Validate storage size
      const dataSize = new TextEncoder().encode(JSON.stringify(delivery)).length;
      if (dataSize > OFFLINE_CONFIG.maxStorageSize) {
        throw new Error('Delivery update exceeds storage size limit');
      }

      // Add delivery update with version control
      this.offlineData.deliveryUpdates.push({
        deliveryId: delivery.id,
        status: delivery.status,
        timestamp: Date.now(),
        location: delivery.proofOfDelivery?.location || null
      });

      // Handle proof of delivery data
      if (delivery.proofOfDelivery) {
        this.offlineData.proofOfDeliveries.push({
          ...delivery.proofOfDelivery,
          timestamp: Date.now()
        });
      }

      // Persist updated offline data
      await this.persistOfflineData();

      // Attempt sync if online
      if (this.isOnline) {
        await this.processOfflineQueue();
      }
    } catch (error) {
      console.error('Error queueing delivery update:', error);
      throw new Error('Failed to queue delivery update');
    }
  }

  /**
   * Processes queued offline updates when online
   * Implements requirement: Automatic synchronization with conflict resolution
   */
  public async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.requestQueue.length === 0) {
      return;
    }

    try {
      // Process location updates
      if (this.offlineData.locations.length > 0) {
        const locationBatch = this.offlineData.locations.splice(0, 100);
        await api.post('/locations/batch', { locations: locationBatch });
      }

      // Process delivery updates with conflict resolution
      for (const update of this.offlineData.deliveryUpdates) {
        try {
          await api.put(`/deliveries/${update.deliveryId}`, {
            status: update.status,
            timestamp: update.timestamp,
            location: update.location
          });
        } catch (error) {
          if (error.response?.status === 409) {
            // Handle conflict by fetching latest state
            const latest = await api.get(`/deliveries/${update.deliveryId}`);
            // Merge changes based on timestamp
            if (latest.data.timestamp > update.timestamp) {
              continue; // Skip conflicting update
            }
          }
          throw error;
        }
      }

      // Process proof of delivery data
      for (const pod of this.offlineData.proofOfDeliveries) {
        await api.post('/deliveries/proof', {
          proof: pod,
          timestamp: pod.timestamp
        });
      }

      // Clear processed data
      this.offlineData.deliveryUpdates = [];
      this.offlineData.proofOfDeliveries = [];
      this.lastSyncTimestamp = Date.now();

      // Persist updated state
      await this.persistOfflineData();
    } catch (error) {
      console.error('Error processing offline queue:', error);
      throw new Error('Failed to process offline queue');
    }
  }

  /**
   * Handles network state changes and triggers sync
   * Implements requirement: Automatic synchronization when online
   */
  private async handleNetworkChange(isConnected: boolean): Promise<void> {
    this.isOnline = isConnected;

    if (isConnected) {
      try {
        await this.processOfflineQueue();
        this.startSyncInterval();
      } catch (error) {
        console.error('Error handling network change:', error);
      }
    } else {
      this.stopSyncInterval();
    }
  }

  /**
   * Persists offline data to storage
   * Implements requirement: Offline data persistence with size restrictions
   */
  private async persistOfflineData(): Promise<void> {
    try {
      // Validate total size
      const dataSize = new TextEncoder().encode(JSON.stringify(this.offlineData)).length;
      if (dataSize > OFFLINE_CONFIG.maxStorageSize) {
        // Implement cleanup strategy
        while (this.offlineData.locations.length > 0 && 
               new TextEncoder().encode(JSON.stringify(this.offlineData)).length > OFFLINE_CONFIG.maxStorageSize) {
          this.offlineData.locations.shift();
        }
      }

      await storeData('offlineData', this.offlineData);
      await storeData(QUEUE_STORAGE_KEY, this.requestQueue);
    } catch (error) {
      console.error('Error persisting offline data:', error);
      throw new Error('Failed to persist offline data');
    }
  }

  /**
   * Starts the sync interval timer
   */
  private startSyncInterval(): void {
    if (!this.syncTimer) {
      this.syncTimer = setInterval(() => {
        this.processOfflineQueue().catch(console.error);
      }, SYNC_INTERVAL);
    }
  }

  /**
   * Stops the sync interval timer
   */
  private stopSyncInterval(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Cleans up resources and stops sync
   */
  public dispose(): void {
    this.stopSyncInterval();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();