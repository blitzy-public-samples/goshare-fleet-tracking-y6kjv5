// @mui/material version: ^5.14.0
// @mui/icons-material version: ^5.14.0
// react version: ^18.0.0

import React, { useEffect, useCallback } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import Card from '../common/Card';
import Loading from '../common/Loading';
import { useAnalytics } from '../../hooks/useAnalytics';

// Human Tasks:
// 1. Configure analytics refresh intervals in environment variables
// 2. Verify Material-UI theme configuration for consistent styling
// 3. Test performance with high-frequency updates
// 4. Validate accessibility features with screen readers

/**
 * Interface for KPI card component props
 * Requirement: Analytics and reporting - Display of real-time KPIs
 */
interface KPICardsProps {
  dateRange: { start: Date; end: Date };
  fleetId: string;
  refreshInterval?: number;
}

/**
 * Interface for KPI metric data structure
 * Requirement: Real-time data visualization - Interactive data visualization
 */
interface KPIMetric {
  value: number;
  change: number;
  unit: string;
}

/**
 * Formats numeric metrics with appropriate units and precision
 * Requirement: Analytics and reporting - Display of real-time KPIs
 */
const formatMetric = (value: number, unit: string): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  // Format based on unit type
  switch (unit) {
    case '%':
      return `${value.toFixed(1)}%`;
    case 'hrs':
      return `${value.toFixed(1)} hrs`;
    case 'km':
      return `${value.toFixed(0)} km`;
    default:
      return value.toFixed(0);
  }
};

/**
 * Renders trend indicator icon based on metric change
 * Requirement: Real-time data visualization - Interactive data visualization
 */
const renderTrendIndicator = (change: number): JSX.Element => {
  const color = change >= 0 ? '#4caf50' : '#f44336';
  
  return change >= 0 ? (
    <TrendingUp sx={{ color, marginLeft: 1 }} />
  ) : (
    <TrendingDown sx={{ color, marginLeft: 1 }} />
  );
};

/**
 * KPI Cards component for displaying real-time fleet metrics
 * Requirements:
 * - Analytics and reporting - Display of real-time KPIs
 * - Real-time data visualization - Interactive data visualization
 * - Performance Requirements - Sub-second response times
 */
const KPICards: React.FC<KPICardsProps> = ({
  dateRange,
  fleetId,
  refreshInterval = 30000
}) => {
  // Get analytics data and state from custom hook
  const {
    fleetAnalytics,
    loading,
    error,
    fetchAnalytics,
    refreshAnalytics
  } = useAnalytics({
    fleetId,
    dateRange
  });

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics({ fleetId, dateRange });
  }, [fetchAnalytics, fleetId, dateRange]);

  // Set up refresh interval for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshAnalytics, refreshInterval]);

  // Show loading state
  if (loading && !fleetAnalytics) {
    return <Loading size={40} color="primary" />;
  }

  // Show error state
  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">
          Error loading analytics: {error}
        </Typography>
      </Box>
    );
  }

  // Render KPI cards grid
  return (
    <Grid container spacing={3}>
      {/* Fleet Utilization KPI */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          title="Fleet Utilization"
          subheader="Active vehicles"
          elevation={2}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">
              {formatMetric(fleetAnalytics?.utilization?.value || 0, '%')}
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography
                color={fleetAnalytics?.utilization?.change >= 0 ? 'success' : 'error'}
                variant="body2"
              >
                {formatMetric(Math.abs(fleetAnalytics?.utilization?.change || 0), '%')}
              </Typography>
              {renderTrendIndicator(fleetAnalytics?.utilization?.change || 0)}
            </Box>
          </Box>
        </Card>
      </Grid>

      {/* Delivery Performance KPI */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          title="On-Time Delivery"
          subheader="Last 24 hours"
          elevation={2}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">
              {formatMetric(fleetAnalytics?.deliveryPerformance?.value || 0, '%')}
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography
                color={fleetAnalytics?.deliveryPerformance?.change >= 0 ? 'success' : 'error'}
                variant="body2"
              >
                {formatMetric(Math.abs(fleetAnalytics?.deliveryPerformance?.change || 0), '%')}
              </Typography>
              {renderTrendIndicator(fleetAnalytics?.deliveryPerformance?.change || 0)}
            </Box>
          </Box>
        </Card>
      </Grid>

      {/* Route Efficiency KPI */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          title="Route Efficiency"
          subheader="Average distance"
          elevation={2}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">
              {formatMetric(fleetAnalytics?.routeEfficiency?.value || 0, 'km')}
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography
                color={fleetAnalytics?.routeEfficiency?.change >= 0 ? 'success' : 'error'}
                variant="body2"
              >
                {formatMetric(Math.abs(fleetAnalytics?.routeEfficiency?.change || 0), '%')}
              </Typography>
              {renderTrendIndicator(fleetAnalytics?.routeEfficiency?.change || 0)}
            </Box>
          </Box>
        </Card>
      </Grid>

      {/* Average Trip Duration KPI */}
      <Grid item xs={12} sm={6} md={3}>
        <Card
          title="Trip Duration"
          subheader="Average time"
          elevation={2}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">
              {formatMetric(fleetAnalytics?.tripDuration?.value || 0, 'hrs')}
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography
                color={fleetAnalytics?.tripDuration?.change >= 0 ? 'success' : 'error'}
                variant="body2"
              >
                {formatMetric(Math.abs(fleetAnalytics?.tripDuration?.change || 0), '%')}
              </Typography>
              {renderTrendIndicator(fleetAnalytics?.tripDuration?.change || 0)}
            </Box>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
};

export default KPICards;