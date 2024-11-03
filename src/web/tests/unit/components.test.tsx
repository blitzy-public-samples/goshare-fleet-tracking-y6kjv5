// @testing-library/react version ^13.0.0
// @testing-library/jest-dom version ^5.16.0
// jest version ^29.0.0
// @material-ui/core version ^4.12.0

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import '@testing-library/jest-dom';
import { CustomButton } from '../../src/components/common/Button';
import Card from '../../src/components/common/Card';
import MapContainer from '../../src/components/map/MapContainer';
import { createTheme } from '@material-ui/core/styles';

// Mock Google Maps API
const mockGoogleMaps = {
  Map: jest.fn().mockImplementation(() => ({
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    addListener: jest.fn()
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setPosition: jest.fn(),
    setMap: jest.fn(),
    addListener: jest.fn()
  })),
  Polyline: jest.fn().mockImplementation(() => ({
    setPath: jest.fn(),
    setMap: jest.fn()
  })),
  Circle: jest.fn().mockImplementation(() => ({
    setCenter: jest.fn(),
    setRadius: jest.fn(),
    setMap: jest.fn()
  })),
  LatLng: jest.fn().mockImplementation((lat, lng) => ({ lat: () => lat, lng: () => lng })),
  MapTypeId: { ROADMAP: 'roadmap' }
};

// Mock vehicle data
const mockVehicleData = [
  {
    id: 'v1',
    location: { latitude: 40.7128, longitude: -74.0060 },
    status: 'active',
    lastUpdate: new Date().toISOString()
  }
];

// Mock route data
const mockRouteData = {
  id: 'r1',
  waypoints: [
    { latitude: 40.7128, longitude: -74.0060 },
    { latitude: 40.7589, longitude: -73.9851 }
  ],
  status: 'in_progress'
};

// Create Material-UI theme for tests
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
      contrastText: '#fff'
    },
    secondary: {
      main: '#dc004e',
      dark: '#9a0036',
      contrastText: '#fff'
    },
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)'
    }
  },
  spacing: (factor: number) => `${0.25 * factor}rem`
});

// Utility function to render components with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock map instance for testing
const mockMapInstance = () => {
  (global as any).google = {
    maps: mockGoogleMaps
  };
  return mockGoogleMaps.Map;
};

describe('Button Component', () => {
  // Test button rendering with variants
  test('renders button with primary variant correctly', () => {
    const { getByRole } = renderWithTheme(
      <CustomButton variant="primary">Primary Button</CustomButton>
    );
    const button = getByRole('button');
    expect(button).toHaveTextContent('Primary Button');
    expect(button).toHaveStyle(`background-color: ${theme.palette.primary.main}`);
  });

  test('renders button with secondary variant correctly', () => {
    const { getByRole } = renderWithTheme(
      <CustomButton variant="secondary">Secondary Button</CustomButton>
    );
    const button = getByRole('button');
    expect(button).toHaveTextContent('Secondary Button');
    expect(button).toHaveStyle(`background-color: ${theme.palette.secondary.main}`);
  });

  test('renders button with outlined variant correctly', () => {
    const { getByRole } = renderWithTheme(
      <CustomButton variant="outlined">Outlined Button</CustomButton>
    );
    const button = getByRole('button');
    expect(button).toHaveTextContent('Outlined Button');
    expect(button).toHaveStyle(`border: 1px solid ${theme.palette.primary.main}`);
  });

  // Test button click handlers
  test('handles click events correctly', () => {
    const handleClick = jest.fn();
    const { getByRole } = renderWithTheme(
      <CustomButton onClick={handleClick}>Click Me</CustomButton>
    );
    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test disabled state
  test('disables button correctly', () => {
    const handleClick = jest.fn();
    const { getByRole } = renderWithTheme(
      <CustomButton disabled onClick={handleClick}>Disabled Button</CustomButton>
    );
    const button = getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  // Test size variants
  test('applies correct size styles', () => {
    const { getByRole, rerender } = renderWithTheme(
      <CustomButton size="small">Small Button</CustomButton>
    );
    expect(getByRole('button')).toHaveStyle('font-size: 0.875rem');

    rerender(
      <ThemeProvider theme={theme}>
        <CustomButton size="large">Large Button</CustomButton>
      </ThemeProvider>
    );
    expect(getByRole('button')).toHaveStyle('font-size: 1.125rem');
  });

  // Test fullWidth prop
  test('applies fullWidth style correctly', () => {
    const { getByRole } = renderWithTheme(
      <CustomButton fullWidth>Full Width Button</CustomButton>
    );
    expect(getByRole('button')).toHaveStyle('width: 100%');
  });
});

describe('Card Component', () => {
  // Test card rendering with title and subheader
  test('renders card with title and subheader correctly', () => {
    const { getByText } = renderWithTheme(
      <Card title="Test Title" subheader="Test Subheader">
        <div>Card Content</div>
      </Card>
    );
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByText('Test Subheader')).toBeInTheDocument();
  });

  // Test card content rendering
  test('renders card content correctly', () => {
    const { getByText } = renderWithTheme(
      <Card>
        <div>Test Content</div>
      </Card>
    );
    expect(getByText('Test Content')).toBeInTheDocument();
  });

  // Test card actions rendering
  test('renders card actions correctly', () => {
    const { getByText } = renderWithTheme(
      <Card actions={<button>Action Button</button>}>
        <div>Card Content</div>
      </Card>
    );
    expect(getByText('Action Button')).toBeInTheDocument();
  });

  // Test card elevation levels
  test('applies correct elevation styles', () => {
    const { container } = renderWithTheme(
      <Card elevation={3}>
        <div>Card Content</div>
      </Card>
    );
    expect(container.firstChild).toHaveStyle('box-shadow: var(--elevation-3)');
  });

  // Test custom class names
  test('applies custom class names correctly', () => {
    const { container } = renderWithTheme(
      <Card className="custom-class">
        <div>Card Content</div>
      </Card>
    );
    expect(container.firstChild).toHaveClass('card', 'custom-class');
  });
});

describe('MapContainer Component', () => {
  beforeEach(() => {
    mockMapInstance();
  });

  // Test map initialization
  test('initializes Google Maps instance correctly', () => {
    const { container } = renderWithTheme(
      <MapContainer
        vehicles={[]}
        activeRoute={null}
        geofences={[]}
        onVehicleClick={() => {}}
        onGeofenceCreate={() => {}}
      />
    );
    expect(mockGoogleMaps.Map).toHaveBeenCalled();
    expect(container.firstChild).toHaveClass('MuiMapWrapper-root');
  });

  // Test vehicle marker rendering
  test('renders vehicle markers correctly', async () => {
    renderWithTheme(
      <MapContainer
        vehicles={mockVehicleData}
        activeRoute={null}
        geofences={[]}
        onVehicleClick={() => {}}
        onGeofenceCreate={() => {}}
      />
    );
    await waitFor(() => {
      expect(mockGoogleMaps.Marker).toHaveBeenCalledTimes(mockVehicleData.length);
    });
  });

  // Test route polyline rendering
  test('renders route polyline correctly', async () => {
    renderWithTheme(
      <MapContainer
        vehicles={[]}
        activeRoute={mockRouteData}
        geofences={[]}
        onVehicleClick={() => {}}
        onGeofenceCreate={() => {}}
      />
    );
    await waitFor(() => {
      expect(mockGoogleMaps.Polyline).toHaveBeenCalled();
    });
  });

  // Test geofence layer rendering
  test('renders geofence layers correctly', async () => {
    const mockGeofences = [{
      id: 'g1',
      center: { latitude: 40.7128, longitude: -74.0060 },
      radius: 1000,
      createdAt: new Date().toISOString()
    }];

    renderWithTheme(
      <MapContainer
        vehicles={[]}
        activeRoute={null}
        geofences={mockGeofences}
        onVehicleClick={() => {}}
        onGeofenceCreate={() => {}}
      />
    );
    await waitFor(() => {
      expect(mockGoogleMaps.Circle).toHaveBeenCalled();
    });
  });

  // Test click event handlers
  test('handles vehicle click events correctly', async () => {
    const handleVehicleClick = jest.fn();
    const { container } = renderWithTheme(
      <MapContainer
        vehicles={mockVehicleData}
        activeRoute={null}
        geofences={[]}
        onVehicleClick={handleVehicleClick}
        onGeofenceCreate={() => {}}
      />
    );
    
    await waitFor(() => {
      const marker = mockGoogleMaps.Marker.mock.results[0].value;
      const clickListener = marker.addListener.mock.calls[0][1];
      clickListener();
      expect(handleVehicleClick).toHaveBeenCalledWith(mockVehicleData[0].id);
    });
  });

  // Test 30-second update interval
  test('updates vehicle positions every 30 seconds', async () => {
    jest.useFakeTimers();
    
    renderWithTheme(
      <MapContainer
        vehicles={mockVehicleData}
        activeRoute={null}
        geofences={[]}
        onVehicleClick={() => {}}
        onGeofenceCreate={() => {}}
      />
    );

    await waitFor(() => {
      jest.advanceTimersByTime(30000);
      expect(mockGoogleMaps.Marker.prototype.setPosition).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});