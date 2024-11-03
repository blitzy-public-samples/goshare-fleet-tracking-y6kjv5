//
// KeychainManager.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure Keychain Sharing entitlement is enabled if using accessGroup
// 2. Verify app has the necessary background execution capabilities
// 3. Configure keychain accessibility based on security requirements

import Foundation  // iOS 14.0+
import Security   // iOS 14.0+

/// KeychainManager provides secure storage and retrieval of sensitive data using iOS Keychain Services with AES-256 encryption
/// Addresses requirements:
/// - Security and encryption protocols (8.1.1 Authentication Methods)
/// - Data Security (8.2.1 Encryption Standards)
/// - Offline operation support (1.2 Technical Implementation)
public final class KeychainManager {
    
    // MARK: - Properties
    
    /// Service identifier for keychain items, using bundle identifier
    private let serviceName: String
    
    /// Access group for keychain sharing between apps (if needed)
    private let accessGroup: String
    
    /// Singleton instance for keychain management
    public static let shared = KeychainManager()
    
    // MARK: - Constants
    
    private enum KeychainError: Error {
        case itemNotFound
        case duplicateItem
        case invalidItemFormat
        case unexpectedStatus(OSStatus)
    }
    
    // MARK: - Initialization
    
    private init() {
        // Initialize serviceName with bundle identifier
        self.serviceName = Bundle.main.bundleIdentifier ?? "com.fleettracker"
        
        // Initialize accessGroup for keychain sharing if needed
        self.accessGroup = "\(self.serviceName).keychain-group"
        
        // Configure default keychain accessibility settings
        setDefaultKeychainAccessibility()
    }
    
    // MARK: - Private Methods
    
    private func setDefaultKeychainAccessibility() {
        // Set default accessibility to after first unlock for background access
        let _ = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleAfterFirstUnlock,
            .privateKeyUsage,
            nil
        )
    }
    
    private func createBaseQuery(for key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
            kSecUseDataProtectionKeychain as String: true
        ]
        
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup as String] = accessGroup
        #endif
        
        return query
    }
    
    // MARK: - Public Methods
    
    /// Saves an item securely to the keychain using AES-256 encryption
    /// - Parameters:
    ///   - data: The data to be stored
    ///   - key: Unique identifier for the stored item
    /// - Returns: Success or failure of the save operation
    public func saveItem(_ data: Data, key: String) -> Bool {
        var query = createBaseQuery(for: key)
        query[kSecValueData as String] = data
        
        var status: OSStatus = errSecSuccess
        var retryCount = 0
        
        repeat {
            // Delete existing item first to avoid duplicates
            SecItemDelete(query as CFDictionary)
            
            // Attempt to add the new item
            status = SecItemAdd(query as CFDictionary, nil)
            retryCount += 1
            
            if status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts {
                Thread.sleep(forTimeInterval: 0.5)
            }
        } while status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts
        
        return status == errSecSuccess
    }
    
    /// Retrieves and decrypts an item from the keychain
    /// - Parameter key: Unique identifier of the item to retrieve
    /// - Returns: Retrieved decrypted data or nil if not found
    public func retrieveItem(key: String) -> Data? {
        var query = createBaseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        
        var result: AnyObject?
        var retryCount = 0
        var status: OSStatus = errSecSuccess
        
        repeat {
            status = SecItemCopyMatching(query as CFDictionary, &result)
            retryCount += 1
            
            if status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts {
                Thread.sleep(forTimeInterval: 0.5)
            }
        } while status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts
        
        return result as? Data
    }
    
    /// Deletes an item from the keychain
    /// - Parameter key: Unique identifier of the item to delete
    /// - Returns: Success or failure of the delete operation
    public func deleteItem(key: String) -> Bool {
        let query = createBaseQuery(for: key)
        var status: OSStatus = errSecSuccess
        var retryCount = 0
        
        repeat {
            status = SecItemDelete(query as CFDictionary)
            retryCount += 1
            
            if status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts {
                Thread.sleep(forTimeInterval: 0.5)
            }
        } while status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts
        
        return status == errSecSuccess || status == errSecItemNotFound
    }
    
    /// Removes all items stored by the application in the keychain
    /// - Returns: Success or failure of the clear operation
    public func clearAll() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName
        ]
        
        var status: OSStatus = errSecSuccess
        var retryCount = 0
        
        repeat {
            status = SecItemDelete(query as CFDictionary)
            retryCount += 1
            
            if status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts {
                Thread.sleep(forTimeInterval: 0.5)
            }
        } while status != errSecSuccess && retryCount < AppConstants.maxRetryAttempts
        
        return status == errSecSuccess || status == errSecItemNotFound
    }
}