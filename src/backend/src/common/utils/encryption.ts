/**
 * Human Tasks:
 * 1. Ensure OpenSSL is installed and available in the production environment
 * 2. Configure secure key storage solution (e.g., AWS KMS, HashiCorp Vault)
 * 3. Set up proper key rotation policies
 * 4. Configure secure environment variables for encryption keys
 */

import crypto from 'crypto'; // @version: built-in
import { EncryptionConfig } from '../types/index';

// Requirement 8.2.1: Implementation of AES-256 encryption for user credentials, location data, and personal information
const ENCRYPTION_CONFIG: EncryptionConfig = {
    algorithm: 'aes-256-cbc',
    keyLength: 32, // 256 bits
    ivLength: 16  // 128 bits for AES
};

/**
 * Encrypts sensitive data using AES-256-CBC encryption algorithm with PKCS7 padding
 * Requirement 8.2.1: Data Security - Encryption Standards
 */
export const encrypt = (data: string, key: string, iv: string): string => {
    if (!data || !key || !iv) {
        throw new Error('Encryption parameters cannot be null or undefined');
    }

    if (Buffer.from(key, 'base64').length !== ENCRYPTION_CONFIG.keyLength) {
        throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes for AES-256`);
    }

    if (Buffer.from(iv, 'base64').length !== ENCRYPTION_CONFIG.ivLength) {
        throw new Error(`IV must be ${ENCRYPTION_CONFIG.ivLength} bytes for AES`);
    }

    try {
        const cipher = crypto.createCipheriv(
            ENCRYPTION_CONFIG.algorithm,
            Buffer.from(key, 'base64'),
            Buffer.from(iv, 'base64')
        );
        
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // Prepend IV to encrypted data for decryption
        return Buffer.from(iv, 'base64').toString('base64') + ':' + encrypted;
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
};

/**
 * Decrypts AES-256-CBC encrypted data with PKCS7 padding
 * Requirement 8.2.1: Data Security - Encryption Standards
 */
export const decrypt = (encryptedData: string, key: string, iv: string): string => {
    if (!encryptedData || !key || !iv) {
        throw new Error('Decryption parameters cannot be null or undefined');
    }

    if (Buffer.from(key, 'base64').length !== ENCRYPTION_CONFIG.keyLength) {
        throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes for AES-256`);
    }

    try {
        const [storedIV, encryptedText] = encryptedData.split(':');
        
        const decipher = crypto.createDecipheriv(
            ENCRYPTION_CONFIG.algorithm,
            Buffer.from(key, 'base64'),
            Buffer.from(storedIV, 'base64')
        );
        
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
};

/**
 * Generates a cryptographically secure random encryption key for AES-256
 * Requirement 8.2.2: Data Protection Measures
 */
export const generateKey = (): Buffer => {
    try {
        const key = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
        if (key.length !== ENCRYPTION_CONFIG.keyLength) {
            throw new Error(`Generated key length ${key.length} does not match required length ${ENCRYPTION_CONFIG.keyLength}`);
        }
        return key;
    } catch (error) {
        throw new Error(`Key generation failed: ${error.message}`);
    }
};

/**
 * Generates a cryptographically secure random initialization vector for AES encryption
 * Requirement 8.2.2: Data Protection Measures
 */
export const generateIV = (): Buffer => {
    try {
        const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
        if (iv.length !== ENCRYPTION_CONFIG.ivLength) {
            throw new Error(`Generated IV length ${iv.length} does not match required length ${ENCRYPTION_CONFIG.ivLength}`);
        }
        return iv;
    } catch (error) {
        throw new Error(`IV generation failed: ${error.message}`);
    }
};

/**
 * Creates a secure hash of a password using PBKDF2-SHA512 with high iteration count
 * Requirement 8.2.1: Data Security - Encryption Standards
 */
export const hashPassword = async (password: string): Promise<string> => {
    if (!password) {
        throw new Error('Password cannot be null or undefined');
    }

    try {
        const salt = crypto.randomBytes(16);
        const iterations = 100000;
        const keyLength = 64;

        const hash = await new Promise<Buffer>((resolve, reject) => {
            crypto.pbkdf2(
                password,
                salt,
                iterations,
                keyLength,
                'sha512',
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });

        return `${salt.toString('base64')}:${hash.toString('base64')}`;
    } catch (error) {
        throw new Error(`Password hashing failed: ${error.message}`);
    }
};

/**
 * Verifies a password against its stored hash using constant-time comparison
 * Requirement 8.2.1: Data Security - Encryption Standards
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    if (!password || !hashedPassword) {
        throw new Error('Password and hash cannot be null or undefined');
    }

    try {
        const [storedSalt, storedHash] = hashedPassword.split(':');
        const iterations = 100000;
        const keyLength = 64;

        const hash = await new Promise<Buffer>((resolve, reject) => {
            crypto.pbkdf2(
                password,
                Buffer.from(storedSalt, 'base64'),
                iterations,
                keyLength,
                'sha512',
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });

        return crypto.timingSafeEqual(
            Buffer.from(storedHash, 'base64'),
            hash
        );
    } catch (error) {
        throw new Error(`Password verification failed: ${error.message}`);
    }
};