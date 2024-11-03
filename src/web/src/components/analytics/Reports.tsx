// @mui/material version ^5.0.0
// @mui/x-date-pickers version ^5.0.0
// @mui/icons-material version ^5.0.0
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { FileDownload } from '@mui/icons-material';
import Table from '../common/Table';
import Card from '../common/Card';
import { useAnalytics } from '../../hooks/useAnalytics';

// Human Tasks:
// 1. Configure analytics data refresh intervals in environment variables
// 2. Set up error tracking and monitoring for analytics processing
// 3. Review data export format requirements with business team
// 4. Validate performance metrics with infrastructure team

interface ReportFilters {
  startDate: Date;
  endDate: Date;
  fleetId: string | null;
  routeId: string | null;
}

interface ReportData {
  fleetMetrics: FleetAnalytics[];
  routeMetrics: RouteAnalytics[];
  deliveryStats: DeliveryStats;
}

/**
 * Reports component for analytics dashboard with real-time updates
 * Implements requirements: Analytics and reporting, Real-time data visualization
 */
const Reports: React.FC = () => {
  // State management for filters and report data
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: new Date(),
    fleetId: null,
    routeId: null
  });

  // Initialize analytics hook with filters
  const {
    fleetAnalytics,
    routeAnalytics,
    loading,
    error,
    fetchAnalytics,
    refreshAnalytics
  } = useAnalytics({
    fleetId: filters.fleetId,
    routeId: filters.routeId,
    dateRange: {
      start: filters.startDate,
      end: filters.endDate
    }
  });

  /**
   * Process analytics data into report format
   * Implements requirement: High-performance data handling
   */
  const processReportData = useCallback(
    (fleetData: typeof fleetAnalytics, routeData: typeof routeAnalytics): ReportData => {
      return {
        fleetMetrics: fleetData?.map(fleet => ({
          ...fleet,
          efficiency: (fleet.completedDeliveries / fleet.totalDeliveries) * 100,
          averageDeliveryTime: fleet.totalDeliveryTime / fleet.completedDeliveries
        })) || [],
        routeMetrics: routeData?.map(route => ({
          ...route,
          efficiency: (route.actualDistance / route.plannedDistance) * 100,
          onTimeDeliveryRate: (route.onTimeDeliveries / route.totalDeliveries) * 100
        })) || [],
        deliveryStats: {
          total: fleetData?.reduce((acc, curr) => acc + curr.totalDeliveries, 0) || 0,
          completed: fleetData?.reduce((acc, curr) => acc + curr.completedDeliveries, 0) || 0,
          onTime: routeData?.reduce((acc, curr) => acc + curr.onTimeDeliveries, 0) || 0
        }
      };
    },
    []
  );

  /**
   * Handle filter changes and trigger data refresh
   * Implements requirement: Sub-second response times
   */
  const handleFilterChange = useCallback(async (newFilters: Partial<ReportFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    await fetchAnalytics({
      fleetId: updatedFilters.fleetId,
      routeId: updatedFilters.routeId,
      dateRange: {
        start: updatedFilters.startDate,
        end: updatedFilters.endDate
      }
    });
  }, [filters, fetchAnalytics]);

  /**
   * Export report data to CSV
   * Implements requirement: Analytics and reporting
   */
  const exportReport = useCallback((data: ReportData) => {
    const fleetHeaders = ['Fleet ID', 'Efficiency', 'Completed Deliveries', 'Average Time'];
    const routeHeaders = ['Route ID', 'Efficiency', 'On-Time Rate', 'Distance'];
    
    const fleetRows = data.fleetMetrics.map(fleet => [
      fleet.id,
      `${fleet.efficiency.toFixed(2)}%`,
      fleet.completedDeliveries,
      `${fleet.averageDeliveryTime.toFixed(2)} mins`
    ]);
    
    const routeRows = data.routeMetrics.map(route => [
      route.id,
      `${route.efficiency.toFixed(2)}%`,
      `${route.onTimeDeliveryRate.toFixed(2)}%`,
      `${route.actualDistance.toFixed(2)} km`
    ]);

    const csv = [
      'Fleet Metrics',
      fleetHeaders.join(','),
      ...fleetRows.map(row => row.join(',')),
      '',
      'Route Metrics',
      routeHeaders.join(','),
      ...routeRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fleet-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, []);

  // Process report data
  const reportData = useMemo(() => 
    processReportData(fleetAnalytics, routeAnalytics),
    [fleetAnalytics, routeAnalytics, processReportData]
  );

  // Define table columns for fleet metrics
  const fleetColumns = [
    { id: 'id', label: 'Fleet ID', sortable: true },
    { id: 'efficiency', label: 'Efficiency (%)', sortable: true, format: (value: number) => value.toFixed(2) },
    { id: 'completedDeliveries', label: 'Completed Deliveries', sortable: true },
    { id: 'averageDeliveryTime', label: 'Avg. Delivery Time (mins)', sortable: true, format: (value: number) => value.toFixed(2) }
  ];

  // Define table columns for route metrics
  const routeColumns = [
    { id: 'id', label: 'Route ID', sortable: true },
    { id: 'efficiency', label: 'Route Efficiency (%)', sortable: true, format: (value: number) => value.toFixed(2) },
    { id: 'onTimeDeliveryRate', label: 'On-Time Rate (%)', sortable: true, format: (value: number) => value.toFixed(2) },
    { id: 'actualDistance', label: 'Actual Distance (km)', sortable: true, format: (value: number) => value.toFixed(2) }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Filters Section */}
      <Card
        title="Report Filters"
        actions={
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={() => exportReport(reportData)}
            disabled={loading}
          >
            Export Report
          </Button>
        }
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={(date) => handleFilterChange({ startDate: date || new Date() })}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(date) => handleFilterChange({ endDate: date || new Date() })}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </Card>

      {/* Error Display */}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error loading analytics data: {error}
        </Typography>
      )}

      {/* Fleet Metrics Section */}
      <Card
        title="Fleet Performance Metrics"
        subheader="Efficiency and delivery statistics by fleet"
      >
        <Table
          columns={fleetColumns}
          data={reportData.fleetMetrics}
          defaultSort="efficiency"
          defaultSortDirection="desc"
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      {/* Route Metrics Section */}
      <Card
        title="Route Analytics"
        subheader="Route efficiency and on-time delivery performance"
      >
        <Table
          columns={routeColumns}
          data={reportData.routeMetrics}
          defaultSort="efficiency"
          defaultSortDirection="desc"
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      {/* Delivery Statistics Summary */}
      <Card title="Delivery Statistics Summary">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Total Deliveries</Typography>
            <Typography variant="h4">{reportData.deliveryStats.total}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Completed Deliveries</Typography>
            <Typography variant="h4">{reportData.deliveryStats.completed}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6">On-Time Deliveries</Typography>
            <Typography variant="h4">{reportData.deliveryStats.onTime}</Typography>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default Reports;