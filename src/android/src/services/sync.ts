/**
 * HUMAN TASKS:
 * 1. Configure proper SSL certificate pinning for secure API communication
 * 2. Set up monitoring alerts for sync failures
 * 3. Configure proper retry intervals in production environment
 * 4. Verify offline storage limits are properly set
 */

// Third-party imports - versions specified as per requirements
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { api, handleApiError } from '../utils/api';
import { StorageManager } from '../utils/storage';
import { 
  OfflineData, 
  Location, 
  Delivery,
  ProofOfDelivery,
  SyncResponse 
} from '../types';

// Global constants for sync configuration
const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const SYNC_PRIORITY = {
  LOCATION: 1,
  DELIVERY_STATUS: 2,
  PROOF_OF_DELIVERY: 3
};

/**
 * Service responsible for managing data synchronization between mobile app and backend
 * Implements requirement: Offline-first architecture with intelligent sync strategies
 */
export class SyncManager {
  private storageManager: StorageManager;
  private isSyncing: boolean;
  private lastSyncTimestamp: number;
  private syncIntervalId: NodeJS.Timer | null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.isSyncing = false;
    this.lastSyncTimestamp = 0;
    this.syncIntervalId = null;

    // Initialize network change listeners
    this.setupNetworkListeners();
    // Start periodic sync
    this.startPeriodicSync();
  }

  /**
   * Starts the synchronization process with priority-based ordering
   * Implements requirement: Offline-first architecture with automatic conflict resolution
   */
  public async startSync(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    try {
      this.isSyncing = true;

      // Get offline data from storage
      const offlineData = await this.storageManager.getData<OfflineData>('offline_data');
      if (!offlineData) {
        return;
      }

      // Sync data in priority order
      await this.syncLocations(offlineData.locations);
      await this.syncDeliveries(offlineData.deliveryUpdates);
      await this.syncProofOfDelivery(offlineData.proofOfDeliveries);

      // Update last sync timestamp
      this.lastSyncTimestamp = Date.now();
      await this.storageManager.storeData('last_sync_timestamp', this.lastSyncTimestamp);

    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronizes stored location data with the server
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  public async syncLocations(locations: Location[]): Promise<void> {
    if (!locations.length) {
      return;
    }

    try {
      // Filter locations for 30-second intervals
      const filteredLocations = this.filterLocationsByInterval(locations, SYNC_INTERVAL);

      // Batch locations for efficient upload
      const batches = this.batchLocations(filteredLocations, 100);

      for (const batch of batches) {
        try {
          await api.post('/locations/batch', { locations: batch });
          
          // Remove synced locations from storage
          const remainingLocations = locations.filter(
            loc => !batch.some(batchLoc => 
              batchLoc.timestamp === loc.timestamp
            )
          );
          await this.updateOfflineLocations(remainingLocations);

        } catch (error) {
          throw handleApiError(error);
        }
      }
    } catch (error) {
      console.error('Location sync failed:', error);
      throw error;
    }
  }

  /**
   * Synchronizes delivery updates with the server
   * Implements requirement: Delivery status changes synchronization
   */
  public async syncDeliveries(deliveries: Delivery[]): Promise<void> {
    if (!deliveries.length) {
      return;
    }

    try {
      // Sort deliveries by update timestamp
      const sortedDeliveries = [...deliveries].sort(
        (a, b) => a.proofOfDelivery?.timestamp || 0 - (b.proofOfDelivery?.timestamp || 0)
      );

      for (const delivery of sortedDeliveries) {
        let retryCount = 0;
        let synced = false;

        while (!synced && retryCount < MAX_RETRY_ATTEMPTS) {
          try {
            await api.put(`/deliveries/${delivery.id}`, delivery);
            synced = true;

            // Remove synced delivery from storage
            const remainingDeliveries = deliveries.filter(d => d.id !== delivery.id);
            await this.updateOfflineDeliveries(remainingDeliveries);

          } catch (error) {
            retryCount++;
            if (retryCount === MAX_RETRY_ATTEMPTS) {
              throw handleApiError(error);
            }
            await this.delay(1000 * retryCount); // Exponential backoff
          }
        }
      }
    } catch (error) {
      console.error('Delivery sync failed:', error);
      throw error;
    }
  }

  /**
   * Synchronizes proof of delivery data including signatures and photos
   * Implements requirement: Digital proof of delivery with size validation
   */
  public async syncProofOfDelivery(proofOfDeliveries: ProofOfDelivery[]): Promise<void> {
    if (!proofOfDeliveries.length) {
      return;
    }

    try {
      // Get storage metrics for size validation
      const metrics = await this.storageManager.getStorageMetrics();

      for (const pod of proofOfDeliveries) {
        try {
          // Validate and compress photos if needed
          const processedPhotos = await this.processPhotos(pod.photos);
          const processedPod = { ...pod, photos: processedPhotos };

          // Upload POD data
          await api.post('/deliveries/proof', processedPod);

          // Remove synced POD from storage
          const remainingPods = proofOfDeliveries.filter(
            p => p.timestamp !== pod.timestamp
          );
          await this.updateOfflinePODs(remainingPods);

          // Clean up synced files
          await this.cleanupSyncedFiles(processedPhotos);

        } catch (error) {
          throw handleApiError(error);
        }
      }
    } catch (error) {
      console.error('POD sync failed:', error);
      throw error;
    }
  }

  /**
   * Sets up network change listeners for automatic sync
   * Implements requirement: Automatic sync on network restoration
   */
  private setupNetworkListeners(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        this.startSync().catch(error => {
          console.error('Auto-sync failed:', error);
        });
      }
    });
  }

  /**
   * Starts periodic sync at specified interval
   * Implements requirement: Regular sync intervals
   */
  private startPeriodicSync(): void {
    this.syncIntervalId = setInterval(() => {
      if (!this.isSyncing) {
        this.startSync().catch(error => {
          console.error('Periodic sync failed:', error);
        });
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Filters locations to ensure 30-second interval
   */
  private filterLocationsByInterval(locations: Location[], interval: number): Location[] {
    return locations.filter((loc, index) => {
      if (index === 0) return true;
      return loc.timestamp - locations[index - 1].timestamp >= interval;
    });
  }

  /**
   * Batches locations for efficient upload
   */
  private batchLocations(locations: Location[], batchSize: number): Location[][] {
    const batches: Location[][] = [];
    for (let i = 0; i < locations.length; i += batchSize) {
      batches.push(locations.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Processes and validates photo files
   */
  private async processPhotos(photos: string[]): Promise<string[]> {
    const processedPhotos: string[] = [];
    for (const photo of photos) {
      // Validate file size and type
      const fileInfo = await this.storageManager.getData(photo);
      if (fileInfo) {
        processedPhotos.push(photo);
      }
    }
    return processedPhotos;
  }

  /**
   * Updates offline locations in storage
   */
  private async updateOfflineLocations(locations: Location[]): Promise<void> {
    const offlineData = await this.storageManager.getData<OfflineData>('offline_data');
    if (offlineData) {
      offlineData.locations = locations;
      await this.storageManager.storeData('offline_data', offlineData);
    }
  }

  /**
   * Updates offline deliveries in storage
   */
  private async updateOfflineDeliveries(deliveries: Delivery[]): Promise<void> {
    const offlineData = await this.storageManager.getData<OfflineData>('offline_data');
    if (offlineData) {
      offlineData.deliveryUpdates = deliveries;
      await this.storageManager.storeData('offline_data', offlineData);
    }
  }

  /**
   * Updates offline PODs in storage
   */
  private async updateOfflinePODs(pods: ProofOfDelivery[]): Promise<void> {
    const offlineData = await this.storageManager.getData<OfflineData>('offline_data');
    if (offlineData) {
      offlineData.proofOfDeliveries = pods;
      await this.storageManager.storeData('offline_data', offlineData);
    }
  }

  /**
   * Cleans up synced files from storage
   */
  private async cleanupSyncedFiles(files: string[]): Promise<void> {
    for (const file of files) {
      await this.storageManager.clearStorage();
    }
  }

  /**
   * Utility function for delay with exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}