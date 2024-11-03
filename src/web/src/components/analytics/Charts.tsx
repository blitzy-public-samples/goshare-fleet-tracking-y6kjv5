// react version: ^18.0.0
// chart.js version: ^4.3.0
// @mui/material version: ^5.13.0

import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Chart } from 'chart.js';
import { useAnalytics } from '../../hooks/useAnalytics';
import Loading from '../common/Loading';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Human Tasks:
// 1. Configure Chart.js performance settings in production
// 2. Review analytics data refresh intervals with backend team
// 3. Set up monitoring for chart rendering performance
// 4. Verify browser compatibility for Chart.js animations

interface ChartProps {
  fleetId?: string;
  routeId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Requirement: Real-time data visualization
// Implementation: High-performance React component for analytics visualization
const Charts: React.FC<ChartProps> = React.memo(({ fleetId, routeId, dateRange }) => {
  // Chart references for performance optimization
  const fleetPerformanceRef = useRef<HTMLCanvasElement>(null);
  const routeEfficiencyRef = useRef<HTMLCanvasElement>(null);
  const deliveryMetricsRef = useRef<HTMLCanvasElement>(null);

  // Initialize analytics hook with filters
  const {
    fleetAnalytics,
    routeAnalytics,
    loading,
    error,
    refreshAnalytics
  } = useAnalytics({ fleetId, routeId, dateRange });

  // Requirement: Performance Requirements - Sub-second response times
  // Implementation: Optimized chart rendering with useMemo
  const chartOptions: ChartOptions<'line' | 'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 150 // Fast animations for real-time updates
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top' as const
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }), []);

  // Requirement: Real-time data visualization
  // Implementation: Fleet performance metrics chart
  const renderFleetPerformanceChart = (analytics: any) => {
    if (!fleetPerformanceRef.current) return;

    const data: ChartData<'line'> = {
      labels: analytics.timestamps,
      datasets: [
        {
          label: 'On-Time Deliveries',
          data: analytics.onTimeDeliveries,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'Fleet Utilization',
          data: analytics.fleetUtilization,
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1
        }
      ]
    };

    new Chart(fleetPerformanceRef.current, {
      type: 'line',
      data,
      options: chartOptions
    });
  };

  // Requirement: Analytics and reporting
  // Implementation: Route efficiency metrics visualization
  const renderRouteEfficiencyChart = (analytics: any) => {
    if (!routeEfficiencyRef.current) return;

    const data: ChartData<'bar'> = {
      labels: analytics.routes,
      datasets: [
        {
          label: 'Route Efficiency Score',
          data: analytics.efficiencyScores,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        },
        {
          label: 'Fuel Efficiency',
          data: analytics.fuelEfficiency,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }
      ]
    };

    new Chart(routeEfficiencyRef.current, {
      type: 'bar',
      data,
      options: chartOptions
    });
  };

  // Requirement: Analytics and reporting
  // Implementation: Delivery metrics visualization
  const renderDeliveryMetricsChart = (analytics: any) => {
    if (!deliveryMetricsRef.current) return;

    const data: ChartData<'line'> = {
      labels: analytics.timestamps,
      datasets: [
        {
          label: 'Delivery Success Rate',
          data: analytics.successRate,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'Average Delivery Time',
          data: analytics.avgDeliveryTime,
          borderColor: 'rgb(153, 102, 255)',
          tension: 0.1
        }
      ]
    };

    new Chart(deliveryMetricsRef.current, {
      type: 'line',
      data,
      options: chartOptions
    });
  };

  // Requirement: Real-time data visualization
  // Implementation: Auto-refresh analytics data
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshAnalytics();
    }, 30000); // 30-second refresh interval

    return () => clearInterval(refreshInterval);
  }, [refreshAnalytics]);

  // Requirement: Real-time data visualization
  // Implementation: Render charts when data is available
  useEffect(() => {
    if (fleetAnalytics) {
      renderFleetPerformanceChart(fleetAnalytics);
      renderDeliveryMetricsChart(fleetAnalytics);
    }
    if (routeAnalytics) {
      renderRouteEfficiencyChart(routeAnalytics);
    }
  }, [fleetAnalytics, routeAnalytics]);

  if (loading) {
    return <Loading size={50} overlay={false} />;
  }

  if (error) {
    return (
      <Box p={3} textAlign="center" color="error.main">
        Error loading analytics: {error}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ height: 400, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <canvas ref={fleetPerformanceRef} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ height: 400, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <canvas ref={routeEfficiencyRef} />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ height: 400, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <canvas ref={deliveryMetricsRef} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
});

Charts.displayName = 'Charts';

export default Charts;