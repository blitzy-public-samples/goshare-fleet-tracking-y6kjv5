// @reduxjs/toolkit version ^1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Route, Delivery } from '../../types';
import { ROUTE_STATUS } from '../../constants';
import { createRoute, updateDeliveryStatus } from '../../services/api';

// Human Tasks:
// 1. Configure real-time update interval in environment variables (30 seconds)
// 2. Set up monitoring for route optimization performance
// 3. Verify WebSocket connection for real-time updates
// 4. Review error handling thresholds with the team

// State interface for route management
interface RouteState {
  routes: Record<string, Route>;
  loading: boolean;
  error: string | null;
  activeRouteIds: string[];
  lastUpdate: string | null;
}

// Initial state
const initialState: RouteState = {
  routes: {},
  loading: false,
  error: null,
  activeRouteIds: [],
  lastUpdate: null
};

// Async thunk for fetching all routes with real-time updates
// Implements requirement: Real-time data synchronization with 30-second intervals
export const fetchRoutes = createAsyncThunk(
  'routes/fetchRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/routes');
      if (!response.ok) throw new Error('Failed to fetch routes');
      const routes: Route[] = await response.json();
      return routes;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for creating a new optimized delivery route
// Implements requirement: Route optimization and planning
export const createNewRoute = createAsyncThunk(
  'routes/createRoute',
  async (routeData: { vehicleId: string; driverId: string; deliveries: string[] }, { rejectWithValue }) => {
    try {
      const route = await createRoute(routeData);
      return route;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for updating route status with real-time sync
// Implements requirement: Real-time route status updates
export const updateRouteStatus = createAsyncThunk(
  'routes/updateStatus',
  async ({ routeId, status }: { routeId: string; status: ROUTE_STATUS }, { rejectWithValue, getState }) => {
    try {
      const response = await fetch(`/api/v1/routes/${routeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update route status');
      return { routeId, status };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Route slice definition with reducers and actions
export const routeSlice = createSlice({
  name: 'routes',
  initialState,
  reducers: {
    // Update route in state when real-time update received
    updateRouteData: (state, action: PayloadAction<Route>) => {
      const route = action.payload;
      state.routes[route.id] = route;
      state.lastUpdate = new Date().toISOString();
    },
    // Clear route data on logout
    clearRoutes: (state) => {
      state.routes = {};
      state.activeRouteIds = [];
      state.lastUpdate = null;
    },
    // Update delivery status within a route
    updateDeliveryStatus: (state, action: PayloadAction<{ routeId: string; deliveryId: string; status: string }>) => {
      const { routeId, deliveryId, status } = action.payload;
      const route = state.routes[routeId];
      if (route) {
        const deliveryIndex = route.deliveries.findIndex(d => d.id === deliveryId);
        if (deliveryIndex !== -1) {
          route.deliveries[deliveryIndex] = {
            ...route.deliveries[deliveryIndex],
            status: status as any
          };
        }
      }
    }
  },
  extraReducers: (builder) => {
    // Handle fetchRoutes states
    builder
      .addCase(fetchRoutes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.loading = false;
        state.routes = action.payload.reduce((acc, route) => {
          acc[route.id] = route;
          return acc;
        }, {} as Record<string, Route>);
        state.activeRouteIds = action.payload
          .filter(route => route.status === ROUTE_STATUS.ACTIVE)
          .map(route => route.id);
        state.lastUpdate = new Date().toISOString();
      })
      .addCase(fetchRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle createNewRoute states
      .addCase(createNewRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.routes[action.payload.id] = action.payload;
        if (action.payload.status === ROUTE_STATUS.ACTIVE) {
          state.activeRouteIds.push(action.payload.id);
        }
        state.lastUpdate = new Date().toISOString();
      })
      .addCase(createNewRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle updateRouteStatus states
      .addCase(updateRouteStatus.fulfilled, (state, action) => {
        const { routeId, status } = action.payload;
        if (state.routes[routeId]) {
          state.routes[routeId].status = status;
          if (status === ROUTE_STATUS.ACTIVE) {
            if (!state.activeRouteIds.includes(routeId)) {
              state.activeRouteIds.push(routeId);
            }
          } else {
            state.activeRouteIds = state.activeRouteIds.filter(id => id !== routeId);
          }
          state.lastUpdate = new Date().toISOString();
        }
      });
  }
});

// Export actions
export const { updateRouteData, clearRoutes, updateDeliveryStatus } = routeSlice.actions;

// Memoized selectors
export const selectAllRoutes = (state: { routes: RouteState }) => 
  Object.values(state.routes.routes);

export const selectRouteById = (state: { routes: RouteState }, routeId: string) => 
  state.routes.routes[routeId];

export const selectActiveRoutes = (state: { routes: RouteState }) => 
  state.activeRouteIds.map(id => state.routes.routes[id]).filter(Boolean);

// Export reducer
export default routeSlice.reducer;