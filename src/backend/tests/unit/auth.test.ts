// Third-party imports
import { describe, test, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.3
import jwt from 'jsonwebtoken'; // ^9.0.1
import { Request, Response } from 'express'; // ^4.18.2

// Internal imports
import { AuthController } from '../../src/services/auth/controllers/authController';
import { authenticateToken, authorizeRoles } from '../../src/services/auth/middleware/authMiddleware';
import { UserModel, UserRole, UserStatus } from '../../src/services/auth/models/userModel';

// Mock Redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  }));
});

// Mock Auth0 client
jest.mock('@auth0/auth0-spa-js', () => ({
  Auth0Client: jest.fn().mockImplementation(() => ({
    getTokenSilently: jest.fn().mockResolvedValue('mock_token'),
    getUser: jest.fn().mockResolvedValue({
      email: 'test@example.com',
      given_name: 'Test',
      family_name: 'User'
    })
  }))
}));

// Mock environment variables
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRY = '1h';
process.env.REFRESH_TOKEN_EXPIRY = '7d';

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUser: any;

  beforeAll(() => {
    // Mock UserModel methods
    jest.spyOn(UserModel, 'findOne').mockImplementation();
    jest.spyOn(UserModel, 'create').mockImplementation();
    jest.spyOn(UserModel, 'findById').mockImplementation();
    jest.spyOn(UserModel, 'findByIdAndUpdate').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
      comparePassword: jest.fn().mockResolvedValue(true),
      updateLastLogin: jest.fn().mockResolvedValue(undefined)
    };

    mockRequest = {
      body: {},
      headers: {},
      params: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Requirement 8.1.1: Testing OAuth 2.0 + OIDC and JWT authentication
  describe('login', () => {
    test('should login successfully with valid email/password', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@example.com',
        password: 'validPassword123'
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({
              id: mockUser._id,
              email: mockUser.email
            })
          })
        })
      );
    });

    test('should login successfully with OAuth provider', async () => {
      // Arrange
      mockRequest.body = {
        provider: 'auth0'
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          })
        })
      );
    });

    test('should reject login with invalid credentials', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongPassword'
      };
      mockUser.comparePassword.mockResolvedValueOnce(false);
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid credentials'
        })
      );
    });

    test('should reject login for inactive user', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@example.com',
        password: 'validPassword123'
      };
      mockUser.status = UserStatus.INACTIVE;
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Account is not active'
        })
      );
    });
  });

  // Requirement 8.1.2: Testing role-based access control
  describe('register', () => {
    test('should register new user successfully', async () => {
      // Arrange
      mockRequest.body = {
        email: 'new@example.com',
        password: 'newPassword123',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '1234567890',
        role: UserRole.CUSTOMER
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      (UserModel.create as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().register(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Registration successful'
        })
      );
    });

    test('should reject registration with existing email', async () => {
      // Arrange
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123'
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().register(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Email already registered'
        })
      );
    });
  });

  // Requirement 8.3: Testing secure token management
  describe('refreshToken', () => {
    test('should refresh tokens successfully', async () => {
      // Arrange
      const validRefreshToken = jwt.sign(
        { userId: mockUser._id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      mockRequest.body = { refreshToken: validRefreshToken };
      (UserModel.findById as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      await new AuthController().refreshToken(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          })
        })
      );
    });

    test('should reject expired refresh token', async () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: mockUser._id },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );
      mockRequest.body = { refreshToken: expiredToken };

      // Act
      await new AuthController().refreshToken(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid refresh token'
        })
      );
    });
  });

  // Requirement 8.3: Testing secure logout
  describe('logout', () => {
    test('should logout successfully', async () => {
      // Arrange
      mockRequest.body = {
        refreshToken: 'valid_refresh_token'
      };
      mockRequest.headers = {
        authorization: 'Bearer valid_access_token'
      };

      // Act
      await new AuthController().logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Logout successful'
        })
      );
    });
  });
});

// Requirement 8.1.1: Testing JWT authentication middleware
describe('Authentication Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  test('should authenticate valid JWT token', async () => {
    // Arrange
    const validToken = jwt.sign(
      { userId: 'user123' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    mockRequest.headers.authorization = `Bearer ${validToken}`;
    (UserModel.findById as jest.Mock).mockResolvedValueOnce({
      _id: 'user123',
      status: 'active'
    });

    // Act
    await authenticateToken(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.user).toBeDefined();
  });

  test('should reject missing token', async () => {
    // Act
    await authenticateToken(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'No authentication token provided'
      })
    );
  });

  test('should reject invalid token', async () => {
    // Arrange
    mockRequest.headers.authorization = 'Bearer invalid_token';

    // Act
    await authenticateToken(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Invalid token'
      })
    );
  });
});

// Requirement 8.1.2: Testing role-based authorization middleware
describe('Authorization Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        role: UserRole.DRIVER
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  test('should authorize user with correct role', () => {
    // Arrange
    const middleware = authorizeRoles([UserRole.DRIVER, UserRole.FLEET_MANAGER]);

    // Act
    middleware(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  test('should reject user with incorrect role', () => {
    // Arrange
    const middleware = authorizeRoles([UserRole.SYSTEM_ADMIN]);

    // Act
    middleware(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Insufficient permissions'
      })
    );
  });

  test('should reject unauthenticated request', () => {
    // Arrange
    mockRequest.user = undefined;
    const middleware = authorizeRoles([UserRole.DRIVER]);

    // Act
    middleware(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Authentication required'
      })
    );
  });

  test('should authorize user with multiple roles', () => {
    // Arrange
    mockRequest.user.role = UserRole.FLEET_MANAGER;
    const middleware = authorizeRoles([
      UserRole.FLEET_MANAGER,
      UserRole.DISPATCHER,
      UserRole.SYSTEM_ADMIN
    ]);

    // Act
    middleware(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });
});