/**
 * HUMAN TASKS:
 * 1. Configure SSL certificate pinning in the Android app
 * 2. Set up proper error tracking and monitoring
 * 3. Configure retry policies in production environment
 * 4. Set up proper API rate limiting in infrastructure
 */

// Third-party imports - versions specified as per requirements
import axios, { AxiosInstance, AxiosError } from 'axios'; // ^1.4.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0

// Internal imports
import { User } from '../types';
import { API_BASE_URL } from '../constants/api';
import { storeData } from './storage';

// Global constants for API configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds
const OFFLINE_QUEUE_KEY = '@offline_queue';

// Types for offline request queue
interface QueuedRequest {
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

// Implements requirement: Core API utility module with retry mechanisms
let api: AxiosInstance;

/**
 * Creates and configures an axios instance with retry and offline capabilities
 * Implements requirement: Sub-second response times through optimized request handling
 */
export const createApiInstance = (): AxiosInstance => {
  api = axios.create({
    baseURL: API_BASE_URL.production,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Request interceptor for authentication and offline handling
  api.interceptors.request.use(
    async (config) => {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        // Queue request for offline handling
        await queueOfflineRequest({
          url: config.url!,
          method: config.method!,
          data: config.data,
          headers: config.headers as Record<string, string>,
          timestamp: Date.now(),
          retryCount: 0
        });
        throw new Error('No network connection');
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and retry logic
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config!;
      
      // Handle retry logic for specific error cases
      if (shouldRetry(error) && originalRequest.retryCount < MAX_RETRY_ATTEMPTS) {
        originalRequest.retryCount = (originalRequest.retryCount || 0) + 1;
        await delay(RETRY_DELAY * originalRequest.retryCount);
        return api(originalRequest);
      }

      // Queue failed requests if network error
      if (error.message === 'Network Error') {
        await queueOfflineRequest({
          url: originalRequest.url!,
          method: originalRequest.method!,
          data: originalRequest.data,
          headers: originalRequest.headers as Record<string, string>,
          timestamp: Date.now(),
          retryCount: originalRequest.retryCount || 0
        });
      }

      return Promise.reject(handleApiError(error));
    }
  );

  return api;
};

/**
 * Sets the authentication token for API requests
 * Implements requirement: Authentication and request headers
 */
export const setAuthToken = async (token: string): Promise<void> => {
  if (!token) {
    delete api.defaults.headers.common['Authorization'];
    return;
  }

  try {
    // Store token securely
    await storeData('auth_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } catch (error) {
    console.error('Error setting auth token:', error);
    throw new Error('Failed to set authentication token');
  }
};

/**
 * Processes API errors and implements retry logic
 * Implements requirement: Error handling with retry mechanisms
 */
export const handleApiError = (error: AxiosError): Error => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || 'An error occurred';

    switch (status) {
      case 401:
        // Handle unauthorized access
        return new Error('Authentication required');
      case 403:
        return new Error('Access forbidden');
      case 404:
        return new Error('Resource not found');
      case 429:
        return new Error('Too many requests');
      default:
        return new Error(message);
    }
  } else if (error.request) {
    // Request made but no response received
    return new Error('No response from server');
  } else {
    // Error in request configuration
    return new Error('Request configuration error');
  }
};

/**
 * Queues failed requests for retry when online
 * Implements requirement: Offline request queueing
 */
export const queueOfflineRequest = async (request: QueuedRequest): Promise<void> => {
  try {
    // Get existing queue
    const queueData = await storeData(OFFLINE_QUEUE_KEY, []);
    const queue: QueuedRequest[] = queueData || [];

    // Add new request to queue
    queue.push(request);

    // Store updated queue
    await storeData(OFFLINE_QUEUE_KEY, queue);
  } catch (error) {
    console.error('Error queueing offline request:', error);
    throw new Error('Failed to queue offline request');
  }
};

/**
 * Processes queued offline requests when connection is restored
 * Implements requirement: Offline-first architecture with automatic retry
 */
export const processOfflineQueue = async (): Promise<void> => {
  try {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    // Get offline queue
    const queue: QueuedRequest[] = await storeData(OFFLINE_QUEUE_KEY, []) || [];
    if (queue.length === 0) return;

    // Process each request in queue
    const processedRequests: QueuedRequest[] = [];
    const failedRequests: QueuedRequest[] = [];

    for (const request of queue) {
      try {
        await api({
          url: request.url,
          method: request.method,
          data: request.data,
          headers: request.headers
        });
        processedRequests.push(request);
      } catch (error) {
        if (request.retryCount < MAX_RETRY_ATTEMPTS) {
          request.retryCount++;
          failedRequests.push(request);
        }
      }
    }

    // Update queue with remaining failed requests
    await storeData(OFFLINE_QUEUE_KEY, failedRequests);
  } catch (error) {
    console.error('Error processing offline queue:', error);
    throw new Error('Failed to process offline queue');
  }
};

// Helper function to determine if request should be retried
const shouldRetry = (error: AxiosError): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error' ||
    (error.response?.status && [408, 500, 502, 503, 504].includes(error.response.status))
  );
};

// Helper function for delay between retries
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Initialize API instance
createApiInstance();

// Export configured instance and utilities
export { api };