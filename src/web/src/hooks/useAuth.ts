// @react-redux version ^8.1.0
// @react version ^18.0.0

// Human Tasks:
// 1. Configure OAuth 2.0 client credentials in environment variables
// 2. Set up secure token storage mechanism (e.g., HttpOnly cookies)
// 3. Review token refresh timing with security team
// 4. Verify CORS settings match authentication domains
// 5. Configure session timeout settings

import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
  login,
  logout,
  selectAuth,
  LoginCredentials,
  AuthState
} from '../store/slices/authSlice';
import { Driver } from '../types';

/**
 * Custom hook for managing OAuth 2.0 + OIDC authentication state and operations
 * Implements requirements:
 * - 8.1.1 Authentication Methods: OAuth 2.0 + OIDC authentication for web dashboard login
 * - 8.3.1 Network Security: Secure token management and session handling
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuth);

  /**
   * Memoized function to handle OAuth 2.0 user login
   * Implements requirement 8.1.1: OAuth 2.0 + OIDC authentication with JWT token handling
   */
  const loginUser = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      // Dispatch login action with OAuth credentials
      await dispatch(login(credentials)).unwrap();
    } catch (error) {
      // Error handling is managed by the auth slice
      console.error('Login failed:', error);
    }
  }, [dispatch]);

  /**
   * Memoized function to handle secure user logout
   * Implements requirement 8.3.1: Secure session handling for API authentication
   */
  const logoutUser = useCallback((): void => {
    try {
      // Dispatch logout action to clear auth state and invalidate session
      dispatch(logout());
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [dispatch]);

  return {
    // Current authenticated driver data
    user: authState.user as Driver | null,
    
    // Authentication status
    isAuthenticated: authState.isAuthenticated,
    
    // Loading state for async operations
    isLoading: authState.loading,
    
    // Error message if authentication fails
    error: authState.error,
    
    // Authentication handlers
    loginUser,
    logoutUser
  };
};

// Export types for consumers
export type { LoginCredentials };
export type { AuthState };