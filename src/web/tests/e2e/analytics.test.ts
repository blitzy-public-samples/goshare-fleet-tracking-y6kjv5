// @testing-library/react version: ^14.0.0
// @testing-library/user-event version: ^14.0.0
// jest version: ^29.0.0

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../../src/components/analytics/Dashboard';
import { useAnalytics } from '../../src/hooks/useAnalytics';
import analyticsReducer from '../../src/store/slices/analyticsSlice';

// Human Tasks:
// 1. Configure test data retention in CI/CD pipeline
// 2. Set up performance monitoring for test execution
// 3. Review WebSocket mock configurations with team
// 4. Validate test coverage thresholds
// 5. Set up automated performance regression testing

// Mock Redux store
const createTestStore = () => configureStore({
  reducer: {
    analytics: analyticsReducer
  }
});

// Mock analytics service responses
const mockFleetAnalytics = {
  totalVehicles: 150,
  activeVehicles: 120,
  totalDeliveries: 1500,
  onTimeDeliveryRate: 95.5,
  fuelEfficiency: 8.2,
  averageSpeed: 45.3,
  performanceScore: 92
};

const mockRouteAnalytics = {
  totalRoutes: 85,
  completedRoutes: 72,
  averageRouteTime: 185,
  routeEfficiencyScore: 88,
  delayedRoutes: 5,
  fuelConsumption: 1250.5
};

// Mock WebSocket for real-time updates
const mockWebSocket = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

// Mock analytics hook
jest.mock('../../src/hooks/useAnalytics', () => ({
  useAnalytics: jest.fn()
}));

describe('Analytics Dashboard', () => {
  // Test setup configuration
  const mockDate = new Date('2024-01-15T10:00:00Z');
  const defaultProps = {
    fleetId: 'fleet-123',
    dateRange: {
      start: new Date(mockDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: mockDate
    },
    refreshInterval: 30000
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock performance API
    window.performance.mark = jest.fn();
    window.performance.measure = jest.fn();

    // Configure mock analytics hook response
    (useAnalytics as jest.Mock).mockImplementation(() => ({
      fleetAnalytics: mockFleetAnalytics,
      routeAnalytics: mockRouteAnalytics,
      loading: false,
      error: null,
      fetchAnalytics: jest.fn(),
      refreshAnalytics: jest.fn()
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test: Initial rendering of analytics dashboard
   * Requirement: Real-time data visualization (1.1 System Overview/Web Dashboard)
   */
  it('should render analytics dashboard with performance metrics', async () => {
    // Start performance measurement
    performance.mark('render-start');

    const store = createTestStore();
    render(
      <Provider store={store}>
        <Dashboard {...defaultProps} />
      </Provider>
    );

    // Verify KPI cards are rendered
    await waitFor(() => {
      expect(screen.getByText('Total Vehicles')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Active Vehicles')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    // Verify charts are rendered
    await waitFor(() => {
      expect(screen.getByTestId('analytics-charts')).toBeInTheDocument();
    });

    // Measure render time
    performance.mark('render-end');
    performance.measure('render-time', 'render-start', 'render-end');
    
    // Assert render time is under 1 second
    const measurements = performance.getEntriesByName('render-time');
    expect(measurements[0].duration).toBeLessThan(1000);
  });

  /**
   * Test: Data fetching and display functionality
   * Requirements: Analytics and reporting (1.2 Scope/Core Functionality)
   */
  it('should fetch and display analytics data with response time validation', async () => {
    const store = createTestStore();
    const fetchAnalytics = jest.fn();
    
    // Mock analytics hook with custom fetch function
    (useAnalytics as jest.Mock).mockImplementation(() => ({
      fleetAnalytics: mockFleetAnalytics,
      routeAnalytics: mockRouteAnalytics,
      loading: false,
      error: null,
      fetchAnalytics,
      refreshAnalytics: jest.fn()
    }));

    // Start response time measurement
    performance.mark('fetch-start');

    render(
      <Provider store={store}>
        <Dashboard {...defaultProps} />
      </Provider>
    );

    // Verify data fetch was called
    expect(fetchAnalytics).toHaveBeenCalledWith({
      fleetId: defaultProps.fleetId,
      dateRange: defaultProps.dateRange
    });

    // Verify data display
    await waitFor(() => {
      expect(screen.getByText('95.5%')).toBeInTheDocument(); // On-time delivery rate
      expect(screen.getByText('92')).toBeInTheDocument(); // Performance score
    });

    // Measure response time
    performance.mark('fetch-end');
    performance.measure('fetch-time', 'fetch-start', 'fetch-end');
    
    // Assert response time under 1 second
    const measurements = performance.getEntriesByName('fetch-time');
    expect(measurements[0].duration).toBeLessThan(1000);
  });

  /**
   * Test: Real-time updates functionality
   * Requirements: Real-time data visualization, Performance Requirements
   */
  it('should handle real-time updates with latency validation', async () => {
    const store = createTestStore();
    const refreshAnalytics = jest.fn();
    
    // Mock analytics hook with real-time updates
    (useAnalytics as jest.Mock).mockImplementation(() => ({
      fleetAnalytics: mockFleetAnalytics,
      routeAnalytics: mockRouteAnalytics,
      loading: false,
      error: null,
      fetchAnalytics: jest.fn(),
      refreshAnalytics
    }));

    render(
      <Provider store={store}>
        <Dashboard {...defaultProps} />
      </Provider>
    );

    // Simulate real-time update
    performance.mark('update-start');
    
    // Fast-forward timers to trigger refresh
    jest.advanceTimersByTime(defaultProps.refreshInterval);

    // Verify refresh was called
    expect(refreshAnalytics).toHaveBeenCalled();

    // Update mock data to simulate real-time change
    (useAnalytics as jest.Mock).mockImplementation(() => ({
      fleetAnalytics: { ...mockFleetAnalytics, activeVehicles: 125 },
      routeAnalytics: mockRouteAnalytics,
      loading: false,
      error: null,
      fetchAnalytics: jest.fn(),
      refreshAnalytics
    }));

    // Verify updated data is displayed
    await waitFor(() => {
      expect(screen.getByText('125')).toBeInTheDocument(); // Updated active vehicles
    });

    // Measure update latency
    performance.mark('update-end');
    performance.measure('update-time', 'update-start', 'update-end');
    
    // Assert update latency under 100ms
    const measurements = performance.getEntriesByName('update-time');
    expect(measurements[0].duration).toBeLessThan(100);
  });

  /**
   * Test: Error handling in analytics dashboard
   * Requirements: Analytics and reporting, System reliability
   */
  it('should handle error states appropriately', async () => {
    const store = createTestStore();
    const testError = 'Failed to fetch analytics data';
    
    // Mock analytics hook with error state
    (useAnalytics as jest.Mock).mockImplementation(() => ({
      fleetAnalytics: null,
      routeAnalytics: null,
      loading: false,
      error: testError,
      fetchAnalytics: jest.fn(),
      refreshAnalytics: jest.fn()
    }));

    render(
      <Provider store={store}>
        <Dashboard {...defaultProps} />
      </Provider>
    );

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(`Error loading analytics: ${testError}`)).toBeInTheDocument();
    });

    // Simulate retry action
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    // Verify retry attempt
    expect(useAnalytics().fetchAnalytics).toHaveBeenCalled();
  });
});