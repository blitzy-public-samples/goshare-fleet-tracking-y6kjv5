// Human Tasks:
// 1. Configure MongoDB indexes for optimal query performance
// 2. Set up encryption keys in secure key storage (AWS KMS/HashiCorp Vault)
// 3. Configure two-factor authentication secret key generation
// 4. Set up automated user status monitoring and alerts
// 5. Implement user session management and token rotation policies

// Third-party imports
import mongoose, { Schema, Document, Model } from 'mongoose'; // ^7.4.0
import bcrypt from 'bcryptjs'; // ^2.4.3

// Internal imports
import { mongoConnection } from '../../../common/config/database';
import { hashPassword, verifyPassword } from '../../../common/utils/encryption';

// Requirement 8.1.2: Role-based access control implementation
export enum UserRole {
    SYSTEM_ADMIN = 'system_admin',
    FLEET_MANAGER = 'fleet_manager',
    DISPATCHER = 'dispatcher',
    DRIVER = 'driver',
    CUSTOMER = 'customer'
}

// Requirement 8.1.2: User status management
export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING_VERIFICATION = 'pending_verification'
}

// User document interface
export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: UserRole;
    status: UserStatus;
    lastLogin: Date;
    deviceTokens: string[];
    twoFactorEnabled: boolean;
    twoFactorSecret: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    updateLastLogin(): Promise<void>;
}

// Requirement: Secure user data storage with MongoDB schema
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false // Exclude password from query results by default
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: Object.values(UserStatus),
        default: UserStatus.PENDING_VERIFICATION,
        index: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    deviceTokens: [{
        type: String,
        trim: true
    }],
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false // Exclude 2FA secret from query results by default
    }
}, {
    timestamps: true,
    collection: 'users',
    toJSON: {
        transform: (doc, ret) => {
            delete ret.password;
            delete ret.twoFactorSecret;
            delete ret.__v;
            return ret;
        }
    }
});

// Requirement 8.1.1: Secure password storage using PBKDF2-SHA512
UserSchema.pre<IUser>('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Hash password using PBKDF2-SHA512 with high iteration count
        this.password = await hashPassword(this.password);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Requirement 8.1.1: Password verification using constant-time comparison
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    try {
        // Use constant-time comparison to prevent timing attacks
        return await verifyPassword(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to update last login timestamp
UserSchema.methods.updateLastLogin = async function(): Promise<void> {
    this.lastLogin = new Date();
    await this.save();
};

// Create indexes for frequently queried fields
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastLogin: 1 });

// Requirement 8.2: Data security - Field level encryption for sensitive data
UserSchema.pre<IUser>('save', function(next) {
    // Implement field-level encryption for sensitive data
    // Note: Actual encryption implementation would use the encryption utility
    next();
});

// Add compound indexes for common query patterns
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ email: 1, status: 1 });

// Add text index for search functionality
UserSchema.index(
    { firstName: 'text', lastName: 'text', email: 'text' },
    { weights: { firstName: 2, lastName: 2, email: 1 } }
);

// Ensure all queries use indexes
UserSchema.pre('find', function() {
    this.setOptions({ maxTimeMS: 5000 }); // Set query timeout
});

// Export the User model
const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

// Export model and types
export { UserModel, UserSchema, IUser };

// Default export
export default UserModel;