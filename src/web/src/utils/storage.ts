// crypto-js version ^4.1.1
import CryptoJS from 'crypto-js';
import { Vehicle, Route, Delivery } from '../types';
import { MAX_OFFLINE_DURATION } from '../constants';

// Human Tasks:
// 1. Ensure REACT_APP_STORAGE_ENCRYPTION_KEY is set in .env file
// 2. Review data retention policies with security team
// 3. Validate encryption requirements for sensitive data
// 4. Confirm offline storage limits with product team

// Storage keys for browser storage
const STORAGE_KEYS = {
  AUTH_TOKEN: 'fleet_tracker_auth_token',
  USER_DATA: 'fleet_tracker_user_data',
  OFFLINE_ROUTES: 'fleet_tracker_offline_routes',
  OFFLINE_DELIVERIES: 'fleet_tracker_offline_deliveries',
  LAST_SYNC: 'fleet_tracker_last_sync'
} as const;

// Encryption key from environment variables
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY;

/**
 * Implements requirement: Security and encryption protocols
 * Encrypts data using AES encryption
 */
const encryptData = (data: any): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

/**
 * Implements requirement: Security and encryption protocols
 * Decrypts AES encrypted data
 */
const decryptData = (encryptedData: string): any => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

/**
 * Storage utility object implementing browser storage operations
 * Implements requirements: Offline operation support, Security and encryption protocols
 */
export const storage = {
  /**
   * Stores data in browser storage with optional encryption
   */
  setItem: <T>(key: string, value: T, useSession = false, encrypt = false): void => {
    try {
      if (!key || value === undefined) {
        throw new Error('Invalid storage parameters');
      }

      const dataToStore = encrypt ? encryptData(value) : JSON.stringify(value);
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(key, dataToStore);
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  },

  /**
   * Retrieves and optionally decrypts data from browser storage
   */
  getItem: <T>(key: string, useSession = false, encrypted = false): T | null => {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const data = storage.getItem(key);

      if (!data) {
        return null;
      }

      return encrypted ? decryptData(data) : JSON.parse(data);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  /**
   * Removes an item from browser storage
   */
  removeItem: (key: string, useSession = false): void => {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  },

  /**
   * Clears all stored data from the specified storage type
   */
  clear: (useSession = false): void => {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  /**
   * Stores route and delivery data for offline access
   * Implements requirement: Offline operation support
   */
  storeOfflineData: (route: Route): void => {
    try {
      // Validate route data
      if (!route.id || !route.deliveries || !route.status) {
        throw new Error('Invalid route data for offline storage');
      }

      // Get existing offline routes or initialize empty array
      const existingRoutes = this.getItem<Route[]>(STORAGE_KEYS.OFFLINE_ROUTES, false, true) || [];

      // Update or add new route
      const routeIndex = existingRoutes.findIndex(r => r.id === route.id);
      if (routeIndex >= 0) {
        existingRoutes[routeIndex] = route;
      } else {
        existingRoutes.push(route);
      }

      // Store encrypted route data
      this.setItem(STORAGE_KEYS.OFFLINE_ROUTES, existingRoutes, false, true);

      // Update last sync timestamp
      this.setItem(STORAGE_KEYS.LAST_SYNC, new Date().getTime(), false, true);
    } catch (error) {
      console.error('Store offline data error:', error);
      throw error;
    }
  },

  /**
   * Retrieves stored offline data if within valid timeframe
   * Implements requirement: Offline operation support
   */
  getOfflineData: (): Route[] | null => {
    try {
      // Check last sync timestamp
      const lastSync = this.getItem<number>(STORAGE_KEYS.LAST_SYNC, false, true);
      if (!lastSync) {
        return null;
      }

      // Validate offline duration
      const currentTime = new Date().getTime();
      if (currentTime - lastSync > MAX_OFFLINE_DURATION) {
        // Clear expired offline data
        this.removeItem(STORAGE_KEYS.OFFLINE_ROUTES);
        this.removeItem(STORAGE_KEYS.LAST_SYNC);
        return null;
      }

      // Retrieve and return decrypted route data
      return this.getItem<Route[]>(STORAGE_KEYS.OFFLINE_ROUTES, false, true);
    } catch (error) {
      console.error('Get offline data error:', error);
      return null;
    }
  }
};