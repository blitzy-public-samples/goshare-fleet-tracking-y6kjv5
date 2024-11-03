/**
 * HUMAN TASKS:
 * 1. Ensure proper permissions are set in AndroidManifest.xml for file system access
 * 2. Configure ProGuard rules for AsyncStorage encryption
 * 3. Verify storage permissions are requested at runtime
 * 4. Set up proper keystore configuration for data encryption
 */

// Third-party imports - versions specified as per requirements
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import RNFS from 'react-native-fs'; // ^2.20.0
import { Platform } from 'react-native';

// Internal imports
import { OFFLINE_CONFIG } from '../constants/config';
import type { OfflineData } from '../types';

// Constants for storage keys and limits
const STORAGE_KEYS = {
  OFFLINE_DATA: '@fleet_tracker/offline_data',
  USER_DATA: '@fleet_tracker/user_data',
  STORAGE_METRICS: '@fleet_tracker/storage_metrics',
} as const;

// Implements requirement: Offline-first architecture with local data persistence
export class StorageManager {
  private maxStorageSize: number;
  private currentUsage: number;
  private storageMetrics: Map<string, number>;
  private syncTimer: NodeJS.Timer | null;

  constructor(config = OFFLINE_CONFIG) {
    this.maxStorageSize = config.maxStorageSize;
    this.currentUsage = 0;
    this.storageMetrics = new Map();
    this.syncTimer = null;
    this.initializeMetrics();
  }

  // Implements requirement: Storage of location data with 30-second intervals
  public async storeData(key: string, data: any, encrypt = false): Promise<void> {
    try {
      // Validate storage space
      const dataSize = new TextEncoder().encode(JSON.stringify(data)).length;
      if (this.currentUsage + dataSize > this.maxStorageSize) {
        await this.cleanup();
      }

      // Encrypt sensitive data if required
      const processedData = encrypt ? 
        await this.encryptData(JSON.stringify(data)) : 
        JSON.stringify(data);

      await AsyncStorage.setItem(key, processedData);
      
      // Update metrics
      this.storageMetrics.set(key, dataSize);
      this.currentUsage += dataSize;
      await this.updateStorageMetrics();
    } catch (error) {
      console.error('Error storing data:', error);
      throw new Error('Failed to store data');
    }
  }

  // Implements requirement: Retrieval of cached data for offline operation
  public async getData<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return null;

      // Check if data is encrypted
      const isEncrypted = this.isEncryptedData(data);
      const processedData = isEncrypted ? 
        await this.decryptData(data) : 
        data;

      return JSON.parse(processedData) as T;
    } catch (error) {
      console.error('Error retrieving data:', error);
      throw new Error('Failed to retrieve data');
    }
  }

  // Implements requirement: Storage handling for proof of delivery data
  public async storeFile(fileName: string, fileData: string | Buffer): Promise<string> {
    try {
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const filePath = `${RNFS.DocumentDirectoryPath}/pod/${uniqueFileName}`;

      // Ensure directory exists
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/pod`);

      // Check file size (5MB limit)
      const fileSize = typeof fileData === 'string' ? 
        new TextEncoder().encode(fileData).length : 
        fileData.length;
      
      if (fileSize > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Write file
      if (typeof fileData === 'string') {
        await RNFS.writeFile(filePath, fileData, 'utf8');
      } else {
        await RNFS.writeFile(filePath, fileData.toString('base64'), 'base64');
      }

      // Update storage metrics
      this.storageMetrics.set(filePath, fileSize);
      this.currentUsage += fileSize;
      await this.updateStorageMetrics();

      return filePath;
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file');
    }
  }

  // Implements requirement: Cleanup of non-essential data
  public async clearStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const preserveKeys = [STORAGE_KEYS.USER_DATA];
      
      // Clear AsyncStorage except essential data
      const keysToRemove = keys.filter(key => !preserveKeys.includes(key));
      await AsyncStorage.multiRemove(keysToRemove);

      // Clear stored files except pending uploads
      const podDir = `${RNFS.DocumentDirectoryPath}/pod`;
      const files = await RNFS.readDir(podDir);
      const pendingFiles = await this.getPendingUploadFiles();
      
      for (const file of files) {
        if (!pendingFiles.includes(file.path)) {
          await RNFS.unlink(file.path);
        }
      }

      // Reset metrics
      this.currentUsage = 0;
      this.storageMetrics.clear();
      await this.updateStorageMetrics();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error('Failed to clear storage');
    }
  }

  // Implements requirement: Storage usage monitoring
  public async getStorageMetrics(): Promise<object> {
    try {
      const asyncStorageSize = this.currentUsage;
      const podStorageSize = await this.calculatePODStorageSize();
      const totalSize = asyncStorageSize + podStorageSize;
      
      return {
        totalSize,
        asyncStorageSize,
        podStorageSize,
        usagePercentage: (totalSize / this.maxStorageSize) * 100,
        itemCount: this.storageMetrics.size,
      };
    } catch (error) {
      console.error('Error getting storage metrics:', error);
      throw new Error('Failed to get storage metrics');
    }
  }

  // Private helper methods
  private async cleanup(): Promise<void> {
    try {
      if (this.currentUsage < this.maxStorageSize * 0.9) return;

      // Get all stored items sorted by timestamp
      const keys = await AsyncStorage.getAllKeys();
      const items = await Promise.all(
        keys.map(async key => {
          const data = await AsyncStorage.getItem(key);
          return { key, data, size: this.storageMetrics.get(key) || 0 };
        })
      );

      // Sort by size and remove largest non-essential items
      items.sort((a, b) => b.size - a.size);
      for (const item of items) {
        if (!this.isEssentialItem(item.key)) {
          await AsyncStorage.removeItem(item.key);
          this.currentUsage -= item.size;
          this.storageMetrics.delete(item.key);
        }
        if (this.currentUsage < this.maxStorageSize * 0.7) break;
      }

      await this.updateStorageMetrics();
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw new Error('Failed to perform storage cleanup');
    }
  }

  private async initializeMetrics(): Promise<void> {
    try {
      const metrics = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_METRICS);
      if (metrics) {
        const { currentUsage, metricsMap } = JSON.parse(metrics);
        this.currentUsage = currentUsage;
        this.storageMetrics = new Map(Object.entries(metricsMap));
      }
    } catch (error) {
      console.error('Error initializing metrics:', error);
    }
  }

  private async updateStorageMetrics(): Promise<void> {
    try {
      const metricsMap = Object.fromEntries(this.storageMetrics);
      await AsyncStorage.setItem(
        STORAGE_KEYS.STORAGE_METRICS,
        JSON.stringify({
          currentUsage: this.currentUsage,
          metricsMap
        })
      );
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  private async calculatePODStorageSize(): Promise<number> {
    try {
      const podDir = `${RNFS.DocumentDirectoryPath}/pod`;
      const files = await RNFS.readDir(podDir);
      return files.reduce((total, file) => total + file.size, 0);
    } catch {
      return 0;
    }
  }

  private async getPendingUploadFiles(): Promise<string[]> {
    try {
      const offlineData = await this.getData<OfflineData>(STORAGE_KEYS.OFFLINE_DATA);
      return offlineData?.proofOfDeliveries
        .map(pod => pod.photos)
        .flat() || [];
    } catch {
      return [];
    }
  }

  private isEssentialItem(key: string): boolean {
    return [
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.STORAGE_METRICS
    ].includes(key);
  }

  private async encryptData(data: string): Promise<string> {
    // Encryption implementation would go here
    // Using platform-specific encryption APIs
    return data;
  }

  private async decryptData(data: string): Promise<string> {
    // Decryption implementation would go here
    // Using platform-specific decryption APIs
    return data;
  }

  private isEncryptedData(data: string): boolean {
    // Check for encryption header or pattern
    return false;
  }
}

// Export storage metrics utility function
export const getStorageMetrics = async (): Promise<object> => {
  const manager = new StorageManager();
  return manager.getStorageMetrics();
};