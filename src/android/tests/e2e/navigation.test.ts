// Third-party imports - versions specified for security and compatibility
import { jest, describe, test, beforeEach, expect } from '@jest/globals'; // ^29.0.0
import { render, fireEvent, waitFor } from '@testing-library/react-native'; // ^12.0.0
import { NavigationContainer } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import AppNavigator, { RootTabParamList } from '../../src/navigation/AppNavigator';
import HomeNavigator, { HomeStackParamList } from '../../src/navigation/HomeNavigator';
import RouteNavigator, { RouteStackParamList } from '../../src/navigation/RouteNavigator';
import { ROUTES } from '../../src/constants/navigation';

// Constants for testing
const TEST_ROUTE_ID = 'test-route-123';
const NAVIGATION_TIMEOUT = 1000;
const TEST_SCREEN_OPTIONS = {
  animation: 'none',
  headerShown: false
};

// Mock hooks and services
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn()
  })
}));

jest.mock('../../src/hooks/useLocation', () => ({
  useLocation: () => ({
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    currentLocation: null
  })
}));

// Mock navigation reference
const navigationRef = jest.fn();

describe('Navigation Flow', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear navigation state and history
    navigationRef.mockClear();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  // Test: Initial authentication screen rendering
  test('should render initial authentication screen when not logged in', async () => {
    // Requirement: Mobile Applications (1.1) - Authentication flow testing
    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Verify Login screen is displayed
      expect(getByTestId('login-screen')).toBeTruthy();
      // Verify bottom tab navigation is not present
      expect(() => getByTestId('bottom-tab-bar')).toThrow();
    });
  });

  // Test: Navigation after successful login
  test('should navigate to home dashboard after successful login', async () => {
    // Requirement: Mobile Driver App Layout (6.1.2) - Navigation structure testing
    const mockAuth = require('../../src/hooks/useAuth').useAuth;
    mockAuth.mockImplementation(() => ({
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn()
    }));

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Verify Dashboard screen is displayed
      expect(getByTestId('dashboard-screen')).toBeTruthy();
      // Verify bottom tab bar is present
      expect(getByTestId('bottom-tab-bar')).toBeTruthy();
      // Verify real-time location tracking initialization
      expect(require('../../src/hooks/useLocation').useLocation().startTracking).toHaveBeenCalled();
    });
  });

  // Test: Bottom tab navigation functionality
  test('should navigate between bottom tabs correctly', async () => {
    // Requirement: Mobile Driver App Layout (6.1.2) - Bottom tab navigation testing
    const mockAuth = require('../../src/hooks/useAuth').useAuth;
    mockAuth.mockImplementation(() => ({
      isAuthenticated: true
    }));

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    // Test navigation to Messages tab
    fireEvent.press(getByText('Messages'));
    await waitFor(() => {
      expect(getByTestId('messages-screen')).toBeTruthy();
    });

    // Test navigation to Notifications tab
    fireEvent.press(getByText('Notifications'));
    await waitFor(() => {
      expect(getByTestId('notifications-screen')).toBeTruthy();
    });

    // Verify tab indicators and styling
    expect(getByTestId('tab-indicator-notifications')).toHaveStyle({
      backgroundColor: '#007AFF'
    });
  });

  // Test: Route stack navigation
  test('should handle route stack navigation properly', async () => {
    // Requirement: Mobile Applications (1.1) - Route navigation testing
    const mockAuth = require('../../src/hooks/useAuth').useAuth;
    mockAuth.mockImplementation(() => ({
      isAuthenticated: true
    }));

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    // Navigate to Routes tab
    fireEvent.press(getByText('Routes'));
    await waitFor(() => {
      expect(getByTestId('route-list-screen')).toBeTruthy();
    });

    // Select a route from the list
    fireEvent.press(getByTestId(`route-item-${TEST_ROUTE_ID}`));
    await waitFor(() => {
      expect(getByTestId('route-details-screen')).toBeTruthy();
    });

    // Navigate to active route
    fireEvent.press(getByTestId('start-route-button'));
    await waitFor(() => {
      expect(getByTestId('active-route-screen')).toBeTruthy();
      // Verify offline support for route data
      expect(getByTestId('offline-indicator')).toBeTruthy();
    });
  });

  // Test: Navigation state persistence
  test('should maintain navigation state during background/foreground transitions', async () => {
    // Requirement: Offline Operation Support (1.2) - Navigation state persistence
    const mockAuth = require('../../src/hooks/useAuth').useAuth;
    mockAuth.mockImplementation(() => ({
      isAuthenticated: true
    }));

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    // Navigate to a deep screen
    fireEvent.press(getByTestId(`route-item-${TEST_ROUTE_ID}`));
    await waitFor(() => {
      expect(getByTestId('route-details-screen')).toBeTruthy();
    });

    // Simulate app going to background
    const appState = require('react-native').AppState;
    appState.emit('change', 'background');

    // Simulate app returning to foreground
    appState.emit('change', 'active');

    await waitFor(() => {
      // Verify navigation state is preserved
      expect(getByTestId('route-details-screen')).toBeTruthy();
      // Verify route data is still available offline
      expect(getByTestId(`route-data-${TEST_ROUTE_ID}`)).toBeTruthy();
    });
  });
});