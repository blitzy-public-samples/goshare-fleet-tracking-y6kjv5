/**
 * HUMAN TASKS:
 * 1. Configure proper SSL certificate pinning in the app
 * 2. Set up proper keychain/keystore access for token storage
 * 3. Configure proper token refresh intervals in app config
 * 4. Verify proper encryption keys are set up for token storage
 */

// Third-party imports
import axios, { AxiosInstance } from 'axios'; // ^1.4.0

// Internal imports
import { User, AuthState, ApiResponse, AuthResponse } from '../types';
import { AUTH_ENDPOINTS } from '../constants/api';
import { StorageManager } from '../utils/storage';

// Constants
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const AUTH_TOKEN_KEY = '@fleet_tracker/auth_token';
const USER_DATA_KEY = '@fleet_tracker/user_data';

/**
 * Implements secure authentication service for mobile driver applications
 * Requirement: Authentication implementation for React Native driver applications
 */
export class AuthService {
  private axiosInstance: AxiosInstance;
  private storageManager: StorageManager;
  private currentAuthState: AuthState | null;
  private refreshInterval: NodeJS.Timer | null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.currentAuthState = null;
    this.refreshInterval = null;

    // Initialize axios instance with interceptors
    this.axiosInstance = axios.create();
    this.setupAxiosInterceptors();
  }

  /**
   * Initializes the auth service and restores previous session if available
   * Requirement: Offline authentication handling with token persistence
   */
  public async initialize(): Promise<void> {
    try {
      // Restore auth state from secure storage
      const token = await this.storageManager.getData<string>(AUTH_TOKEN_KEY);
      const userData = await this.storageManager.getData<User>(USER_DATA_KEY);

      if (token && userData) {
        this.currentAuthState = {
          isAuthenticated: true,
          user: userData,
          token
        };

        // Setup token refresh if valid auth state
        this.setupTokenRefresh();
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
      this.currentAuthState = null;
    }
  }

  /**
   * Authenticates user with credentials and stores auth tokens securely
   * Requirement: Secure token management and encrypted storage
   */
  public async login(email: string, password: string): Promise<AuthState> {
    try {
      // Validate input credentials format
      if (!this.validateCredentials(email, password)) {
        throw new Error('Invalid credentials format');
      }

      // Make API request to login endpoint
      const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>(
        AUTH_ENDPOINTS.LOGIN,
        { email, password }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }

      const { token, user } = response.data.data;

      // Store auth data securely with encryption
      await this.storageManager.storeData(AUTH_TOKEN_KEY, token, true);
      await this.storageManager.storeData(USER_DATA_KEY, user, true);

      // Update current auth state
      this.currentAuthState = {
        isAuthenticated: true,
        user,
        token
      };

      // Setup token refresh interval
      this.setupTokenRefresh();

      return this.currentAuthState;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logs out user and clears stored authentication data securely
   * Requirement: Secure token management
   */
  public async logout(): Promise<void> {
    try {
      // Call logout endpoint if online
      if (navigator.onLine) {
        await this.axiosInstance.post(AUTH_ENDPOINTS.LOGOUT);
      }

      // Clear stored tokens and user data
      await this.storageManager.storeData(AUTH_TOKEN_KEY, null);
      await this.storageManager.storeData(USER_DATA_KEY, null);

      // Clear auth state and cancel refresh interval
      this.currentAuthState = null;
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Refreshes authentication token using stored refresh token
   * Requirement: Automatic token refresh
   */
  public async refreshToken(): Promise<string> {
    try {
      // Get current token for refresh request
      const currentToken = this.currentAuthState?.token;
      if (!currentToken) {
        throw new Error('No token available for refresh');
      }

      // Call refresh token endpoint
      const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>(
        AUTH_ENDPOINTS.REFRESH_TOKEN,
        { token: currentToken }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Token refresh failed');
      }

      const { token, user } = response.data.data;

      // Store new token securely
      await this.storageManager.storeData(AUTH_TOKEN_KEY, token, true);
      await this.storageManager.storeData(USER_DATA_KEY, user, true);

      // Update auth state
      this.currentAuthState = {
        isAuthenticated: true,
        user,
        token
      };

      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Force logout on refresh failure
      await this.logout();
      throw error;
    }
  }

  /**
   * Checks current authentication status using stored token
   * Requirement: Offline authentication handling
   */
  public async checkAuthStatus(): Promise<boolean> {
    try {
      // Check for stored auth token
      const token = await this.storageManager.getData<string>(AUTH_TOKEN_KEY);
      if (!token) {
        return false;
      }

      // Validate token expiration
      if (this.isTokenExpired(token)) {
        // Attempt token refresh if expired
        try {
          await this.refreshToken();
          return true;
        } catch {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Auth status check error:', error);
      return false;
    }
  }

  /**
   * Retrieves current user data from secure storage
   * Requirement: Offline authentication handling
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      // Check authentication status
      const isAuthenticated = await this.checkAuthStatus();
      if (!isAuthenticated) {
        return null;
      }

      // Retrieve cached user data
      const userData = await this.storageManager.getData<User>(USER_DATA_KEY);
      if (!userData) {
        return null;
      }

      // Validate user data structure
      if (!this.validateUserData(userData)) {
        return null;
      }

      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Sets up axios interceptors for token handling
   * Requirement: Secure token management
   */
  private setupAxiosInterceptors(): void {
    // Request interceptor for adding auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = this.currentAuthState?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling token expiration
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await this.refreshToken();
            // Retry original request with new token
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.currentAuthState?.token}`;
            return this.axiosInstance(originalRequest);
          } catch {
            await this.logout();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Sets up token refresh interval
   * Requirement: Automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.refreshInterval = setInterval(
      () => this.refreshToken(),
      TOKEN_REFRESH_INTERVAL
    );
  }

  /**
   * Validates user credentials format
   */
  private validateCredentials(email: string, password: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && password.length >= 8;
  }

  /**
   * Validates user data structure
   */
  private validateUserData(user: any): user is User {
    return (
      typeof user === 'object' &&
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.name === 'string'
    );
  }

  /**
   * Checks if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const [, payload] = token.split('.');
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}