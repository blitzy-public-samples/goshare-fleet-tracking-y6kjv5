// @reduxjs/toolkit version ^1.9.5

// Human Tasks:
// 1. Configure OAuth 2.0 client credentials in environment variables
// 2. Set up secure token storage mechanism (e.g., HttpOnly cookies)
// 3. Review token refresh timing with security team
// 4. Ensure CORS settings match authentication domains
// 5. Verify SSL/TLS configuration for auth endpoints

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Driver } from '../../types';
import { API_ENDPOINTS } from '../../constants';

// Implements requirement 8.1.1: Authentication Methods - OAuth 2.0 + OIDC authentication
interface LoginCredentials {
  email: string;
  password: string;
}

// Implements requirement 8.1.1: Authentication Methods - JWT token handling
interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
  user: Driver | null;
  tokenExpiration: Date | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
  user: null,
  tokenExpiration: null
};

// Implements requirement 8.1.1: OAuth 2.0 + OIDC authentication for web dashboard login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include' // For secure cookie handling
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // Store JWT token securely
      const expirationDate = new Date(Date.now() + data.expiresIn * 1000);
      
      return {
        token: data.token,
        user: data.user,
        tokenExpiration: expirationDate
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Implements requirement 8.1.1: JWT token refresh handling
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const expirationDate = new Date(Date.now() + data.expiresIn * 1000);

      return {
        token: data.token,
        tokenExpiration: expirationDate
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Implements requirement 8.1.1: Secure session handling
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      // Clear authentication state
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.tokenExpiration = null;
      state.error = null;
      
      // Call logout endpoint to invalidate server-side session
      fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        credentials: 'include'
      });
    },
    clearError: (state) => {
      state.error = null;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Login action handlers
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.tokenExpiration = action.payload.tokenExpiration;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isAuthenticated = false;
      state.loading = false;
      state.error = action.payload as string;
    });

    // Token refresh action handlers
    builder.addCase(refreshToken.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.tokenExpiration = action.payload.tokenExpiration;
      state.loading = false;
    });
    builder.addCase(refreshToken.rejected, (state, action) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.tokenExpiration = null;
      state.loading = false;
      state.error = action.payload as string;
    });
  }
});

// Selector for accessing auth state
export const selectAuth = (state: { auth: AuthState }) => state.auth;

// Export actions and reducer
export const { logout, clearError, setAuthError } = authSlice.actions;
export default authSlice.reducer;