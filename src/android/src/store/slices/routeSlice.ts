/**
 * HUMAN TASKS:
 * 1. Configure proper offline storage limits in app configuration
 * 2. Set up proper error tracking and monitoring
 * 3. Configure location tracking permissions in AndroidManifest.xml
 * 4. Verify proper SSL pinning for API communication
 */

// Third-party imports - @reduxjs/toolkit v1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Internal imports
import { Route, RouteStatus, Location } from '../../types';
import { RouteService } from '../../services/route';

// Initialize route service singleton
const routeService = new RouteService();

// Define the state interface for the route slice
interface RouteState {
  activeRoute: Route | null;
  loading: boolean;
  error: string | null;
  lastSyncTimestamp: number;
  offlineUpdates: boolean;
}

// Initial state
const initialState: RouteState = {
  activeRoute: null,
  loading: false,
  error: null,
  lastSyncTimestamp: 0,
  offlineUpdates: false
};

// Requirement: Offline operation support with automatic synchronization
export const fetchActiveRoute = createAsyncThunk(
  'route/fetchActiveRoute',
  async (_, { rejectWithValue }) => {
    try {
      const route = await routeService.getActiveRoute();
      return route;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Requirement: Route optimization and planning with real-time updates
export const startRoute = createAsyncThunk(
  'route/startRoute',
  async (routeId: string, { rejectWithValue }) => {
    try {
      const route = await routeService.startRoute(routeId);
      return route;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Requirement: Digital proof of delivery validation and route completion
export const completeRoute = createAsyncThunk(
  'route/completeRoute',
  async (routeId: string, { rejectWithValue }) => {
    try {
      const route = await routeService.completeRoute(routeId);
      return route;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Requirement: Route optimization based on current location
export const optimizeRoute = createAsyncThunk(
  'route/optimizeRoute',
  async ({ routeId, currentLocation }: { routeId: string; currentLocation: Location }, 
  { rejectWithValue }) => {
    try {
      const route = await routeService.optimizeRoute(routeId, currentLocation);
      return route;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Create the route slice with reducers and actions
const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    // Requirement: Real-time route state updates
    setActiveRoute: (state, action: PayloadAction<Route | null>) => {
      state.activeRoute = action.payload;
      state.lastSyncTimestamp = Date.now();
    },
    // Requirement: Route status management
    updateRouteStatus: (state, action: PayloadAction<RouteStatus>) => {
      if (state.activeRoute) {
        state.activeRoute.status = action.payload;
        state.offlineUpdates = true;
      }
    },
    // Loading state management
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // Error state management
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Requirement: Offline sync status tracking
    setOfflineUpdates: (state, action: PayloadAction<boolean>) => {
      state.offlineUpdates = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Requirement: Fetch active route handling
    builder
      .addCase(fetchActiveRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.activeRoute = action.payload;
        state.lastSyncTimestamp = Date.now();
      })
      .addCase(fetchActiveRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Requirement: Start route handling
      .addCase(startRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.activeRoute = action.payload;
        state.lastSyncTimestamp = Date.now();
      })
      .addCase(startRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Requirement: Complete route handling
      .addCase(completeRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.activeRoute = action.payload;
        state.lastSyncTimestamp = Date.now();
        state.offlineUpdates = false;
      })
      .addCase(completeRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Requirement: Route optimization handling
      .addCase(optimizeRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(optimizeRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.activeRoute = action.payload;
        state.lastSyncTimestamp = Date.now();
      })
      .addCase(optimizeRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { 
  setActiveRoute, 
  updateRouteStatus, 
  setLoading, 
  setError, 
  setOfflineUpdates 
} = routeSlice.actions;

// Export thunks
export const routeThunks = {
  fetchActiveRoute,
  startRoute,
  completeRoute,
  optimizeRoute
};

// Export reducer
export default routeSlice.reducer;