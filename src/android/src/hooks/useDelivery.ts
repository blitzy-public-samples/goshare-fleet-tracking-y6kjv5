/**
 * HUMAN TASKS:
 * 1. Configure proper image compression settings for proof of delivery photos
 * 2. Set up proper SSL pinning for API communication
 * 3. Configure offline storage limits in app configuration
 * 4. Verify proper permissions for camera and storage access
 */

// Third-party imports - versions specified in package.json
import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0

// Internal imports
import { 
  Delivery, 
  DeliveryStatus, 
  ProofOfDelivery 
} from '../types';
import { DeliveryService } from '../services/delivery';
import { 
  fetchDeliveries, 
  updateDeliveryStatus, 
  submitProofOfDelivery,
  selectDeliveries 
} from '../store/slices/deliverySlice';
import { OfflineManager } from '../utils/offline';

/**
 * Custom hook for managing delivery operations with offline support
 * Implements requirements: Digital proof of delivery, Offline-first architecture, Real-time data synchronization
 */
export const useDelivery = () => {
  // Initialize state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Redux
  const dispatch = useDispatch();
  const deliveries = useSelector(selectDeliveries);

  // Initialize services
  const offlineManager = new OfflineManager();
  const deliveryService = new DeliveryService(offlineManager);

  /**
   * Fetches deliveries with offline support
   * Implements requirement: Offline-first architecture for delivery management
   */
  const fetchDeliveriesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(fetchDeliveries()).unwrap();
    } catch (err) {
      setError('Failed to fetch deliveries');
      console.error('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Updates delivery status with offline queueing
   * Implements requirement: Real-time data synchronization and offline data handling
   */
  const updateDeliveryStatusData = useCallback(async (
    deliveryId: string, 
    status: DeliveryStatus
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(updateDeliveryStatus({ deliveryId, status })).unwrap();
    } catch (err) {
      setError('Failed to update delivery status');
      console.error('Error updating delivery status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Submits proof of delivery with offline support
   * Implements requirement: Digital proof of delivery capabilities with offline support
   */
  const submitProofOfDeliveryData = useCallback(async (
    deliveryId: string, 
    proof: ProofOfDelivery
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Validate proof of delivery data
      if (!proof.signature || !proof.photos || proof.photos.length === 0) {
        throw new Error('Invalid proof of delivery data');
      }

      await dispatch(submitProofOfDelivery({ deliveryId, proof })).unwrap();
    } catch (err) {
      setError('Failed to submit proof of delivery');
      console.error('Error submitting proof of delivery:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Gets delivery by ID with offline support
   * Implements requirement: Offline-first architecture
   */
  const getDeliveryById = useCallback((deliveryId: string): Delivery | undefined => {
    return deliveries.find(delivery => delivery.id === deliveryId);
  }, [deliveries]);

  /**
   * Sets up automatic data synchronization
   * Implements requirement: Real-time data synchronization
   */
  useEffect(() => {
    // Initial data fetch
    fetchDeliveriesData();

    // Set up periodic refresh (every 30 seconds)
    const refreshInterval = setInterval(() => {
      fetchDeliveriesData();
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(refreshInterval);
      deliveryService.dispose();
    };
  }, [fetchDeliveriesData, deliveryService]);

  // Return hook interface
  return {
    // State
    deliveries,
    loading,
    error,

    // Methods
    fetchDeliveries: fetchDeliveriesData,
    updateDeliveryStatus: updateDeliveryStatusData,
    submitProofOfDelivery: submitProofOfDeliveryData,
    getDeliveryById
  };
};