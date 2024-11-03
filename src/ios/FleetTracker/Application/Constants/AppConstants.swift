//
// AppConstants.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure minimum iOS version (14.0) is set in Xcode project settings
// 2. Update APP_VERSION and BUILD_NUMBER when releasing new versions
// 3. Configure offline storage capacity based on device capabilities

import Foundation  // iOS 14.0+
import UIKit      // iOS 14.0+

// MARK: - Global Constants
let APP_VERSION: String = "1.0.0"
let BUILD_NUMBER: String = "1"
let MIN_IOS_VERSION: Float = 14.0

// MARK: - AppConstants
/// Static structure containing all application-wide constants
/// Addresses requirements: Cross-platform compatibility, Offline operation support, System uptime
public struct AppConstants {
    // MARK: - Properties
    
    /// Current application version
    public static let appVersion: String = APP_VERSION
    
    /// Current build number
    public static let buildNumber: String = BUILD_NUMBER
    
    /// Minimum supported iOS version
    /// Requirement: Cross-platform compatibility - Defines minimum iOS version requirement
    public static let minIOSVersion: Float = MIN_IOS_VERSION
    
    /// Interval for synchronizing offline data with the server (in seconds)
    /// Requirement: Offline operation support - Defines sync intervals
    public static let offlineSyncInterval: TimeInterval = 300 // 5 minutes
    
    /// Maximum number of days to store offline data
    /// Requirement: Offline operation support - Defines offline data storage thresholds
    public static let maxOfflineStorageDays: Int = 7
    
    /// Maximum number of retry attempts for failed operations
    /// Requirement: System uptime - Defines system health monitoring thresholds
    public static let maxRetryAttempts: Int = 3
    
    /// Private initializer to prevent instantiation
    private init() {}
}

// MARK: - StorageConstants
/// Nested structure containing storage-related constants aligned with offline-first architecture requirements
/// Addresses requirement: Offline operation support
public struct StorageConstants {
    /// Maximum cache size in megabytes
    public static let maxCacheSize: Int = 500
    
    /// Duration to keep cached data (in seconds)
    public static let cacheDuration: TimeInterval = 86400 // 24 hours
    
    /// Maximum number of offline entries to store
    public static let maxOfflineEntries: Int = 10000
    
    /// Private initializer to prevent instantiation
    private init() {}
}

// MARK: - NetworkConstants
/// Nested structure containing network-related constants for real-time communication
/// Addresses requirement: System uptime
public struct NetworkConstants {
    /// Connection timeout interval (in seconds)
    public static let connectionTimeout: TimeInterval = 30
    
    /// Request timeout interval (in seconds)
    public static let requestTimeout: TimeInterval = 60
    
    /// Maximum number of concurrent network operations
    public static let maxConcurrentOperations: Int = 4
    
    /// Private initializer to prevent instantiation
    private init() {}
}