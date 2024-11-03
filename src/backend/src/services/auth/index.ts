// Human Tasks:
// 1. Configure Auth0 tenant and application settings in environment variables
// 2. Set up secure key storage for JWT secrets
// 3. Configure email service for verification emails
// 4. Set up Redis for token blacklist and session management
// 5. Configure rate limiting for auth endpoints
// 6. Set up monitoring for failed login attempts
// 7. Implement automated account lockout policies
// 8. Configure TLS 1.3 for API Gateway

// Third-party imports
import express, { Application } from 'express'; // ^4.18.2
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import jwt from 'jsonwebtoken'; // ^9.0.1
import Redis from 'ioredis'; // ^4.28.5

// Internal imports
import router from './routes/authRoutes';
import { AuthController } from './controllers/authController';
import { authenticateToken, authorizeRoles } from './middleware/authMiddleware';

// Environment variables for authentication configuration
const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  auth0Domain: process.env.AUTH0_DOMAIN!,
  auth0ClientId: process.env.AUTH0_CLIENT_ID!,
  auth0Audience: process.env.AUTH0_AUDIENCE!
};

/**
 * Configures and initializes the authentication service
 * Requirement 8.1.1: Implementation of OAuth 2.0 + OIDC with Auth0 integration
 * @param app Express application instance
 */
const configureAuthService = (app: Application): void => {
  try {
    // Initialize Auth0 client for OAuth 2.0 + OIDC
    // Requirement 8.1.1: Authentication Methods
    const auth0Client = new Auth0Client({
      domain: AUTH_CONFIG.auth0Domain,
      client_id: AUTH_CONFIG.auth0ClientId,
      audience: AUTH_CONFIG.auth0Audience
    });

    // Initialize Redis client for token blacklist and session management
    // Requirement 8.3: Security Protocols
    const redisClient = new Redis(process.env.REDIS_URL!, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      }
    });

    // Configure JWT verification options
    // Requirement 8.3: Security Protocols/8.3.1 Network Security
    const jwtOptions = {
      secret: AUTH_CONFIG.jwtSecret,
      algorithms: ['HS256'] as jwt.Algorithm[],
      issuer: AUTH_CONFIG.auth0Domain,
      audience: AUTH_CONFIG.auth0Audience
    };

    // Mount authentication routes with security middleware
    // Requirement 8.1.1: Authentication Methods
    app.use('/api/v1/auth', router);

    // Configure role-based access control middleware
    // Requirement 8.1.2: Authorization Model
    app.use('/api/v1/admin/*', authenticateToken, authorizeRoles(['admin']));
    app.use('/api/v1/fleet/*', authenticateToken, authorizeRoles(['admin', 'fleet_manager']));
    app.use('/api/v1/dispatch/*', authenticateToken, authorizeRoles(['admin', 'fleet_manager', 'dispatcher']));
    app.use('/api/v1/driver/*', authenticateToken, authorizeRoles(['admin', 'fleet_manager', 'dispatcher', 'driver']));

    // Export authentication controller for external use
    // Requirement 8.1.1: Authentication Methods
    app.locals.authController = AuthController;

    // Configure security headers
    // Requirement 8.3: Security Protocols/8.3.1 Network Security
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      next();
    });

    // Health check endpoint for authentication service
    app.get('/api/v1/auth/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'Authentication service is healthy',
        timestamp: new Date().toISOString()
      });
    });

    console.log('Authentication service configured successfully');
  } catch (error) {
    console.error('Failed to configure authentication service:', error);
    throw error;
  }
};

// Export authentication service configuration
export default configureAuthService;

// Export authentication components for external use
export {
  AuthController,
  authenticateToken,
  authorizeRoles
};