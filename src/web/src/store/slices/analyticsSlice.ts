// @reduxjs/toolkit version ^1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchFleetAnalytics,
  fetchRouteAnalytics,
  generateAnalyticsReport,
  subscribeToLiveAnalytics
} from '../../services/analytics';
import { Vehicle, Route, Delivery } from '../../types';

// Human Tasks:
// 1. Configure analytics update intervals in environment variables
// 2. Set up monitoring for analytics processing performance
// 3. Review data retention policies with infrastructure team
// 4. Verify real-time analytics socket connection settings

/**
 * Analytics state interface
 * Implements requirement: Analytics and reporting
 */
interface AnalyticsState {
  fleetAnalytics: {
    data: {
      vehicleUtilization: number;
      deliveryPerformance: {
        onTime: number;
        delayed: number;
        failed: number;
      };
      routeEfficiency: {
        plannedVsActual: number;
        fuelEfficiency: number;
        timeEfficiency: number;
      };
      kpis: {
        deliveriesPerHour: number;
        averageDeliveryTime: number;
        successRate: number;
      };
    } | null;
    loading: boolean;
    error: string | null;
  };
  routeAnalytics: {
    data: {
      completionRate: number;
      delayMetrics: {
        averageDelay: number;
        delayFrequency: number;
      };
      efficiency: {
        distanceOptimization: number;
        timeOptimization: number;
        costEfficiency: number;
      };
    } | null;
    loading: boolean;
    error: string | null;
  };
  report: {
    data: {
      summary: {
        period: string;
        generatedAt: string;
        metrics: Record<string, number>;
      };
      charts: any[];
      data: Record<string, any>;
    } | null;
    loading: boolean;
    error: string | null;
  };
  realTimeUpdates: {
    enabled: boolean;
    lastUpdate: Date | null;
  };
}

// Initial state
const initialState: AnalyticsState = {
  fleetAnalytics: {
    data: null,
    loading: false,
    error: null
  },
  routeAnalytics: {
    data: null,
    loading: false,
    error: null
  },
  report: {
    data: null,
    loading: false,
    error: null
  },
  realTimeUpdates: {
    enabled: false,
    lastUpdate: null
  }
};

/**
 * Async thunk for fetching fleet analytics data
 * Implements requirement: Analytics and reporting - Comprehensive analytics capabilities
 */
export const fetchFleetAnalyticsAsync = createAsyncThunk(
  'analytics/fetchFleetAnalytics',
  async (params: { dateRange: string; fleetId: string }) => {
    const { dateRange, fleetId } = params;
    const response = await fetchFleetAnalytics(dateRange, fleetId);
    return response;
  }
);

/**
 * Async thunk for fetching route analytics data
 * Implements requirement: Real-time data visualization - Interactive data visualization
 */
export const fetchRouteAnalyticsAsync = createAsyncThunk(
  'analytics/fetchRouteAnalytics',
  async ({ routeId, dateRange }: { routeId: string; dateRange: { start: Date; end: Date } }) => {
    const formattedDateRange = `${dateRange.start.toISOString()}/${dateRange.end.toISOString()}`;
    const response = await fetchRouteAnalytics(routeId, formattedDateRange);
    return response;
  }
);

/**
 * Async thunk for generating analytics reports
 * Implements requirement: Analytics and reporting - Report generation
 */
export const generateReportAsync = createAsyncThunk(
  'analytics/generateReport',
  async (reportParams: { type: string; dateRange: { start: Date; end: Date }; filters: object }) => {
    const formattedParams = {
      dateRange: `${reportParams.dateRange.start.toISOString()}/${reportParams.dateRange.end.toISOString()}`,
      metrics: ['efficiency', 'performance', 'utilization'],
      format: 'json',
      ...reportParams.filters
    };
    const response = await generateAnalyticsReport(formattedParams);
    return response;
  }
);

/**
 * Analytics slice with reducers and actions
 * Implements requirements: Analytics and reporting, Real-time data visualization
 */
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setRealTimeUpdates: (state, action: PayloadAction<boolean>) => {
      state.realTimeUpdates.enabled = action.payload;
    },
    updateRealTimeData: (state, action: PayloadAction<any>) => {
      if (state.fleetAnalytics.data) {
        // Update relevant metrics with real-time data
        state.fleetAnalytics.data = {
          ...state.fleetAnalytics.data,
          ...action.payload
        };
      }
      state.realTimeUpdates.lastUpdate = new Date();
    },
    clearAnalyticsData: (state) => {
      state.fleetAnalytics.data = null;
      state.routeAnalytics.data = null;
      state.report.data = null;
    }
  },
  extraReducers: (builder) => {
    // Fleet Analytics
    builder
      .addCase(fetchFleetAnalyticsAsync.pending, (state) => {
        state.fleetAnalytics.loading = true;
        state.fleetAnalytics.error = null;
      })
      .addCase(fetchFleetAnalyticsAsync.fulfilled, (state, action) => {
        state.fleetAnalytics.loading = false;
        state.fleetAnalytics.data = action.payload;
      })
      .addCase(fetchFleetAnalyticsAsync.rejected, (state, action) => {
        state.fleetAnalytics.loading = false;
        state.fleetAnalytics.error = action.error.message || 'Failed to fetch fleet analytics';
      })
      // Route Analytics
      .addCase(fetchRouteAnalyticsAsync.pending, (state) => {
        state.routeAnalytics.loading = true;
        state.routeAnalytics.error = null;
      })
      .addCase(fetchRouteAnalyticsAsync.fulfilled, (state, action) => {
        state.routeAnalytics.loading = false;
        state.routeAnalytics.data = action.payload;
      })
      .addCase(fetchRouteAnalyticsAsync.rejected, (state, action) => {
        state.routeAnalytics.loading = false;
        state.routeAnalytics.error = action.error.message || 'Failed to fetch route analytics';
      })
      // Report Generation
      .addCase(generateReportAsync.pending, (state) => {
        state.report.loading = true;
        state.report.error = null;
      })
      .addCase(generateReportAsync.fulfilled, (state, action) => {
        state.report.loading = false;
        state.report.data = action.payload;
      })
      .addCase(generateReportAsync.rejected, (state, action) => {
        state.report.loading = false;
        state.report.error = action.error.message || 'Failed to generate analytics report';
      });
  }
});

// Export actions and reducer
export const { setRealTimeUpdates, updateRealTimeData, clearAnalyticsData } = analyticsSlice.actions;
export default analyticsSlice.reducer;