/**
 * HUMAN TASKS:
 * 1. Configure proper token refresh intervals in app configuration
 * 2. Set up proper keychain/keystore access for secure token storage
 * 3. Verify proper encryption settings for token storage
 * 4. Configure proper SSL certificate pinning
 */

// Third-party imports - versions specified for security auditing
import { useEffect, useCallback } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0

// Internal imports
import { User, AuthState } from '../types';
import {
  loginAsync,
  logoutAsync,
  refreshTokenAsync,
  checkAuthStatusAsync,
  selectAuth
} from '../store/slices/authSlice';
import { AuthService } from '../services/auth';

// Constants
const TOKEN_CHECK_INTERVAL = 60 * 1000; // 1 minute

/**
 * Custom hook for managing authentication state and operations with secure token handling
 * Requirement: Authentication implementation for React Native driver applications with offline-first architecture
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuth);
  
  /**
   * Handles user login operation with secure token storage
   * Requirement: Secure authentication and token management for mobile app
   */
  const handleLogin = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      // Dispatch login action with credentials
      const resultAction = await dispatch(loginAsync({ email, password }));
      
      if (loginAsync.rejected.match(resultAction)) {
        throw new Error(resultAction.payload as string);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles user logout operation with secure cleanup
   * Requirement: Secure token management with encrypted storage
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      // Dispatch logout action for secure cleanup
      const resultAction = await dispatch(logoutAsync());
      
      if (logoutAsync.rejected.match(resultAction)) {
        throw new Error(resultAction.payload as string);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Effect for handling automatic token refresh and auth status check
   * Requirement: Automatic token refresh and offline authentication support
   */
  useEffect(() => {
    let tokenCheckInterval: NodeJS.Timer;

    const checkAuthStatus = async () => {
      try {
        // Check authentication status
        await dispatch(checkAuthStatusAsync());
        
        // Refresh token if authenticated
        if (authState.isAuthenticated && authState.token) {
          await dispatch(refreshTokenAsync());
        }
      } catch (error) {
        console.error('Auth status check error:', error);
      }
    };

    // Initial auth status check
    checkAuthStatus();

    // Setup periodic token check interval
    if (authState.isAuthenticated) {
      tokenCheckInterval = setInterval(checkAuthStatus, TOKEN_CHECK_INTERVAL);
    }

    // Cleanup interval on unmount or auth state change
    return () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    };
  }, [dispatch, authState.isAuthenticated, authState.token]);

  /**
   * Returns authentication state and operations
   * Requirement: Authentication state management for mobile app
   */
  return {
    user: authState.user as User | null,
    isAuthenticated: authState.isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    loading: false // Loading state managed by Redux toolkit internally
  };
};

export default useAuth;