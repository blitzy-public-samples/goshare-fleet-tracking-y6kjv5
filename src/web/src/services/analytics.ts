// chart.js version ^4.3.0
// lodash version ^4.17.21
import { Chart, ChartConfiguration } from 'chart.js';
import { groupBy, sumBy, meanBy } from 'lodash';
import { apiClient, handleApiError } from '../config/api';
import { createSocketClient } from '../config/socket';
import { Vehicle, Route, Delivery } from '../types';
import { getDateRangeForAnalytics, formatDateTime } from '../utils/date';

// Human Tasks:
// 1. Configure Chart.js plugins and themes according to UI requirements
// 2. Set up monitoring alerts for analytics processing delays
// 3. Review data aggregation thresholds with infrastructure team
// 4. Verify real-time analytics update intervals with stakeholders

/**
 * Interface for fleet analytics data including KPIs and metrics
 * Implements requirement: Analytics and reporting
 */
interface FleetAnalytics {
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
}

/**
 * Interface for route-specific analytics data
 * Implements requirement: Real-time data visualization
 */
interface RouteAnalytics {
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
}

/**
 * Interface for analytics report parameters
 * Implements requirement: Analytics and reporting
 */
interface ReportParams {
  dateRange: string;
  fleetIds?: string[];
  metrics: string[];
  format: 'pdf' | 'csv' | 'json';
}

/**
 * Interface for analytics report data
 * Implements requirement: Analytics and reporting
 */
interface AnalyticsReport {
  summary: {
    period: string;
    generatedAt: string;
    metrics: Record<string, number>;
  };
  charts: ChartConfiguration[];
  data: Record<string, any>;
}

/**
 * Retrieves fleet-wide analytics data including vehicle utilization and delivery metrics
 * Implements requirement: Analytics and reporting - Comprehensive analytics capabilities
 */
export const fetchFleetAnalytics = async (
  dateRange: string,
  fleetId: string
): Promise<FleetAnalytics> => {
  try {
    const { startDate, endDate } = getDateRangeForAnalytics(dateRange);

    const response = await apiClient.get('/analytics/fleet', {
      params: {
        fleetId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    // Process and format analytics data
    const { vehicles, deliveries, routes } = response.data;

    // Calculate vehicle utilization
    const vehicleUtilization = calculateVehicleUtilization(vehicles);

    // Process delivery performance metrics
    const deliveryPerformance = processDeliveryPerformance(deliveries);

    // Calculate route efficiency metrics
    const routeEfficiency = calculateRouteEfficiency(routes);

    // Generate KPIs
    const kpis = generateFleetKPIs(deliveries, routes);

    return {
      vehicleUtilization,
      deliveryPerformance,
      routeEfficiency,
      kpis
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Retrieves analytics data for specific routes including completion rates and efficiency metrics
 * Implements requirement: Real-time data visualization - Interactive data visualization
 */
export const fetchRouteAnalytics = async (
  routeId: string,
  dateRange: string
): Promise<RouteAnalytics> => {
  try {
    const { startDate, endDate } = getDateRangeForAnalytics(dateRange);

    const response = await apiClient.get(`/analytics/routes/${routeId}`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

    const { deliveries, timestamps, distances } = response.data;

    // Calculate completion rate
    const completionRate = calculateCompletionRate(deliveries);

    // Process delay metrics
    const delayMetrics = processDelayMetrics(deliveries, timestamps);

    // Calculate efficiency metrics
    const efficiency = calculateRouteEfficiencyMetrics(distances, timestamps);

    return {
      completionRate,
      delayMetrics,
      efficiency
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Generates comprehensive analytics reports with visualizations
 * Implements requirement: Analytics and reporting - Report generation
 */
export const generateAnalyticsReport = async (
  reportParams: ReportParams
): Promise<AnalyticsReport> => {
  try {
    const { startDate, endDate } = getDateRangeForAnalytics(reportParams.dateRange);

    // Fetch required analytics data
    const response = await apiClient.post('/analytics/reports', {
      ...reportParams,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const { metrics, chartData } = response.data;

    // Generate charts using Chart.js
    const charts = generateCharts(chartData);

    // Format report data
    const report: AnalyticsReport = {
      summary: {
        period: `${formatDateTime(startDate, 'PPP')} - ${formatDateTime(endDate, 'PPP')}`,
        generatedAt: formatDateTime(new Date(), 'PPP pp'),
        metrics: processMetrics(metrics)
      },
      charts,
      data: response.data
    };

    return report;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Sets up real-time subscription for live analytics updates
 * Implements requirement: Real-time data visualization - Sub-second response times
 */
export const subscribeToLiveAnalytics = (
  callback: (data: any) => void
): (() => void) => {
  const socket = createSocketClient(localStorage.getItem('auth_token') || '');

  // Subscribe to analytics events
  socket.on('analytics:update', (data) => {
    callback(data);
  });

  // Set up error handling
  socket.on('error', (error) => {
    console.error('Analytics socket error:', error);
    // Attempt to reconnect
    socket.connect();
  });

  // Return cleanup function
  return () => {
    socket.off('analytics:update');
    socket.disconnect();
  };
};

// Helper functions for analytics calculations

/**
 * Calculates vehicle utilization metrics
 */
const calculateVehicleUtilization = (vehicles: Vehicle[]): number => {
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  return (activeVehicles / vehicles.length) * 100;
};

/**
 * Processes delivery performance metrics
 */
const processDeliveryPerformance = (deliveries: Delivery[]) => {
  const grouped = groupBy(deliveries, 'status');
  const total = deliveries.length;

  return {
    onTime: ((grouped['completed']?.length || 0) / total) * 100,
    delayed: ((grouped['delayed']?.length || 0) / total) * 100,
    failed: ((grouped['failed']?.length || 0) / total) * 100
  };
};

/**
 * Calculates route efficiency metrics
 */
const calculateRouteEfficiency = (routes: Route[]) => {
  return {
    plannedVsActual: calculatePlannedVsActual(routes),
    fuelEfficiency: calculateFuelEfficiency(routes),
    timeEfficiency: calculateTimeEfficiency(routes)
  };
};

/**
 * Generates fleet-wide KPIs
 */
const generateFleetKPIs = (deliveries: Delivery[], routes: Route[]) => {
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');
  const totalHours = sumBy(routes, r => 
    (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3600000
  );

  return {
    deliveriesPerHour: completedDeliveries.length / totalHours,
    averageDeliveryTime: meanBy(completedDeliveries, d => 
      new Date(d.completedTime).getTime() - new Date(d.scheduledTime).getTime()
    ) / 60000, // Convert to minutes
    successRate: (completedDeliveries.length / deliveries.length) * 100
  };
};

/**
 * Generates Chart.js configurations for analytics visualizations
 */
const generateCharts = (chartData: any[]): ChartConfiguration[] => {
  return chartData.map(data => ({
    type: data.type,
    data: {
      labels: data.labels,
      datasets: data.datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        title: {
          display: true,
          text: data.title
        }
      }
    }
  }));
};

/**
 * Calculates planned vs actual route metrics
 */
const calculatePlannedVsActual = (routes: Route[]): number => {
  const plannedTotal = routes.length;
  const completedAsPlanned = routes.filter(r => 
    new Date(r.endTime).getTime() <= new Date(r.startTime).getTime() + 3600000
  ).length;
  return (completedAsPlanned / plannedTotal) * 100;
};

/**
 * Calculates fuel efficiency metrics
 */
const calculateFuelEfficiency = (routes: Route[]): number => {
  // Implementation depends on vehicle telemetry data
  return 0;
};

/**
 * Calculates time efficiency metrics
 */
const calculateTimeEfficiency = (routes: Route[]): number => {
  const actualTimes = routes.map(r => 
    new Date(r.endTime).getTime() - new Date(r.startTime).getTime()
  );
  const averageTime = meanBy(actualTimes);
  return averageTime / 3600000; // Convert to hours
};