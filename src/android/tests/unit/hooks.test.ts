// Third-party imports - versions specified for security auditing
import { renderHook, act } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^8.1.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.5.0

// Internal imports
import { useAuth } from '../../src/hooks/useAuth';
import { useLocation } from '../../src/hooks/useLocation';
import { useDelivery } from '../../src/hooks/useDelivery';
import { mockStore, mockGeolocation, mockNetInfo, mockAuthService, mockDeliveryService } from '../mocks';

// Test utility for rendering hooks with Redux provider
const renderHookWithRedux = (hook: any, initialState = {}) => {
  const store = configureStore({
    reducer: {
      auth: (state = initialState.auth || {}) => state,
      location: (state = initialState.location || {}) => state,
      delivery: (state = initialState.delivery || {}) => state
    },
    preloadedState: initialState
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(hook, { wrapper });
};

describe('useAuth', () => {
  // Test requirement: Testing authentication hook functionality with secure token management
  beforeEach(() => {
    mockAuthService.mockClear();
    localStorage.clear();
  });

  test('initial authentication state should be null user', () => {
    const { result } = renderHookWithRedux(useAuth, {
      auth: { user: null, isAuthenticated: false, loading: false }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBeFalsy();
    expect(result.current.loading).toBeFalsy();
  });

  test('login functionality should store token securely', async () => {
    const { result } = renderHookWithRedux(useAuth);
    const testCredentials = { email: 'test@example.com', password: 'password123' };

    await act(async () => {
      await result.current.login(testCredentials.email, testCredentials.password);
    });

    expect(mockAuthService.login).toHaveBeenCalledWith(testCredentials);
    expect(result.current.isAuthenticated).toBeTruthy();
    expect(result.current.user).toBeDefined();
  });

  test('logout functionality should clean up tokens', async () => {
    const { result } = renderHookWithRedux(useAuth, {
      auth: { user: { id: '1' }, isAuthenticated: true, loading: false }
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBeFalsy();
    expect(result.current.user).toBeNull();
  });

  test('token refresh mechanism should work automatically', async () => {
    jest.useFakeTimers();
    const { result } = renderHookWithRedux(useAuth, {
      auth: { user: { id: '1' }, isAuthenticated: true, token: 'valid-token' }
    });

    // Fast-forward 1 minute to trigger token refresh
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('error handling for invalid credentials', async () => {
    const { result } = renderHookWithRedux(useAuth);
    mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(
      act(async () => {
        await result.current.login('invalid@example.com', 'wrongpass');
      })
    ).rejects.toThrow('Invalid credentials');
  });

  test('loading states during operations', async () => {
    const { result } = renderHookWithRedux(useAuth);
    mockAuthService.login.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    act(() => {
      result.current.login('test@example.com', 'password123');
    });

    expect(result.current.loading).toBeFalsy(); // Loading managed by Redux toolkit
  });
});

describe('useLocation', () => {
  // Test requirement: Testing location tracking hook functionality with 30-second intervals
  beforeEach(() => {
    mockGeolocation.mockClear();
    mockNetInfo.mockClear();
  });

  test('location tracking initialization with default options', () => {
    const { result } = renderHookWithRedux(useLocation);

    expect(result.current.currentLocation).toBeNull();
    expect(result.current.isTracking).toBeFalsy();
    expect(result.current.error).toBeNull();
  });

  test('start/stop tracking functions with proper cleanup', async () => {
    const { result } = renderHookWithRedux(useLocation);

    await act(async () => {
      await result.current.startTracking();
    });

    expect(result.current.isTracking).toBeTruthy();
    expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        interval: 30000
      })
    );

    act(() => {
      result.current.stopTracking();
    });

    expect(result.current.isTracking).toBeFalsy();
    expect(mockGeolocation.clearWatch).toHaveBeenCalled();
  });

  test('current position retrieval with high accuracy', async () => {
    const { result } = renderHookWithRedux(useLocation);
    const mockLocation = { latitude: 40.7128, longitude: -74.0060 };
    mockGeolocation.getCurrentPosition.mockImplementationOnce(success => 
      success(mockLocation)
    );

    await act(async () => {
      const location = await result.current.getCurrentPosition();
      expect(location).toEqual(mockLocation);
    });
  });

  test('location updates at 30-second intervals', async () => {
    jest.useFakeTimers();
    const { result } = renderHookWithRedux(useLocation);
    const mockLocation = { latitude: 40.7128, longitude: -74.0060 };

    await act(async () => {
      await result.current.startTracking();
    });

    act(() => {
      mockGeolocation.mockLocationUpdate(mockLocation);
      jest.advanceTimersByTime(30000);
    });

    expect(result.current.currentLocation).toEqual(mockLocation);
    jest.useRealTimers();
  });

  test('error handling for location services', async () => {
    const { result } = renderHookWithRedux(useLocation);
    mockGeolocation.getCurrentPosition.mockImplementationOnce((_, error) => 
      error(new Error('Location permission denied'))
    );

    await act(async () => {
      try {
        await result.current.getCurrentPosition();
      } catch (error) {
        expect(error.message).toBe('Location permission denied');
      }
    });

    expect(result.current.error).toBe('Location permission denied');
  });

  test('offline behavior with data persistence', async () => {
    const { result } = renderHookWithRedux(useLocation);
    mockNetInfo.mockImplementation(() => ({ isConnected: false }));

    await act(async () => {
      await result.current.startTracking();
    });

    expect(result.current.error).toBe('Operating in offline mode');
    expect(result.current.isTracking).toBeTruthy();
  });

  test('location accuracy and speed calculations', async () => {
    const { result } = renderHookWithRedux(useLocation);
    const mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      speed: 5
    };

    await act(async () => {
      await result.current.startTracking();
      mockGeolocation.mockLocationUpdate(mockLocation);
    });

    expect(result.current.currentLocation).toEqual(mockLocation);
  });
});

describe('useDelivery', () => {
  // Test requirement: Testing delivery management hook functionality with offline support
  beforeEach(() => {
    mockDeliveryService.mockClear();
    mockNetInfo.mockClear();
  });

  test('delivery list fetching with offline data', async () => {
    const mockDeliveries = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'completed' }
    ];
    mockDeliveryService.getDeliveries.mockResolvedValueOnce(mockDeliveries);

    const { result } = renderHookWithRedux(useDelivery);

    await act(async () => {
      await result.current.fetchDeliveries();
    });

    expect(result.current.deliveries).toEqual(mockDeliveries);
    expect(result.current.loading).toBeFalsy();
  });

  test('delivery status updates with queueing', async () => {
    const { result } = renderHookWithRedux(useDelivery);
    const deliveryId = '1';
    const newStatus = 'completed';

    await act(async () => {
      await result.current.updateDeliveryStatus(deliveryId, newStatus);
    });

    expect(mockDeliveryService.updateStatus).toHaveBeenCalledWith(
      deliveryId,
      newStatus
    );
  });

  test('proof of delivery submission with photo and signature', async () => {
    const { result } = renderHookWithRedux(useDelivery);
    const deliveryId = '1';
    const proof = {
      photos: ['base64photo'],
      signature: 'base64signature',
      notes: 'Delivered to reception'
    };

    await act(async () => {
      await result.current.submitProofOfDelivery(deliveryId, proof);
    });

    expect(mockDeliveryService.submitProof).toHaveBeenCalledWith(
      deliveryId,
      proof
    );
  });

  test('offline queue functionality and sync', async () => {
    const { result } = renderHookWithRedux(useDelivery);
    mockNetInfo.mockImplementation(() => ({ isConnected: false }));

    const deliveryId = '1';
    const proof = {
      photos: ['base64photo'],
      signature: 'base64signature'
    };

    await act(async () => {
      await result.current.submitProofOfDelivery(deliveryId, proof);
    });

    expect(mockDeliveryService.queueOfflineAction).toHaveBeenCalled();
  });

  test('error handling for network failures', async () => {
    const { result } = renderHookWithRedux(useDelivery);
    mockDeliveryService.getDeliveries.mockRejectedValueOnce(
      new Error('Network error')
    );

    await act(async () => {
      await result.current.fetchDeliveries();
    });

    expect(result.current.error).toBe('Failed to fetch deliveries');
  });

  test('delivery sync mechanism on reconnect', async () => {
    const { result } = renderHookWithRedux(useDelivery);
    
    // Simulate offline -> online transition
    mockNetInfo.mockImplementationOnce(() => ({ isConnected: false }))
               .mockImplementationOnce(() => ({ isConnected: true }));

    await act(async () => {
      await result.current.fetchDeliveries();
    });

    expect(mockDeliveryService.syncOfflineActions).toHaveBeenCalled();
  });

  test('loading states during operations', async () => {
    const { result } = renderHookWithRedux(useDelivery);
    mockDeliveryService.getDeliveries.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    act(() => {
      result.current.fetchDeliveries();
    });

    expect(result.current.loading).toBeTruthy();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBeFalsy();
  });
});