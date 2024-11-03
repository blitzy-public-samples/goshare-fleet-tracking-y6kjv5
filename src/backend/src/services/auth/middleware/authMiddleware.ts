// Human Tasks:
// 1. Configure JWT secret key in environment variables
// 2. Set up rate limiting rules in API Gateway
// 3. Configure CORS settings for allowed origins
// 4. Implement token rotation policy
// 5. Set up monitoring for authentication failures

// Third-party imports
import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import jwt from 'jsonwebtoken'; // ^9.0.0

// Internal imports
import { UserModel, User, UserRole } from '../models/userModel';
import { SECURITY_CONSTANTS, HTTP_STATUS } from '../../../common/constants';

// Requirement 8.1.1: Extended Express Request interface with authenticated user
export interface AuthRequest extends Request {
  user?: User;
}

/**
 * Requirement 8.1.1: JWT-based authentication middleware with OAuth 2.0 + OIDC integration
 * Verifies JWT tokens in request headers and attaches user object to request
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract JWT token from Authorization header using Bearer scheme
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'No authentication token provided'
      });
      return;
    }

    // Verify token signature and expiration using jsonwebtoken
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

    // Retrieve user from database using token payload
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Verify user status is active
    if (user.status !== 'active') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Account is not active'
      });
      return;
    }

    // Attach user object to request for downstream middleware
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Token has expired'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Invalid token'
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER).json({
        status: 'error',
        message: 'Authentication error'
      });
    }
  }
};

/**
 * Requirement 8.1.2: Role-based authorization middleware for access control
 * Checks if authenticated user has required role(s)
 */
export const authorizeRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Verify user object exists in request from authenticateToken
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Check if user role is in allowed roles array
      if (!allowedRoles.includes(req.user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER).json({
        status: 'error',
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Requirement 8.3.1: API Gateway level request validation and authentication
 * Validates request structure and content with sanitization
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check required headers presence including Authorization
    if (!req.headers.authorization) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Missing authorization header'
      });
      return;
    }

    // Validate content type for requests with body
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: 'error',
          message: 'Content-Type must be application/json'
        });
        return;
      }
    }

    // Validate request body schema if present
    if (req.body && Object.keys(req.body).length > 0) {
      // Basic sanitization of request body
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }

    // Check for maximum login attempts
    if (req.path.includes('/login')) {
      const attempts = parseInt(req.headers['x-login-attempts'] as string) || 0;
      if (attempts >= SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: 'error',
          message: 'Maximum login attempts exceeded. Please try again later.'
        });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: 'error',
      message: 'Invalid request format'
    });
  }
};