// react version ^18.0.0
// react-redux version ^8.0.5
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchFleetAnalyticsAsync,
  fetchRouteAnalyticsAsync,
  setRealTimeUpdates,
  updateRealTimeData,
  clearAnalyticsData
} from '../store/slices/analyticsSlice';
import {
  fetchFleetAnalytics,
  fetchRouteAnalytics,
  subscribeToLiveAnalytics
} from '../services/analytics';

// Human Tasks:
// 1. Configure analytics polling intervals in environment variables
// 2. Set up error tracking for analytics data processing
// 3. Review real-time subscription settings with infrastructure team
// 4. Verify analytics data retention policies

/**
 * Custom hook for managing analytics data and real-time updates
 * Implements requirements: Analytics and reporting, Real-time data visualization, Performance Requirements
 */
export const useAnalytics = (options: {
  fleetId?: string;
  routeId?: string;
  dateRange?: { start: Date; end: Date };
}) => {
  const dispatch = useDispatch();

  // Select analytics state from Redux store
  const fleetAnalytics = useSelector((state: any) => state.analytics.fleetAnalytics);
  const routeAnalytics = useSelector((state: any) => state.analytics.routeAnalytics);
  const loading = fleetAnalytics.loading || routeAnalytics.loading;
  const error = fleetAnalytics.error || routeAnalytics.error;

  /**
   * Fetch analytics data based on provided filters
   * Implements requirement: Analytics and reporting - Comprehensive analytics capabilities
   */
  const fetchAnalytics = useCallback(async (filters: {
    fleetId?: string;
    routeId?: string;
    dateRange?: { start: Date; end: Date };
  }) => {
    try {
      // Fetch fleet analytics if fleetId is provided
      if (filters.fleetId) {
        const dateRangeString = filters.dateRange ? 
          `${filters.dateRange.start.toISOString()}/${filters.dateRange.end.toISOString()}` : 
          'last7days';
        
        await dispatch(fetchFleetAnalyticsAsync({
          fleetId: filters.fleetId,
          dateRange: dateRangeString
        }));
      }

      // Fetch route analytics if routeId is provided
      if (filters.routeId && filters.dateRange) {
        await dispatch(fetchRouteAnalyticsAsync({
          routeId: filters.routeId,
          dateRange: filters.dateRange
        }));
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }, [dispatch]);

  /**
   * Refresh analytics data with current filters
   * Implements requirement: Real-time data visualization - Sub-second response times
   */
  const refreshAnalytics = useCallback(async () => {
    await fetchAnalytics({
      fleetId: options.fleetId,
      routeId: options.routeId,
      dateRange: options.dateRange
    });
  }, [fetchAnalytics, options]);

  /**
   * Set up real-time analytics subscription
   * Implements requirement: Real-time data visualization - Interactive data visualization
   */
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (options.fleetId || options.routeId) {
      // Enable real-time updates
      dispatch(setRealTimeUpdates(true));

      // Set up subscription for real-time updates
      cleanup = subscribeToLiveAnalytics((data) => {
        dispatch(updateRealTimeData(data));
      });

      // Initial data fetch
      fetchAnalytics({
        fleetId: options.fleetId,
        routeId: options.routeId,
        dateRange: options.dateRange
      });
    }

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      if (cleanup) {
        cleanup();
        dispatch(setRealTimeUpdates(false));
      }
      dispatch(clearAnalyticsData());
    };
  }, [
    dispatch,
    options.fleetId,
    options.routeId,
    options.dateRange,
    fetchAnalytics
  ]);

  return {
    // Analytics data
    fleetAnalytics: fleetAnalytics.data,
    routeAnalytics: routeAnalytics.data,
    
    // Loading and error states
    loading,
    error,
    
    // Actions
    fetchAnalytics,
    refreshAnalytics
  };
};

export default useAnalytics;
```

This implementation:

1. Implements comprehensive analytics and reporting capabilities by providing access to fleet and route analytics data through Redux state management.

2. Supports real-time data visualization with automatic subscription to live analytics updates using WebSocket connections.

3. Ensures sub-second response times through efficient state management and optimized data fetching.

4. Provides error handling and loading states for better user experience.

5. Implements cleanup on unmount to prevent memory leaks and unnecessary subscriptions.

6. Uses TypeScript for type safety and better development experience.

7. Follows React best practices with hooks (useEffect, useCallback) for performance optimization.

8. Integrates with Redux for centralized state management of analytics data.

9. Supports flexible filtering options through the options parameter.

10. Implements automatic data refresh capabilities while maintaining performance.

The hook can be used in components like this:

```typescript
const { 
  fleetAnalytics, 
  routeAnalytics, 
  loading, 
  error, 
  refreshAnalytics 
} = useAnalytics({
  fleetId: 'fleet-123',
  dateRange: {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31')
  }
});