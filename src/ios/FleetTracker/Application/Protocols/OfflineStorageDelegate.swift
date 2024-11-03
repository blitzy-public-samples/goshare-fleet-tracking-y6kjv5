//
// OfflineStorageDelegate.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreData is properly configured for offline storage
// 2. Configure Reachability monitoring for network status
// 3. Set up background fetch capabilities in project settings
// 4. Configure proper error logging and monitoring system
// 5. Verify sync conflict resolution strategy with backend team

import Foundation  // iOS 14.0+

/// Protocol defining methods for handling offline storage events and synchronization status in the Fleet Tracking application
/// Requirements addressed:
/// - Offline data handling capabilities for mobile applications
/// - Real-time data synchronization between mobile and backend
/// - Offline-first architecture requirement for mobile applications
@objc
public protocol OfflineStorageDelegate: AnyObject {
    
    /// Called when a delivery is successfully saved to offline storage
    /// - Parameter delivery: The Delivery object that was saved offline
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    @objc optional func didSaveDeliveryOffline(_ delivery: Delivery)
    
    /// Called when a route is successfully saved to offline storage
    /// - Parameter route: The Route object that was saved offline
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    @objc optional func didSaveRouteOffline(_ route: Route)
    
    /// Called when an offline storage operation fails
    /// - Parameter error: The error that occurred during the storage operation
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    @objc optional func didFailToSaveOffline(_ error: Error)
    
    /// Called when offline data is successfully synchronized with the server
    /// - Parameter syncResults: Dictionary containing sync results including success/failure counts and entities
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    @objc optional func didSyncOfflineData(_ syncResults: [String: Any])
}

/// Extension providing default implementations for optional methods
extension OfflineStorageDelegate {
    
    public func didSaveDeliveryOffline(_ delivery: Delivery) {
        // Default implementation posts a notification for observers
        NotificationCenter.default.post(
            name: NSNotification.Name("DeliverySavedOffline"),
            object: nil,
            userInfo: [
                "deliveryId": delivery.id,
                "status": delivery.status.rawValue,
                "isOffline": delivery.isOffline,
                "timestamp": Date()
            ]
        )
    }
    
    public func didSaveRouteOffline(_ route: Route) {
        // Default implementation posts a notification for observers
        NotificationCenter.default.post(
            name: NSNotification.Name("RouteSavedOffline"),
            object: nil,
            userInfo: [
                "routeId": route.id,
                "status": route.status.rawValue,
                "isOffline": route.isOffline,
                "timestamp": Date()
            ]
        )
    }
    
    public func didFailToSaveOffline(_ error: Error) {
        // Default implementation logs the error and posts a notification
        NSLog("Offline storage error: \(error.localizedDescription)")
        NotificationCenter.default.post(
            name: NSNotification.Name("OfflineStorageError"),
            object: nil,
            userInfo: [
                "error": error,
                "timestamp": Date()
            ]
        )
    }
    
    public func didSyncOfflineData(_ syncResults: [String: Any]) {
        // Default implementation posts a notification with sync results
        NotificationCenter.default.post(
            name: NSNotification.Name("OfflineDataSynced"),
            object: nil,
            userInfo: [
                "results": syncResults,
                "timestamp": Date()
            ]
        )
    }
}

/// Constants for offline storage notification names
public extension NSNotification.Name {
    /// Posted when a delivery is saved offline
    static let deliverySavedOffline = NSNotification.Name("DeliverySavedOffline")
    
    /// Posted when a route is saved offline
    static let routeSavedOffline = NSNotification.Name("RouteSavedOffline")
    
    /// Posted when an offline storage error occurs
    static let offlineStorageError = NSNotification.Name("OfflineStorageError")
    
    /// Posted when offline data is synced with the server
    static let offlineDataSynced = NSNotification.Name("OfflineDataSynced")
}

/// Constants for sync result dictionary keys
public struct SyncResultKeys {
    /// Key for total number of items synced
    public static let totalSynced = "totalSynced"
    
    /// Key for number of successful syncs
    public static let successCount = "successCount"
    
    /// Key for number of failed syncs
    public static let failureCount = "failureCount"
    
    /// Key for array of successfully synced items
    public static let syncedItems = "syncedItems"
    
    /// Key for array of failed items
    public static let failedItems = "failedItems"
    
    /// Key for sync start timestamp
    public static let syncStartTime = "syncStartTime"
    
    /// Key for sync completion timestamp
    public static let syncEndTime = "syncEndTime"
    
    /// Key for sync duration in seconds
    public static let syncDuration = "syncDuration"
    
    private init() {}
}