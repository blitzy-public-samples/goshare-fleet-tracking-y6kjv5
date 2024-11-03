// @reduxjs/toolkit version ^1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Vehicle, Driver } from '../../types';
import { VEHICLE_STATUS, DRIVER_STATUS, LOCATION_UPDATE_INTERVAL } from '../../constants';
import { getVehicles, getVehicleLocation } from '../../services/api';

// Human Tasks:
// 1. Verify real-time update interval (30 seconds) is properly configured in infrastructure
// 2. Ensure WebSocket connection is established for live updates
// 3. Configure monitoring alerts for tracking data latency
// 4. Review error handling thresholds with operations team

// State interface for fleet management
interface FleetState {
  vehicles: Vehicle[];
  drivers: Driver[];
  loading: boolean;
  error: string | null;
  selectedVehicleId: string | null;
}

// Initial state
const initialState: FleetState = {
  vehicles: [],
  drivers: [],
  loading: false,
  error: null,
  selectedVehicleId: null
};

// Async thunk for fetching all vehicles with real-time locations
// Implements requirement: Real-time GPS tracking with 30-second update intervals
export const fetchVehicles = createAsyncThunk(
  'fleet/fetchVehicles',
  async (_, { rejectWithValue }) => {
    try {
      const vehicles = await getVehicles();
      return vehicles.map(vehicle => ({
        ...vehicle,
        lastUpdate: new Date()
      }));
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for updating vehicle location with 30-second intervals
// Implements requirement: Real-time data synchronization
export const updateVehicleLocation = createAsyncThunk(
  'fleet/updateVehicleLocation',
  async (vehicleId: string, { rejectWithValue }) => {
    try {
      const location = await getVehicleLocation(vehicleId);
      return { vehicleId, location, lastUpdate: new Date() };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Fleet management slice with real-time updates
// Implements requirement: Interactive fleet management dashboard
const fleetSlice = createSlice({
  name: 'fleet',
  initialState,
  reducers: {
    // Updates selected vehicle for detailed view
    setSelectedVehicle: (state, action: PayloadAction<string>) => {
      state.selectedVehicleId = action.payload;
    },
    // Clears any error messages from state
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch vehicles reducers
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.vehicles = action.payload;
        state.loading = false;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update vehicle location reducers
      .addCase(updateVehicleLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVehicleLocation.fulfilled, (state, action) => {
        const { vehicleId, location, lastUpdate } = action.payload;
        const vehicleIndex = state.vehicles.findIndex(v => v.id === vehicleId);
        
        if (vehicleIndex !== -1) {
          state.vehicles[vehicleIndex] = {
            ...state.vehicles[vehicleIndex],
            currentLocation: location,
            lastUpdate
          };
        }
        state.loading = false;
      })
      .addCase(updateVehicleLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions for component usage
export const { setSelectedVehicle, clearError } = fleetSlice.actions;

// Selectors for accessing fleet state
export const selectVehicles = (state: { fleet: FleetState }) => state.fleet.vehicles;
export const selectDrivers = (state: { fleet: FleetState }) => state.fleet.drivers;
export const selectSelectedVehicle = (state: { fleet: FleetState }) => {
  const { selectedVehicleId, vehicles } = state.fleet;
  return selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) : null;
};
export const selectVehiclesByStatus = (state: { fleet: FleetState }, status: VEHICLE_STATUS) =>
  state.fleet.vehicles.filter(v => v.status === status);
export const selectDriversByStatus = (state: { fleet: FleetState }, status: DRIVER_STATUS) =>
  state.fleet.drivers.filter(d => d.status === status);
export const selectLoading = (state: { fleet: FleetState }) => state.fleet.loading;
export const selectError = (state: { fleet: FleetState }) => state.fleet.error;

// Export reducer as default for store configuration
export default fleetSlice.reducer;

// Constants for real-time updates
export const LOCATION_POLLING_INTERVAL = LOCATION_UPDATE_INTERVAL; // 30 seconds
export const MAX_UPDATE_RETRIES = 3;
export const UPDATE_RETRY_DELAY = 5000; // 5 seconds