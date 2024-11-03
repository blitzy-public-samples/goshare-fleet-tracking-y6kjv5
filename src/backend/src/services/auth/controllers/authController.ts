// Human Tasks:
// 1. Configure Auth0 tenant and application settings
// 2. Set up secure key storage for JWT secrets
// 3. Configure email service for verification emails
// 4. Set up Redis for token blacklist
// 5. Configure rate limiting for auth endpoints
// 6. Set up monitoring for failed login attempts
// 7. Implement automated account lockout policies

// Third-party imports
import { Request, Response } from 'express'; // ^4.18.2
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import jwt from 'jsonwebtoken'; // ^9.0.1
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import Redis from 'ioredis'; // ^4.28.5

// Internal imports
import { UserModel, UserRole, UserStatus, IUser } from '../models/userModel';
import { validateSchema } from '../../../common/middleware/validator';
import { hashPassword } from '../../../common/utils/encryption';

// Environment variables for JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Redis client for token blacklist
const redisClient = new Redis(process.env.REDIS_URL);

// Auth0 client configuration
const auth0Client = new Auth0Client({
    domain: process.env.AUTH0_DOMAIN!,
    client_id: process.env.AUTH0_CLIENT_ID!
});

/**
 * Authentication Controller Class
 * Implements OAuth 2.0 + OIDC with Auth0 integration and JWT token management
 * Requirement 8.1.1: Authentication Methods
 */
export class AuthController {
    /**
     * User login with email/password or OAuth
     * Requirement 8.1.1: Implementation of OAuth 2.0 + OIDC and JWT authentication
     */
    @validateSchema(loginSchema)
    public async login(req: Request, res: Response): Promise<Response> {
        try {
            const { email, password, provider } = req.body;

            // OAuth login through Auth0
            if (provider) {
                const auth0Token = await auth0Client.getTokenSilently();
                const userInfo = await auth0Client.getUser(auth0Token);
                
                // Find or create user from OAuth data
                let user = await UserModel.findOne({ email: userInfo.email });
                if (!user) {
                    user = await UserModel.create({
                        email: userInfo.email,
                        firstName: userInfo.given_name,
                        lastName: userInfo.family_name,
                        status: UserStatus.ACTIVE,
                        role: UserRole.CUSTOMER
                    });
                }

                return this.generateAuthResponse(user, res);
            }

            // Email/password login
            const user = await UserModel.findOne({ email })
                .select('+password')
                .exec();

            if (!user) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Verify password with constant-time comparison
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Check user status
            if (user.status !== UserStatus.ACTIVE) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    status: 'error',
                    message: 'Account is not active'
                });
            }

            // Update last login timestamp
            await user.updateLastLogin();

            return this.generateAuthResponse(user, res);

        } catch (error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'Login failed',
                error: error.message
            });
        }
    }

    /**
     * User registration with role-based access control
     * Requirement 8.1.2: Role-based access control implementation
     */
    @validateSchema(registerSchema)
    public async register(req: Request, res: Response): Promise<Response> {
        try {
            const { email, password, firstName, lastName, phoneNumber, role } = req.body;

            // Check if email already exists
            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                return res.status(StatusCodes.CONFLICT).json({
                    status: 'error',
                    message: 'Email already registered'
                });
            }

            // Hash password using PBKDF2-SHA512
            const hashedPassword = await hashPassword(password);

            // Create new user with specified role
            const user = await UserModel.create({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phoneNumber,
                role: role || UserRole.CUSTOMER,
                status: UserStatus.PENDING_VERIFICATION
            });

            // Generate verification token
            const verificationToken = this.generateVerificationToken(user);

            // Send verification email
            await this.sendVerificationEmail(user.email, verificationToken);

            return res.status(StatusCodes.CREATED).json({
                status: 'success',
                message: 'Registration successful',
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        role: user.role,
                        status: user.status
                    }
                }
            });

        } catch (error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'Registration failed',
                error: error.message
            });
        }
    }

    /**
     * Refresh token generation with preserved permissions
     * Requirement 8.3: Security Protocols - Token-based authorization
     */
    @validateSchema(refreshTokenSchema)
    public async refreshToken(req: Request, res: Response): Promise<Response> {
        try {
            const { refreshToken } = req.body;

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, JWT_SECRET!) as any;

            // Check if token is blacklisted
            const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
            if (isBlacklisted) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'Invalid refresh token'
                });
            }

            // Get user and verify status
            const user = await UserModel.findById(decoded.userId);
            if (!user || user.status !== UserStatus.ACTIVE) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'User not found or inactive'
                });
            }

            // Generate new tokens
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            return res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    user: {
                        id: user._id,
                        email: user.email,
                        role: user.role
                    }
                }
            });

        } catch (error) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                status: 'error',
                message: 'Invalid refresh token',
                error: error.message
            });
        }
    }

    /**
     * User logout with token invalidation
     * Requirement 8.3: Security Protocols - Session management
     */
    @validateSchema(logoutSchema)
    public async logout(req: Request, res: Response): Promise<Response> {
        try {
            const { refreshToken } = req.body;
            const authHeader = req.headers.authorization;
            const accessToken = authHeader?.split(' ')[1];

            // Add tokens to blacklist with expiry
            if (accessToken) {
                await redisClient.setex(
                    `blacklist:${accessToken}`,
                    3600, // 1 hour
                    'true'
                );
            }

            if (refreshToken) {
                await redisClient.setex(
                    `blacklist:${refreshToken}`,
                    604800, // 7 days
                    'true'
                );
            }

            return res.status(StatusCodes.OK).json({
                status: 'success',
                message: 'Logout successful'
            });

        } catch (error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'Logout failed',
                error: error.message
            });
        }
    }

    /**
     * Email verification with secure token
     * Requirement 8.3: Security Protocols
     */
    @validateSchema(verifyEmailSchema)
    public async verifyEmail(req: Request, res: Response): Promise<Response> {
        try {
            const { token } = req.params;

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET!) as any;

            // Update user status
            const user = await UserModel.findByIdAndUpdate(
                decoded.userId,
                {
                    status: UserStatus.ACTIVE
                },
                { new: true }
            );

            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            return res.status(StatusCodes.OK).json({
                status: 'success',
                message: 'Email verified successfully'
            });

        } catch (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid verification token',
                error: error.message
            });
        }
    }

    /**
     * Password reset with secure token
     * Requirement 8.1.1: Secure password storage
     */
    @validateSchema(resetPasswordSchema)
    public async resetPassword(req: Request, res: Response): Promise<Response> {
        try {
            const { email } = req.body;

            // Find user
            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(StatusCodes.OK).json({
                    status: 'success',
                    message: 'If the email exists, a reset link will be sent'
                });
            }

            // Generate reset token
            const resetToken = this.generateResetToken(user);

            // Send reset email
            await this.sendPasswordResetEmail(email, resetToken);

            return res.status(StatusCodes.OK).json({
                status: 'success',
                message: 'If the email exists, a reset link will be sent'
            });

        } catch (error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'Password reset failed',
                error: error.message
            });
        }
    }

    /**
     * Generate JWT access token with user permissions
     * Requirement 8.3: Security Protocols - Token-based authorization
     */
    private generateAccessToken(user: IUser): string {
        return jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET!,
            { expiresIn: JWT_EXPIRY }
        );
    }

    /**
     * Generate refresh token for token renewal
     * Requirement 8.3: Security Protocols - Refresh token support
     */
    private generateRefreshToken(user: IUser): string {
        return jwt.sign(
            {
                userId: user._id,
                tokenType: 'refresh'
            },
            JWT_SECRET!,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );
    }

    /**
     * Generate verification token for email confirmation
     */
    private generateVerificationToken(user: IUser): string {
        return jwt.sign(
            {
                userId: user._id,
                email: user.email,
                tokenType: 'verification'
            },
            JWT_SECRET!,
            { expiresIn: '24h' }
        );
    }

    /**
     * Generate password reset token
     */
    private generateResetToken(user: IUser): string {
        return jwt.sign(
            {
                userId: user._id,
                email: user.email,
                tokenType: 'reset'
            },
            JWT_SECRET!,
            { expiresIn: '1h' }
        );
    }

    /**
     * Generate standardized authentication response
     */
    private async generateAuthResponse(user: IUser, res: Response): Promise<Response> {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        return res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status
                }
            }
        });
    }

    /**
     * Send verification email to user
     */
    private async sendVerificationEmail(email: string, token: string): Promise<void> {
        // Implementation depends on email service configuration
        // TODO: Implement email sending logic
    }

    /**
     * Send password reset email to user
     */
    private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        // Implementation depends on email service configuration
        // TODO: Implement email sending logic
    }
}

// Export controller instance
export default new AuthController();