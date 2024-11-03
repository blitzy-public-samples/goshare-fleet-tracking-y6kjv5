// Human Tasks:
// 1. Configure Auth0 tenant and application settings
// 2. Set up secure key storage for JWT secrets
// 3. Configure email service for verification emails
// 4. Set up Redis for token blacklist
// 5. Configure rate limiting for auth endpoints
// 6. Set up monitoring for failed login attempts
// 7. Implement automated account lockout policies

// Third-party imports
import express, { Router } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2

// Internal imports
import { AuthController } from '../controllers/authController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { validateSchema } from '../../../common/middleware/validator';

/**
 * Login request validation schema
 * Requirement 8.1.1: Authentication Methods - Secure login validation
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    }),
  provider: Joi.string()
    .valid('auth0', 'google', 'microsoft')
    .optional()
});

/**
 * Registration request validation schema
 * Requirement 8.1.1: Authentication Methods - Secure registration validation
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
      'any.required': 'Password is required'
    }),
  firstName: Joi.string()
    .required()
    .messages({
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .required()
    .messages({
      'any.required': 'Last name is required'
    }),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number in E.164 format',
      'any.required': 'Phone number is required'
    }),
  role: Joi.string()
    .valid('admin', 'fleet_manager', 'dispatcher', 'driver', 'customer')
    .default('customer')
});

/**
 * Reset password request validation schema
 * Requirement 8.1.1: Authentication Methods - Secure password reset
 */
const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  token: Joi.string()
    .when('$hasToken', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  newPassword: Joi.string()
    .when('token', {
      is: Joi.exist(),
      then: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .required()
        .messages({
          'string.min': 'New password must be at least 8 characters long',
          'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
          'any.required': 'New password is required'
        }),
      otherwise: Joi.forbidden()
    })
});

/**
 * Configures and returns Express router with authentication routes
 * Requirement 8.1.1: Implementation of OAuth 2.0 + OIDC with Auth0 integration
 * @returns Configured Express router instance
 */
const configureAuthRoutes = (): Router => {
  const router = express.Router();

  // Login route with OAuth 2.0 + OIDC support
  // Requirement 8.1.1: Authentication Methods
  router.post(
    '/login',
    validateSchema(loginSchema),
    AuthController.login
  );

  // Registration route with role-based access control
  // Requirement 8.1.2: Authorization Model
  router.post(
    '/register',
    validateSchema(registerSchema),
    AuthController.register
  );

  // Token refresh route with JWT validation
  // Requirement 8.3: Security Protocols
  router.post(
    '/refresh-token',
    authenticateToken,
    AuthController.refreshToken
  );

  // Logout route with token invalidation
  // Requirement 8.3: Security Protocols
  router.post(
    '/logout',
    authenticateToken,
    AuthController.logout
  );

  // Email verification route
  // Requirement 8.3: Security Protocols
  router.get(
    '/verify-email/:token',
    AuthController.verifyEmail
  );

  // Password reset request route
  // Requirement 8.1.1: Authentication Methods
  router.post(
    '/reset-password',
    validateSchema(resetPasswordSchema),
    AuthController.resetPassword
  );

  // Password reset with token route
  // Requirement 8.1.1: Authentication Methods
  router.post(
    '/reset-password/:token',
    validateSchema(resetPasswordSchema.keys({
      hasToken: Joi.boolean().default(true)
    })),
    AuthController.resetPassword
  );

  // Admin-only route for user management
  // Requirement 8.1.2: Role-based access control
  router.get(
    '/users',
    authenticateToken,
    authorizeRoles(['admin']),
    AuthController.getUsers
  );

  return router;
};

// Export configured router
export default configureAuthRoutes();