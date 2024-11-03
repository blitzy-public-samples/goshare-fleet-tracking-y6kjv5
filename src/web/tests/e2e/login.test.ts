// @jest/globals version ^29.0.0
// @testing-library/react version ^14.0.0
// @testing-library/user-event version ^14.0.0
// @testing-library/jest-dom version ^5.16.5

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Login from '../../src/pages/Login';
import authReducer, { login } from '../../src/store/slices/authSlice';

// Test IDs from specification
const TEST_IDS = {
  emailInput: 'login-email-input',
  passwordInput: 'login-password-input',
  submitButton: 'login-submit-button',
  errorMessage: 'login-error-message',
  loadingSpinner: 'login-loading-spinner'
};

// Mock navigation function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Setup test Redux store and component render utilities
const setupTest = () => {
  // Create test store with auth reducer
  const store = configureStore({
    reducer: {
      auth: authReducer
    }
  });

  // Mock login thunk action
  store.dispatch = jest.fn();

  // Render component with required providers
  const utils = render(
    <Provider store={store}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </Provider>
  );

  return {
    store,
    ...utils
  };
};

// Mock function for simulating OAuth 2.0 API login requests
const mockLoginRequest = async (credentials: { email: string; password: string }) => {
  if (credentials.email === 'valid@example.com' && credentials.password === 'ValidPass123!') {
    return {
      token: 'mock-jwt-token',
      user: {
        id: '123',
        email: credentials.email,
        name: 'Test Driver'
      },
      expiresIn: 3600
    };
  }
  throw new Error('Invalid credentials');
};

describe('Login Page E2E Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset navigation mock
    mockNavigate.mockReset();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.resetAllMocks();
  });

  // Test case: Render login form correctly
  it('should render login form correctly', () => {
    setupTest();

    // Verify email input with RFC 5322 validation
    const emailInput = screen.getByTestId(TEST_IDS.emailInput);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeRequired();

    // Verify password input with security requirements
    const passwordInput = screen.getByTestId(TEST_IDS.passwordInput);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();

    // Verify submit button with loading state support
    const submitButton = screen.getByTestId(TEST_IDS.submitButton);
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeEnabled();
  });

  // Test case: Show validation errors for invalid inputs
  it('should show validation errors for invalid inputs', async () => {
    setupTest();
    const user = userEvent.setup();

    // Submit empty form
    const submitButton = screen.getByTestId(TEST_IDS.submitButton);
    await user.click(submitButton);

    // Verify RFC 5322 email validation error
    const emailInput = screen.getByTestId(TEST_IDS.emailInput);
    await user.type(emailInput, 'invalid-email');
    fireEvent.blur(emailInput);
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();

    // Verify password security requirement error
    const passwordInput = screen.getByTestId(TEST_IDS.passwordInput);
    await user.type(passwordInput, 'weak');
    fireEvent.blur(passwordInput);
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
  });

  // Test case: Show loading state during authentication
  it('should show loading state during authentication', async () => {
    const { store } = setupTest();
    const user = userEvent.setup();

    // Mock OAuth authentication delay
    store.dispatch = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    // Fill valid credentials
    await user.type(screen.getByTestId(TEST_IDS.emailInput), 'valid@example.com');
    await user.type(screen.getByTestId(TEST_IDS.passwordInput), 'ValidPass123!');

    // Submit form
    await user.click(screen.getByTestId(TEST_IDS.submitButton));

    // Verify loading indicator presence
    expect(screen.getByTestId(TEST_IDS.loadingSpinner)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.submitButton)).toBeDisabled();
  });

  // Test case: Handle successful login and navigation
  it('should handle successful login and navigation', async () => {
    const { store } = setupTest();
    const user = userEvent.setup();

    // Mock successful OAuth response with JWT token
    const mockResponse = await mockLoginRequest({
      email: 'valid@example.com',
      password: 'ValidPass123!'
    });

    store.dispatch = jest.fn().mockResolvedValueOf({
      payload: {
        token: mockResponse.token,
        user: mockResponse.user,
        tokenExpiration: new Date(Date.now() + mockResponse.expiresIn * 1000)
      }
    });

    // Fill valid credentials
    await user.type(screen.getByTestId(TEST_IDS.emailInput), 'valid@example.com');
    await user.type(screen.getByTestId(TEST_IDS.passwordInput), 'ValidPass123!');

    // Submit form
    await user.click(screen.getByTestId(TEST_IDS.submitButton));

    // Verify JWT token storage and navigation
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: login.pending.type
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // Test case: Display error message on failed login
  it('should display error message on failed login', async () => {
    const { store } = setupTest();
    const user = userEvent.setup();

    // Mock failed OAuth response
    store.dispatch = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

    // Fill invalid credentials
    await user.type(screen.getByTestId(TEST_IDS.emailInput), 'invalid@example.com');
    await user.type(screen.getByTestId(TEST_IDS.passwordInput), 'WrongPass123!');

    // Submit form
    await user.click(screen.getByTestId(TEST_IDS.submitButton));

    // Verify OAuth error message display
    await waitFor(() => {
      expect(screen.getByTestId(TEST_IDS.errorMessage)).toBeInTheDocument();
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});