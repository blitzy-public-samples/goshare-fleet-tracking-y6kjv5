/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for authentication endpoints
 * 2. Set up mock SSL certificates for secure test connections
 * 3. Configure test keychain/keystore access for token storage
 * 4. Set up network condition simulation for offline tests
 */

// Third-party imports
import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals'; // ^29.0.0
import { render, fireEvent, waitFor } from '@testing-library/react-native'; // ^12.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Internal imports
import Login, { LoginScreenProps } from '../../src/screens/auth/Login';
import { AuthService } from '../../src/services/auth';
import { useAuth } from '../../src/hooks/useAuth';

// Test data
const validUserCredentials = {
  email: 'test@example.com',
  password: 'validPassword123'
};

const invalidUserCredentials = {
  email: 'invalid@example.com',
  password: 'wrongPassword'
};

// Mock implementations
const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  checkAuthStatus: jest.fn(),
  refreshToken: jest.fn()
};

const mockNetworkInfo = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  fetch: jest.fn()
};

const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

/**
 * End-to-end tests for authentication flows
 * Requirements addressed:
 * - Mobile Applications: Testing React Native driver application authentication
 * - Offline-first architecture: Testing offline authentication capabilities
 * - Security and encryption: Validating secure auth flows
 */
describe('Authentication Flow', () => {
  // Mock store setup
  const mockStore = {
    getState: () => ({
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      }
    }),
    dispatch: jest.fn(),
    subscribe: jest.fn()
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Clear secure storage
    await AsyncStorage.clear();
    
    // Reset auth state
    mockStore.getState = () => ({
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      }
    });

    // Setup network info mock
    NetInfo.addEventListener = mockNetworkInfo.addEventListener;
    NetInfo.fetch = mockNetworkInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true
    });

    // Setup storage mock
    AsyncStorage.getItem = mockStorage.getItem;
    AsyncStorage.setItem = mockStorage.setItem;
    AsyncStorage.removeItem = mockStorage.removeItem;
    AsyncStorage.clear = mockStorage.clear;

    // Setup auth service mock
    jest.spyOn(AuthService.prototype, 'login').mockImplementation(mockAuthService.login);
    jest.spyOn(AuthService.prototype, 'logout').mockImplementation(mockAuthService.logout);
    jest.spyOn(AuthService.prototype, 'checkAuthStatus').mockImplementation(mockAuthService.checkAuthStatus);
    jest.spyOn(AuthService.prototype, 'refreshToken').mockImplementation(mockAuthService.refreshToken);
  });

  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear storage
    AsyncStorage.clear();
    
    // Reset network state
    mockNetworkInfo.fetch.mockReset();
    
    // Clear auth service mocks
    mockAuthService.login.mockReset();
    mockAuthService.logout.mockReset();
    mockAuthService.checkAuthStatus.mockReset();
    mockAuthService.refreshToken.mockReset();
  });

  /**
   * Test successful login flow
   * Requirements:
   * - Mobile Applications: Validate successful authentication
   * - Security and encryption: Verify secure token storage
   */
  it('should successfully login with valid credentials', async () => {
    // Mock successful auth response
    const mockAuthResponse = {
      isAuthenticated: true,
      user: {
        id: '123',
        email: validUserCredentials.email,
        name: 'Test User'
      },
      token: 'valid.jwt.token'
    };
    mockAuthService.login.mockResolvedValueOnce(mockAuthResponse);

    // Render login screen with store provider
    const { getByPlaceholderText, getByText } = render(
      <Provider store={mockStore}>
        <Login />
      </Provider>
    );

    // Fill in credentials
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    fireEvent.changeText(emailInput, validUserCredentials.email);
    fireEvent.changeText(passwordInput, validUserCredentials.password);

    // Submit form
    const loginButton = getByText('Login');
    fireEvent.press(loginButton);

    // Verify auth flow
    await waitFor(() => {
      // Check if login was called with correct credentials
      expect(mockAuthService.login).toHaveBeenCalledWith(
        validUserCredentials.email,
        validUserCredentials.password
      );

      // Verify token storage
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        '@fleet_tracker/auth_token',
        mockAuthResponse.token
      );

      // Verify user data storage
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        '@fleet_tracker/user_data',
        JSON.stringify(mockAuthResponse.user)
      );
    });
  });

  /**
   * Test offline login capability
   * Requirements:
   * - Offline-first architecture: Validate offline authentication
   * - Security and encryption: Verify secure token handling
   */
  it('should handle offline login with stored credentials', async () => {
    // Setup stored credentials
    const storedToken = 'stored.jwt.token';
    const storedUser = {
      id: '123',
      email: validUserCredentials.email,
      name: 'Test User'
    };

    // Mock offline state
    mockNetworkInfo.fetch.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false
    });

    // Mock stored auth data
    mockStorage.getItem.mockImplementation((key) => {
      if (key === '@fleet_tracker/auth_token') return storedToken;
      if (key === '@fleet_tracker/user_data') return JSON.stringify(storedUser);
      return null;
    });

    // Mock successful offline auth check
    mockAuthService.checkAuthStatus.mockResolvedValueOnce(true);

    // Render login screen
    const { getByText } = render(
      <Provider store={mockStore}>
        <Login />
      </Provider>
    );

    // Verify offline auth flow
    await waitFor(() => {
      // Check if stored token was retrieved
      expect(mockStorage.getItem).toHaveBeenCalledWith('@fleet_tracker/auth_token');
      
      // Verify auth status check
      expect(mockAuthService.checkAuthStatus).toHaveBeenCalled();
      
      // Verify navigation to dashboard
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('auth/checkStatus/fulfilled')
        })
      );
    });
  });

  /**
   * Test login error handling
   * Requirements:
   * - Mobile Applications: Validate error handling
   * - Security and encryption: Verify secure error handling
   */
  it('should handle login errors correctly', async () => {
    // Mock failed auth response
    mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    // Render login screen
    const { getByPlaceholderText, getByText, findByText } = render(
      <Provider store={mockStore}>
        <Login />
      </Provider>
    );

    // Fill in invalid credentials
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    fireEvent.changeText(emailInput, invalidUserCredentials.email);
    fireEvent.changeText(passwordInput, invalidUserCredentials.password);

    // Submit form
    const loginButton = getByText('Login');
    fireEvent.press(loginButton);

    // Verify error handling
    await waitFor(async () => {
      // Check if error message is displayed
      const errorMessage = await findByText('Invalid email or password');
      expect(errorMessage).toBeTruthy();

      // Verify secure storage wasn't accessed
      expect(mockStorage.setItem).not.toHaveBeenCalled();

      // Verify auth state remains unauthenticated
      expect(mockStore.getState().auth.isAuthenticated).toBeFalsy();
    });
  });

  /**
   * Test logout functionality
   * Requirements:
   * - Mobile Applications: Validate logout flow
   * - Security and encryption: Verify secure cleanup
   */
  it('should successfully logout user', async () => {
    // Setup initial authenticated state
    const initialToken = 'valid.jwt.token';
    mockStore.getState = () => ({
      auth: {
        isAuthenticated: true,
        user: {
          id: '123',
          email: validUserCredentials.email,
          name: 'Test User'
        },
        token: initialToken,
        error: null
      }
    });

    // Mock successful logout
    mockAuthService.logout.mockResolvedValueOnce(undefined);

    // Get auth hook
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    // Trigger logout
    await act(async () => {
      await result.current.logout();
    });

    // Verify logout flow
    await waitFor(() => {
      // Check if logout was called
      expect(mockAuthService.logout).toHaveBeenCalled();

      // Verify token cleanup
      expect(mockStorage.removeItem).toHaveBeenCalledWith('@fleet_tracker/auth_token');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('@fleet_tracker/user_data');

      // Verify auth state reset
      expect(mockStore.getState().auth.isAuthenticated).toBeFalsy();
      expect(mockStore.getState().auth.user).toBeNull();
      expect(mockStore.getState().auth.token).toBeNull();
    });
  });
});