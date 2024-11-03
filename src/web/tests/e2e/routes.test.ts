// @jest/globals version ^29.0.0
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
// @testing-library/react version ^14.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// @testing-library/user-event version ^14.0.0
import userEvent from '@testing-library/user-event';
// react-redux version ^8.0.5
import { Provider } from 'react-redux';
import { store } from '../../src/store';
import { getVehicles, createRoute, updateDeliveryStatus, LOCATION_UPDATE_INTERVAL } from '../../src/services/api';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import RoutesPage from '../../src/pages/Routes';

// Mock API services
jest.mock('../../src/services/api', () => ({
  getVehicles: jest.fn(),
  createRoute: jest.fn(),
  updateDeliveryStatus: jest.fn(),
  LOCATION_UPDATE_INTERVAL: 30000
}));

// Mock Google Maps components
jest.mock('@react-google-maps/api', () => ({
  GoogleMap: jest.fn(({ children }) => <div data-testid="google-map">{children}</div>),
  Marker: jest.fn(() => <div data-testid="map-marker" />),
  Polyline: jest.fn(() => <div data-testid="route-polyline" />)
}));

describe('Routes Page', () => {
  // Test data
  const mockVehicles = [
    {
      id: 'v1',
      name: 'Truck 1',
      location: { lat: 40.7128, lng: -74.0060 },
      status: 'ACTIVE'
    },
    {
      id: 'v2',
      name: 'Truck 2',
      location: { lat: 40.7589, lng: -73.9851 },
      status: 'ACTIVE'
    }
  ];

  const mockRoute = {
    id: 'r1',
    vehicleId: 'v1',
    deliveries: [
      { id: 'd1', status: 'PENDING', location: { lat: 40.7300, lng: -73.9950 } },
      { id: 'd2', status: 'PENDING', location: { lat: 40.7400, lng: -73.9850 } }
    ],
    optimized: true
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful API responses
    (getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
    (createRoute as jest.Mock).mockResolvedValue(mockRoute);
    (updateDeliveryStatus as jest.Mock).mockImplementation((id, status) => 
      Promise.resolve({ id, status })
    );

    // Render component with Redux Provider
    render(
      <Provider store={store}>
        <RoutesPage />
      </Provider>
    );
  });

  afterEach(() => {
    // Clean up after each test
    jest.useRealTimers();
  });

  test('should display route list with real-time updates', async () => {
    // Test requirement: Real-time data synchronization with 30-second intervals
    jest.useFakeTimers();

    // Initial load
    await waitFor(() => {
      expect(getVehicles).toHaveBeenCalled();
    });

    // Verify vehicles are displayed
    expect(screen.getByText('Truck 1')).toBeInTheDocument();
    expect(screen.getByText('Truck 2')).toBeInTheDocument();

    // Verify 30-second update interval
    jest.advanceTimersByTime(LOCATION_UPDATE_INTERVAL);
    expect(getVehicles).toHaveBeenCalledTimes(2);

    // Verify map markers are rendered
    expect(screen.getAllByTestId('map-marker')).toHaveLength(2);
  });

  test('should create new route with optimization', async () => {
    // Test requirement: Route optimization and planning
    const user = userEvent.setup();

    // Click create route button
    await user.click(screen.getByText('Create Route'));

    // Fill route creation form
    await user.selectOptions(screen.getByLabelText('Vehicle'), 'v1');
    await user.click(screen.getByText('Optimize Route'));

    // Submit form
    await user.click(screen.getByText('Save Route'));

    // Verify API call
    expect(createRoute).toHaveBeenCalledWith({
      vehicleId: 'v1',
      deliveries: expect.any(Array),
      optimize: true
    });

    // Verify new route appears in list
    await waitFor(() => {
      expect(screen.getByText(`Route ${mockRoute.id}`)).toBeInTheDocument();
    });
  });

  test('should optimize route and display on map', async () => {
    // Test requirement: Interactive mapping with Google Maps integration
    const user = userEvent.setup();

    // Select existing route
    await user.click(screen.getByText(`Route ${mockRoute.id}`));

    // Click optimize button
    await user.click(screen.getByText('Optimize Route'));

    // Verify map updates
    await waitFor(() => {
      expect(screen.getByTestId('route-polyline')).toBeInTheDocument();
      expect(screen.getAllByTestId('map-marker')).toHaveLength(
        mockRoute.deliveries.length + 1 // deliveries + vehicle
      );
    });

    // Verify optimization results
    expect(screen.getByText('Route Optimized')).toBeInTheDocument();
  });

  test('should update delivery status with validation', async () => {
    // Test requirement: Real-time delivery status updates
    const user = userEvent.setup();

    // Select delivery from route
    await user.click(screen.getByText(`Route ${mockRoute.id}`));
    await user.click(screen.getByText(`Delivery ${mockRoute.deliveries[0].id}`));

    // Update status
    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await user.click(screen.getByText('Update Status'));

    // Verify API call
    expect(updateDeliveryStatus).toHaveBeenCalledWith(
      mockRoute.deliveries[0].id,
      'IN_PROGRESS'
    );

    // Verify status update in UI
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  test('should display route on interactive map', async () => {
    // Test requirement: Interactive mapping with route visualization
    const user = userEvent.setup();

    // Select route to display
    await user.click(screen.getByText(`Route ${mockRoute.id}`));

    // Verify map components
    await waitFor(() => {
      // Verify map is rendered
      expect(screen.getByTestId('google-map')).toBeInTheDocument();

      // Verify route polyline
      expect(screen.getByTestId('route-polyline')).toBeInTheDocument();

      // Verify markers for vehicle and deliveries
      const markers = screen.getAllByTestId('map-marker');
      expect(markers).toHaveLength(mockRoute.deliveries.length + 1);
    });

    // Verify map centers on route
    expect(GoogleMap).toHaveBeenCalledWith(
      expect.objectContaining({
        center: expect.any(Object),
        zoom: expect.any(Number)
      }),
      expect.any(Object)
    );
  });
});