//
// User.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Configure OAuth 2.0 client credentials in environment configuration
// 2. Set up proper keychain access groups if using multiple extensions
// 3. Verify token refresh timing aligns with backend token expiration policy

import Foundation // iOS 14.0+
import Combine   // iOS 14.0+

/// Core model class representing a user in the Fleet Tracking System with OAuth 2.0 + OIDC authentication support
/// Addresses requirements:
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Security Protocols (8.3.1 Network Security)
/// - Data Security (8.2.1 Encryption Standards)
@objc public class User: NSObject, Codable, Equatable {
    
    // MARK: - Properties
    
    /// Unique identifier for the user
    public let id: String
    
    /// User's email address used for authentication
    public let email: String
    
    /// User's first name
    public let firstName: String
    
    /// User's last name
    public let lastName: String
    
    /// Optional phone number for user contact
    public var phoneNumber: String?
    
    /// User's role in the system (e.g., driver, manager)
    public let role: String
    
    /// Timestamp of user record creation
    public let createdAt: Date
    
    /// Timestamp of last user record update
    public let updatedAt: Date
    
    /// Current OAuth 2.0 access token
    private var accessToken: String?
    
    /// OAuth 2.0 refresh token for obtaining new access tokens
    private var refreshToken: String?
    
    /// Expiration date of the current access token
    private var tokenExpirationDate: Date?
    
    // MARK: - Constants
    
    private enum TokenKeys {
        static let accessToken = "user.accessToken"
        static let refreshToken = "user.refreshToken"
        static let tokenExpiration = "user.tokenExpiration"
    }
    
    // MARK: - Initialization
    
    /// Initializes a new User instance with required properties
    /// - Parameters:
    ///   - id: Unique identifier for the user
    ///   - email: User's email address
    ///   - firstName: User's first name
    ///   - lastName: User's last name
    ///   - role: User's role in the system
    public init(id: String, email: String, firstName: String, lastName: String, role: String) {
        self.id = id
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.role = role
        self.createdAt = Date()
        self.updatedAt = Date()
        super.init()
    }
    
    // MARK: - Token Management
    
    /// Securely saves OAuth 2.0 authentication tokens to the keychain using AES-256 encryption
    /// Implements requirement for secure token storage using AES-256 encryption
    /// - Parameters:
    ///   - accessToken: OAuth 2.0 access token
    ///   - refreshToken: OAuth 2.0 refresh token
    ///   - expirationDate: Token expiration date
    /// - Returns: Success status of token storage operation
    public func saveTokens(accessToken: String, refreshToken: String, expirationDate: Date) -> Bool {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.tokenExpirationDate = expirationDate
        
        guard let accessTokenData = accessToken.data(using: .utf8),
              let refreshTokenData = refreshToken.data(using: .utf8),
              let expirationData = try? JSONEncoder().encode(expirationDate) else {
            return false
        }
        
        let accessTokenSaved = KeychainManager.shared.saveItem(accessTokenData, key: TokenKeys.accessToken)
        let refreshTokenSaved = KeychainManager.shared.saveItem(refreshTokenData, key: TokenKeys.refreshToken)
        let expirationSaved = KeychainManager.shared.saveItem(expirationData, key: TokenKeys.tokenExpiration)
        
        return accessTokenSaved && refreshTokenSaved && expirationSaved
    }
    
    /// Retrieves stored OAuth tokens from the keychain using AES-256 decryption
    /// Implements requirement for secure token retrieval with encryption
    /// - Returns: Success status of token retrieval operation
    public func loadTokens() -> Bool {
        guard let accessTokenData = KeychainManager.shared.retrieveItem(key: TokenKeys.accessToken),
              let refreshTokenData = KeychainManager.shared.retrieveItem(key: TokenKeys.refreshToken),
              let expirationData = KeychainManager.shared.retrieveItem(key: TokenKeys.tokenExpiration),
              let accessToken = String(data: accessTokenData, encoding: .utf8),
              let refreshToken = String(data: refreshTokenData, encoding: .utf8),
              let expirationDate = try? JSONDecoder().decode(Date.self, from: expirationData) else {
            return false
        }
        
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.tokenExpirationDate = expirationDate
        
        return true
    }
    
    /// Securely removes stored authentication tokens from keychain
    /// Implements requirement for secure token removal
    public func clearTokens() {
        self.accessToken = nil
        self.refreshToken = nil
        self.tokenExpirationDate = nil
        
        _ = KeychainManager.shared.deleteItem(key: TokenKeys.accessToken)
        _ = KeychainManager.shared.deleteItem(key: TokenKeys.refreshToken)
        _ = KeychainManager.shared.deleteItem(key: TokenKeys.tokenExpiration)
    }
    
    /// Checks if the current OAuth access token is valid and not expired
    /// - Returns: Token validity status
    public func isTokenValid() -> Bool {
        guard let accessToken = accessToken,
              let expirationDate = tokenExpirationDate,
              !accessToken.isEmpty else {
            return false
        }
        
        // Add 5-minute buffer to expiration check
        let bufferInterval: TimeInterval = 300
        return expirationDate.timeIntervalSinceNow > bufferInterval
    }
    
    // MARK: - Equatable
    
    public static func == (lhs: User, rhs: User) -> Bool {
        return lhs.id == rhs.id &&
               lhs.email == rhs.email &&
               lhs.firstName == rhs.firstName &&
               lhs.lastName == rhs.lastName &&
               lhs.role == rhs.role
    }
    
    // MARK: - Codable
    
    private enum CodingKeys: String, CodingKey {
        case id, email, firstName, lastName, phoneNumber, role, createdAt, updatedAt
    }
}