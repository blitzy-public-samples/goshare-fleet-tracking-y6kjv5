/**
 * HUMAN TASKS:
 * 1. Configure proper image compression settings for proof of delivery photos
 * 2. Set up proper SSL pinning for API communication
 * 3. Configure offline storage limits in app configuration
 * 4. Verify proper permissions for camera and storage access
 */

// Third-party imports - versions specified as per package.json
import axios from 'axios'; // ^1.4.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

// Internal imports
import { 
  Delivery, 
  DeliveryStatus, 
  ProofOfDelivery, 
  Customer 
} from '../types';
import { DELIVERY_ENDPOINTS } from '../constants/api';
import { OfflineManager } from '../utils/offline';

/**
 * Core delivery service that handles delivery management with offline support
 * Implements requirements: Digital proof of delivery, Offline-first architecture, Two-way communication
 */
export class DeliveryService {
  private offlineManager: OfflineManager;
  private isOnline: boolean = true;
  private readonly STORAGE_KEY = '@deliveries';

  constructor(offlineManager: OfflineManager) {
    this.offlineManager = offlineManager;
    this.initializeNetworkListener();
  }

  /**
   * Sets up network state monitoring
   * Implements requirement: Offline-first architecture
   */
  private initializeNetworkListener(): void {
    // Network state changes are handled by OfflineManager
    this.offlineManager['isOnline'].subscribe((online: boolean) => {
      this.isOnline = online;
    });
  }

  /**
   * Retrieves list of assigned deliveries with offline support
   * Implements requirement: Offline-first architecture for delivery management
   */
  public async getDeliveries(): Promise<Delivery[]> {
    try {
      // Try to fetch from local storage first
      const cachedDeliveries = await AsyncStorage.getItem(this.STORAGE_KEY);
      let deliveries: Delivery[] = cachedDeliveries ? JSON.parse(cachedDeliveries) : [];

      if (this.isOnline) {
        // Fetch fresh data from API if online
        const response = await axios.get<Delivery[]>(DELIVERY_ENDPOINTS.LIST);
        deliveries = response.data;

        // Update local cache
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(deliveries));
      }

      return deliveries;
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      throw new Error('Failed to fetch deliveries');
    }
  }

  /**
   * Updates delivery status with offline queueing support
   * Implements requirements: Two-way communication system, Offline-first architecture
   */
  public async updateDeliveryStatus(
    deliveryId: string, 
    status: DeliveryStatus
  ): Promise<void> {
    try {
      // Validate delivery ID and status
      if (!deliveryId || !Object.values(DeliveryStatus).includes(status)) {
        throw new Error('Invalid delivery ID or status');
      }

      const statusUpdate = {
        deliveryId,
        status,
        timestamp: Date.now()
      };

      if (!this.isOnline) {
        // Queue update for offline processing
        await this.offlineManager.queueDeliveryUpdate({
          id: deliveryId,
          status,
          address: '', // Will be updated during sync
          customer: {} as Customer,
          proofOfDelivery: null
        });
      } else {
        // Send update directly if online
        await axios.put(
          DELIVERY_ENDPOINTS.UPDATE_STATUS.replace(':id', deliveryId),
          statusUpdate
        );
      }

      // Update local cache
      const cachedDeliveries = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cachedDeliveries) {
        const deliveries: Delivery[] = JSON.parse(cachedDeliveries);
        const updatedDeliveries = deliveries.map(delivery => 
          delivery.id === deliveryId 
            ? { ...delivery, status } 
            : delivery
        );
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedDeliveries));
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw new Error('Failed to update delivery status');
    }
  }

  /**
   * Submits proof of delivery with offline support
   * Implements requirements: Digital proof of delivery capabilities with offline support
   */
  public async submitProofOfDelivery(
    deliveryId: string,
    proof: ProofOfDelivery
  ): Promise<void> {
    try {
      // Validate proof of delivery data
      if (!proof.signature || !proof.photos || proof.photos.length === 0) {
        throw new Error('Invalid proof of delivery data');
      }

      // Prepare media files
      const compressedPhotos = await Promise.all(
        proof.photos.map(async (photo) => {
          // TODO: Implement photo compression
          return photo;
        })
      );

      const proofData = {
        ...proof,
        photos: compressedPhotos,
        timestamp: Date.now()
      };

      if (!this.isOnline) {
        // Queue proof submission for offline processing
        await this.offlineManager.queueDeliveryUpdate({
          id: deliveryId,
          status: DeliveryStatus.COMPLETED,
          address: '', // Will be updated during sync
          customer: {} as Customer,
          proofOfDelivery: proofData
        });
      } else {
        // Submit directly if online
        const formData = new FormData();
        formData.append('signature', proof.signature);
        proofData.photos.forEach((photo, index) => {
          formData.append(`photo_${index}`, photo);
        });
        formData.append('notes', proof.notes);
        formData.append('timestamp', proofData.timestamp.toString());

        await axios.post(
          DELIVERY_ENDPOINTS.SUBMIT_PROOF.replace(':id', deliveryId),
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        // Update delivery status to completed
        await this.updateDeliveryStatus(deliveryId, DeliveryStatus.COMPLETED);
      }

      // Update local cache
      const cachedDeliveries = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cachedDeliveries) {
        const deliveries: Delivery[] = JSON.parse(cachedDeliveries);
        const updatedDeliveries = deliveries.map(delivery => 
          delivery.id === deliveryId 
            ? { 
                ...delivery, 
                status: DeliveryStatus.COMPLETED,
                proofOfDelivery: proofData
              } 
            : delivery
        );
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedDeliveries));
      }
    } catch (error) {
      console.error('Error submitting proof of delivery:', error);
      throw new Error('Failed to submit proof of delivery');
    }
  }

  /**
   * Retrieves detailed delivery information with offline support
   * Implements requirement: Offline-first architecture
   */
  public async getDeliveryDetails(deliveryId: string): Promise<Delivery> {
    try {
      // Check local storage first
      const cachedDeliveries = await AsyncStorage.getItem(this.STORAGE_KEY);
      let delivery: Delivery | null = null;

      if (cachedDeliveries) {
        const deliveries: Delivery[] = JSON.parse(cachedDeliveries);
        delivery = deliveries.find(d => d.id === deliveryId) || null;
      }

      if (this.isOnline) {
        // Fetch fresh data from API
        const response = await axios.get<Delivery>(
          DELIVERY_ENDPOINTS.DETAILS.replace(':id', deliveryId)
        );
        delivery = response.data;

        // Update cache if needed
        if (cachedDeliveries) {
          const deliveries: Delivery[] = JSON.parse(cachedDeliveries);
          const updatedDeliveries = deliveries.map(d => 
            d.id === deliveryId ? delivery! : d
          );
          await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedDeliveries));
        }
      }

      if (!delivery) {
        throw new Error('Delivery not found');
      }

      return delivery;
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      throw new Error('Failed to fetch delivery details');
    }
  }

  /**
   * Cleans up service resources
   */
  public dispose(): void {
    // Cleanup subscriptions and resources
  }
}