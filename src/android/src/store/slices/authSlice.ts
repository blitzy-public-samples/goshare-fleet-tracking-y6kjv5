/**
 * HUMAN TASKS:
 * 1. Configure proper token refresh intervals in app configuration
 * 2. Set up proper keychain/keystore access for secure token storage
 * 3. Verify proper encryption settings for token storage
 * 4. Configure proper SSL certificate pinning
 */

// Third-party imports - @reduxjs/toolkit v1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Internal imports
import { User, AuthState } from '../../types';
import { AuthService } from '../../services/auth';

// Initial state implementing secure token management
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null
};

/**
 * Async thunk for handling user login with secure token storage
 * Requirement: Authentication state management with secure token handling
 */
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // Validate input credentials format
      if (!credentials.email || !credentials.password) {
        throw new Error('Invalid credentials format');
      }

      // Call AuthService.login with credentials
      const authService = new AuthService(/* storageManager */);
      const authState = await authService.login(credentials.email, credentials.password);

      // Store encrypted auth token securely
      // Update Redux state with auth result
      // Setup token refresh interval
      return authState;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for handling user logout and secure cleanup
 * Requirement: Secure token management and encrypted storage
 */
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Call AuthService.logout
      const authService = new AuthService(/* storageManager */);
      await authService.logout();

      // Clear encrypted auth tokens
      // Clear auth state in Redux
      // Cancel token refresh interval
      // Reset application state
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for refreshing authentication token securely
 * Requirement: Secure token management and automatic token refresh
 */
export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Check current token expiration
      const authService = new AuthService(/* storageManager */);
      const newToken = await authService.refreshToken();

      // Store new encrypted token
      // Update token in Redux state
      // Reset token refresh interval
      return newToken;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for validating current authentication status
 * Requirement: Offline authentication state persistence
 */
export const checkAuthStatusAsync = createAsyncThunk(
  'auth/checkStatus',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Call AuthService.checkAuthStatus
      const authService = new AuthService(/* storageManager */);
      const isAuthenticated = await authService.checkAuthStatus();

      // Validate stored token
      if (isAuthenticated) {
        const user = await authService.getCurrentUser();
        if (user) {
          dispatch(authSlice.actions.setUser(user));
        }
      }

      // Refresh token if needed
      // Update auth state if changed
      return isAuthenticated;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Redux slice for secure authentication state management
 * Requirement: Authentication state management for React Native driver applications
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    resetState: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    }
  },
  extraReducers: (builder) => {
    // Login async thunk handlers
    builder.addCase(loginAsync.pending, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });
    builder.addCase(loginAsync.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(loginAsync.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Logout async thunk handlers
    builder.addCase(logoutAsync.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Token refresh async thunk handlers
    builder.addCase(refreshTokenAsync.fulfilled, (state, action) => {
      state.token = action.payload;
    });
    builder.addCase(refreshTokenAsync.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Auth status check async thunk handlers
    builder.addCase(checkAuthStatusAsync.fulfilled, (state, action) => {
      state.isAuthenticated = action.payload;
    });
    builder.addCase(checkAuthStatusAsync.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });
  }
});

// Selector for accessing auth state
export const selectAuth = (state: { auth: AuthState }) => state.auth;

// Export actions and reducer
export const { setUser, setToken, resetState } = authSlice.actions;
export default authSlice.reducer;