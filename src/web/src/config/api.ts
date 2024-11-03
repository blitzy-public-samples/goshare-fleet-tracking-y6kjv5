// axios version ^1.4.0
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { API_VERSION, API_ENDPOINTS } from '../constants';

// Human Tasks:
// 1. Ensure REACT_APP_API_URL is set in environment variables
// 2. Configure SSL certificates for HTTPS communication
// 3. Set up monitoring for request timeouts and failures
// 4. Review retry mechanism thresholds with infrastructure team

// Global API configuration constants
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second delay between retries

/**
 * Creates and configures an axios instance with base configuration, interceptors, and security settings
 * Implements REQ-1.1: RESTful API communication between web dashboard and backend services
 */
export const createApiClient = (): AxiosInstance => {
  // Create axios instance with base configuration
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true // Enable secure cookie handling
  });

  // Request interceptor for authentication and API versioning
  instance.interceptors.request.use(
    (config) => {
      // Add API version header
      config.headers['X-API-Version'] = API_VERSION;
      
      // Add JWT token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      // Enable SSL/TLS
      config.httpsAgent = {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      };

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and retry logic
  instance.interceptors.response.use(
    (response) => {
      // Validate response format
      if (!response.data) {
        throw new Error('Invalid response format');
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest: any = error.config;

      // Implement retry mechanism for network errors
      if (error.message === 'Network Error' && !originalRequest._retry) {
        return retryRequest(error, 0);
      }

      // Handle authentication errors
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          // Attempt token refresh
          const refreshResponse = await instance.post(API_ENDPOINTS.AUTH.REFRESH);
          const newToken = refreshResponse.data.token;
          localStorage.setItem('auth_token', newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          // Clear auth state on refresh failure
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(handleApiError(error));
    }
  );

  return instance;
};

/**
 * Processes API error responses and formats them for consistent error handling
 * Implements REQ-1.1: Standardized error handling
 */
export const handleApiError = (error: AxiosError): object => {
  const errorResponse = {
    message: 'An unexpected error occurred',
    code: 500,
    details: null
  };

  if (error.response) {
    // Server error response
    errorResponse.message = error.response.data?.message || error.message;
    errorResponse.code = error.response.status;
    errorResponse.details = error.response.data?.details || null;
  } else if (error.request) {
    // Network error
    errorResponse.message = 'Network connectivity error';
    errorResponse.code = 0;
    errorResponse.details = error.message;
  } else {
    // Client-side error
    errorResponse.message = error.message;
    errorResponse.code = 400;
  }

  // Log error for monitoring
  console.error('[API Error]', {
    ...errorResponse,
    timestamp: new Date().toISOString(),
    url: error.config?.url
  });

  return errorResponse;
};

/**
 * Implements exponential backoff retry logic for failed API requests
 * Implements REQ-1.2: Automatic retry mechanisms
 */
export const retryRequest = async (
  error: AxiosError,
  retryCount: number
): Promise<AxiosResponse> => {
  if (retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }

  // Calculate exponential backoff delay
  const delay = RETRY_DELAY * Math.pow(2, retryCount);

  // Wait for the calculated delay
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    // Retry the request
    const response = await axios(error.config!);
    return response;
  } catch (retryError) {
    // Recursively retry with incremented count
    return retryRequest(retryError as AxiosError, retryCount + 1);
  }
};

// Export configured axios instance
export const apiClient = createApiClient();