// react version: ^18.0.0
// @mui/material version: ^5.13.0

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Grid, Alert } from '@mui/material';
import { Charts } from './Charts';
import { KPICards } from './KPICards';
import { useAnalytics } from '../../hooks/useAnalytics';

// Human Tasks:
// 1. Configure analytics refresh intervals in environment variables
// 2. Set up monitoring for component rendering performance
// 3. Review data caching strategy with backend team
// 4. Validate analytics data retention policies
// 5. Test dashboard with high-frequency updates

interface DashboardProps {
  className?: string;
  style?: React.CSSProperties;
  fleetId: string;
  dateRange: { start: Date; end: Date };
  refreshInterval?: number;
}

/**
 * Main analytics dashboard component that provides comprehensive fleet tracking metrics
 * Requirements addressed:
 * - Real-time data visualization (1.1 System Overview/Web Dashboard)
 * - Analytics and reporting (1.2 Scope/Core Functionality)
 * - Dashboard Layout (6.1.1 Web Dashboard Layout)
 * - Performance Requirements (1.2 Scope/Performance Requirements)
 */
const Dashboard: React.FC<DashboardProps> = React.memo(({
  className,
  style,
  fleetId,
  dateRange,
  refreshInterval = 30000 // Default 30s refresh interval
}) => {
  // Track refresh cooldown to prevent rapid manual refreshes
  const [refreshCooldown, setRefreshCooldown] = useState<boolean>(false);

  // Initialize analytics hook with filters
  const {
    fleetAnalytics,
    routeAnalytics,
    loading,
    error,
    fetchAnalytics,
    refreshAnalytics
  } = useAnalytics({
    fleetId,
    dateRange
  });

  // Requirement: Real-time data visualization
  // Implementation: Initial data fetch on mount and when filters change
  useEffect(() => {
    fetchAnalytics({
      fleetId,
      dateRange
    });
  }, [fetchAnalytics, fleetId, dateRange]);

  // Requirement: Real-time data visualization
  // Implementation: Set up automatic refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshAnalytics, refreshInterval]);

  // Requirement: Performance Requirements - Sub-second response times
  // Implementation: Debounced manual refresh handler
  const handleRefresh = useCallback(async () => {
    if (refreshCooldown) return;

    try {
      setRefreshCooldown(true);
      await refreshAnalytics();
    } catch (err) {
      console.error('Error refreshing analytics:', err);
    } finally {
      // Reset cooldown after 5 seconds
      setTimeout(() => setRefreshCooldown(false), 5000);
    }
  }, [refreshAnalytics, refreshCooldown]);

  // Requirement: Analytics and reporting
  // Implementation: Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      // Any cleanup needed for analytics subscriptions
    };
  }, []);

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        p: 3,
        ...style
      }}
    >
      {/* Error handling */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
        >
          Error loading analytics: {error}
        </Alert>
      )}

      {/* Requirement: Real-time data visualization */}
      {/* Implementation: KPI metrics section */}
      <Box>
        <KPICards
          fleetId={fleetId}
          dateRange={dateRange}
          refreshInterval={refreshInterval}
        />
      </Box>

      {/* Requirement: Analytics and reporting */}
      {/* Implementation: Analytics charts section */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Charts
              fleetId={fleetId}
              dateRange={dateRange}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
});

// Set display name for debugging
Dashboard.displayName = 'Dashboard';

// Export the memoized component
export default Dashboard;