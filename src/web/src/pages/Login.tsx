// @react version ^18.0.0
// @react-router-dom version ^6.0.0
// @mui/material version ^5.0.0

/*
Human Tasks:
1. Configure OAuth 2.0 client credentials in environment variables
2. Set up secure token storage mechanism (e.g., HttpOnly cookies)
3. Review and configure password policy requirements
4. Set up CORS configuration for authentication endpoints
5. Configure session timeout and refresh token settings
*/

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password security requirements regex
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

/**
 * Interface for login form data with RFC 5322 compliant email
 * Implements requirement: Authentication and Authorization
 */
interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Login page component implementing OAuth 2.0 + OIDC authentication
 * Implements requirements:
 * - 8.1.1 Authentication Methods: OAuth 2.0 + OIDC authentication
 * - 8.3.1 Network Security: Secure token management
 * - Web Dashboard UI Framework: Material-UI implementation
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginUser, isLoading, error } = useAuth();

  // Form state management
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});

  /**
   * Validates form input based on security requirements
   * Implements requirement: Security Protocols - Input validation
   */
  const validateForm = useCallback((): boolean => {
    const errors: Partial<LoginFormData> = {};

    // Validate email using RFC 5322 compliance
    if (!EMAIL_REGEX.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate password against security requirements
    if (!PASSWORD_REGEX.test(formData.password)) {
      errors.password = 'Password must be at least 8 characters and include letters, numbers, and special characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  /**
   * Handles form input changes with validation
   * Implements requirement: Data validation and integrity
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user starts typing
    if (validationErrors[name as keyof LoginFormData]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [validationErrors]);

  /**
   * Handles OAuth 2.0 login form submission
   * Implements requirements:
   * - OAuth 2.0 + OIDC authentication flow
   * - Secure token management
   */
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate form inputs
    if (!validateForm()) {
      return;
    }

    try {
      // Attempt OAuth 2.0 authentication
      await loginUser({
        email: formData.email,
        password: formData.password
      });

      // Navigate to dashboard on successful authentication
      navigate('/dashboard');
    } catch (err) {
      // Error handling is managed by useAuth hook
      console.error('Login failed:', err);
    }
  }, [formData, validateForm, loginUser, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 3,
          borderRadius: 2,
          boxShadow: 3,
          backgroundColor: 'background.paper'
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Fleet Tracking System Login
        </Typography>

        {/* Display authentication errors */}
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* OAuth 2.0 login form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Input
            id="email"
            name="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={validationErrors.email}
            required
            disabled={isLoading}
          />

          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            error={validationErrors.password}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>

        {/* Loading indicator during authentication */}
        {isLoading && <Loading size={40} />}
      </Box>
    </Container>
  );
};

export default Login;