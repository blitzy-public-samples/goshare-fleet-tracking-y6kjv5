// jest version: ^29.0.0
// @testing-library/react version: ^14.0.0
// socket.io-mock version: ^1.3.2

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'jest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import MockSocket from 'socket.io-mock';
import Dashboard from '../../src/pages/Dashboard';
import { MapContainer } from '../../src/components/map/MapContainer';
import { KPICards } from '../../src/components/analytics/KPICards';

// Mock data for testing
const mockVehicleData = {
  vehicles: [
    {
      id: 'v1',
      name: 'Truck 1',
      location: { latitude: 40.7128, longitude: -74.0060 },
      status: 'active',
      activeRoute: {
        id: 'r1',
        waypoints: [
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 40.7589, longitude: -73.9851 }
        ]
      }
    },
    {
      id: 'v2',
      name: 'Truck 2',
      location: { latitude: 40.7589, longitude: -73.9851 },
      status: 'inactive',
      activeRoute: null
    }
  ]
};

const mockAnalyticsData = {
  utilization: { value: 85.5, change: 2.3, unit: '%' },
  deliveryPerformance: { value: 94.2, change: -1.5, unit: '%' },
  routeEfficiency: { value: 127, change: 5.2, unit: 'km' },
  tripDuration: { value: 4.5, change: -0.3, unit: 'hrs' }
};

const mockSocketEvents = {
  vehicle_location: {
    vehicleId: 'v1',
    location: { latitude: 40.7130, longitude: -74.0062 }
  },
  vehicle_status: {
    vehicleId: 'v1',
    status: 'en_route'
  }
};

// Test utilities
const renderWithProviders = (component: React.ReactElement) => {
  const mockStore = {
    getState: () => ({
      fleet: {
        ...mockVehicleData,
        fleetId: 'f1',
        geofences: []
      }
    }),
    dispatch: jest.fn(),
    subscribe: jest.fn()
  };

  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

const setupMockSocket = () => {
  const socket = new MockSocket();
  const mockSocketHook = {
    socket: socket.socketClient,
    isConnected: true,
    error: null
  };
  
  jest.mock('../../src/hooks/useSocket', () => ({
    useSocket: () => mockSocketHook
  }));

  return socket;
};

const waitForMapLoad = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('map-container')).toBeInTheDocument();
  }, { timeout: 5000 });
};

describe('Dashboard Page', () => {
  let mockSocket: MockSocket;

  beforeAll(() => {
    // Mock Google Maps API
    global.google = {
      maps: {
        Map: jest.fn(),
        Marker: jest.fn(),
        Polyline: jest.fn(),
        Circle: jest.fn(),
        LatLng: jest.fn(),
        MapTypeId: { ROADMAP: 'roadmap' }
      }
    };
  });

  beforeEach(() => {
    mockSocket = setupMockSocket();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete global.google;
  });

  it('should render dashboard layout with all components', async () => {
    renderWithProviders(<Dashboard />);

    // Verify main components are rendered
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-cards')).toBeInTheDocument();
    await waitForMapLoad();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should display error alert when socket connection fails', async () => {
    const mockSocketWithError = {
      socket: null,
      isConnected: false,
      error: 'Connection failed'
    };

    jest.mock('../../src/hooks/useSocket', () => ({
      useSocket: () => mockSocketWithError
    }));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('Attempting to reconnect to real-time updates...')).toBeInTheDocument();
  });
});

describe('Real-time Updates', () => {
  let mockSocket: MockSocket;

  beforeEach(() => {
    mockSocket = setupMockSocket();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update vehicle location on socket event', async () => {
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    // Emit location update event
    mockSocket.emit('vehicle_location', mockSocketEvents.vehicle_location);

    // Verify vehicle marker position is updated
    await waitFor(() => {
      const marker = screen.getByTestId(`vehicle-marker-${mockSocketEvents.vehicle_location.vehicleId}`);
      expect(marker).toHaveAttribute('data-lat', mockSocketEvents.vehicle_location.location.latitude.toString());
      expect(marker).toHaveAttribute('data-lng', mockSocketEvents.vehicle_location.location.longitude.toString());
    });
  });

  it('should update vehicle status on socket event', async () => {
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    // Emit status update event
    mockSocket.emit('vehicle_status', mockSocketEvents.vehicle_status);

    // Verify vehicle status is updated
    await waitFor(() => {
      const statusIndicator = screen.getByTestId(`vehicle-status-${mockSocketEvents.vehicle_status.vehicleId}`);
      expect(statusIndicator).toHaveTextContent(mockSocketEvents.vehicle_status.status);
    });
  });

  it('should maintain 30-second update interval for vehicle locations', async () => {
    jest.useFakeTimers();
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const locationSpy = jest.spyOn(mockSocket, 'emit');

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    expect(locationSpy).toHaveBeenCalledWith('request_location_updates');
    jest.useRealTimers();
  });
});

describe('Map Interaction', () => {
  beforeAll(() => {
    global.google = {
      maps: {
        Map: jest.fn(),
        Marker: jest.fn(),
        Polyline: jest.fn(),
        Circle: jest.fn(),
        LatLng: jest.fn(),
        MapTypeId: { ROADMAP: 'roadmap' }
      }
    };
  });

  afterAll(() => {
    delete global.google;
  });

  it('should select vehicle on marker click', async () => {
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const vehicleMarker = screen.getByTestId('vehicle-marker-v1');
    fireEvent.click(vehicleMarker);

    await waitFor(() => {
      expect(screen.getByTestId('selected-vehicle-info')).toHaveTextContent('Truck 1');
    });
  });

  it('should display active route when vehicle is selected', async () => {
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const vehicleMarker = screen.getByTestId('vehicle-marker-v1');
    fireEvent.click(vehicleMarker);

    await waitFor(() => {
      expect(screen.getByTestId('route-polyline')).toBeInTheDocument();
    });
  });

  it('should create geofence on map interaction', async () => {
    const mockGeofence = {
      id: 'geo1',
      center: { latitude: 40.7128, longitude: -74.0060 },
      radius: 1000
    };

    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const createGeofenceBtn = screen.getByTestId('create-geofence-btn');
    fireEvent.click(createGeofenceBtn);

    // Simulate map click
    fireEvent.click(screen.getByTestId('map-container'), {
      clientX: 100,
      clientY: 100
    });

    await waitFor(() => {
      expect(screen.getByTestId('geofence-circle')).toBeInTheDocument();
    });
  });
});

describe('Analytics Display', () => {
  beforeEach(() => {
    jest.mock('../../src/hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        fleetAnalytics: mockAnalyticsData,
        loading: false,
        error: null,
        fetchAnalytics: jest.fn(),
        refreshAnalytics: jest.fn()
      })
    }));
  });

  it('should display KPI cards with correct metrics', () => {
    renderWithProviders(<Dashboard />);

    // Verify utilization KPI
    expect(screen.getByText('Fleet Utilization')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-indicator-utilization')).toHaveClass('trend-up');

    // Verify delivery performance KPI
    expect(screen.getByText('On-Time Delivery')).toBeInTheDocument();
    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-indicator-delivery')).toHaveClass('trend-down');

    // Verify route efficiency KPI
    expect(screen.getByText('Route Efficiency')).toBeInTheDocument();
    expect(screen.getByText('127 km')).toBeInTheDocument();
    expect(screen.getByTestId('trend-indicator-efficiency')).toHaveClass('trend-up');
  });

  it('should refresh analytics at specified interval', async () => {
    jest.useFakeTimers();
    const refreshAnalytics = jest.fn();

    jest.mock('../../src/hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        fleetAnalytics: mockAnalyticsData,
        loading: false,
        error: null,
        fetchAnalytics: jest.fn(),
        refreshAnalytics
      })
    }));

    renderWithProviders(<Dashboard />);

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    expect(refreshAnalytics).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('should show loading state while fetching analytics', () => {
    jest.mock('../../src/hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        fleetAnalytics: null,
        loading: true,
        error: null,
        fetchAnalytics: jest.fn(),
        refreshAnalytics: jest.fn()
      })
    }));

    renderWithProviders(<Dashboard />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});

describe('Performance Tests', () => {
  it('should load dashboard within sub-second requirement', async () => {
    const startTime = performance.now();
    
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(1000);
  });

  it('should maintain responsive map interactions', async () => {
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const startTime = performance.now();
    
    const vehicleMarker = screen.getByTestId('vehicle-marker-v1');
    fireEvent.click(vehicleMarker);

    const responseTime = performance.now() - startTime;
    expect(responseTime).toBeLessThan(100);
  });

  it('should process real-time updates within latency requirements', async () => {
    const mockSocket = setupMockSocket();
    renderWithProviders(<Dashboard />);
    await waitForMapLoad();

    const startTime = performance.now();
    
    mockSocket.emit('vehicle_location', mockSocketEvents.vehicle_location);
    
    await waitFor(() => {
      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(100);
      
      const marker = screen.getByTestId(`vehicle-marker-${mockSocketEvents.vehicle_location.vehicleId}`);
      expect(marker).toHaveAttribute('data-lat', mockSocketEvents.vehicle_location.location.latitude.toString());
    });
  });
});