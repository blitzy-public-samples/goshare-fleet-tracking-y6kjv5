/**
 * HUMAN TASKS:
 * 1. Configure proper image compression settings for proof of delivery photos
 * 2. Set up proper SSL pinning for API communication
 * 3. Configure offline storage limits in app configuration
 * 4. Verify proper permissions for camera and storage access
 */

// Third-party imports - versions specified in package.json
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5

// Internal imports
import { 
  Delivery, 
  DeliveryStatus, 
  ProofOfDelivery, 
  Customer 
} from '../../types';
import { DeliveryService } from '../../services/delivery';

// Requirement: Offline-first architecture for delivery state management
interface DeliveryState {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTimestamp: number;
}

const initialState: DeliveryState = {
  deliveries: [],
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSyncTimestamp: 0
};

// Requirement: Async thunk for fetching delivery list with offline support
export const fetchDeliveries = createAsyncThunk(
  'delivery/fetchDeliveries',
  async (_, { rejectWithValue }) => {
    try {
      const deliveryService = new DeliveryService();
      const deliveries = await deliveryService.getDeliveries();
      return deliveries;
    } catch (error) {
      return rejectWithValue('Failed to fetch deliveries');
    }
  }
);

// Requirement: Async thunk for updating delivery status with offline queueing
export const updateDeliveryStatus = createAsyncThunk(
  'delivery/updateStatus',
  async ({ 
    deliveryId, 
    status 
  }: { 
    deliveryId: string; 
    status: DeliveryStatus 
  }, { rejectWithValue }) => {
    try {
      const deliveryService = new DeliveryService();
      await deliveryService.updateDeliveryStatus(deliveryId, status);
      return { deliveryId, status };
    } catch (error) {
      return rejectWithValue('Failed to update delivery status');
    }
  }
);

// Requirement: Async thunk for submitting proof of delivery with media handling
export const submitProofOfDelivery = createAsyncThunk(
  'delivery/submitProof',
  async ({ 
    deliveryId, 
    proof 
  }: { 
    deliveryId: string; 
    proof: ProofOfDelivery 
  }, { rejectWithValue }) => {
    try {
      const deliveryService = new DeliveryService();
      await deliveryService.submitProofOfDelivery(deliveryId, proof);
      return { deliveryId, proof };
    } catch (error) {
      return rejectWithValue('Failed to submit proof of delivery');
    }
  }
);

// Requirement: Redux slice for delivery state management with offline support
export const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    // Reset delivery state
    resetDeliveryState: (state) => {
      state.deliveries = [];
      state.loading = false;
      state.error = null;
      state.syncStatus = 'idle';
    },
    // Update sync timestamp
    updateSyncTimestamp: (state, action: PayloadAction<number>) => {
      state.lastSyncTimestamp = action.payload;
    },
    // Update sync status
    updateSyncStatus: (state, action: PayloadAction<'idle' | 'syncing' | 'error'>) => {
      state.syncStatus = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Fetch deliveries reducers
    builder.addCase(fetchDeliveries.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDeliveries.fulfilled, (state, action) => {
      state.loading = false;
      state.deliveries = action.payload;
      state.error = null;
    });
    builder.addCase(fetchDeliveries.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update delivery status reducers
    builder.addCase(updateDeliveryStatus.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateDeliveryStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      const { deliveryId, status } = action.payload;
      state.deliveries = state.deliveries.map(delivery =>
        delivery.id === deliveryId
          ? { ...delivery, status }
          : delivery
      );
    });
    builder.addCase(updateDeliveryStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Submit proof of delivery reducers
    builder.addCase(submitProofOfDelivery.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(submitProofOfDelivery.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      const { deliveryId, proof } = action.payload;
      state.deliveries = state.deliveries.map(delivery =>
        delivery.id === deliveryId
          ? {
              ...delivery,
              status: DeliveryStatus.COMPLETED,
              proofOfDelivery: proof
            }
          : delivery
      );
    });
    builder.addCase(submitProofOfDelivery.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  }
});

// Export actions
export const { 
  resetDeliveryState, 
  updateSyncTimestamp, 
  updateSyncStatus 
} = deliverySlice.actions;

// Export selector for accessing delivery state
export const selectDeliveries = (state: { delivery: DeliveryState }) => state.delivery.deliveries;

// Export reducer
export default deliverySlice.reducer;