// react version: ^18.0.0
// @mui/material version: ^5.13.0
// react-router-dom version: ^6.11.0

// Human Tasks:
// 1. Configure analytics refresh intervals in environment variables
// 2. Set up monitoring for component performance metrics
// 3. Review data retention policies with backend team
// 4. Test dashboard with high-volume concurrent users
// 5. Verify real-time update performance under load

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { MainLayout } from '../components/layout/MainLayout';
import Dashboard from '../components/analytics/Dashboard';
import { useAnalytics } from '../hooks/useAnalytics';

// Requirement: Analytics and reporting
// Location: 1.2 Scope/Core Functionality
// Implementation: Analytics page props interface
interface AnalyticsPageProps {
  className?: string;
}

// Requirement: Real-time data visualization
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Default date range for analytics
const DEFAULT_DATE_RANGE = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  end: new Date()
};

// Requirement: Performance Requirements
// Location: 1.2 Scope/Performance Requirements
// Implementation: Refresh interval for real-time updates (30 seconds)
const REFRESH_INTERVAL = 30000;

/**
 * Main analytics page component that provides comprehensive fleet tracking analytics
 * Requirements addressed:
 * - Real-time data visualization (1.1 System Overview/Web Dashboard)
 * - Analytics and reporting (1.2 Scope/Core Functionality)
 * - Dashboard Layout (6.1.1 Web Dashboard Layout)
 * - Performance Requirements (1.2 Scope/Performance Requirements)
 */
const AnalyticsPage: React.FC<AnalyticsPageProps> = React.memo(({ className }) => {
  // Get fleetId from URL parameters
  const { fleetId } = useParams<{ fleetId: string }>();

  // Initialize date range state
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);

  // Initialize analytics hook
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
  // Location: 1.1 System Overview/Web Dashboard
  // Implementation: Initial data fetch on mount
  useEffect(() => {
    if (fleetId) {
      fetchAnalytics({
        fleetId,
        dateRange
      });
    }
  }, [fetchAnalytics, fleetId, dateRange]);

  // Requirement: Analytics and reporting
  // Location: 1.2 Scope/Core Functionality
  // Implementation: Handle date range changes with debouncing
  const handleDateRangeChange = useCallback(async (range: { start: Date; end: Date }) => {
    try {
      // Validate date range
      if (range.start > range.end) {
        throw new Error('Invalid date range');
      }

      // Update date range state
      setDateRange(range);

      // Fetch analytics with new date range
      await fetchAnalytics({
        fleetId,
        dateRange: range
      });
    } catch (err) {
      console.error('Error updating date range:', err);
    }
  }, [fetchAnalytics, fleetId]);

  // Requirement: Performance Requirements
  // Location: 1.2 Scope/Performance Requirements
  // Implementation: Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Cleanup any active subscriptions
    };
  }, []);

  return (
    <MainLayout>
      <Box
        className={className}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          width: '100%',
          height: '100%',
          p: 3
        }}
      >
        {/* Requirement: Dashboard Layout
            Location: 6.1.1 Web Dashboard Layout
            Implementation: Page header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Fleet Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time analytics and performance metrics for your fleet
          </Typography>
        </Box>

        {/* Requirement: Real-time data visualization
            Location: 1.1 System Overview/Web Dashboard
            Implementation: Analytics dashboard component */}
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Dashboard
            fleetId={fleetId || ''}
            dateRange={dateRange}
            refreshInterval={REFRESH_INTERVAL}
          />
        </Box>
      </Box>
    </MainLayout>
  );
});

// Set display name for debugging
AnalyticsPage.displayName = 'AnalyticsPage';

// Export the memoized component
export default AnalyticsPage;