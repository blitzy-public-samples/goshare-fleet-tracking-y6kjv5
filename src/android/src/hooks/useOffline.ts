/**
 * HUMAN TASKS:
 * 1. Configure proper encryption keys for offline data storage
 * 2. Set up background task scheduling for sync operations
 * 3. Configure proper SSL pinning for API communication
 * 4. Verify proper permissions are set in AndroidManifest.xml
 */

// Third-party imports - versions specified as per requirements
import { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { OfflineManager } from '../utils/offline';
import { SyncManager } from '../services/sync';
import { 
  Location, 
  Delivery, 
  OfflineData, 
  ProofOfDelivery, 
  DeliveryStatus 
} from '../types';

/**
 * Custom hook for managing offline functionality in the mobile application
 * Implements requirements:
 * - Offline-first architecture with automatic synchronization
 * - Support for offline operation and data persistence
 * - Digital proof of delivery with automatic conflict resolution
 */
export const useOffline = () => {
  // State management for offline functionality
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSync, setIsSync] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    locations: [],
    deliveryUpdates: [],
    proofOfDeliveries: []
  });

  // Initialize managers
  const offlineManager = new OfflineManager();
  const syncManager = new SyncManager(offlineManager);

  /**
   * Handles network state changes and triggers sync when online
   * Implements requirement: Automatic synchronization when online
   */
  const handleNetworkChange = useCallback(async (state: { isConnected: boolean }) => {
    setIsOnline(state.isConnected || false);
    
    if (state.isConnected && !isSync) {
      try {
        setIsSync(true);
        await syncManager.startSync();
        setLastSyncTime(Date.now());
      } catch (error) {
        console.error('Sync failed:', error);
      } finally {
        setIsSync(false);
      }
    }
  }, [isSync]);

  /**
   * Queues location updates for offline processing
   * Implements requirement: Location updates with 30-second intervals
   */
  const queueLocationUpdate = useCallback(async (location: Location): Promise<void> => {
    try {
      await offlineManager.queueLocationUpdate(location);
      setOfflineData(prevData => ({
        ...prevData,
        locations: [...prevData.locations, location]
      }));
    } catch (error) {
      console.error('Failed to queue location update:', error);
      throw error;
    }
  }, []);

  /**
   * Queues delivery updates for offline processing
   * Implements requirement: Digital proof of delivery with offline support
   */
  const queueDeliveryUpdate = useCallback(async (delivery: Delivery): Promise<void> => {
    try {
      await offlineManager.queueDeliveryUpdate(delivery);
      setOfflineData(prevData => ({
        ...prevData,
        deliveryUpdates: [
          ...prevData.deliveryUpdates,
          {
            deliveryId: delivery.id,
            status: delivery.status,
            timestamp: Date.now(),
            location: delivery.proofOfDelivery?.location || null
          }
        ]
      }));

      if (delivery.proofOfDelivery) {
        setOfflineData(prevData => ({
          ...prevData,
          proofOfDeliveries: [
            ...prevData.proofOfDeliveries,
            delivery.proofOfDelivery as ProofOfDelivery
          ]
        }));
      }
    } catch (error) {
      console.error('Failed to queue delivery update:', error);
      throw error;
    }
  }, []);

  /**
   * Triggers immediate synchronization
   * Implements requirement: Manual sync trigger with conflict resolution
   */
  const syncNow = useCallback(async (): Promise<void> => {
    if (!isOnline || isSync) {
      return;
    }

    try {
      setIsSync(true);
      await syncManager.startSync();
      setLastSyncTime(Date.now());
      
      // Clear synced data from state
      setOfflineData({
        locations: [],
        deliveryUpdates: [],
        proofOfDeliveries: []
      });
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    } finally {
      setIsSync(false);
    }
  }, [isOnline, isSync]);

  // Set up network state monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Initial network check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected || false);
    });

    return () => {
      unsubscribe();
      offlineManager.dispose();
    };
  }, [handleNetworkChange]);

  // Set up periodic sync interval (30 seconds)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isOnline && !isSync) {
        syncNow().catch(console.error);
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isOnline, isSync, syncNow]);

  return {
    isOnline,
    isSync,
    lastSyncTime,
    offlineData,
    queueLocationUpdate,
    queueDeliveryUpdate,
    syncNow
  };
};