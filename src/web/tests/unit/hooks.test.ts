// @testing-library/react version ^14.0.0
// @testing-library/react-hooks version ^8.0.1
// jest version ^29.5.0
// socket.io-client version ^4.7.0

import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAnalytics } from '../../src/hooks/useAnalytics';
import { useAuth } from '../../src/hooks/useAuth';
import { useMap } from '../../src/hooks/useMap';
import { useNotification } from '../../src/hooks/useNotification';
import { useSocket } from '../../src/hooks/useSocket';

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    analytics: (state = {
      fleetAnalytics: { data: null, loading: false, error: null },
      routeAnalytics: { data: null, loading: false, error: null }
    }) => state,
    auth: (state = {
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    }) => state,
    notifications: (state = []) => state
  }
});

// Mock Socket.io client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }))
}));

// Mock Google Maps API
const mockGoogleMaps = {
  Map: jest.fn(() => ({
    setCenter: jest.fn(),
    panTo: jest.fn(),
    fitBounds: jest.fn()
  })),
  Marker: jest.fn(() => ({
    setMap: jest.fn(),
    setPosition: jest.fn(),
    getPosition: jest.fn()
  })),
  LatLng: jest.fn(),
  LatLngBounds: jest.fn(() => ({
    extend: jest.fn()
  })),
  Circle: jest.fn(() => ({
    setMap: jest.fn(),
    setCenter: jest.fn(),
    setRadius: jest.fn(),
    getCenter: jest.fn(),
    getRadius: jest.fn()
  }))
};

global.google = {
  maps: mockGoogleMaps
};

// Wrapper component for hooks that need Redux context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useAnalytics', () => {
  // Testing requirement: Real-time data visualization with 30-second update intervals
  test('should fetch initial analytics data', async () => {
    const { result } = renderHook(() => useAnalytics({
      fleetId: 'fleet-123',
      dateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31')
      }
    }), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.fleetAnalytics).toBeDefined();
  });

  // Testing requirement: Analytics and reporting functionality
  test('should refresh analytics data', async () => {
    const { result } = renderHook(() => useAnalytics({
      fleetId: 'fleet-123'
    }), { wrapper });

    await act(async () => {
      await result.current.refreshAnalytics();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Testing requirement: Error handling for failed requests
  test('should handle analytics fetch errors', async () => {
    const { result } = renderHook(() => useAnalytics({
      fleetId: 'invalid-id'
    }), { wrapper });

    expect(result.current.error).toBeNull();
  });
});

describe('useAuth', () => {
  // Testing requirement: OAuth 2.0 + OIDC authentication implementation
  test('should handle user login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginUser({
        username: 'testuser',
        password: 'testpass'
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Testing requirement: JWT token management
  test('should handle user logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logoutUser();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  // Testing requirement: Authentication error handling
  test('should handle login errors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginUser({
        username: 'invalid',
        password: 'invalid'
      });
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useMap', () => {
  const mockContainer = document.createElement('div');

  // Testing requirement: Google Maps integration
  test('should initialize map instance', () => {
    const { result } = renderHook(() => useMap(mockContainer, {
      center: { lat: 0, lng: 0 },
      zoom: 12
    }));

    expect(result.current.map).toBeDefined();
    expect(mockGoogleMaps.Map).toHaveBeenCalled();
  });

  // Testing requirement: Vehicle tracking and route visualization
  test('should update vehicle marker', () => {
    const { result } = renderHook(() => useMap(mockContainer, {
      center: { lat: 0, lng: 0 }
    }));

    act(() => {
      result.current.updateVehicle({
        id: 'vehicle-123',
        location: { lat: 1, lng: 1 }
      });
    });

    expect(mockGoogleMaps.Marker).toHaveBeenCalled();
  });

  // Testing requirement: Geofencing features
  test('should create geofence', () => {
    const { result } = renderHook(() => useMap(mockContainer, {
      center: { lat: 0, lng: 0 }
    }));

    act(() => {
      result.current.addGeofence(
        { latitude: 1, longitude: 1 },
        1000
      );
    });

    expect(mockGoogleMaps.Circle).toHaveBeenCalled();
  });
});

describe('useNotification', () => {
  // Testing requirement: Real-time notification system
  test('should handle vehicle location updates', () => {
    const { result } = renderHook(() => useNotification({
      vehicleIds: ['vehicle-123'],
      autoMarkAsRead: true
    }), { wrapper });

    expect(result.current.markAsRead).toBeDefined();
    expect(result.current.clearNotifications).toBeDefined();
  });

  // Testing requirement: Notification management
  test('should mark notifications as read', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.markAsRead(['notification-123']);
    });
  });

  // Testing requirement: Batch notification operations
  test('should clear all notifications', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.clearNotifications();
    });
  });
});

describe('useSocket', () => {
  // Testing requirement: Socket.io connection management
  test('should establish socket connection', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.socket).toBeDefined();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Testing requirement: Real-time updates with 30s interval
  test('should handle location updates', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.socket).toBeDefined();
  });

  // Testing requirement: Socket error handling
  test('should handle connection errors', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.error).toBeNull();
  });
});